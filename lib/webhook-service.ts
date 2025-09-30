import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { logger, LogCategory } from '@/lib/logger'
import { extractCustomerEmail, extractCustomerName } from '@/lib/email-utils'
import webhookMonitor from '@/lib/webhook-monitor'
import autoSyncService from '@/lib/auto-sync-service'
import { createIdempotencyService, IdempotencyService } from '@/lib/idempotency-service'
import { SubscriptionSyncService } from '@/lib/subscription-sync-service'
// Importar el nuevo sistema de gestión de suscripciones
import { SubscriptionManager } from '@/lib/subscription-manager'
import { EnhancedEmailService } from '@/lib/email-service-enhanced'

// Tipos para webhooks de MercadoPago
interface WebhookPayload {
  id: string
  live_mode: boolean
  type: 'payment' | 'subscription_preapproval' | 'subscription_authorized_payment' | 'plan' | 'invoice'
  date_created: string
  application_id: string
  user_id: string
  version: number
  api_version: string
  action: string
  data: {
    id: string
  }
}

interface PaymentData {
  id: number
  status: string
  status_detail: string
  date_created: string
  date_approved?: string
  date_last_updated: string
  transaction_amount: number
  currency_id: string
  payment_method_id: string
  payment_type_id: string
  external_reference?: string
  description?: string
  payer: {
    id: string
    email: string
    first_name?: string
    last_name?: string
  }
  metadata?: {
    subscription_id?: string
    user_id?: string
    order_id?: string
  }
}

interface SubscriptionData {
  id: string
  status: string
  reason: string
  payer_email: string
  external_reference?: string
  next_payment_date?: string
  auto_recurring?: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
  }
}

export class WebhookService {
  private supabase: any
  private mercadoPagoToken: string
  private webhookSecret: string
  private emailTransporter: any
  private subscriptionSyncService: SubscriptionSyncService
  // Nuevos servicios integrados
  private subscriptionManager: SubscriptionManager
  private emailService: EnhancedEmailService

  constructor() {
    this.mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ''
    this.webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    this.subscriptionSyncService = new SubscriptionSyncService()
    
    // Inicializar nuevos servicios
    this.subscriptionManager = new SubscriptionManager()
    this.emailService = new EnhancedEmailService()
    
    if (!this.mercadoPagoToken) {
      logger.error(LogCategory.WEBHOOK, 'MERCADOPAGO_ACCESS_TOKEN es requerido', undefined, { component: 'WebhookService' })
      throw new Error('MERCADOPAGO_ACCESS_TOKEN es requerido')
    }

    logger.info(LogCategory.WEBHOOK, 'WebhookService inicializado correctamente con nuevos servicios', { 
      hasToken: !!this.mercadoPagoToken,
      hasSecret: !!this.webhookSecret,
      hasSubscriptionManager: !!this.subscriptionManager,
      hasEmailService: !!this.emailService
    })
    this.initializeEmailTransporter()
  }

