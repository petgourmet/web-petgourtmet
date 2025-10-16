import { createServiceClient } from '@/lib/supabase/service'
import logger, { LogCategory } from '@/lib/logger'
import { getMercadoPagoAccessToken } from './mercadopago-config'

/**
 * Servicio de sincronización de pagos con MercadoPago
 * Mantiene el estado de pagos y suscripciones sincronizado
 */
export class PaymentSyncService {
  private supabase: any
  private mercadoPagoToken: string

  constructor() {
    this.mercadoPagoToken = getMercadoPagoAccessToken()
    if (!this.mercadoPagoToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')
    }
  }

  async initializeSupabase() {
    this.supabase = createServiceClient()
  }

  /**
   * Sincronizar todas las órdenes pendientes
   */
  async syncPendingOrders(maxAge: number = 24): Promise<SyncResult> {
    const startTime = Date.now()
    
    try {
      await this.initializeSupabase()
      
      logger.info('Iniciando sincronización de órdenes pendientes', 'SYNC', {
        maxAgeHours: maxAge
      })

      // Obtener órdenes pendientes de las últimas X horas
      const cutoffDate = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString()
      
      const { data: pendingOrders, error } = await this.supabase
        .from('orders')
        .select('*')
        .in('payment_status', ['pending', 'in_process'])
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw new Error(`Error obteniendo órdenes: ${error.message}`)
      }

      const result: SyncResult = {
        type: 'orders',
        processed: 0,
        updated: 0,
        errors: 0,
        duration: 0,
        details: []
      }

      if (!pendingOrders || pendingOrders.length === 0) {
        logger.info('No hay órdenes pendientes para sincronizar', 'SYNC')
        result.duration = Date.now() - startTime
        return result
      }

      logger.info(`Sincronizando ${pendingOrders.length} órdenes`, 'SYNC')

      for (const order of pendingOrders) {
        try {
          result.processed++
          const syncResult = await this.syncSingleOrder(order)
          
          if (syncResult.updated) {
            result.updated++
            result.details.push(syncResult)
          }
          
        } catch (error) {
          result.errors++
          logger.error(`Error sincronizando orden ${order.id}`, 'SYNC', {
            orderId: order.id,
            error: error.message
          })
        }
      }

      result.duration = Date.now() - startTime
      
      logger.info('Sincronización de órdenes completada', 'SYNC', {
        ...result
      })

      return result

    } catch (error) {
      logger.error('Error en sincronización de órdenes', 'SYNC', {
        error: error.message,
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Sincronizar una orden específica
   */
  async syncSingleOrder(order: any): Promise<OrderSyncResult> {
    const result: OrderSyncResult = {
      orderId: order.id,
      updated: false,
      oldStatus: order.status,
      newStatus: order.status,
      paymentId: null,
      paymentStatus: null
    }

    try {
      // Buscar pagos por external_reference
      const payments = await this.searchPaymentsByReference(order.id.toString())
      
      if (payments.length === 0) {
        // Si no hay pagos por external_reference, buscar por preference_id
        if (order.payment_intent_id) {
          const preferencePayments = await this.searchPaymentsByPreference(order.payment_intent_id)
          payments.push(...preferencePayments)
        }
      }

      if (payments.length === 0) {
        logger.info(`No se encontraron pagos para orden ${order.id}`, 'SYNC')
        return result
      }

      // Tomar el pago más reciente o el aprobado
      const approvedPayments = payments.filter(p => p.status === 'approved')
      const latestPayment = approvedPayments.length > 0 
        ? approvedPayments[approvedPayments.length - 1]
        : payments[payments.length - 1]

      logger.info(`Pago encontrado para orden ${order.id}`, 'SYNC', {
        paymentId: latestPayment.id,
        status: latestPayment.status,
        amount: latestPayment.transaction_amount
      })

      // Preparar datos de actualización
      const updateData = this.prepareOrderUpdateData(latestPayment, order)
      
      // Actualizar la orden
      const { error: updateError } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (updateError) {
        throw new Error(`Error actualizando orden: ${updateError.message}`)
      }

      result.updated = true
      result.newStatus = updateData.status
      result.paymentId = latestPayment.id
      result.paymentStatus = latestPayment.status

      logger.info(`Orden ${order.id} sincronizada exitosamente`, 'SYNC', {
        paymentId: latestPayment.id,
        oldStatus: result.oldStatus,
        newStatus: result.newStatus
      })

      return result

    } catch (error) {
      logger.error(`Error sincronizando orden ${order.id}`, 'SYNC', {
        error: error.message
      })
      throw error
    }
  }

  /**
   * Buscar pagos por external_reference
   */
  private async searchPaymentsByReference(reference: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${this.mercadoPagoToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []

    } catch (error) {
      logger.error('Error buscando pagos por referencia', 'SYNC', {
        reference,
        error: error.message
      })
      return []
    }
  }

  /**
   * Buscar pagos por preference_id
   */
  private async searchPaymentsByPreference(preferenceId: string): Promise<any[]> {
    try {
      // Obtener la preferencia para encontrar pagos relacionados
      const response = await fetch(
        `https://api.mercadopago.com/checkout/preferences/${preferenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.mercadoPagoToken}`
          }
        }
      )

      if (!response.ok) {
        return []
      }

      const preference = await response.json()
      
      // Buscar pagos por external_reference de la preferencia
      if (preference.external_reference) {
        return await this.searchPaymentsByReference(preference.external_reference)
      }

      return []

    } catch (error) {
      logger.error('Error buscando pagos por preferencia', 'SYNC', {
        preferenceId,
        error: error.message
      })
      return []
    }
  }

  /**
   * Preparar datos de actualización para la orden
   */
  private prepareOrderUpdateData(paymentData: any, order: any): any {
    const updateData: any = {
      mercadopago_payment_id: paymentData.id.toString(),
      payment_status: paymentData.status,
      payment_type: paymentData.payment_type_id,
      payment_method: paymentData.payment_method_id,
      external_reference: paymentData.external_reference || order.id.toString(),
      collection_id: paymentData.id.toString(),
      site_id: paymentData.currency_id === 'MXN' ? 'MLM' : 'MLA',
      processing_mode: 'aggregator',
      updated_at: new Date().toISOString()
    }

    // Actualizar estado de la orden según el estado del pago
    if (paymentData.status === 'approved' || paymentData.status === 'paid') {
      updateData.status = 'confirmed'
      updateData.confirmed_at = new Date().toISOString()
    } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
      updateData.status = 'cancelled'
    } else if (paymentData.status === 'pending' || paymentData.status === 'in_process') {
      updateData.status = 'pending_payment'
    }

    return updateData
  }

