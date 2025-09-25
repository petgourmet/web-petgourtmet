import { createServiceClient } from '@/lib/supabase/service'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import logger, { LogCategory } from '@/lib/logger'
import { extractCustomerEmail, extractCustomerName } from '@/lib/email-utils'
import webhookMonitor from '@/lib/webhook-monitor'
import autoSyncService from '@/lib/auto-sync-service'
import { idempotencyService, IdempotencyService } from '@/lib/idempotency-service'
import { AdvancedIdempotencyService } from '@/lib/services/advanced-idempotency.service'
import { NewSyncService } from '@/lib/services/subscription-sync.service'
import { databaseLocksService } from '@/lib/services/database-locks.service'

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
  private advancedIdempotencyService: AdvancedIdempotencyService
  private syncService: NewSyncService

  constructor() {
    this.mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN || ''
    this.webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    
    if (!this.mercadoPagoToken) {
      logger.error(LogCategory.WEBHOOK, 'MERCADOPAGO_ACCESS_TOKEN es requerido', undefined, { component: 'WebhookService' })
      throw new Error('MERCADOPAGO_ACCESS_TOKEN es requerido')
    }

    logger.info(LogCategory.WEBHOOK, 'WebhookService inicializado correctamente', { 
      hasToken: !!this.mercadoPagoToken,
      hasSecret: !!this.webhookSecret 
    })
    this.initializeEmailTransporter()
    this.advancedIdempotencyService = AdvancedIdempotencyService.getInstance()
    this.syncService = NewSyncService.getInstance()
  }

  private initializeEmailTransporter() {
    this.emailTransporter = nodemailer.createTransporter({
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

  async initializeSupabase() {
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

  // Obtener datos de suscripción desde MercadoPago
  async getSubscriptionData(subscriptionId: string): Promise<SubscriptionData | null> {
    const startTime = Date.now()
    
    try {
      logger.info('Obteniendo datos de suscripción desde MercadoPago', 'SUBSCRIPTION', {
        subscriptionId
      })
      
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.mercadoPagoToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        logger.error('Error obteniendo datos de suscripción', 'SUBSCRIPTION', {
          subscriptionId,
          status: response.status,
          statusText: response.statusText
        })
        return null
      }
      
      const data = await response.json()
      
      logger.info('Datos de suscripción obtenidos exitosamente', 'SUBSCRIPTION', {
        subscriptionId,
        status: data.status,
        payerEmail: data.payer_email,
        externalReference: data.external_reference,
        duration: Date.now() - startTime
      })
      
      return {
        id: data.id,
        status: data.status,
        reason: data.reason || '',
        payer_email: data.payer_email,
        external_reference: data.external_reference,
        next_payment_date: data.next_payment_date,
        auto_recurring: data.auto_recurring
      }
      
    } catch (error: any) {
      logger.error('Error obteniendo datos de suscripción', 'SUBSCRIPTION', {
        subscriptionId,
        error: error.message,
        duration: Date.now() - startTime
      })
      return null
    }
  }
  
  // Obtener datos de pago desde MercadoPago
  async getPaymentData(paymentId: string): Promise<PaymentData | null> {
    const startTime = Date.now()
    
    try {
      // Si es un ID de prueba, crear datos simulados
      if (paymentId.includes('test_') || paymentId.includes('payment_test_') || /^test_payment_\d+$/.test(paymentId)) {
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
      
      const supabase = await this.initializeSupabase()
      
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
        webhookMonitor.logWebhookSuccess(eventId, duration)
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

  // WEBHOOK MEJORADO: Activación inmediata de suscripciones con retry logic
  async processSubscriptionWebhook(webhookData: WebhookPayload): Promise<boolean> {
    const startTime = Date.now()
    const subscriptionId = webhookData.data.id
    
    try {
      logger.info('🔔 Webhook de suscripción recibido - procesamiento inmediato', 'WEBHOOK', {
        subscriptionId,
        type: webhookData.type,
        action: webhookData.action,
        liveMode: webhookData.live_mode
      })
      
      await this.initializeSupabase()
      
      // Obtener datos de la suscripción desde MercadoPago
      const subscriptionData = await this.getSubscriptionData(subscriptionId)
      
      if (!subscriptionData) {
        logger.warn('No se pudieron obtener datos de suscripción', 'WEBHOOK', {
          subscriptionId,
          action: webhookData.action
        })
        return true // No fallar por datos no disponibles
      }
      
      // Procesar según la acción del webhook
      let processed = false
      
      switch (webhookData.action) {
        case 'created':
        case 'updated':
          if (subscriptionData.status === 'authorized') {
            logger.info('🎉 Suscripción autorizada - activando inmediatamente', 'WEBHOOK', {
              subscriptionId,
              externalReference: subscriptionData.external_reference,
              payerEmail: subscriptionData.payer_email
            })
            processed = await this.activateSubscriptionFromWebhook(subscriptionData)
          } else {
            logger.info('📋 Suscripción en estado no autorizado', 'WEBHOOK', {
              subscriptionId,
              status: subscriptionData.status,
              reason: subscriptionData.reason
            })
            processed = true // No es error, solo no está lista
          }
          break
          
        case 'payment.created':
        case 'payment.updated':
          logger.info('💳 Pago de suscripción procesado', 'WEBHOOK', {
            subscriptionId,
            action: webhookData.action
          })
          processed = true // Los pagos recurrentes no requieren activación
          break
          
        default:
          logger.info('ℹ️ Acción de webhook no manejada', 'WEBHOOK', {
            subscriptionId,
            action: webhookData.action
          })
          processed = true
      }
      
      const duration = Date.now() - startTime
      logger.info('✅ Webhook de suscripción procesado', 'WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        processed,
        duration
      })
      
      return processed

    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('❌ Error en webhook de suscripción', 'WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        error: error.message,
        duration
      })
      
      // Implementar retry logic para errores temporales
      if (this.isRetryableError(error)) {
        logger.info('🔄 Error temporal - webhook será reintentado por MercadoPago', 'WEBHOOK', {
          subscriptionId,
          errorType: 'retryable'
        })
        return false // Hacer que MercadoPago reintente
      }
      
      return false
    }
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

      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        updateData.confirmed_at = new Date().toISOString()
      }

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

  // PAGO DE SUSCRIPCIÓN SIMPLIFICADO: Solo logging - flujo principal por URL
  private async handleSubscriptionPayment(paymentData: PaymentData, supabase: any): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      const paymentId = paymentData.id
      const externalReference = paymentData.external_reference
      
      logger.info('Pago de suscripción detectado - solo logging', 'SUBSCRIPTION', {
        paymentId,
        externalReference,
        paymentStatus: paymentData.status,
        amount: paymentData.transaction_amount,
        note: 'Flujo principal manejado por URL redirect en /suscripcion'
      })

      // SOLO LOGGING - No procesamiento aquí
      // El flujo principal se maneja cuando el usuario llega a /suscripcion con collection_status=approved
      
      return true

    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('Error en logging de pago de suscripción', 'SUBSCRIPTION', {
        paymentId: paymentData.id,
        error: error.message,
        duration
      })
      return false
    }
  }

  // FUNCIÓN MEJORADA - Activación robusta con locks de base de datos y servicios avanzados
  private async activateSubscriptionByReference(externalReference: string, webhookData: any, supabase: any): Promise<void> {
    logger.info('🚀 Activación por webhook con locks de BD y servicios avanzados', 'SUBSCRIPTION', {
      externalReference,
      subscriptionId: webhookData.id,
      note: 'Procesamiento robusto con prevención de condiciones de carrera'
    })
    
    if (!externalReference) {
      logger.warn('External reference no disponible para activación', 'SUBSCRIPTION', { webhookData })
      return
    }

    const lockKey = `subscription_activation_${externalReference}`
    let lockAcquired = false
    
    try {
      // PASO 1: Adquirir lock de base de datos para prevenir condiciones de carrera
      const lockResult = await databaseLocksService.acquireLock(lockKey, {
        ttlSeconds: 300, // 5 minutos
        maxRetries: 3,
        retryDelayMs: 1000
      })
      
      if (!lockResult.success) {
        logger.error('❌ No se pudo adquirir lock para activación de suscripción', 'SUBSCRIPTION', {
          externalReference,
          lockKey,
          error: lockResult.error
        })
        return
      }
      
      lockAcquired = true
      logger.info('🔒 Lock adquirido para activación de suscripción', 'SUBSCRIPTION', {
        externalReference,
        lockId: lockResult.lockId
      })

      // PASO 2: Verificar duplicados con idempotencia avanzada
      const isDuplicate = await this.advancedIdempotencyService.checkDuplicate({
        external_reference: externalReference,
        user_id: webhookData.payer?.id,
        product_id: webhookData.auto_recurring?.transaction_amount,
        payer_email: webhookData.payer?.email
      })
      
      if (isDuplicate) {
        logger.info('✅ Suscripción ya procesada - idempotencia avanzada', 'SUBSCRIPTION', {
          externalReference
        })
        return
      }

      // PASO 3: Buscar suscripción usando el servicio de sincronización
      const subscription = await this.syncService.findSubscriptionByReference(externalReference)
      
      if (!subscription) {
        // PASO 4: Buscar por criterios alternativos
        const alternativeSubscription = await this.syncService.findSubscriptionByAlternativeCriteria({
          userId: webhookData.payer?.id,
          payerEmail: webhookData.payer?.email,
          collectionId: webhookData.collection?.id,
          paymentId: webhookData.id,
          preferenceId: webhookData.preference_id
        })
        
        if (!alternativeSubscription) {
          logger.warn('⚠️ No se encontró suscripción para activar desde webhook', 'SUBSCRIPTION', {
            externalReference,
            webhookData: {
              id: webhookData.id,
              payerId: webhookData.payer?.id,
              payerEmail: webhookData.payer?.email
            }
          })
          return
        }
        
        // Usar la suscripción encontrada por criterios alternativos
        await this.processSubscriptionActivation(alternativeSubscription, webhookData, supabase)
        return
      }

      // PASO 5: Procesar activación de suscripción encontrada
      await this.processSubscriptionActivation(subscription, webhookData, supabase)
      
      // PASO 6: Almacenar resultado en idempotencia avanzada
      await this.advancedIdempotencyService.storeResult({
        external_reference: externalReference,
        user_id: subscription.user_id,
        product_id: subscription.product_id,
        payer_email: subscription.customer_data?.email
      }, {
        success: true,
        subscriptionId: subscription.id,
        activatedAt: new Date().toISOString(),
        source: 'webhook'
      })
      
    } catch (error: any) {
      logger.error('❌ Error crítico en activación desde webhook', 'SUBSCRIPTION', {
        externalReference,
        webhookId: webhookData.id,
        error: error.message,
        stack: error.stack
      })
      
      // Almacenar error en idempotencia
      try {
        await this.advancedIdempotencyService.storeResult({
          external_reference: externalReference,
          user_id: webhookData.payer?.id,
          product_id: null,
          payer_email: webhookData.payer?.email
        }, {
          success: false,
          error: error.message,
          source: 'webhook'
        })
      } catch (storeError: any) {
        logger.error('Error almacenando resultado de error', 'SUBSCRIPTION', {
          error: storeError.message
        })
      }
    } finally {
      // PASO 7: Liberar lock
      if (lockAcquired) {
        await databaseLocksService.releaseLock(lockKey)
        logger.info('🔓 Lock liberado para activación de suscripción', 'SUBSCRIPTION', {
          externalReference,
          lockKey
        })
      }
    }
  }

  // Nueva función para procesar la activación de suscripción
  private async processSubscriptionActivation(subscription: any, webhookData: any, supabase: any): Promise<void> {
    try {
      // Verificar si ya está activa
      if (subscription.status === 'active') {
        logger.info('✅ Suscripción ya está activa', 'SUBSCRIPTION', {
          subscriptionId: subscription.id,
          externalReference: subscription.external_reference
        })
        return
      }

      // Actualizar suscripción usando el servicio de sincronización
      const updatedSubscription = await this.syncService.updateSubscriptionWithMercadoPagoData(
        subscription,
        {
          id: webhookData.id,
          status: 'authorized',
          payer: webhookData.payer,
          auto_recurring: webhookData.auto_recurring,
          external_reference: webhookData.external_reference || subscription.external_reference
        }
      )
      
      if (!updatedSubscription) {
        throw new Error('No se pudo actualizar la suscripción')
      }
      
      // Enviar email de confirmación
      await this.sendSubscriptionConfirmationEmail(updatedSubscription, supabase)
      
      // Registrar evento de sincronización
      await this.syncService.logSyncEvent({
        subscription_id: updatedSubscription.id,
        event_type: 'webhook_activation',
        source_data: webhookData,
        result_data: updatedSubscription,
        success: true
      })
      
      logger.info('✅ Suscripción activada exitosamente desde webhook', 'SUBSCRIPTION', {
        subscriptionId: updatedSubscription.id,
        externalReference: updatedSubscription.external_reference,
        webhookId: webhookData.id
      })
      
    } catch (error: any) {
      logger.error('❌ Error procesando activación de suscripción', 'SUBSCRIPTION', {
        subscriptionId: subscription.id,
        error: error.message
      })
      
      // Registrar evento de error
      await this.syncService.logSyncEvent({
        subscription_id: subscription.id,
        event_type: 'webhook_activation_error',
        source_data: webhookData,
        result_data: { error: error.message },
        success: false
      })
      
      throw error
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

  // Activar suscripción desde webhook usando el servicio de idempotencia avanzado
  private async activateSubscriptionFromWebhook(subscriptionData: SubscriptionData): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      const { enhancedIdempotencyService } = await import('@/lib/enhanced-idempotency-service')
      const { subscriptionSyncService } = await import('@/lib/subscription-sync-service')
      
      if (!subscriptionData.external_reference) {
        logger.error('Suscripción sin external_reference - no se puede activar', 'WEBHOOK_ACTIVATION', {
          subscriptionId: subscriptionData.id,
          payerEmail: subscriptionData.payer_email
        })
        return false
      }
      
      // Usar el servicio de idempotencia para evitar duplicados
      const idempotencyKey = `webhook_activation:${subscriptionData.external_reference}`
      
      const result = await enhancedIdempotencyService.executeWithIdempotency(
        idempotencyKey,
        async () => {
          logger.info('🚀 Iniciando activación de suscripción desde webhook', 'WEBHOOK_ACTIVATION', {
            externalReference: subscriptionData.external_reference,
            payerEmail: subscriptionData.payer_email,
            subscriptionId: subscriptionData.id
          })
          
          // Buscar suscripción pendiente por external_reference
          const { data: pendingSubscriptions, error: searchError } = await this.supabase
            .from('unified_subscriptions')
            .select('*')
            .eq('external_reference', subscriptionData.external_reference)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (searchError) {
            logger.error('Error buscando suscripción pendiente', 'WEBHOOK_ACTIVATION', {
              externalReference: subscriptionData.external_reference,
              error: searchError.message
            })
            throw new Error(`Error buscando suscripción: ${searchError.message}`)
          }
          
          let targetSubscription = pendingSubscriptions?.[0]
          
          // Si no se encuentra por external_reference, usar criterios alternativos
          if (!targetSubscription) {
            logger.info('Suscripción no encontrada por external_reference - buscando por criterios alternativos', 'WEBHOOK_ACTIVATION', {
              externalReference: subscriptionData.external_reference,
              payerEmail: subscriptionData.payer_email
            })
            
            targetSubscription = await subscriptionSyncService.findPendingSubscriptionByAlternativeCriteria({
              payerEmail: subscriptionData.payer_email,
              externalReference: subscriptionData.external_reference
            })
          }
          
          if (!targetSubscription) {
            logger.warn('No se encontró suscripción pendiente para activar', 'WEBHOOK_ACTIVATION', {
              externalReference: subscriptionData.external_reference,
              payerEmail: subscriptionData.payer_email
            })
            return { success: false, reason: 'Suscripción no encontrada' }
          }
          
          // Verificar que no esté ya activa
          if (targetSubscription.status === 'active') {
            logger.info('Suscripción ya está activa - omitiendo activación', 'WEBHOOK_ACTIVATION', {
              subscriptionId: targetSubscription.id,
              externalReference: subscriptionData.external_reference
            })
            return { success: true, reason: 'Ya activa', subscriptionId: targetSubscription.id }
          }
          
          // Calcular próxima fecha de facturación
          const nextBillingDate = new Date()
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
          
          // Activar la suscripción
          const { error: updateError } = await this.supabase
            .from('unified_subscriptions')
            .update({
              status: 'active',
              mercadopago_subscription_id: subscriptionData.id,
              payer_email: subscriptionData.payer_email,
              next_billing_date: subscriptionData.next_payment_date || nextBillingDate.toISOString(),
              activated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_sync_at: new Date().toISOString(),
              activation_source: 'webhook'
            })
            .eq('id', targetSubscription.id)
          
          if (updateError) {
            logger.error('Error activando suscripción', 'WEBHOOK_ACTIVATION', {
              subscriptionId: targetSubscription.id,
              error: updateError.message
            })
            throw new Error(`Error activando suscripción: ${updateError.message}`)
          }
          
          logger.info('✅ Suscripción activada exitosamente desde webhook', 'WEBHOOK_ACTIVATION', {
            subscriptionId: targetSubscription.id,
            externalReference: subscriptionData.external_reference,
            payerEmail: subscriptionData.payer_email,
            mercadopagoId: subscriptionData.id
          })
          
          // Enviar emails de confirmación
          await this.sendSubscriptionConfirmationEmails(targetSubscription)
          
          return { 
            success: true, 
            subscriptionId: targetSubscription.id,
            reason: 'Activada exitosamente'
          }
        },
        {
          lockTimeout: 30000, // 30 segundos
          resultTtl: 300000   // 5 minutos
        }
      )
      
      const duration = Date.now() - startTime
      
      if (result.success) {
        logger.info('🎉 Activación de suscripción completada desde webhook', 'WEBHOOK_ACTIVATION', {
          externalReference: subscriptionData.external_reference,
          subscriptionId: result.data?.subscriptionId,
          duration,
          fromCache: result.fromCache
        })
        return true
      } else {
        logger.error('❌ Fallo en activación de suscripción desde webhook', 'WEBHOOK_ACTIVATION', {
          externalReference: subscriptionData.external_reference,
          error: result.error,
          duration
        })
        return false
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('❌ Error crítico en activación desde webhook', 'WEBHOOK_ACTIVATION', {
        externalReference: subscriptionData.external_reference,
        error: error.message,
        duration
      })
      return false
    }
  }
  
  // Determinar si un error es reintentable
  private isRetryableError(error: any): boolean {
    // Errores de red o temporales que MercadoPago puede reintentar
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN'
    ]
    
    // Códigos de estado HTTP que indican errores temporales
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
    
    // Verificar código de error de red
    if (error.code && retryableErrors.includes(error.code)) {
      return true
    }
    
    // Verificar código de estado HTTP
    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true
    }
    
    // Verificar mensajes de error específicos
    const errorMessage = error.message?.toLowerCase() || ''
    const retryableMessages = [
      'timeout',
      'connection',
      'network',
      'temporary',
      'rate limit',
      'service unavailable'
    ]
    
    return retryableMessages.some(msg => errorMessage.includes(msg))
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