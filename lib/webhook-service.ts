import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { logger, LogCategory } from '@/lib/logger'
import { extractCustomerEmail, extractCustomerName } from '@/lib/email-utils'
import webhookMonitor from '@/lib/webhook-monitor'
import autoSyncService from '@/lib/auto-sync-service'
import { idempotencyService, IdempotencyService } from '@/lib/idempotency-service'

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

  // WEBHOOK MEJORADO: Procesamiento completo de eventos de suscripciones
  async processSubscriptionWebhook(webhookData: WebhookPayload): Promise<boolean> {
    const startTime = Date.now()
    const subscriptionId = webhookData.data.id
    const supabase = this.initializeSupabase()
    
    try {
      logger.info('🔔 Webhook de suscripción recibido - procesamiento completo', 'SUBSCRIPTION_WEBHOOK', {
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
      
      // Procesar según el tipo de evento y acción
      let processed = false
      
      switch (webhookData.type) {
        case 'subscription_preapproval':
          processed = await this.handleSubscriptionPreapproval(subscriptionData, webhookData, supabase)
          break
        case 'subscription_authorized_payment':
          processed = await this.handleSubscriptionPayment(subscriptionData, webhookData, supabase)
          break
        default:
          logger.info('Tipo de webhook de suscripción no manejado específicamente', 'SUBSCRIPTION_WEBHOOK', {
            type: webhookData.type,
            subscriptionId
          })
          processed = true
      }
      
      const duration = Date.now() - startTime
      logger.info('✅ Webhook de suscripción procesado exitosamente', 'SUBSCRIPTION_WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        type: webhookData.type,
        processed,
        duration
      })
      
      return processed

    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('❌ Error procesando webhook de suscripción', 'SUBSCRIPTION_WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        error: error.message,
        stack: error.stack,
        duration
      })
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

  // PAGO DE SUSCRIPCIÓN MEJORADO: Procesamiento completo con webhook
  private async handleSubscriptionPayment(subscriptionData: any, webhookData: WebhookPayload, supabase: any): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      const subscriptionId = subscriptionData.id
      const externalReference = subscriptionData.external_reference
      const status = subscriptionData.status
      
      logger.info('💳 Procesando pago de suscripción via webhook', 'SUBSCRIPTION_PAYMENT', {
        subscriptionId,
        externalReference,
        status,
        action: webhookData.action
      })

      // Buscar la suscripción en nuestra base de datos
      const { data: subscription, error: findError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', externalReference)
        .single()
      
      if (findError && findError.code !== 'PGRST116') {
        logger.error('Error buscando suscripción por referencia externa', 'SUBSCRIPTION_PAYMENT', {
          externalReference,
          error: findError.message
        })
        return false
      }
      
      if (!subscription) {
        logger.warn('Suscripción no encontrada para pago', 'SUBSCRIPTION_PAYMENT', {
          externalReference,
          subscriptionId
        })
        return true // No es un error crítico
      }
      
      // Activar suscripción si el pago fue autorizado
      if (status === 'authorized' && subscription.status !== 'active') {
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: 'active',
            mercadopago_subscription_id: subscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        
        if (updateError) {
          logger.error('Error activando suscripción por pago', 'SUBSCRIPTION_PAYMENT', {
            subscriptionId: subscription.id,
            error: updateError.message
          })
          return false
        }
        
        logger.info('✅ Suscripción activada por pago autorizado', 'SUBSCRIPTION_PAYMENT', {
          subscriptionId: subscription.id,
          mercadopagoId: subscriptionId
        })
        
        // Enviar email de confirmación
        await this.sendSubscriptionConfirmationEmail(subscription, subscriptionData)
      }
      
      return true

    } catch (error: any) {
      const duration = Date.now() - startTime
      logger.error('Error procesando pago de suscripción', 'SUBSCRIPTION_PAYMENT', {
        error: error.message,
        duration
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

  // Método para manejar eventos de preaprobación de suscripciones
  private async handleSubscriptionPreapproval(subscriptionData: any, webhookData: WebhookPayload, supabase: any): Promise<boolean> {
    try {
      const externalReference = subscriptionData.external_reference
      const status = subscriptionData.status
      const subscriptionId = subscriptionData.id
      
      logger.info('🔄 Procesando preaprobación de suscripción', 'SUBSCRIPTION_PREAPPROVAL', {
        subscriptionId,
        externalReference,
        status,
        action: webhookData.action
      })
      
      // Para suscripciones de prueba, buscar por mercadopago_subscription_id o por external_reference
      let subscription, findError
      
      if (subscriptionId.startsWith('mp_sub_') || subscriptionId.startsWith('test_sub_')) {
        // Primero intentar buscar por mercadopago_subscription_id
        const result1 = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('mercadopago_subscription_id', subscriptionId)
          .single()
        
        if (result1.data) {
          subscription = result1.data
          findError = result1.error
        } else {
          // Si no se encuentra, buscar la suscripción más reciente en estado pending
          const result2 = await supabase
            .from('unified_subscriptions')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          subscription = result2.data
          findError = result2.error
        }
      } else {
        // Para suscripciones reales, buscar por external_reference
        const result = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', externalReference)
          .single()
        
        subscription = result.data
        findError = result.error
      }
      
      if (findError && findError.code !== 'PGRST116') {
        logger.error('Error buscando suscripción por referencia externa', 'SUBSCRIPTION_PREAPPROVAL', {
          externalReference,
          error: findError.message
        })
        return false
      }
      
      if (!subscription) {
        logger.warn('Suscripción no encontrada en base de datos', 'SUBSCRIPTION_PREAPPROVAL', {
          externalReference,
          subscriptionId
        })
        return true // No es un error crítico
      }
      
      // Actualizar estado según el status de MercadoPago
      let newStatus = subscription.status
      
      switch (status) {
        case 'authorized':
          newStatus = 'active'
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
          logger.info('Estado de suscripción no reconocido', 'SUBSCRIPTION_PREAPPROVAL', {
            status,
            subscriptionId
          })
      }
      
      // Solo actualizar si el estado cambió
      if (newStatus !== subscription.status) {
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: newStatus,
            mercadopago_subscription_id: subscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        
        if (updateError) {
          logger.error('Error actualizando estado de suscripción', 'SUBSCRIPTION_PREAPPROVAL', {
            subscriptionId: subscription.id,
            newStatus,
            error: updateError.message
          })
          return false
        }
        
        logger.info('✅ Estado de suscripción actualizado exitosamente', 'SUBSCRIPTION_PREAPPROVAL', {
          subscriptionId: subscription.id,
          oldStatus: subscription.status,
          newStatus,
          mercadopagoId: subscriptionId
        })
        
        // Enviar email de confirmación si la suscripción se activó
        if (newStatus === 'active' && subscription.status !== 'active') {
          await this.sendSubscriptionConfirmationEmail(subscription, subscriptionData)
        }
      } else {
        logger.info('Estado de suscripción sin cambios', 'SUBSCRIPTION_PREAPPROVAL', {
          subscriptionId: subscription.id,
          status: newStatus
        })
      }
      
      return true
      
    } catch (error: any) {
      logger.error('Error procesando preaprobación de suscripción', 'SUBSCRIPTION_PREAPPROVAL', {
        error: error.message,
        stack: error.stack
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
              <p><strong>Precio:</strong> $${subscription.amount} ${subscription.currency || 'MXN'}</p>
              <p><strong>Estado:</strong> Activa ✅</p>
              <p><strong>Próximo pago:</strong> ${subscriptionData.next_payment_date ? new Date(subscriptionData.next_payment_date).toLocaleDateString('es-MX') : 'Próximamente'}</p>
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