  /**
   * Sincronizar suscripciones pendientes
   */
  async syncPendingSubscriptions(maxAge: number = 24): Promise<SyncResult> {
    const startTime = Date.now()
    
    try {
      await this.initializeSupabase()
      
      logger.info('Iniciando sincronización de suscripciones', 'SYNC', {
        maxAgeHours: maxAge
      })

      const cutoffDate = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString()
      
      const { data: pendingSubscriptions, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', cutoffDate)
        .limit(50)

      if (error) {
        throw new Error(`Error obteniendo suscripciones: ${error.message}`)
      }

      const result: SyncResult = {
        type: 'subscriptions',
        processed: 0,
        updated: 0,
        errors: 0,
        duration: 0,
        details: []
      }

      if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
        logger.info('No hay suscripciones pendientes para sincronizar', 'SYNC')
        result.duration = Date.now() - startTime
        return result
      }

      // Procesar cada suscripción
      for (const subscription of pendingSubscriptions) {
        try {
          result.processed++
          // Aquí iría la lógica de sincronización de suscripciones
          // Similar a las órdenes pero para preapprovals de MercadoPago
          
        } catch (error) {
          result.errors++
          logger.error(`Error sincronizando suscripción ${subscription.id}`, 'SYNC', {
            subscriptionId: subscription.id,
            error: error.message
          })
        }
      }

      result.duration = Date.now() - startTime
      return result

    } catch (error) {
      logger.error('Error en sincronización de suscripciones', 'SYNC', {
        error: error.message,
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Ejecutar sincronización completa
   */
  async fullSync(): Promise<FullSyncResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Iniciando sincronización completa', 'SYNC')

      const [ordersResult, subscriptionsResult] = await Promise.all([
        this.syncPendingOrders(),
        this.syncPendingSubscriptions()
      ])

      const result: FullSyncResult = {
        orders: ordersResult,
        subscriptions: subscriptionsResult,
        totalDuration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }

      logger.info('Sincronización completa finalizada', 'SYNC', {
        ordersProcessed: ordersResult.processed,
        ordersUpdated: ordersResult.updated,
        subscriptionsProcessed: subscriptionsResult.processed,
        subscriptionsUpdated: subscriptionsResult.updated,
        totalDuration: result.totalDuration
      })

      return result

    } catch (error) {
      logger.error('Error en sincronización completa', 'SYNC', {
        error: error.message,
        duration: Date.now() - startTime
      })
      throw error
    }
  }
}

// Interfaces
export interface SyncResult {
  type: 'orders' | 'subscriptions'
  processed: number
  updated: number
  errors: number
  duration: number
  details: any[]
}

export interface OrderSyncResult {
  orderId: number
  updated: boolean
  oldStatus: string
  newStatus: string
  paymentId: string | null
  paymentStatus: string | null
}

export interface FullSyncResult {
  orders: SyncResult
  subscriptions: SyncResult
  totalDuration: number
  timestamp: string
}

export default PaymentSyncService