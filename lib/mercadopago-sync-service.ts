// lib/mercadopago-sync-service.ts
// Servicio robusto para sincronizar suscripciones con MercadoPago API directamente

import { createClient } from '@supabase/supabase-js'
import { getMercadoPagoAccessToken, isTestMode } from './mercadopago-config'
import { logger, LogCategory } from './logger'

interface MercadoPagoSubscription {
  id: string
  status: 'pending' | 'authorized' | 'paused' | 'cancelled' | 'expired'
  external_reference: string
  payer_id: string
  date_created: string
  last_modified: string
  next_payment_date?: string
  // ELIMINADO: preapproval_plan_id ya no se usa en el nuevo sistema
  // preapproval_plan_id: string
  reason?: string
  auto_recurring?: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
  }
}

interface LocalSubscription {
  id: number
  mercadopago_subscription_id: string
  status: string
  external_reference: string
  user_id: string
  created_at: string
  updated_at: string
  next_billing_date?: string
  last_sync_at?: string
}

export class MercadoPagoSyncService {
  private supabase: any
  private accessToken: string
  private isTestMode: boolean

  constructor() {
    this.accessToken = getMercadoPagoAccessToken()
    this.isTestMode = isTestMode()
    
    // Inicializar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are required')
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey)
    
    logger.info(LogCategory.SUBSCRIPTION, 'MercadoPagoSyncService inicializado', {
      isTestMode: this.isTestMode,
      hasToken: !!this.accessToken
    })
  }

  /**
   * Obtiene datos de una suscripción directamente desde MercadoPago API
   */
  async getSubscriptionFromMercadoPago(subscriptionId: string): Promise<MercadoPagoSubscription | null> {
    try {
      logger.info(LogCategory.SUBSCRIPTION, 'Consultando suscripción en MercadoPago API', {
        subscriptionId,
        isTestMode: this.isTestMode
      })

      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn(LogCategory.SUBSCRIPTION, 'Suscripción no encontrada en MercadoPago', {
            subscriptionId,
            status: response.status
          })
          return null
        }
        
        logger.error(LogCategory.SUBSCRIPTION, 'Error consultando MercadoPago API', {
          subscriptionId,
          status: response.status,
          statusText: response.statusText
        })
        return null
      }

      const subscriptionData = await response.json()
      
      logger.info(LogCategory.SUBSCRIPTION, 'Suscripción obtenida exitosamente de MercadoPago', {
        subscriptionId,
        status: subscriptionData.status,
        externalReference: subscriptionData.external_reference
      })

      return subscriptionData
    } catch (error: any) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error obteniendo suscripción de MercadoPago', {
        subscriptionId,
        error: error.message
      })
      return null
    }
  }

  /**
   * Busca pagos usando múltiples estrategias para encontrar pagos relacionados con suscripciones
   */
  async getPaymentByExternalReference(externalReference: string, subscriptionData?: any): Promise<any | null> {
    try {
      logger.info(LogCategory.SUBSCRIPTION, 'Iniciando búsqueda de pago con múltiples estrategias', {
        externalReference,
        isTestMode: this.isTestMode,
        hasSubscriptionData: !!subscriptionData
      })

      // Estrategia 1: Búsqueda directa por external_reference
      let payment = await this.searchByExternalReference(externalReference)
      if (payment) {
        logger.info(LogCategory.SUBSCRIPTION, 'Pago encontrado - Estrategia 1: external_reference directo', {
          paymentId: payment.id,
          status: payment.status
        })
        return payment
      }

      // Si tenemos datos de suscripción, usar estrategias adicionales
      if (subscriptionData) {
        // Estrategia 2: Buscar por user_id y monto en rango de fechas
        payment = await this.searchByUserAndAmount(subscriptionData)
        if (payment) {
          logger.info(LogCategory.SUBSCRIPTION, 'Pago encontrado - Estrategia 2: user_id y monto', {
            paymentId: payment.id,
            status: payment.status
          })
          return payment
        }

        // Estrategia 3: Buscar por email del cliente
        payment = await this.searchByCustomerEmail(subscriptionData)
        if (payment) {
          logger.info(LogCategory.SUBSCRIPTION, 'Pago encontrado - Estrategia 3: email del cliente', {
            paymentId: payment.id,
            status: payment.status
          })
          return payment
        }

        // Estrategia 4: Buscar por monto exacto en rango de fechas
        payment = await this.searchByAmountAndDate(subscriptionData)
        if (payment) {
          logger.info(LogCategory.SUBSCRIPTION, 'Pago encontrado - Estrategia 4: monto y fecha', {
            paymentId: payment.id,
            status: payment.status
          })
          return payment
        }

        // Estrategia 5: Buscar por product_id en external_reference
        payment = await this.searchByProductId(subscriptionData)
        if (payment) {
          logger.info(LogCategory.SUBSCRIPTION, 'Pago encontrado - Estrategia 5: product_id', {
            paymentId: payment.id,
            status: payment.status
          })
          return payment
        }
      }

      logger.warn(LogCategory.SUBSCRIPTION, 'No se encontró pago con ninguna estrategia', {
        externalReference,
        strategiesUsed: subscriptionData ? 7 : 1
      })
      return null

    } catch (error: any) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error en búsqueda de pago con múltiples estrategias', {
        externalReference,
        error: error.message
      })
      return null
    }
  }

  /**
   * Estrategia 1: Búsqueda directa por external_reference
   */
  private async searchByExternalReference(externalReference: string): Promise<any | null> {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${externalReference}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) return null

      const data = await response.json()
      if (!data.results || data.results.length === 0) return null

      const approvedPayments = data.results.filter((p: any) => p.status === 'approved')
      return approvedPayments.length > 0 ? approvedPayments[approvedPayments.length - 1] : data.results[data.results.length - 1]
    } catch (error) {
      return null
    }
  }

  /**
   * Estrategia 2: Buscar por Collection ID específico
   */
  private async searchByCollectionId(collectionId: string): Promise<any | null> {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${collectionId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) return null

      const payment = await response.json()
      return payment.status === 'approved' ? payment : null
    } catch (error) {
      return null
    }
  }

  /**
   * Estrategia 2: Buscar por user_id y monto en rango de fechas
   */
  private async searchByUserAndAmount(subscriptionData: any): Promise<any | null> {
    try {
      const customerData = JSON.parse(subscriptionData.customer_data || '{}')
      const email = customerData.email
      if (!email) return null

      const createdAt = new Date(subscriptionData.created_at)
      const startDate = new Date(createdAt.getTime() - 5 * 60 * 1000) // 5 minutos antes (más preciso)
      const endDate = new Date(createdAt.getTime() + 30 * 60 * 1000) // 30 minutos después (ventana más estrecha)

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?payer.email=${email}&begin_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      if (!data.results || data.results.length === 0) return null

      // Filtrar por monto aproximado
      const expectedAmount = parseFloat(subscriptionData.discounted_price || subscriptionData.base_price)
      const matchingPayments = data.results.filter((p: any) => {
        const paymentAmount = parseFloat(p.transaction_amount)
        return Math.abs(paymentAmount - expectedAmount) < 1 && p.status === 'approved'
      })

      return matchingPayments.length > 0 ? matchingPayments[matchingPayments.length - 1] : null
    } catch (error) {
      return null
    }
  }

  /**
   * Estrategia 5: Buscar por email del cliente
   */
  private async searchByCustomerEmail(subscriptionData: any): Promise<any | null> {
    try {
      const customerData = JSON.parse(subscriptionData.customer_data || '{}')
      const email = customerData.email
      if (!email) return null

      const createdAt = new Date(subscriptionData.created_at)
      const startDate = new Date(createdAt.getTime() - 24 * 60 * 60 * 1000) // 24 horas antes
      const endDate = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) // 24 horas después

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?payer.email=${email}&begin_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      if (!data.results || data.results.length === 0) return null

      // Buscar pagos aprobados recientes
      const approvedPayments = data.results.filter((p: any) => p.status === 'approved')
      return approvedPayments.length > 0 ? approvedPayments[approvedPayments.length - 1] : null
    } catch (error) {
      return null
    }
  }

  /**
   * Estrategia 6: Buscar por monto exacto en rango de fechas
   */
  private async searchByAmountAndDate(subscriptionData: any): Promise<any | null> {
    try {
      const expectedAmount = parseFloat(subscriptionData.discounted_price || subscriptionData.base_price)
      const createdAt = new Date(subscriptionData.created_at)
      const startDate = new Date(createdAt.getTime() - 4 * 60 * 60 * 1000) // 4 horas antes
      const endDate = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000) // 4 horas después

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?begin_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      if (!data.results || data.results.length === 0) return null

      // Filtrar por monto exacto
      const matchingPayments = data.results.filter((p: any) => {
        const paymentAmount = parseFloat(p.transaction_amount)
        return Math.abs(paymentAmount - expectedAmount) < 0.01 && p.status === 'approved'
      })

      return matchingPayments.length > 0 ? matchingPayments[matchingPayments.length - 1] : null
    } catch (error) {
      return null
    }
  }

  /**
   * Estrategia 7: Buscar por product_id en external_reference
   */
  private async searchByProductId(subscriptionData: any): Promise<any | null> {
    try {
      const productId = subscriptionData.product_id
      if (!productId) return null

      const createdAt = new Date(subscriptionData.created_at)
      const startDate = new Date(createdAt.getTime() - 6 * 60 * 60 * 1000) // 6 horas antes
      const endDate = new Date(createdAt.getTime() + 6 * 60 * 60 * 1000) // 6 horas después

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?begin_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      if (!data.results || data.results.length === 0) return null

      // Buscar pagos que contengan el product_id en su external_reference
      const matchingPayments = data.results.filter((p: any) => {
        return p.external_reference && p.external_reference.includes(productId.toString()) && p.status === 'approved'
      })

      return matchingPayments.length > 0 ? matchingPayments[matchingPayments.length - 1] : null
    } catch (error) {
      return null
    }
  }

  /**
   * Obtiene el estado de una suscripción por ID
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<any | null> {
    const subscription = await this.getSubscriptionFromMercadoPago(subscriptionId)
    return subscription
  }

  /**
   * Obtiene todas las suscripciones pendientes de la base de datos local
   */
  async getPendingSubscriptions(): Promise<LocalSubscription[]> {
    try {
      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'pending')
        .not('mercadopago_subscription_id', 'is', null)
        .order('created_at', { ascending: true })

      if (error) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error obteniendo suscripciones pendientes', {
          error: error.message
        })
        return []
      }

      logger.info(LogCategory.SUBSCRIPTION, 'Suscripciones pendientes obtenidas', {
        count: data?.length || 0
      })

      return data || []
    } catch (error: any) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error consultando suscripciones pendientes', {
        error: error.message
      })
      return []
    }
  }

  /**
   * Sincroniza una suscripción específica con MercadoPago
   */
  async syncSubscription(localSubscription: LocalSubscription): Promise<boolean> {
    try {
      logger.info(LogCategory.SUBSCRIPTION, 'Iniciando sincronización de suscripción', {
        subscriptionId: localSubscription.id,
        mercadopagoId: localSubscription.mercadopago_subscription_id,
        currentStatus: localSubscription.status
      })

      // Obtener datos actuales de MercadoPago
      const mpSubscription = await this.getSubscriptionFromMercadoPago(
        localSubscription.mercadopago_subscription_id
      )

      if (!mpSubscription) {
        logger.warn(LogCategory.SUBSCRIPTION, 'Suscripción no encontrada en MercadoPago, marcando como error', {
          subscriptionId: localSubscription.id,
          mercadopagoId: localSubscription.mercadopago_subscription_id
        })
        
        // Marcar como error en lugar de cancelar
        await this.updateLocalSubscriptionStatus(localSubscription.id, 'error', {
          error_reason: 'subscription_not_found_in_mercadopago',
          last_sync_at: new Date().toISOString()
        })
        
        return false
      }

      // Mapear estado de MercadoPago a estado local
      const newStatus = this.mapMercadoPagoStatusToLocal(mpSubscription.status)
      
      // Solo actualizar si el estado cambió
      if (newStatus !== localSubscription.status) {
        logger.info(LogCategory.SUBSCRIPTION, 'Estado de suscripción cambió, actualizando', {
          subscriptionId: localSubscription.id,
          oldStatus: localSubscription.status,
          newStatus,
          mpStatus: mpSubscription.status
        })

        const updateData: any = {
          status: newStatus,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Si se activa, configurar fechas de facturación
        if (newStatus === 'active' && localSubscription.status === 'pending') {
          updateData.activated_at = new Date().toISOString()
          
          if (mpSubscription.next_payment_date) {
            updateData.next_billing_date = mpSubscription.next_payment_date
          } else {
            // Calcular próxima fecha de facturación (30 días por defecto)
            const nextBilling = new Date()
            nextBilling.setDate(nextBilling.getDate() + 30)
            updateData.next_billing_date = nextBilling.toISOString()
          }

          // Crear registro de facturación inicial
          await this.createInitialBillingRecord(localSubscription.id, mpSubscription)
        }

        await this.updateLocalSubscriptionStatus(localSubscription.id, newStatus, updateData)
        
        // Log de activación exitosa
        if (newStatus === 'active') {
          logger.info(LogCategory.SUBSCRIPTION, '🎉 Suscripción activada automáticamente', {
            subscriptionId: localSubscription.id,
            mercadopagoId: localSubscription.mercadopago_subscription_id,
            externalReference: mpSubscription.external_reference,
            userId: localSubscription.user_id
          })
        }

        return true
      } else {
        // Actualizar solo la fecha de sincronización
        await this.updateLocalSubscriptionStatus(localSubscription.id, newStatus, {
          last_sync_at: new Date().toISOString()
        })
        
        logger.info(LogCategory.SUBSCRIPTION, 'Suscripción ya está sincronizada', {
          subscriptionId: localSubscription.id,
          status: newStatus
        })
        
        return true
      }
    } catch (error: any) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error sincronizando suscripción', {
        subscriptionId: localSubscription.id,
        error: error.message
      })
      return false
    }
  }

  /**
   * Sincroniza todas las suscripciones pendientes
   */
  async syncAllPendingSubscriptions(): Promise<{ synced: number; errors: number; total: number }> {
    const startTime = Date.now()
    
    logger.info(LogCategory.SUBSCRIPTION, '🔄 Iniciando sincronización masiva de suscripciones pendientes')

    const pendingSubscriptions = await this.getPendingSubscriptions()
    
    if (pendingSubscriptions.length === 0) {
      logger.info(LogCategory.SUBSCRIPTION, 'No hay suscripciones pendientes para sincronizar')
      return { synced: 0, errors: 0, total: 0 }
    }

    let synced = 0
    let errors = 0

    for (const subscription of pendingSubscriptions) {
      try {
        const success = await this.syncSubscription(subscription)
        if (success) {
          synced++
        } else {
          errors++
        }
        
        // Pequeña pausa para no sobrecargar la API de MercadoPago
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error: any) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error procesando suscripción individual', {
          subscriptionId: subscription.id,
          error: error.message
        })
        errors++
      }
    }

    const duration = Date.now() - startTime
    
    logger.info(LogCategory.SUBSCRIPTION, '✅ Sincronización masiva completada', {
      total: pendingSubscriptions.length,
      synced,
      errors,
      duration: `${duration}ms`
    })

    return { synced, errors, total: pendingSubscriptions.length }
  }

  /**
   * Obtiene suscripciones que han estado pendientes por más de X minutos
   */
  async getStaleSubscriptions(minutesThreshold: number = 10): Promise<LocalSubscription[]> {
    try {
      const thresholdDate = new Date()
      thresholdDate.setMinutes(thresholdDate.getMinutes() - minutesThreshold)

      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'pending')
        .not('mercadopago_subscription_id', 'is', null)
        .lt('created_at', thresholdDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error obteniendo suscripciones obsoletas', {
          error: error.message,
          minutesThreshold
        })
        return []
      }

      logger.info(LogCategory.SUBSCRIPTION, 'Suscripciones obsoletas obtenidas', {
        count: data?.length || 0,
        minutesThreshold
      })

      return data || []
    } catch (error: any) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error consultando suscripciones obsoletas', {
        error: error.message,
        minutesThreshold
      })
      return []
    }
  }

  /**
   * Sincroniza solo suscripciones que han estado pendientes por mucho tiempo
   */
  async syncStaleSubscriptions(minutesThreshold: number = 10): Promise<{ synced: number; errors: number; total: number }> {
    const startTime = Date.now()
    
    logger.info(LogCategory.SUBSCRIPTION, '🔄 Iniciando sincronización de suscripciones obsoletas', {
      minutesThreshold
    })

    const staleSubscriptions = await this.getStaleSubscriptions(minutesThreshold)
    
    if (staleSubscriptions.length === 0) {
      logger.info(LogCategory.SUBSCRIPTION, 'No hay suscripciones obsoletas para sincronizar')
      return { synced: 0, errors: 0, total: 0 }
    }

    let synced = 0
    let errors = 0

    for (const subscription of staleSubscriptions) {
      try {
        const success = await this.syncSubscription(subscription)
        if (success) {
          synced++
        } else {
          errors++
        }
        
        // Pausa más corta para suscripciones críticas
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error: any) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error procesando suscripción obsoleta', {
          subscriptionId: subscription.id,
          error: error.message
        })
        errors++
      }
    }

    const duration = Date.now() - startTime
    
    logger.info(LogCategory.SUBSCRIPTION, '✅ Sincronización de suscripciones obsoletas completada', {
      total: staleSubscriptions.length,
      synced,
      errors,
      duration: `${duration}ms`,
      minutesThreshold
    })

    return { synced, errors, total: staleSubscriptions.length }
  }

  /**
   * Mapea estados de MercadoPago a estados locales
   */
  private mapMercadoPagoStatusToLocal(mpStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'authorized': 'active',
      'approved': 'active', 
      'active': 'active',
      'pending': 'pending',
      'cancelled': 'cancelled',
      'paused': 'paused',
      'expired': 'expired'
    }
    
    return statusMap[mpStatus] || 'pending'
  }

  /**
   * Actualiza el estado de una suscripción local
   */
  private async updateLocalSubscriptionStatus(
    subscriptionId: number, 
    status: string, 
    additionalData: any = {}
  ): Promise<void> {
    const { error } = await this.supabase
      .from('unified_subscriptions')
      .update({
        status,
        ...additionalData
      })
      .eq('id', subscriptionId)

    if (error) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error actualizando estado de suscripción', {
        subscriptionId,
        status,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Crea un registro inicial de facturación cuando se activa una suscripción
   */
  private async createInitialBillingRecord(
    subscriptionId: number, 
    mpSubscription: MercadoPagoSubscription
  ): Promise<void> {
    try {
      const billingData = {
        subscription_id: subscriptionId,
        billing_date: new Date().toISOString(),
        amount: mpSubscription.auto_recurring?.transaction_amount || 0,
        currency: mpSubscription.auto_recurring?.currency_id || 'MXN',
        status: 'completed',
        mercadopago_payment_id: null,
        created_at: new Date().toISOString(),
        notes: 'Registro inicial de activación automática'
      }

      const { error } = await this.supabase
        .from('subscription_billing_history')
        .insert([billingData])

      if (error) {
        logger.warn(LogCategory.SUBSCRIPTION, 'Error creando registro de facturación inicial', {
          subscriptionId,
          error: error.message
        })
        // No fallar la sincronización por esto
      } else {
        logger.info(LogCategory.SUBSCRIPTION, 'Registro de facturación inicial creado', {
          subscriptionId
        })
      }
    } catch (error: any) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Error en creación de registro de facturación', {
        subscriptionId,
        error: error.message
      })
    }
  }

  /**
   * Verifica el estado de una suscripción específica
   */
  async verifySubscriptionStatus(subscriptionId: number): Promise<{
    success: boolean
    currentStatus: string
    mpStatus?: string
    updated: boolean
  }> {
    try {
      // Obtener suscripción local
      const { data: localSub, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single()

      if (error || !localSub) {
        return { success: false, currentStatus: 'not_found', updated: false }
      }

      if (!localSub.mercadopago_subscription_id) {
        return { success: false, currentStatus: localSub.status, updated: false }
      }

      // Sincronizar con MercadoPago
      const syncResult = await this.syncSubscription(localSub)
      
      // Obtener estado actualizado
      const { data: updatedSub } = await this.supabase
        .from('unified_subscriptions')
        .select('status')
        .eq('id', subscriptionId)
        .single()

      return {
        success: syncResult,
        currentStatus: updatedSub?.status || localSub.status,
        updated: syncResult && updatedSub?.status !== localSub.status
      }
    } catch (error: any) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error verificando estado de suscripción', {
        subscriptionId,
        error: error.message
      })
      return { success: false, currentStatus: 'error', updated: false }
    }
  }
}