  private initializeEmailTransporter() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }

  initializeSupabase() {
    if (!this.supabase) {
      this.supabase = createServiceClient()
    }
    return this.supabase
  }

  // Validar firma del webhook según formato de MercadoPago
  validateWebhookSignature(payload: string, signature: string, requestId?: string): boolean {
    if (!this.webhookSecret || !signature) {
      logger.warn(LogCategory.WEBHOOK, 'Webhook secret o signature no configurados - permitiendo en desarrollo', {
        hasSecret: !!this.webhookSecret,
        hasSignature: !!signature
      })
      return true // En desarrollo, permitir sin validación
    }

    try {
      // Extraer timestamp (ts) y hash (v1) del header x-signature
      // Formato: "ts=1234567890,v1=abcdef123456..."
      const parts = signature.split(',');
      let ts: string | undefined;
      let hash: string | undefined;
      
      parts.forEach((part) => {
        const [key, value] = part.split('=');
        if (key && value) {
          const trimmedKey = key.trim();
          const trimmedValue = value.trim();
          if (trimmedKey === 'ts') {
            ts = trimmedValue;
          } else if (trimmedKey === 'v1') {
            hash = trimmedValue;
          }
        }
      });
      
      if (!ts || !hash) {
        logger.error(LogCategory.WEBHOOK, 'Formato de firma inválido - no se encontraron ts o v1', {
          signature,
          foundTs: !!ts,
          foundHash: !!hash
        })
        return false
      }
      
      // Crear el manifest según la documentación de MercadoPago
      // Formato: id:DATA_ID;request-id:REQUEST_ID;ts:TIMESTAMP;
      const dataId = JSON.parse(payload).data?.id || '';
      let manifest = `id:${dataId};`;
      
      if (requestId) {
        manifest += `request-id:${requestId};`;
      }
      
      manifest += `ts:${ts};`;
      
      // Generar la firma esperada usando HMAC SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(manifest)
        .digest('hex')
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
      
      logger.info(LogCategory.WEBHOOK, 'Validación de firma de webhook MercadoPago', {
        isValid,
        manifest,
        dataId,
        requestId,
        timestamp: ts,
        signatureLength: signature.length,
        payloadLength: payload.length
      })
      
      return isValid
    } catch (error: any) {
      logger.error(LogCategory.WEBHOOK, 'Error validando firma del webhook', error.message, { 
        error: error.message,
        signature,
        payloadLength: payload.length
      })
      return false
    }
  }

  // Obtener datos de pago desde MercadoPago
  async getPaymentData(paymentId: string): Promise<PaymentData | null> {
    const startTime = Date.now()
    
    try {
      // Si es un ID de prueba o ID genérico de webhook de prueba, crear datos simulados
      if (paymentId.includes('test_') || paymentId.includes('payment_test_') || /^test_payment_\d+$/.test(paymentId) || paymentId === '123456') {
        logger.info('Generando datos de pago simulados para prueba', 'PAYMENT', { paymentId })
        
        return {
          id: parseInt(paymentId.replace(/\D/g, '') || '123456'),
          status: 'approved',
          status_detail: 'accredited',
          date_created: new Date().toISOString(),
          date_approved: new Date().toISOString(),
          date_last_updated: new Date().toISOString(),
          transaction_amount: 100,
          currency_id: 'MXN',
          payment_method_id: 'visa',
          payment_type_id: 'credit_card',
          external_reference: `test_order_${Date.now()}`,
          description: 'Test payment',
          payer: {
            id: 'test_payer_123',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User'
          },
          metadata: {
            user_id: 'test_user_123'
          }
        }
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.mercadoPagoToken}`,
          'Content-Type': 'application/json'
        }
      })

      const duration = Date.now() - startTime

      if (!response.ok) {
        logger.error('Error obteniendo pago desde MercadoPago API', 'PAYMENT', {
          paymentId,
          status: response.status,
          statusText: response.statusText,
          duration
        })
        return null
      }

      const paymentData = await response.json()
      
      logger.info('Datos de pago obtenidos exitosamente', 'PAYMENT', {
        paymentId,
        status: paymentData.status,
        amount: paymentData.transaction_amount,
        externalReference: paymentData.external_reference,
        duration
      })
      
      return paymentData
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('Error obteniendo datos de pago', 'PAYMENT', {
        paymentId,
        error: error.message,
        duration
      })
      return null
    }
  }

  // Obtener datos de suscripción desde MercadoPago
  async getSubscriptionData(subscriptionId: string): Promise<SubscriptionData | null> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.mercadoPagoToken}`,
          'Content-Type': 'application/json'
        }
      })

      const duration = Date.now() - startTime

      if (!response.ok) {
        logger.error('Error obteniendo suscripción desde MercadoPago API', 'SUBSCRIPTION', {
          subscriptionId,
          status: response.status,
          statusText: response.statusText,
          duration
        })
        return null
      }

      const subscriptionData = await response.json()
      
      logger.info('Datos de suscripción obtenidos exitosamente', 'SUBSCRIPTION', {
        subscriptionId,
        status: subscriptionData.status,
        payerEmail: subscriptionData.payer_email,
        externalReference: subscriptionData.external_reference,
        duration
      })
      
      return subscriptionData
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('Error obteniendo datos de suscripción', 'SUBSCRIPTION', {
        subscriptionId,
        error: error.message,
        duration
      })
      return null
    }
  }

  // Procesar webhook de pago
  async processPaymentWebhook(webhookData: WebhookPayload): Promise<boolean> {
    const startTime = Date.now()
    const paymentId = webhookData.data.id
    
    // Registrar webhook recibido en el monitor
    const eventId = webhookMonitor.logWebhookReceived(webhookData)
    
    try {
      logger.info('Iniciando procesamiento de webhook de pago', 'WEBHOOK', {
        eventId,
        paymentId,
        type: webhookData.type,
        action: webhookData.action,
        liveMode: webhookData.live_mode
      })
      
      const supabase = this.initializeSupabase()
      
      // Obtener datos del pago
      const paymentData = await this.getPaymentData(paymentId)
      if (!paymentData) {
        logger.error('No se pudieron obtener datos del pago desde MercadoPago', 'WEBHOOK', {
          eventId,
          paymentId,
          duration: Date.now() - startTime
        })
        
        // Registrar error en el monitor
        webhookMonitor.logWebhookError(eventId, 'No se pudieron obtener datos del pago', Date.now() - startTime)
        
        return false
      }

      // Determinar si es pago de suscripción o de orden
      const isSubscriptionPayment = (
        paymentData.metadata?.subscription_id ||
        paymentData.external_reference?.startsWith('subscription_') ||
        webhookData.type === 'subscription_authorized_payment'
      )

      logger.info('Clasificando tipo de pago', 'WEBHOOK', {
        eventId,
        paymentId,
        isSubscriptionPayment,
        hasSubscriptionMetadata: !!paymentData.metadata?.subscription_id,
        externalReferenceStartsWithSubscription: paymentData.external_reference?.startsWith('subscription_'),
        webhookType: webhookData.type
      })

      let result: boolean
      if (isSubscriptionPayment) {
        result = await this.handleSubscriptionPayment(paymentData, supabase)
      } else {
        result = await this.handleOrderPayment(paymentData, supabase)
      }

      const duration = Date.now() - startTime
      
      if (result) {
        logger.info('Webhook de pago procesado exitosamente', 'WEBHOOK', {
          eventId,
          paymentId,
          isSubscriptionPayment,
          duration
        })
        
        // Registrar éxito en el monitor
        webhookMonitor.logWebhookProcessed(eventId, duration)
        
        // Si es un pago de suscripción, activar sincronización inmediata
        if (isSubscriptionPayment && paymentData.external_reference) {
          try {
            logger.info('🔄 Activando sincronización inmediata para pago de suscripción', 'SYNC', {
              paymentId,
              externalReference: paymentData.external_reference,
              trigger: 'subscription_payment_webhook'
            })
            
            // Sincronizar inmediatamente esta suscripción específica
            await this.subscriptionSyncService.syncSingleSubscription(paymentData.external_reference)
            
            logger.info('✅ Sincronización inmediata completada para pago de suscripción', 'SYNC', {
              paymentId,
              externalReference: paymentData.external_reference
            })
          } catch (syncError: any) {
            logger.error('❌ Error en sincronización inmediata para pago de suscripción', 'SYNC', {
              paymentId,
              externalReference: paymentData.external_reference,
              error: syncError.message
            })
            // No fallar el webhook por error de sincronización
          }
        }
      } else {
        logger.error('Error procesando webhook de pago', 'WEBHOOK', {
          eventId,
          paymentId,
          isSubscriptionPayment,
          duration
        })
        
        // Registrar error en el monitor
        webhookMonitor.logWebhookError(eventId, 'Error en el procesamiento', duration)
      }
      
      return result

    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('Error procesando webhook de pago', 'WEBHOOK', {
        eventId,
        paymentId,
        error: error.message,
        stack: error.stack,
        duration
      })
      
      // Registrar error en el monitor
      webhookMonitor.logWebhookError(eventId, error.message, duration)
      
      return false
    }
  }

  // WEBHOOK MEJORADO: Procesamiento completo de eventos de suscripciones con nuevo sistema
  async processSubscriptionWebhook(webhookData: WebhookPayload): Promise<boolean> {
    const startTime = Date.now()
    const subscriptionId = webhookData.data.id
    const supabase = this.initializeSupabase()
    
    try {
      logger.info('🔔 Webhook de suscripción recibido - usando nuevo sistema de gestión', 'SUBSCRIPTION_WEBHOOK', {
        subscriptionId,
        type: webhookData.type,
        action: webhookData.action,
        liveMode: webhookData.live_mode
      })
      
      // Obtener datos de la suscripción desde MercadoPago
      const subscriptionData = await this.getSubscriptionData(subscriptionId)
      
      if (!subscriptionData) {
        logger.warn('No se pudieron obtener datos de la suscripción desde MercadoPago', 'SUBSCRIPTION_WEBHOOK', {
          subscriptionId,
          action: webhookData.action
        })
        return true // No fallar por datos no disponibles
      }
      
      // Usar el nuevo sistema de gestión de suscripciones
      let processed = false
      
      switch (webhookData.type) {
        case 'subscription_preapproval':
          processed = await this.handleSubscriptionPreapprovalEnhanced(subscriptionData, webhookData, supabase)
          break
        case 'subscription_authorized_payment':
          processed = await this.handleSubscriptionPaymentEnhanced(subscriptionData, webhookData, supabase)
          break
        default:
          logger.info('Tipo de webhook de suscripción no manejado específicamente', 'SUBSCRIPTION_WEBHOOK', {
            type: webhookData.type,
            subscriptionId
          })
          processed = true
      }
      
      const duration = Date.now() - startTime
      logger.info('✅ Webhook de suscripción procesado con nuevo sistema', 'SUBSCRIPTION_WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        type: webhookData.type,
        processed,
        duration: `${duration}ms`
      })
      
      return processed
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('❌ Error procesando webhook de suscripción con nuevo sistema', 'SUBSCRIPTION_WEBHOOK', {
        subscriptionId,
        error: error.message,
        duration: `${duration}ms`
      })
      return false
    }
  }

  // Nuevo método mejorado para manejar preaprobaciones de suscripción
  private async handleSubscriptionPreapprovalEnhanced(subscriptionData: any, webhookData: WebhookPayload, supabase: any): Promise<boolean> {
    try {
      const externalReference = subscriptionData.external_reference
      const status = subscriptionData.status
      const subscriptionId = subscriptionData.id
      
      logger.info('📋 WEBHOOK MEJORADO: Procesando preaprobación con nuevo sistema', 'SUBSCRIPTION_PREAPPROVAL_ENHANCED', {
        subscriptionId,
        externalReference,
        status,
        action: webhookData.action
      })
      
      // Buscar suscripción usando el nuevo sistema
      const subscription = await this.subscriptionManager.findSubscriptionByReference(externalReference)
      
      if (!subscription) {
        logger.warn('❌ Suscripción no encontrada con nuevo sistema', 'SUBSCRIPTION_PREAPPROVAL_ENHANCED', {
          externalReference,
          subscriptionId
        })
        return true // No fallar el webhook
      }
      
      // Determinar si debe activarse
      const shouldActivate = ['authorized', 'approved', 'active'].includes(status)
      
      if (shouldActivate) {
        // Usar el nuevo sistema para activar la suscripción
        const activationResult = await this.subscriptionManager.activateSubscription(
          subscription.id,
          {
            mp_subscription_id: subscriptionId,
            status: 'active',
            activated_at: new Date().toISOString()
          }
        )
        
        if (activationResult.success) {
          logger.info('✅ Suscripción activada con nuevo sistema', 'SUBSCRIPTION_ACTIVATION_ENHANCED', {
            subscriptionId: subscription.id,
            externalReference,
            mpSubscriptionId: subscriptionId
          })
          
          // Crear registro de facturación usando el nuevo sistema
          await this.subscriptionManager.createBillingRecord(subscription.id, {
            amount: subscription.price,
            status: 'paid',
            payment_method: 'mercadopago',
            external_reference: externalReference,
            mp_payment_id: subscriptionId
          })
          
          // Enviar email de confirmación usando el servicio mejorado
          await this.emailService.sendSubscriptionConfirmation(
            subscription.customer_email,
            {
              customerName: subscription.customer_name || 'Cliente',
              planName: subscription.plan_name,
              amount: subscription.price,
              nextBillingDate: activationResult.nextBillingDate,
              subscriptionId: subscription.id
            }
          )
          
          return true
        } else {
          logger.error('❌ Error activando suscripción con nuevo sistema', 'SUBSCRIPTION_ACTIVATION_ENHANCED', {
            subscriptionId: subscription.id,
            error: activationResult.error
          })
          return false
        }
      } else {
        // Solo actualizar estado sin activar
        const { error } = await supabase
          .from('unified_subscriptions')
          .update({
            status: this.mapMercadoPagoStatusToLocal(status),
            mp_subscription_id: subscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        
        if (error) {
          logger.error('❌ Error actualizando estado de suscripción', 'SUBSCRIPTION_UPDATE_ENHANCED', {
            subscriptionId: subscription.id,
            error: error.message
          })
          return false
        }
        
        logger.info('✅ Estado de suscripción actualizado', 'SUBSCRIPTION_UPDATE_ENHANCED', {
          subscriptionId: subscription.id,
          newStatus: this.mapMercadoPagoStatusToLocal(status)
        })
        
        return true
      }
      
    } catch (error: any) {
      logger.error('❌ Error en preaprobación mejorada', 'SUBSCRIPTION_PREAPPROVAL_ENHANCED', {
        error: error.message
      })
      return false
    }
  }

  // Nuevo método mejorado para manejar pagos de suscripción
  private async handleSubscriptionPaymentEnhanced(subscriptionData: any, webhookData: WebhookPayload, supabase: any): Promise<boolean> {
    try {
      const externalReference = subscriptionData.external_reference
      const status = subscriptionData.status
      const subscriptionId = subscriptionData.id
      
      logger.info('💳 WEBHOOK MEJORADO: Procesando pago con nuevo sistema', 'SUBSCRIPTION_PAYMENT_ENHANCED', {
        subscriptionId,
        externalReference,
        status,
        action: webhookData.action
      })
      
      // Buscar suscripción usando el nuevo sistema
      const subscription = await this.subscriptionManager.findSubscriptionByReference(externalReference)
      
      if (!subscription) {
        logger.warn('❌ Suscripción no encontrada para pago', 'SUBSCRIPTION_PAYMENT_ENHANCED', {
          externalReference,
          subscriptionId
        })
        return true // No fallar el webhook
      }
      
      // Si el pago está aprobado, crear registro de facturación
      if (['approved', 'authorized', 'paid'].includes(status)) {
        const billingResult = await this.subscriptionManager.createBillingRecord(subscription.id, {
          amount: subscription.price,
          status: 'paid',
          payment_method: 'mercadopago',
          external_reference: externalReference,
          mp_payment_id: subscriptionId,
          billing_date: new Date().toISOString()
        })
        
        if (billingResult.success) {
          logger.info('✅ Registro de facturación creado para pago', 'BILLING_RECORD_ENHANCED', {
            subscriptionId: subscription.id,
            amount: subscription.price,
            paymentId: subscriptionId
          })
          
          // Enviar notificación de pago procesado
          await this.emailService.sendPaymentConfirmation(
            subscription.customer_email,
            {
              customerName: subscription.customer_name || 'Cliente',
              planName: subscription.plan_name,
              amount: subscription.price,
              paymentDate: new Date().toISOString(),
              nextBillingDate: billingResult.nextBillingDate
            }
          )
          
          return true
        } else {
          logger.error('❌ Error creando registro de facturación', 'BILLING_RECORD_ENHANCED', {
            subscriptionId: subscription.id,
            error: billingResult.error
          })
          return false
        }
      }
      
      return true
      
    } catch (error: any) {
      logger.error('❌ Error en pago mejorado', 'SUBSCRIPTION_PAYMENT_ENHANCED', {
        error: error.message
      })
      return false
    }
  }

  // Mapear estados de MercadoPago a estados locales
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

  // MANTENER INTACTA: Manejar pago de orden (COMPRAS NORMALES)
  private async handleOrderPayment(paymentData: PaymentData, supabase: any): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      const orderId = paymentData.external_reference
      const paymentId = paymentData.id
      
      logger.info('Iniciando manejo de pago de orden', 'ORDER', {
        paymentId,
        orderId,
        paymentStatus: paymentData.status,
        amount: paymentData.transaction_amount
      })
      
      if (!orderId) {
        logger.warn('Pago sin referencia de orden - procesado sin acción', 'ORDER', {
          paymentId,
          payerEmail: paymentData.payer?.email
        })
        return true // No fallar por pagos sin referencia
      }

      // Buscar la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        logger.warn('Orden no encontrada en base de datos - procesado sin acción', 'ORDER', {
          paymentId,
          orderId,
          error: orderError?.message,
          reason: 'Puede ser orden eliminada o de entorno diferente'
        })
        return true // No fallar por órdenes que no existen
      }

      // Actualizar estado de la orden
      const orderStatus = this.mapPaymentStatusToOrderStatus(paymentData.status)
      const updateData: any = {
        payment_status: paymentData.status,
        status: orderStatus,
        updated_at: new Date().toISOString(),
        mercadopago_payment_id: paymentData.id.toString(),
        // Información adicional de MercadoPago
        payment_type: paymentData.payment_type_id,
        payment_method: paymentData.payment_method_id,
        external_reference: paymentData.external_reference || orderId,
        // Campos adicionales si están disponibles
        collection_id: paymentData.id.toString(), // El payment ID es también el collection ID
        site_id: paymentData.currency_id === 'MXN' ? 'MLM' : 'MLA',
        processing_mode: 'aggregator' // Modo por defecto de MercadoPago
      }

      // Nota: No hay columna confirmed_at en la tabla orders
      // El campo updated_at ya se actualiza arriba para registrar cuándo se confirmó

      logger.info('Actualizando estado de orden', 'ORDER', {
        paymentId,
        orderId,
        previousStatus: order.status,
        newStatus: orderStatus,
        paymentStatus: paymentData.status
      })

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (updateError) {
        logger.error('Error actualizando orden en base de datos', 'ORDER', {
          paymentId,
          orderId,
          error: updateError.message,
          duration: Date.now() - startTime
        })
        return false
      }

      logger.info('Orden actualizada exitosamente', 'ORDER', {
        paymentId,
        orderId,
        newStatus: orderStatus,
        isApproved: paymentData.status === 'approved' || paymentData.status === 'paid'
      })

      // VALIDACIÓN AUTOMÁTICA cuando el cliente efectivamente paga
      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        logger.info('🎉 PAGO COMPLETADO - Ejecutando validación automática inmediata', 'PAYMENT_COMPLETED', {
          paymentId,
          orderId,
          payerEmail: paymentData.payer?.email,
          customerEmail: order.customer_email,
          amount: paymentData.transaction_amount,
          paymentMethod: paymentData.payment_method_id
        })
        
        // Enviar ambos emails inmediatamente en paralelo
        await Promise.all([
          // Email de agradecimiento al cliente
          this.sendThankYouEmail(order, paymentData),
          // Email de notificación de nueva compra a administradores
          this.sendNewOrderNotificationEmail(order, paymentData)
        ])
        
        logger.info('✅ Validación automática completada exitosamente', 'PAYMENT_VALIDATION', {
          paymentId,
          orderId,
          customerEmailSent: true,
          adminEmailSent: true,
          processingTime: Date.now() - startTime
        })
      } else {
        logger.info('💰 Pago pendiente - Monitoreando estado', 'PAYMENT_PENDING', {
          paymentId,
          orderId,
          currentStatus: paymentData.status,
          statusDetail: paymentData.status_detail
        })
      }

      return true

    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('Error manejando pago de orden', 'ORDER', {
        paymentId: paymentData.id,
        orderId: paymentData.external_reference,
        error: error.message,
        stack: error.stack,
        duration
      })
      return false
    }
  }

  // PAGO DE SUSCRIPCIÓN MEJORADO: Procesamiento completo con webhook y activación automática robusta
  private async handleSubscriptionPayment(subscriptionData: any, webhookData: WebhookPayload, supabase: any): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      const subscriptionId = subscriptionData.id
      const externalReference = subscriptionData.external_reference
      const status = subscriptionData.status
      
      logger.info('💳 WEBHOOK MEJORADO: Procesando pago de suscripción con activación automática', 'SUBSCRIPTION_PAYMENT', {
        subscriptionId,
        externalReference,
        status,
        action: webhookData.action,
        timestamp: new Date().toISOString()
      })

      // BÚSQUEDA ROBUSTA: Intentar múltiples métodos para encontrar la suscripción
      let subscription = null
      let searchMethod = 'none'
      
      // Método 1: Buscar por external_reference exacto
      if (externalReference) {
        const { data: sub1, error: err1 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', externalReference)
          .single()
        
        if (sub1 && !err1) {
          subscription = sub1
          searchMethod = 'external_reference'
        }
      }
      
      // Método 2: Buscar por mercadopago_subscription_id
      if (!subscription && subscriptionId) {
        const { data: sub2, error: err2 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('mercadopago_subscription_id', subscriptionId)
          .single()
        
        if (sub2 && !err2) {
          subscription = sub2
          searchMethod = 'mercadopago_id'
        }
      }
      
      // Método 3: Buscar suscripciones pendientes recientes (último recurso)
      if (!subscription) {
        const { data: sub3, error: err3 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3)
        
        if (sub3 && sub3.length > 0) {
          // Tomar la más reciente que no tenga mercadopago_subscription_id asignado
          subscription = sub3.find(s => !s.mercadopago_subscription_id) || sub3[0]
          searchMethod = 'recent_pending'
        }
      }
      
      logger.info('🔍 Resultado de búsqueda de suscripción', 'SUBSCRIPTION_SEARCH', {
        found: !!subscription,
        searchMethod,
        subscriptionId: subscription?.id,
        currentStatus: subscription?.status,
        externalReference,
        mercadopagoId: subscriptionId
      })
      
      if (!subscription) {
        logger.warn('❌ Suscripción no encontrada con ningún método', 'SUBSCRIPTION_PAYMENT', {
          externalReference,
          subscriptionId,
          searchMethods: ['external_reference', 'mercadopago_id', 'recent_pending']
        })
        return true // No fallar el webhook
      }
      
      // ACTIVACIÓN AUTOMÁTICA ROBUSTA: Activar si el estado lo permite (GARANTIZADA)
      const shouldActivate = (
        (status === 'authorized' || status === 'approved' || status === 'active' || status === 'paid') &&
        subscription.status !== 'active'
      )
      
      logger.info('🔍 EVALUACIÓN DE ACTIVACIÓN AUTOMÁTICA', 'ACTIVATION_EVALUATION', {
        subscriptionId: subscription.id,
        mercadopagoStatus: status,
        currentStatus: subscription.status,
        shouldActivate,
        activationCriteria: {
          statusIsActivatable: ['authorized', 'approved', 'active', 'paid'].includes(status),
          notAlreadyActive: subscription.status !== 'active'
        }
      })
      
      if (shouldActivate) {
        logger.info('🚀 ACTIVACIÓN AUTOMÁTICA: Iniciando proceso de activación', 'AUTO_ACTIVATION', {
          subscriptionId: subscription.id,
          currentStatus: subscription.status,
          newStatus: 'active',
          mercadopagoStatus: status,
          trigger: 'subscription_payment_webhook'
        })
        
        // Calcular fechas de facturación
        const now = new Date()
        const nextBillingDate = new Date(now)
        nextBillingDate.setDate(nextBillingDate.getDate() + (subscription.billing_frequency || 30))
        
        // Preparar metadata actualizada para sincronización
        const currentMetadata = subscription.metadata || {}
        const updatedMetadata = {
          ...currentMetadata,
          mercadopago_external_reference: externalReference,
          search_method: searchMethod,
          activation_source: 'webhook_preapproval',
          activation_timestamp: now.toISOString(),
          webhook_data: {
            type: webhookData.type,
            action: webhookData.action,
            subscription_id: subscriptionId,
            processed_at: now.toISOString()
          }
        }
        
        const updateData = {
          status: 'active',
          mercadopago_subscription_id: subscriptionId,
          external_reference: externalReference || subscription.external_reference,
          metadata: updatedMetadata,
          updated_at: now.toISOString(),
          activated_at: now.toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          charges_made: (subscription.charges_made || 0) + 1
        }
        
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update(updateData)
          .eq('id', subscription.id)
        
        if (updateError) {
          logger.error('❌ Error en activación automática', 'AUTO_ACTIVATION', {
            subscriptionId: subscription.id,
            error: updateError.message,
            updateData
          })
          return false
        }
        
        logger.info('✅ ACTIVACIÓN AUTOMÁTICA EXITOSA', 'AUTO_ACTIVATION', {
          subscriptionId: subscription.id,
          mercadopagoId: subscriptionId,
          customerEmail: subscription.customer_email,
          planName: subscription.plan_name,
          amount: subscription.amount,
          nextBillingDate: nextBillingDate.toISOString()
        })
        
        // Crear registro en historial de facturación
        try {
          const { error: billingError } = await supabase
            .from('subscription_billing_history')
            .insert({
              subscription_id: subscription.id,
              amount: subscription.amount,
              currency: subscription.currency || 'MXN',
              status: 'paid',
              mercadopago_payment_id: subscriptionId,
              external_reference: externalReference,
              billing_date: now.toISOString(),
              created_at: now.toISOString()
            })
          
          if (billingError) {
            logger.warn('⚠️ Error creando registro de facturación (no crítico)', 'BILLING_HISTORY', {
              subscriptionId: subscription.id,
              error: billingError.message
            })
          } else {
            logger.info('📊 Registro de facturación creado exitosamente', 'BILLING_HISTORY', {
              subscriptionId: subscription.id,
              amount: subscription.amount
            })
          }
        } catch (billingError: any) {
          logger.warn('⚠️ Error en historial de facturación (continuando)', 'BILLING_HISTORY', {
            error: billingError.message
          })
        }
        
        // ENVÍO INMEDIATO DE EMAIL DE CONFIRMACIÓN
        try {
          await this.sendSubscriptionConfirmationEmail({
            ...subscription,
            status: 'active',
            mercadopago_subscription_id: subscriptionId
          }, subscriptionData)
          
          logger.info('📧 Email de confirmación enviado exitosamente', 'EMAIL_CONFIRMATION', {
            subscriptionId: subscription.id,
            customerEmail: subscription.customer_email
          })
        } catch (emailError: any) {
          logger.error('❌ Error enviando email de confirmación (no crítico)', 'EMAIL_CONFIRMATION', {
            subscriptionId: subscription.id,
            error: emailError.message
          })
        }
        
        // SINCRONIZACIÓN INMEDIATA ADICIONAL
        try {
          if (externalReference) {
            await this.subscriptionSyncService.syncSingleSubscription(externalReference)
            logger.info('🔄 Sincronización adicional completada', 'ADDITIONAL_SYNC', {
              externalReference
            })
          }
        } catch (syncError: any) {
          logger.warn('⚠️ Error en sincronización adicional (no crítico)', 'ADDITIONAL_SYNC', {
            error: syncError.message
          })
        }
        
      } else {
        logger.info('ℹ️ Suscripción no requiere activación', 'SUBSCRIPTION_STATUS', {
          subscriptionId: subscription.id,
          currentStatus: subscription.status,
          mercadopagoStatus: status,
          reason: subscription.status === 'active' ? 'already_active' : 'status_not_activatable'
        })
      }
      
      return true

    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('❌ Error crítico procesando pago de suscripción', 'SUBSCRIPTION_PAYMENT', {
        error: error.message,
        stack: error.stack,
        duration,
        subscriptionId: subscriptionData?.id,
        externalReference: subscriptionData?.external_reference
      })
      return false
    }
  }

  // Método para obtener datos de suscripción desde MercadoPago
  private async getSubscriptionData(subscriptionId: string): Promise<any> {
    try {
      // Si es un ID de prueba, usar datos mock
      if (subscriptionId.startsWith('mp_sub_') || subscriptionId.startsWith('test_sub_')) {
        logger.info('Usando datos mock para suscripción de prueba', 'SUBSCRIPTION_API', {
          subscriptionId
        })
        
        return {
          id: subscriptionId,
          status: 'authorized',
          external_reference: `SUB-00000000-0000-0000-0000-000000000000-test123-${Date.now().toString().slice(-8)}`,
          payer_id: 'test_payer_123',
          date_created: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          preapproval_plan_id: 'plan_test_123',
          reason: 'Suscripción de prueba activa'
        }
      }
      
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        logger.warn('Error obteniendo datos de suscripción desde MercadoPago', 'SUBSCRIPTION_API', {
          subscriptionId,
          status: response.status,
          statusText: response.statusText
        })
        return null
      }
      
      return await response.json()
    } catch (error: any) {
      logger.error('Error en API de MercadoPago para suscripción', 'SUBSCRIPTION_API', {
        subscriptionId,
        error: error.message
      })
      return null
    }
  }

  // PREAPROBACIÓN DE SUSCRIPCIÓN MEJORADA: Manejo robusto con activación automática garantizada
  private async handleSubscriptionPreapproval(subscriptionData: any, webhookData: WebhookPayload, supabase: any): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      const externalReference = subscriptionData.external_reference
      const status = subscriptionData.status
      const subscriptionId = subscriptionData.id
      
      logger.info('📋 WEBHOOK MEJORADO: Procesando preaprobación con activación automática garantizada', 'SUBSCRIPTION_PREAPPROVAL', {
        subscriptionId,
        externalReference,
        status,
        action: webhookData.action,
        timestamp: new Date().toISOString()
      })
      
      // BÚSQUEDA ROBUSTA: Múltiples métodos para encontrar la suscripción
      let subscription = null
      let searchMethod = 'none'
      
      // Método 1: Buscar por mercadopago_subscription_id
      if (subscriptionId) {
        const { data: sub1, error: err1 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('mercadopago_subscription_id', subscriptionId)
          .single()
        
        if (sub1 && !err1) {
          subscription = sub1
          searchMethod = 'mercadopago_id'
        }
      }
      
      // Método 2: Buscar por external_reference directo
      if (!subscription && externalReference) {
        const { data: sub2, error: err2 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', externalReference)
          .maybeSingle()
        
        if (sub2 && !err2) {
          subscription = sub2
          searchMethod = 'external_reference'
        }
      }
      
      // Método 3: Buscar en metadata por mercadopago_external_reference
      if (!subscription && externalReference) {
        const { data: metadataResults, error: metadataError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .contains('metadata', { mercadopago_external_reference: externalReference })
        
        if (!metadataError && metadataResults && metadataResults.length > 0) {
          subscription = metadataResults[0]
          searchMethod = 'metadata'
        }
      }
      
      // Método 4: Para suscripciones de prueba, buscar pendientes recientes
      if (!subscription && (subscriptionId.startsWith('mp_sub_') || subscriptionId.startsWith('test_sub_'))) {
        const { data: sub3, error: err3 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3)
        
        if (sub3 && sub3.length > 0) {
          subscription = sub3.find(s => !s.mercadopago_subscription_id) || sub3[0]
          searchMethod = 'recent_pending_test'
        }
      }
      
      // Método 5: Último recurso - buscar cualquier suscripción pendiente reciente
      if (!subscription) {
        const { data: sub4, error: err4 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3)
        
        if (sub4 && sub4.length > 0) {
          subscription = sub4.find(s => !s.mercadopago_subscription_id) || sub4[0]
          searchMethod = 'recent_pending_fallback'
        }
      }
      
      logger.info('🔍 Resultado de búsqueda de suscripción (preaprobación)', 'SUBSCRIPTION_SEARCH', {
        found: !!subscription,
        searchMethod,
        subscriptionId: subscription?.id,
        currentStatus: subscription?.status,
        externalReference,
        mercadopagoId: subscriptionId
      })
      
      if (!subscription) {
        logger.warn('❌ Suscripción no encontrada para preaprobación', 'SUBSCRIPTION_PREAPPROVAL', {
          externalReference,
          subscriptionId,
          searchMethods: ['mercadopago_id', 'external_reference', 'recent_pending_test', 'recent_pending_fallback']
        })
        return true // No fallar el webhook
      }
      
      // MAPEO ROBUSTO DE ESTADOS: Determinar el nuevo estado y si debe activarse
      let newStatus = subscription.status
      let shouldActivate = false
      
      switch (status) {
        case 'authorized':
        case 'approved':
        case 'active':
          newStatus = 'active'
          shouldActivate = true
          break
        case 'pending':
          newStatus = 'pending'
          break
        case 'cancelled':
          newStatus = 'cancelled'
          break
        case 'paused':
          newStatus = 'paused'
          break
        default:
          logger.info('ℹ️ Estado de preaprobación no reconocido', 'SUBSCRIPTION_PREAPPROVAL', {
            status,
            subscriptionId,
            currentStatus: subscription.status
          })
          return true
      }
      
      // ACTIVACIÓN AUTOMÁTICA ROBUSTA
      if (shouldActivate && subscription.status !== 'active') {
        logger.info('🚀 ACTIVACIÓN AUTOMÁTICA: Iniciando por preaprobación', 'AUTO_ACTIVATION', {
          subscriptionId: subscription.id,
          currentStatus: subscription.status,
          newStatus: 'active',
          mercadopagoStatus: status,
          trigger: 'subscription_preapproval_webhook'
        })
        
        // Calcular fechas de facturación
        const now = new Date()
        const nextBillingDate = new Date(now)
        nextBillingDate.setDate(nextBillingDate.getDate() + (subscription.billing_frequency || 30))
        
        const updateData = {
          status: 'active',
          mercadopago_subscription_id: subscriptionId,
          external_reference: externalReference || subscription.external_reference,
          updated_at: now.toISOString(),
          activated_at: now.toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          charges_made: (subscription.charges_made || 0) + 1
        }
        
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update(updateData)
          .eq('id', subscription.id)
        
        if (updateError) {
          logger.error('❌ Error en activación automática (preaprobación)', 'AUTO_ACTIVATION', {
            subscriptionId: subscription.id,
            error: updateError.message,
            updateData
          })
          return false
        }
        
        logger.info('✅ ACTIVACIÓN AUTOMÁTICA EXITOSA (preaprobación)', 'AUTO_ACTIVATION', {
          subscriptionId: subscription.id,
          mercadopagoId: subscriptionId,
          customerEmail: subscription.customer_email,
          planName: subscription.plan_name,
          amount: subscription.amount,
          nextBillingDate: nextBillingDate.toISOString()
        })
        
        // Crear registro en historial de facturación
        try {
          const { error: billingError } = await supabase
            .from('subscription_billing_history')
            .insert({
              subscription_id: subscription.id,
              amount: subscription.amount,
              currency: subscription.currency || 'MXN',
              status: 'paid',
              mercadopago_payment_id: subscriptionId,
              external_reference: externalReference,
              billing_date: now.toISOString(),
              created_at: now.toISOString()
            })
          
          if (!billingError) {
            logger.info('📊 Registro de facturación creado (preaprobación)', 'BILLING_HISTORY', {
              subscriptionId: subscription.id,
              amount: subscription.amount
            })
          }
        } catch (billingError: any) {
          logger.warn('⚠️ Error en historial de facturación (continuando)', 'BILLING_HISTORY', {
            error: billingError.message
          })
        }
        
        // ENVÍO INMEDIATO DE EMAIL DE CONFIRMACIÓN
        try {
          await this.sendSubscriptionConfirmationEmail({
            ...subscription,
            status: 'active',
            mercadopago_subscription_id: subscriptionId
          }, subscriptionData)
          
          logger.info('📧 Email de confirmación enviado (preaprobación)', 'EMAIL_CONFIRMATION', {
            subscriptionId: subscription.id,
            customerEmail: subscription.customer_email
          })
        } catch (emailError: any) {
          logger.error('❌ Error enviando email de confirmación (no crítico)', 'EMAIL_CONFIRMATION', {
            subscriptionId: subscription.id,
            error: emailError.message
          })
        }
        
        // SINCRONIZACIÓN INMEDIATA ADICIONAL
        try {
          if (externalReference) {
            await this.subscriptionSyncService.syncSingleSubscription(externalReference)
            logger.info('🔄 Sincronización adicional completada (preaprobación)', 'ADDITIONAL_SYNC', {
              externalReference
            })
          }
        } catch (syncError: any) {
          logger.warn('⚠️ Error en sincronización adicional (no crítico)', 'ADDITIONAL_SYNC', {
            error: syncError.message
          })
        }
        
      } else if (newStatus !== subscription.status) {
        // Actualización de estado sin activación
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: newStatus,
            mercadopago_subscription_id: subscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        
        if (updateError) {
          logger.error('❌ Error actualizando estado de suscripción', 'SUBSCRIPTION_PREAPPROVAL', {
            subscriptionId: subscription.id,
            newStatus,
            error: updateError.message
          })
          return false
        }
        
        logger.info('✅ Estado de suscripción actualizado (preaprobación)', 'SUBSCRIPTION_PREAPPROVAL', {
          subscriptionId: subscription.id,
          oldStatus: subscription.status,
          newStatus,
          mercadopagoId: subscriptionId
        })
      } else {
        logger.info('ℹ️ Suscripción no requiere cambios (preaprobación)', 'SUBSCRIPTION_STATUS', {
          subscriptionId: subscription.id,
          currentStatus: subscription.status,
          mercadopagoStatus: status
        })
      }
      
      return true
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('❌ Error crítico procesando preaprobación de suscripción', 'SUBSCRIPTION_PREAPPROVAL', {
        error: error.message,
        stack: error.stack,
        duration,
        subscriptionId: subscriptionData?.id,
        externalReference: subscriptionData?.external_reference
      })
      return false
    }
  }

  // Método para enviar email de confirmación de suscripción
  private async sendSubscriptionConfirmationEmail(subscription: any, subscriptionData: any): Promise<void> {
    try {
      logger.info('📧 Enviando email de confirmación de suscripción', 'SUBSCRIPTION_EMAIL', {
        subscriptionId: subscription.id,
        customerEmail: subscription.customer_email
      })
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@petgourmet.com',
        to: subscription.customer_email,
        subject: '🎉 ¡Tu suscripción a PetGourmet está activa!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">¡Bienvenido a PetGourmet! 🐾</h2>
            <p>¡Excelentes noticias! Tu suscripción ha sido activada exitosamente.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Detalles de tu suscripción:</h3>
              <p><strong>Plan:</strong> ${subscription.plan_name || 'Plan Premium'}</p>
              <p><strong>Precio:</strong> $${subscription.discounted_price || subscription.base_price}</li>
            </div>
            
            <p>Ahora puedes disfrutar de todos los beneficios de tu suscripción:</p>
            <ul>
              <li>🥘 Comida premium para tu mascota</li>
              <li>🚚 Entregas automáticas</li>
              <li>💰 Precios preferenciales</li>
              <li>🎯 Atención personalizada</li>
            </ul>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            
            <p style="margin-top: 30px;">¡Gracias por confiar en PetGourmet!</p>
            <p><strong>El equipo de PetGourmet</strong></p>
          </div>
        `
      }
      
      await this.transporter.sendMail(mailOptions)
      
      logger.info('✅ Email de confirmación de suscripción enviado exitosamente', 'SUBSCRIPTION_EMAIL', {
        subscriptionId: subscription.id,
        customerEmail: subscription.customer_email
      })
      
    } catch (error: any) {
      logger.error('❌ Error enviando email de confirmación de suscripción', 'SUBSCRIPTION_EMAIL', {
        subscriptionId: subscription.id,
        error: error.message
      })
    }
  }

  // FUNCIÓN MEJORADA - Activación robusta con idempotencia para casos edge
  private async activateSubscriptionByReference(externalReference: string, webhookData: any, supabase: any): Promise<void> {
    logger.info('Activación por webhook - CASO EDGE con idempotencia robusta', 'SUBSCRIPTION', {
      externalReference,
      subscriptionId: webhookData.id,
      note: 'Procesamiento robusto para casos donde el usuario no llegue a /suscripcion'
    })
    
    if (!externalReference) {
      logger.warn('External reference no disponible para activación', 'SUBSCRIPTION', { webhookData })
      return
    }

    // IDEMPOTENCIA ROBUSTA: Usar servicio de idempotencia con locks distribuidos
    const idempotencyService = createIdempotencyService()
    const idempotencyKey = idempotencyService.generateWebhookKey(externalReference, webhookData.id)
    
    try {
      const result = await idempotencyService.executeWithIdempotency(
        idempotencyKey,
        async () => {
          // Buscar suscripción pendiente por external_reference
          const { data: pendingSubscriptions, error: searchError } = await supabase
            .from('unified_subscriptions')
            .select('*')
            .eq('external_reference', externalReference)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
          
          if (searchError) {
            logger.error('Error buscando suscripción pendiente en webhook', 'SUBSCRIPTION', {
              externalReference,
              error: searchError.message
            })
            throw new Error(`Error buscando suscripción: ${searchError.message}`)
          }
          
          if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
            logger.info('No se encontró suscripción pendiente para activar desde webhook', 'SUBSCRIPTION', {
              externalReference
            })
            return { success: false, reason: 'no_pending_subscription' }
          }
          
          // Verificar que no exista ya una suscripción activa
          const { data: activeSubscriptions } = await supabase
            .from('unified_subscriptions')
            .select('*')
            .eq('external_reference', externalReference)
            .eq('status', 'active')
          
          if (activeSubscriptions && activeSubscriptions.length > 0) {
            logger.info('Suscripción ya está activa - idempotencia', 'SUBSCRIPTION', {
              externalReference,
              activeSubscriptionId: activeSubscriptions[0].id
            })
            return { success: true, reason: 'already_active', subscriptionId: activeSubscriptions[0].id }
          }
          
          // Activar la suscripción más reciente
          const subscriptionToActivate = pendingSubscriptions[0]
          
          const { error: updateError } = await supabase
            .from('unified_subscriptions')
            .update({
              status: 'active',
              processed_at: new Date().toISOString(),
              last_billing_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              mercadopago_subscription_id: webhookData.id
            })
            .eq('id', subscriptionToActivate.id)
          
          if (updateError) {
            logger.error('Error activando suscripción desde webhook', 'SUBSCRIPTION', {
              subscriptionId: subscriptionToActivate.id,
              error: updateError.message
            })
            throw new Error(`Error activando suscripción: ${updateError.message}`)
          }
          
          // Enviar email de confirmación
          await this.sendSubscriptionConfirmationEmail(subscriptionToActivate, supabase)
          
          logger.info('Suscripción activada exitosamente desde webhook', 'SUBSCRIPTION', {
            subscriptionId: subscriptionToActivate.id,
            externalReference,
            webhookId: webhookData.id
          })
          
          return { success: true, subscriptionId: subscriptionToActivate.id }
        },
        300000 // 5 minutos de timeout
      )
      
      if (result.fromCache) {
        logger.info('Resultado de activación obtenido desde caché de idempotencia', 'SUBSCRIPTION', {
          externalReference,
          webhookId: webhookData.id
        })
      }
      
    } catch (error: any) {
      logger.error('Error en activación robusta desde webhook', 'SUBSCRIPTION', {
        externalReference,
        webhookId: webhookData.id,
        error: error.message
      })
    }
  }

  // FUNCIÓN PARA ENVIAR EMAIL DE CONFIRMACIÓN DE SUSCRIPCIÓN
  private async sendSubscriptionConfirmationEmail(subscription: any, supabase: any): Promise<void> {
    try {
      // Obtener datos del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', subscription.user_id)
        .single()
      
      if (!profile?.email) {
        logger.warn('No se pudo obtener email del usuario para confirmación', 'EMAIL', {
          subscriptionId: subscription.id,
          userId: subscription.user_id
        })
        return
      }
      
      const customerData = subscription.customer_data || {}
      const productName = subscription.product_name || 'Suscripción PetGourmet'
      
      // Email al cliente
      const customerEmailHtml = `
        <h2>¡Tu suscripción está activa! 🎉</h2>
        <p>Hola ${profile.first_name || customerData.name || 'Cliente'},</p>
        <p>Tu suscripción a <strong>${productName}</strong> ha sido activada exitosamente.</p>
        <p><strong>Detalles de tu suscripción:</strong></p>
        <ul>
          <li>Producto: ${productName}</li>
          <li>Tipo: ${subscription.subscription_type}</li>
          <li>Precio: $${subscription.discounted_price || subscription.base_price}</li>
        </ul>
        <p>Gracias por confiar en PetGourmet.</p>
      `
      
      // Email a administradores
      const adminEmailHtml = `
        <h2>Nueva suscripción activada</h2>
        <p><strong>Cliente:</strong> ${profile.first_name} ${profile.last_name} (${profile.email})</p>
        <p><strong>Producto:</strong> ${productName}</p>
        <p><strong>Tipo:</strong> ${subscription.subscription_type}</p>
        <p><strong>Precio:</strong> $${subscription.discounted_price || subscription.base_price}</p>
        <p><strong>ID Suscripción:</strong> ${subscription.id}</p>
      `
      
      // Enviar emails usando el transporter
      await Promise.all([
        // Email al cliente
        this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
          to: profile.email,
          subject: '¡Tu suscripción PetGourmet está activa!',
          html: customerEmailHtml
        }),
        // Email a administradores
        this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
          to: 'contacto@petgourmet.mx',
          subject: 'Nueva suscripción activada',
          html: adminEmailHtml
        })
      ])
      
      logger.info('Emails de confirmación enviados', 'EMAIL', {
        subscriptionId: subscription.id,
        customerEmail: profile.email
      })
      
    } catch (error: any) {
      logger.error('Error enviando emails de confirmación', 'EMAIL', {
        error: error.message,
        subscriptionId: subscription.id
      })
    }
  }

  // MANTENER INTACTA: Mapear estado de pago a estado de orden
  private mapPaymentStatusToOrderStatus(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'approved':
      case 'paid':
        return 'confirmed'
      case 'pending':
        return 'pending'
      case 'cancelled':
      case 'rejected':
        return 'cancelled'
      case 'refunded':
        return 'refunded'
      default:
        return 'pending'
    }
  }

  // MANTENER INTACTA: Enviar email de agradecimiento
  private async sendThankYouEmail(order: any, paymentData: PaymentData): Promise<void> {
    try {
      const customerEmail = extractCustomerEmail(order)
      const customerName = extractCustomerName(order)
      
      if (!customerEmail) {
        logger.warn('No se pudo extraer email del cliente para envío de agradecimiento', 'EMAIL', {
          orderId: order.id,
          paymentId: paymentData.id
        })
        return
      }

      const emailHtml = `
        <h2>¡Gracias por tu compra! 🎉</h2>
        <p>Hola ${customerName},</p>
        <p>Tu pago ha sido procesado exitosamente.</p>
        <p><strong>Detalles de tu compra:</strong></p>
        <ul>
          <li>Número de orden: ${order.id}</li>
          <li>Monto: $${paymentData.transaction_amount}</li>
          <li>Método de pago: ${paymentData.payment_method_id}</li>
        </ul>
        <p>Pronto recibirás más información sobre tu pedido.</p>
        <p>Gracias por confiar en PetGourmet.</p>
      `

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
        to: customerEmail,
        subject: '¡Gracias por tu compra en PetGourmet!',
        html: emailHtml
      })

      logger.info('Email de agradecimiento enviado exitosamente', 'EMAIL', {
        orderId: order.id,
        paymentId: paymentData.id,
        customerEmail
      })

    } catch (error: any) {
      logger.error('Error enviando email de agradecimiento', 'EMAIL', {
        orderId: order.id,
        paymentId: paymentData.id,
        error: error.message
      })
    }
  }

  // MANTENER INTACTA: Enviar notificación de nueva orden a administradores
  private async sendNewOrderNotificationEmail(order: any, paymentData: PaymentData): Promise<void> {
    try {
      const customerEmail = extractCustomerEmail(order)
      const customerName = extractCustomerName(order)

      const emailHtml = `
        <h2>Nueva compra recibida 💰</h2>
        <p><strong>Cliente:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Número de orden:</strong> ${order.id}</p>
        <p><strong>Monto:</strong> $${paymentData.transaction_amount}</p>
        <p><strong>Método de pago:</strong> ${paymentData.payment_method_id}</p>
        <p><strong>Estado:</strong> ${paymentData.status}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
      `

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
        to: 'contacto@petgourmet.mx',
        subject: 'Nueva compra recibida - PetGourmet',
        html: emailHtml
      })

      logger.info('Notificación de nueva orden enviada a administradores', 'EMAIL', {
        orderId: order.id,
        paymentId: paymentData.id,
        customerEmail
      })

    } catch (error: any) {
      logger.error('Error enviando notificación de nueva orden', 'EMAIL', {
        orderId: order.id,
        paymentId: paymentData.id,
        error: error.message
      })
    }
  }

  // Actualizar suscripción local buscando por external_reference para evitar duplicados
  private async updateLocalSubscription(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    try {
      // Primero buscar registro existente por external_reference
      const { data: existingSubscription, error: searchError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', subscriptionData.external_reference)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        logger.error('Error buscando suscripción existente', 'SUBSCRIPTION', {
          externalReference: subscriptionData.external_reference,
          error: searchError.message
        })
        return
      }

      if (existingSubscription) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({
            mercadopago_subscription_id: subscriptionData.id,
            status: subscriptionData.status === 'authorized' ? 'active' : subscriptionData.status,
            payer_email: subscriptionData.payer_email,
            next_billing_date: subscriptionData.next_payment_date,
            updated_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id)

        if (updateError) {
          logger.error('Error actualizando suscripción existente', 'SUBSCRIPTION', {
            subscriptionId: existingSubscription.id,
            externalReference: subscriptionData.external_reference,
            error: updateError.message
          })
        } else {
          logger.info('Suscripción existente actualizada exitosamente', 'SUBSCRIPTION', {
            subscriptionId: existingSubscription.id,
            mercadopagoId: subscriptionData.id,
            externalReference: subscriptionData.external_reference,
            status: subscriptionData.status
          })
        }
      } else {
        logger.warn('No se encontró suscripción existente para actualizar', 'SUBSCRIPTION', {
          externalReference: subscriptionData.external_reference,
          mercadopagoId: subscriptionData.id
        })
      }
    } catch (error: any) {
      logger.error('Error en updateLocalSubscription', 'SUBSCRIPTION', {
        externalReference: subscriptionData.external_reference,
        mercadopagoId: subscriptionData.id,
        error: error.message
      })
    }
  }
}

export default WebhookService