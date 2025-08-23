import { createServiceClient } from '@/lib/supabase/service'
import logger from '@/lib/logger'
import webhookMonitor from '@/lib/webhook-monitor'
import notificationService from '@/lib/notification-service'

interface AutoSyncResult {
  success: boolean
  orderId?: number
  paymentId?: string
  action: string
  details?: any
  error?: string
}

class AutoSyncService {
  private mercadoPagoToken: string
  private isRunning: boolean = false
  private syncQueue: Set<number> = new Set()
  private lastSyncTime: Date = new Date()

  constructor() {
    this.mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ''
  }

  // Sincronización automática inmediata cuando falla un webhook
  async autoSyncOnWebhookFailure(paymentId: string, externalReference?: string): Promise<AutoSyncResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Iniciando auto-sincronización por fallo de webhook', 'AUTO_SYNC', {
        paymentId,
        externalReference
      })

      // Obtener datos del pago desde MercadoPago
      const paymentData = await this.getPaymentFromMercadoPago(paymentId)
      if (!paymentData) {
        return {
          success: false,
          action: 'get_payment_data',
          error: 'No se pudieron obtener datos del pago desde MercadoPago'
        }
      }

      // Buscar la orden correspondiente
      const orderId = externalReference || paymentData.external_reference
      if (!orderId) {
        logger.warn('Pago sin external_reference - no se puede auto-sincronizar', 'AUTO_SYNC', {
          paymentId,
          paymentStatus: paymentData.status
        })
        return {
          success: true,
          action: 'skip_no_reference',
          details: 'Pago sin external_reference'
        }
      }

      // Sincronizar la orden
      const syncResult = await this.syncOrderWithPayment(parseInt(orderId), paymentData)
      
      const duration = Date.now() - startTime
      logger.info('Auto-sincronización completada', 'AUTO_SYNC', {
        paymentId,
        orderId,
        success: syncResult.success,
        duration
      })

      return syncResult

    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error en auto-sincronización', 'AUTO_SYNC', {
        paymentId,
        externalReference,
        error: error.message,
        duration
      })
      
      return {
        success: false,
        action: 'auto_sync_error',
        error: error.message
      }
    }
  }

  // Validación proactiva de una orden específica
  async validateOrderPayment(orderId: number): Promise<AutoSyncResult> {
    try {
      const supabase = createServiceClient()
      
      // Obtener información de la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        return {
          success: false,
          orderId,
          action: 'order_not_found',
          error: 'Orden no encontrada'
        }
      }

      // Si ya tiene payment ID, verificar que esté actualizado
      if (order.mercadopago_payment_id) {
        const isValid = await this.validateExistingPayment(order)
        if (isValid) {
          return {
            success: true,
            orderId,
            paymentId: order.mercadopago_payment_id,
            action: 'already_synced',
            details: 'Orden ya sincronizada correctamente'
          }
        }
      }

      // Buscar pagos en MercadoPago para esta orden
      const payments = await this.searchPaymentsForOrder(order)
      
      if (payments.length === 0) {
        // No hay pagos, verificar si la orden es muy reciente
        const orderAge = Date.now() - new Date(order.created_at).getTime()
        if (orderAge < 5 * 60 * 1000) { // Menos de 5 minutos
          return {
            success: true,
            orderId,
            action: 'order_too_recent',
            details: 'Orden muy reciente, esperando pago'
          }
        }
        
        return {
          success: false,
          orderId,
          action: 'no_payment_found',
          error: 'No se encontraron pagos para esta orden'
        }
      }

      // Seleccionar el mejor pago y sincronizar
      const bestPayment = this.selectBestPayment(payments)
      const syncResult = await this.syncOrderWithPayment(orderId, bestPayment)
      
      return syncResult

    } catch (error) {
      logger.error('Error validando pago de orden', 'AUTO_SYNC', {
        orderId,
        error: error.message
      })
      
      return {
        success: false,
        orderId,
        action: 'validation_error',
        error: error.message
      }
    }
  }

  // Sincronización masiva de órdenes pendientes
  async syncPendingOrders(maxAge: number = 24): Promise<{
    totalProcessed: number
    successful: number
    failed: number
    results: AutoSyncResult[]
  }> {
    if (this.isRunning) {
      logger.warn('Auto-sincronización ya en progreso', 'AUTO_SYNC')
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: []
      }
    }

    this.isRunning = true
    const startTime = Date.now()
    
    try {
      logger.info('Iniciando sincronización masiva de órdenes pendientes', 'AUTO_SYNC', {
        maxAge
      })

      const supabase = createServiceClient()
      
      // Buscar órdenes que necesitan sincronización
      const cutoffDate = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString()
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .or('mercadopago_payment_id.is.null,payment_status.eq.pending')
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(50) // Procesar máximo 50 órdenes por vez

      if (error) {
        throw new Error(`Error obteniendo órdenes: ${error.message}`)
      }

      const results: AutoSyncResult[] = []
      let successful = 0
      let failed = 0

      for (const order of orders || []) {
        try {
          const result = await this.validateOrderPayment(order.id)
          results.push(result)
          
          if (result.success) {
            successful++
          } else {
            failed++
          }
          
          // Pequeña pausa entre órdenes para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          failed++
          results.push({
            success: false,
            orderId: order.id,
            action: 'processing_error',
            error: error.message
          })
        }
      }

      const duration = Date.now() - startTime
      logger.info('Sincronización masiva completada', 'AUTO_SYNC', {
        totalProcessed: results.length,
        successful,
        failed,
        duration
      })

      // Enviar notificaciones si hay problemas críticos
      if (failed > 0) {
        const failureRate = (failed / results.length) * 100
        
        if (failureRate > 50) {
          // Más del 50% de fallos - crítico
          await notificationService.sendNotification({
            type: 'sync_failure',
            severity: 'critical',
            title: 'Fallo Crítico en Sincronización Masiva',
            message: `${failed} de ${results.length} órdenes fallaron en sincronización (${failureRate.toFixed(1)}%). Requiere atención inmediata.`,
            data: {
              totalProcessed: results.length,
              successful,
              failed,
              failureRate,
              failedOrders: results.filter(r => !r.success).slice(0, 10) // Primeras 10 órdenes fallidas
            }
          })
        } else if (failed > 5) {
          // Más de 5 fallos - alerta
          await notificationService.sendNotification({
            type: 'sync_failure',
            severity: 'medium',
            title: 'Múltiples Fallos en Sincronización',
            message: `${failed} órdenes fallaron en sincronización automática. Revisar logs para más detalles.`,
            data: {
              totalProcessed: results.length,
              successful,
              failed,
              failedOrders: results.filter(r => !r.success).slice(0, 5)
            }
          })
        }
      }

      this.lastSyncTime = new Date()
      
      return {
        totalProcessed: results.length,
        successful,
        failed,
        results
      }

    } catch (error) {
      logger.error('Error en sincronización masiva', 'AUTO_SYNC', {
        error: error.message
      })
      
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 1,
        results: [{
          success: false,
          action: 'mass_sync_error',
          error: error.message
        }]
      }
    } finally {
      this.isRunning = false
    }
  }

  // Obtener datos de pago desde MercadoPago
  private async getPaymentFromMercadoPago(paymentId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.mercadoPagoToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      logger.error('Error obteniendo pago desde MercadoPago', 'AUTO_SYNC', {
        paymentId,
        error: error.message
      })
      return null
    }
  }

  // Buscar pagos para una orden específica
  private async searchPaymentsForOrder(order: any): Promise<any[]> {
    const payments = []
    
    try {
      // Método 1: Buscar por external_reference
      if (order.id) {
        const searchByRef = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.mercadoPagoToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (searchByRef.ok) {
          const refData = await searchByRef.json()
          if (refData.results) {
            payments.push(...refData.results)
          }
        }
      }

      // Método 2: Buscar por email y monto en rango de fechas
      if (order.customer_email && payments.length === 0) {
        const orderDate = new Date(order.created_at)
        const startDate = new Date(orderDate.getTime() - 24 * 60 * 60 * 1000)
        const endDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000)
        
        const searchByEmail = await fetch(
          `https://api.mercadopago.com/v1/payments/search?payer.email=${order.customer_email}&begin_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
          {
            headers: {
              'Authorization': `Bearer ${this.mercadoPagoToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (searchByEmail.ok) {
          const emailData = await searchByEmail.json()
          if (emailData.results) {
            // Filtrar por monto similar
            const similarPayments = emailData.results.filter((payment: any) => 
              Math.abs(payment.transaction_amount - order.total) <= 5
            )
            payments.push(...similarPayments)
          }
        }
      }

    } catch (error) {
      logger.error('Error buscando pagos para orden', 'AUTO_SYNC', {
        orderId: order.id,
        error: error.message
      })
    }

    return payments
  }

  // Seleccionar el mejor pago de una lista
  private selectBestPayment(payments: any[]): any {
    // Prioridad: approved > pending > otros estados
    const approvedPayments = payments.filter(p => p.status === 'approved')
    if (approvedPayments.length > 0) {
      return approvedPayments[0]
    }

    const pendingPayments = payments.filter(p => p.status === 'pending')
    if (pendingPayments.length > 0) {
      return pendingPayments[0]
    }

    return payments[0] // Cualquier pago
  }

  // Sincronizar orden con datos de pago
  private async syncOrderWithPayment(orderId: number, paymentData: any): Promise<AutoSyncResult> {
    try {
      const supabase = createServiceClient()
      
      // Mapear estado del pago
      const orderStatus = this.mapPaymentStatusToOrderStatus(paymentData.status)
      
      const updateData = {
        mercadopago_payment_id: paymentData.id.toString(),
        payment_status: paymentData.status,
        status: orderStatus,
        updated_at: new Date().toISOString(),
        payment_type: paymentData.payment_type_id,
        payment_method: paymentData.payment_method_id,
        external_reference: paymentData.external_reference || orderId.toString(),
        collection_id: paymentData.id.toString(),
        site_id: paymentData.currency_id === 'MXN' ? 'MLM' : 'MLA',
        processing_mode: 'aggregator'
      }

      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        updateData.confirmed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) {
        throw new Error(`Error actualizando orden: ${error.message}`)
      }

      logger.info('Orden sincronizada automáticamente', 'AUTO_SYNC', {
        orderId,
        paymentId: paymentData.id,
        paymentStatus: paymentData.status,
        orderStatus
      })

      // Enviar email de agradecimiento si el pago fue aprobado
      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        try {
          // Obtener la orden actualizada para el email
          const { data: updatedOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()
          
          if (updatedOrder) {
            await this.sendThankYouEmailForAutoSync(updatedOrder, paymentData)
          }
        } catch (emailError) {
          logger.warn('Error enviando email de agradecimiento en auto-sync', 'AUTO_SYNC', {
            orderId,
            paymentId: paymentData.id,
            error: emailError.message
          })
        }
      }

      return {
        success: true,
        orderId,
        paymentId: paymentData.id.toString(),
        action: 'order_synced',
        details: {
          paymentStatus: paymentData.status,
          orderStatus,
          amount: paymentData.transaction_amount
        }
      }

    } catch (error) {
      logger.error('Error sincronizando orden con pago', 'AUTO_SYNC', {
        orderId,
        paymentId: paymentData.id,
        error: error.message
      })
      
      return {
        success: false,
        orderId,
        paymentId: paymentData.id?.toString(),
        action: 'sync_error',
        error: error.message
      }
    }
  }

  // Validar que un pago existente esté actualizado
  private async validateExistingPayment(order: any): Promise<boolean> {
    try {
      const paymentData = await this.getPaymentFromMercadoPago(order.mercadopago_payment_id)
      if (!paymentData) {
        return false
      }

      // Verificar que los estados coincidan
      const expectedOrderStatus = this.mapPaymentStatusToOrderStatus(paymentData.status)
      
      return order.payment_status === paymentData.status && 
             order.status === expectedOrderStatus
             
    } catch (error) {
      return false
    }
  }

  // Mapear estado de pago a estado de orden
  private mapPaymentStatusToOrderStatus(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'approved':
      case 'paid':
        return 'confirmed'
      case 'pending':
      case 'in_process':
        return 'pending_payment'
      case 'cancelled':
      case 'rejected':
        return 'cancelled'
      case 'refunded':
        return 'refunded'
      default:
        return 'pending'
    }
  }

  // Enviar email de agradecimiento para auto-sync
  private async sendThankYouEmailForAutoSync(order: any, paymentData: any): Promise<void> {
    try {
      const nodemailer = require('nodemailer')
      
      // Configurar transportador SMTP
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })

      const customerEmail = order.customer_email || paymentData.payer?.email
      
      if (!customerEmail) {
        logger.warn('No se pudo obtener email del cliente para agradecimiento auto-sync', 'AUTO_SYNC', {
          orderId: order.id,
          paymentId: paymentData.id
        })
        return
      }

      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin-bottom: 10px;">🎉 ¡Gracias por tu compra!</h1>
            <p style="color: #64748b; font-size: 16px;">Tu pago ha sido confirmado exitosamente</p>
          </div>
          
          <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #16a34a;">
            <h3 style="color: #1e293b; margin-top: 0;">📦 Detalles del pedido</h3>
            <ul style="color: #475569; line-height: 1.6;">
              <li><strong>Número de pedido:</strong> ${order.id}</li>
              <li><strong>Monto pagado:</strong> $${paymentData.transaction_amount} ${paymentData.currency_id}</li>
              <li><strong>Método de pago:</strong> ${paymentData.payment_method_id}</li>
              <li><strong>Fecha de pago:</strong> ${new Date(paymentData.date_created).toLocaleDateString('es-MX')}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #475569; margin-bottom: 20px;">¡Gracias por confiar en Pet Gourmet! Procesaremos tu pedido pronto.</p>
            <a href="https://petgourmet.mx/perfil" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mis pedidos</a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">Pet Gourmet - Nutrición premium para tu mascota</p>
          </div>
        </div>
      `

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
        to: customerEmail,
        subject: '🎉 ¡Gracias por tu compra! Pago confirmado - Pet Gourmet',
        html: emailTemplate
      })

      logger.info('Email de agradecimiento enviado desde auto-sync', 'AUTO_SYNC', {
        orderId: order.id,
        paymentId: paymentData.id,
        customerEmail
      })

    } catch (error) {
      logger.error('Error enviando email de agradecimiento desde auto-sync', 'AUTO_SYNC', {
        orderId: order.id,
        paymentId: paymentData.id,
        error: error.message
      })
    }
  }

  // Obtener estadísticas del servicio
  getStats(): {
    isRunning: boolean
    lastSyncTime: Date
    queueSize: number
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      queueSize: this.syncQueue.size
    }
  }
}

// Instancia singleton
const autoSyncService = new AutoSyncService()

export default autoSyncService
export type { AutoSyncResult }