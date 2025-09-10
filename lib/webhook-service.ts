import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import logger, { LogCategory } from '@/lib/logger'
import { extractCustomerEmail, extractCustomerName } from '@/lib/email-utils'
import webhookMonitor from '@/lib/webhook-monitor'
import autoSyncService from '@/lib/auto-sync-service'

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

  async initializeSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
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
      logger.info('Obteniendo datos de pago desde MercadoPago', 'PAYMENT', { paymentId })
      
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
        currency: paymentData.currency_id,
        duration
      })
      
      return paymentData
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error en API de MercadoPago para pago', 'PAYMENT', {
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
      // Si es un ID de prueba, crear datos simulados
      if (subscriptionId.includes('test_') || subscriptionId.includes('subscription_test_') || subscriptionId.includes('payment_test_') || /^\d{1,6}$/.test(subscriptionId)) {
        logger.info('Generando datos de suscripción simulados para prueba', 'SUBSCRIPTION', { subscriptionId })
        
        return {
          id: subscriptionId,
          status: 'authorized',
          reason: 'test_subscription',
          payer_email: 'test@example.com',
          external_reference: `test_ref_${Date.now()}`,
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: 299.00,
            currency_id: 'MXN'
          }
        }
      }
      
      logger.info('Obteniendo datos de suscripción desde MercadoPago', 'SUBSCRIPTION', { subscriptionId })
      
      const response = await fetch(`https://api.mercadopago.com/v1/preapproval/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.mercadoPagoToken}`,
          'Content-Type': 'application/json'
        }
      })

      const duration = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Error obteniendo suscripción desde MercadoPago API', 'SUBSCRIPTION', {
          subscriptionId,
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          url: `https://api.mercadopago.com/v1/preapproval/${subscriptionId}`,
          duration
        })
        return null
      }

      const subscriptionData = await response.json()
      
      logger.info('Datos de suscripción obtenidos exitosamente', 'SUBSCRIPTION', {
        subscriptionId,
        status: subscriptionData.status,
        payerEmail: subscriptionData.payer_email,
        duration
      })
      
      return subscriptionData
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error en API de MercadoPago para suscripción', 'SUBSCRIPTION', {
        subscriptionId,
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        url: `https://api.mercadopago.com/v1/preapproval/${subscriptionId}`,
        hasToken: !!this.mercadoPagoToken,
        tokenLength: this.mercadoPagoToken ? this.mercadoPagoToken.length : 0,
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
          paymentId,
          duration: Date.now() - startTime
        })
        return false
      }

      logger.info('Datos del pago obtenidos para webhook', 'WEBHOOK', {
        paymentId: paymentData.id,
        status: paymentData.status,
        amount: paymentData.transaction_amount,
        currency: paymentData.currency_id,
        externalReference: paymentData.external_reference,
        payerEmail: paymentData.payer?.email
      })

      // Determinar si es pago de orden o suscripción
      const isSubscriptionPayment = paymentData.metadata?.subscription_id || 
                                   paymentData.external_reference?.startsWith('subscription_')

      logger.info('Tipo de pago determinado', 'WEBHOOK', {
        paymentId,
        isSubscriptionPayment,
        hasMetadataSubscriptionId: !!paymentData.metadata?.subscription_id,
        externalReferenceStartsWithSubscription: paymentData.external_reference?.startsWith('subscription_')
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
          logger.error('Fallo en el procesamiento del webhook de pago', 'WEBHOOK', {
            eventId,
            paymentId,
            isSubscriptionPayment,
            duration
          })
          
          // Registrar error en el monitor
          webhookMonitor.logWebhookError(eventId, 'Fallo en el procesamiento del webhook de pago', duration)
          
          // Intentar auto-sincronización como respaldo
          logger.info('Iniciando auto-sincronización de respaldo', 'WEBHOOK', {
            eventId,
            paymentId
          })
          
          try {
            const autoSyncResult = await autoSyncService.autoSyncOnWebhookFailure(
              paymentId, 
              paymentData.external_reference
            )
            
            if (autoSyncResult.success) {
              logger.info('Auto-sincronización exitosa después de fallo de webhook', 'WEBHOOK', {
                eventId,
                paymentId,
                orderId: autoSyncResult.orderId,
                action: autoSyncResult.action
              })
              
              // Actualizar el monitor con éxito de auto-sync
              webhookMonitor.logWebhookProcessed(eventId, duration)
              return true
            } else {
              logger.warn('Auto-sincronización también falló', 'WEBHOOK', {
                eventId,
                paymentId,
                error: autoSyncResult.error
              })
            }
          } catch (autoSyncError) {
            logger.error('Error en auto-sincronización de respaldo', 'WEBHOOK', {
              eventId,
              paymentId,
              error: autoSyncError.message
            })
          }
        }
      
      return result

    } catch (error) {
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

  // Procesar webhook de suscripción
  async processSubscriptionWebhook(webhookData: WebhookPayload): Promise<boolean> {
    const startTime = Date.now()
    const subscriptionId = webhookData.data.id
    
    try {
      logger.info('Iniciando procesamiento de webhook de suscripción', 'WEBHOOK', {
        subscriptionId,
        type: webhookData.type,
        action: webhookData.action,
        liveMode: webhookData.live_mode
      })
      
      const supabase = await this.initializeSupabase()
      
      // Obtener datos de la suscripción
      const subscriptionData = await this.getSubscriptionData(subscriptionId)
      if (!subscriptionData) {
        logger.error('No se pudieron obtener datos de la suscripción desde MercadoPago', 'WEBHOOK', {
          subscriptionId,
          duration: Date.now() - startTime
        })
        return false
      }

      // Actualizar suscripción en base de datos
      await this.updateLocalSubscription(subscriptionData, supabase)

      // Manejar acciones específicas
      logger.info('Procesando acción específica de suscripción', 'WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        subscriptionStatus: subscriptionData.status
      })
      
      switch (webhookData.action) {
        case 'created':
          await this.handleSubscriptionCreated(subscriptionData, supabase)
          break
        case 'updated':
          await this.handleSubscriptionUpdated(subscriptionData, supabase)
          break
        case 'cancelled':
          await this.handleSubscriptionCancelled(subscriptionData, supabase)
          break
        case 'payment_created':
        case 'payment_updated':
          // Estos se manejan en el webhook de pagos
          logger.info('Acción de pago delegada al webhook de pagos', 'WEBHOOK', {
            subscriptionId,
            action: webhookData.action
          })
          break
        default:
          logger.warn('Acción de suscripción no manejada', 'WEBHOOK', {
            subscriptionId,
            action: webhookData.action
          })
      }

      const duration = Date.now() - startTime
      logger.info('Webhook de suscripción procesado exitosamente', 'WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        duration
      })
      
      return true

    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error procesando webhook de suscripción', 'WEBHOOK', {
        subscriptionId,
        action: webhookData.action,
        error: error.message,
        stack: error.stack,
        duration
      })
      return false
    }
  }

  // Manejar pago de orden
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

      // SEGUNDA VALIDACIÓN: Validación automática cuando el cliente efectivamente paga
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
           
           // Notificar al sistema de monitoreo
           webhookMonitor.logWebhookProcessed(eventId, Date.now() - startTime)
           
           logger.info('✅ Validación automática de pago completada exitosamente', 'PAYMENT_COMPLETED', {
             paymentId,
             orderId,
             emailsSent: true,
             customerEmailSent: true,
             adminEmailSent: true,
             processingTime: Date.now() - startTime
           })
         } else {
           logger.info('💰 Pago pendiente - Monitoreando estado', 'PAYMENT_PENDING', {
             paymentId,
             orderId,
             status: paymentData.status,
             paymentMethod: paymentData.payment_method_id
           })
         }

      const duration = Date.now() - startTime
      logger.info('Pago de orden procesado exitosamente', 'ORDER', {
        paymentId,
        orderId,
        finalStatus: orderStatus,
        duration
      })
      
      return true

    } catch (error) {
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

  // Manejar pago de suscripción
  private async handleSubscriptionPayment(paymentData: PaymentData, supabase: any): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      const subscriptionId = paymentData.metadata?.subscription_id || 
                           paymentData.external_reference?.replace('subscription_', '')
      const paymentId = paymentData.id
      
      logger.info('Iniciando manejo de pago de suscripción', 'SUBSCRIPTION', {
        paymentId,
        subscriptionId,
        paymentStatus: paymentData.status,
        amount: paymentData.transaction_amount
      })
      
      if (!subscriptionId) {
        logger.warn('Pago sin referencia de suscripción - procesado sin acción', 'SUBSCRIPTION', {
          paymentId,
          payerEmail: paymentData.payer?.email
        })
        return true
      }

      // Verificar si ya existe el registro de pago
      const { data: existingPayment } = await supabase
        .from('subscription_billing_history')
        .select('id')
        .eq('mercadopago_payment_id', paymentData.id.toString())
        .single()

      const billingData = {
        subscription_id: subscriptionId,
        billing_date: paymentData.date_created,
        amount: paymentData.transaction_amount,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        payment_method: paymentData.payment_method_id,
        mercadopago_payment_id: paymentData.id.toString(),
        payment_details: {
          currency_id: paymentData.currency_id,
          payment_type_id: paymentData.payment_type_id,
          date_approved: paymentData.date_approved,
          payer_email: paymentData.payer?.email
        },
        updated_at: new Date().toISOString()
      }

      logger.info('Registrando pago en historial de facturación', 'SUBSCRIPTION', {
        paymentId,
        subscriptionId,
        amount: paymentData.transaction_amount,
        currency: paymentData.currency_id,
        paymentMethod: paymentData.payment_method_id,
        isUpdate: !!existingPayment
      })

      if (existingPayment) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('subscription_billing_history')
          .update(billingData)
          .eq('id', existingPayment.id)

        if (error) {
          logger.error('Error actualizando historial de facturación', 'SUBSCRIPTION', {
            paymentId,
            subscriptionId,
            error: error.message,
            duration: Date.now() - startTime
          })
          return false
        }
      } else {
        // Crear nuevo registro
        const { error } = await supabase
          .from('subscription_billing_history')
          .insert(billingData)

        if (error) {
          logger.error('Error creando historial de facturación', 'SUBSCRIPTION', {
            paymentId,
            subscriptionId,
            error: error.message,
            duration: Date.now() - startTime
          })
          return false
        }
      }

      // Actualizar fecha de último pago y estado en la suscripción si fue aprobado
      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            last_billing_date: paymentData.date_created,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId)

        if (subscriptionError) {
          logger.error('Error actualizando suscripción', 'SUBSCRIPTION', {
            paymentId,
            subscriptionId,
            error: subscriptionError.message
          })
        } else {
          logger.info('Suscripción activada por pago aprobado', 'SUBSCRIPTION', {
            paymentId,
            subscriptionId,
            newStatus: 'active'
          })
        }

        // Enviar email de confirmación de pago
        logger.info('Enviando email de confirmación de pago de suscripción', 'SUBSCRIPTION', {
          paymentId,
          subscriptionId,
          payerEmail: paymentData.payer?.email
        })
        await this.sendSubscriptionPaymentEmail(subscriptionId, paymentData, supabase)
      }

      const duration = Date.now() - startTime
      logger.info('Pago de suscripción procesado exitosamente', 'SUBSCRIPTION', {
        paymentId,
        subscriptionId,
        finalStatus: paymentData.status,
        isApproved: paymentData.status === 'approved' || paymentData.status === 'paid',
        duration
      })
      
      return true

    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error manejando pago de suscripción', 'SUBSCRIPTION', {
        paymentId: paymentData.id,
        subscriptionId,
        error: error.message,
        stack: error.stack,
        duration
      })
      return false
    }
  }

  // Actualizar suscripción local
  private async updateLocalSubscription(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    try {
      const updateData = {
        status: subscriptionData.status,
        next_payment_date: subscriptionData.next_payment_date,
        updated_at: new Date().toISOString()
      }

      // Buscar por external_reference si no se encuentra por mercadopago_subscription_id
      let { data: subscription, error: findError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('mercadopago_subscription_id', subscriptionData.id)
        .single()

      if (findError && subscriptionData.external_reference) {
        const { data: subscriptionByRef } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('external_reference', subscriptionData.external_reference)
          .single()
        
        subscription = subscriptionByRef
      }

      if (!subscription) {
        logger.warn('Suscripción no encontrada para actualizar', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          externalReference: subscriptionData.external_reference
        })
        return
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscription.id)

      if (error) {
        logger.error('Error actualizando suscripción local', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          error: error.message
        })
      } else {
        logger.info('Suscripción actualizada localmente', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          status: subscriptionData.status
        })
      }
    } catch (error) {
      logger.error('Error en updateLocalSubscription', 'SUBSCRIPTION', {
        subscriptionId: subscriptionData.id,
        error: error.message
      })
    }
  }

  // Manejar suscripción creada
  private async handleSubscriptionCreated(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    logger.info('Suscripción creada', 'SUBSCRIPTION', {
      subscriptionId: subscriptionData.id,
      payerEmail: subscriptionData.payer_email,
      status: subscriptionData.status
    })
    
    try {
      // Buscar suscripción pendiente por mercadopago_subscription_id o external_reference
      let pendingSubscription = null
      let pendingError = null

      // Primero buscar por mercadopago_subscription_id
      const { data: pendingById, error: errorById } = await supabase
        .from('pending_subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', subscriptionData.id)
        .eq('status', 'pending')
        .single()

      if (pendingById) {
        pendingSubscription = pendingById
      } else if (subscriptionData.external_reference) {
        // Si no se encuentra por ID, buscar por external_reference
        const { data: pendingByRef, error: errorByRef } = await supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('external_reference', subscriptionData.external_reference)
          .eq('status', 'pending')
          .single()
        
        pendingSubscription = pendingByRef
        pendingError = errorByRef
      }

      if (pendingError && pendingError.code !== 'PGRST116') {
        logger.error('Error buscando suscripción pendiente', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          error: pendingError.message
        })
      }

      if (pendingSubscription) {
        logger.info('Suscripción pendiente encontrada, activando...', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          pendingId: pendingSubscription.id,
          userId: pendingSubscription.user_id
        })

        // Calcular próxima fecha de facturación basada en la frecuencia
        const nextBillingDate = this.calculateNextBillingDate(
          pendingSubscription.subscription_type || 'monthly'
        )

        // Preparar metadata con información completa
        const metadata = {
          preapproval_id: subscriptionData.id,
          processed_via_webhook: true,
          original_cart_items: pendingSubscription.metadata?.original_cart_items || [],
          ...pendingSubscription.metadata
        }

        // Crear suscripción activa en user_subscriptions con todos los campos necesarios
        const { data: activeSubscription, error: activeError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: pendingSubscription.user_id,
            product_id: pendingSubscription.product_id,
            subscription_type: pendingSubscription.subscription_type || 'monthly',
            status: 'active',
            quantity: pendingSubscription.quantity || 1,
            size: pendingSubscription.size,
            discount_percentage: pendingSubscription.discount_percentage || 0,
            base_price: pendingSubscription.base_price,
            discounted_price: pendingSubscription.discounted_price || pendingSubscription.base_price,
            next_billing_date: nextBillingDate,
            mercadopago_subscription_id: subscriptionData.id,
            external_reference: subscriptionData.external_reference || subscriptionData.id,
            frequency: this.getFrequencyFromType(pendingSubscription.subscription_type || 'monthly'),
            frequency_type: this.getFrequencyTypeFromType(pendingSubscription.subscription_type || 'monthly'),
            start_date: new Date().toISOString(),
            currency_id: 'MXN',
            transaction_amount: pendingSubscription.discounted_price || pendingSubscription.base_price,
            metadata: metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (activeError) {
          logger.error('Error creando suscripción activa', 'SUBSCRIPTION', {
            subscriptionId: subscriptionData.id,
            error: activeError.message
          })
        } else {
          logger.info('Suscripción activa creada exitosamente', 'SUBSCRIPTION', {
            subscriptionId: subscriptionData.id,
            activeSubscriptionId: activeSubscription.id,
            userId: pendingSubscription.user_id
          })

          // Marcar suscripción pendiente como procesada
          const { error: updateError } = await supabase
            .from('pending_subscriptions')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', pendingSubscription.id)

          if (updateError) {
            logger.error('Error marcando suscripción pendiente como procesada', 'SUBSCRIPTION', {
              pendingId: pendingSubscription.id,
              error: updateError.message
            })
          }

          // Log de suscripción activada exitosamente
          logger.info('Suscripción activada exitosamente para el usuario', 'SUBSCRIPTION', {
            userId: pendingSubscription.user_id,
            subscriptionId: subscriptionData.id,
            activeSubscriptionId: activeSubscription.id
          })
        }
      } else {
        logger.warn('No se encontró suscripción pendiente para procesar', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          externalReference: subscriptionData.external_reference
        })
      }

      // Enviar email de confirmación
      await this.sendEmail({
        to: subscriptionData.payer_email,
        subject: '🎉 ¡Tu suscripción a Pet Gourmet está activa!',
        html: this.getSubscriptionCreatedEmailTemplate(subscriptionData)
      })
      
      logger.info('Email de suscripción creada enviado', 'SUBSCRIPTION', {
        subscriptionId: subscriptionData.id,
        payerEmail: subscriptionData.payer_email
      })
    } catch (error) {
      logger.error('Error manejando suscripción creada', 'SUBSCRIPTION', {
        subscriptionId: subscriptionData.id,
        error: error.message
      })
    }
  }

  // Funciones auxiliares para calcular frecuencia
  private getFrequencyFromType(subscriptionType: string): number {
    const frequencyMap: Record<string, number> = {
      'weekly': 1,
      'biweekly': 2,
      'monthly': 1,
      'quarterly': 3
    }
    return frequencyMap[subscriptionType] || 1
  }

  private getFrequencyTypeFromType(subscriptionType: string): string {
    const typeMap: Record<string, string> = {
      'weekly': 'weeks',
      'biweekly': 'weeks',
      'monthly': 'months',
      'quarterly': 'months'
    }
    return typeMap[subscriptionType] || 'months'
  }

  private calculateNextBillingDate(subscriptionType: string): string {
    const now = new Date()
    const frequency = this.getFrequencyFromType(subscriptionType)
    const frequencyType = this.getFrequencyTypeFromType(subscriptionType)
    
    if (frequencyType === 'weeks') {
      now.setDate(now.getDate() + (frequency * 7))
    } else if (frequencyType === 'months') {
      now.setMonth(now.getMonth() + frequency)
    }
    
    return now.toISOString()
  }

  // Manejar suscripción actualizada
  private async handleSubscriptionUpdated(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    logger.info('Suscripción actualizada', 'SUBSCRIPTION', {
      subscriptionId: subscriptionData.id,
      status: subscriptionData.status,
      externalReference: subscriptionData.external_reference
    })
    
    try {
      // Buscar suscripción existente
      let { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', subscriptionData.id)
        .single()

      if (!subscription && subscriptionData.external_reference) {
        const { data: subscriptionByRef } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('external_reference', subscriptionData.external_reference)
          .single()
        
        subscription = subscriptionByRef
      }

      if (subscription) {
        // Actualizar datos de la suscripción
        const updateData: any = {
          status: subscriptionData.status,
          updated_at: new Date().toISOString()
        }

        // Si hay próxima fecha de pago, actualizarla
        if (subscriptionData.next_payment_date) {
          updateData.next_billing_date = subscriptionData.next_payment_date
        }

        // Mapear el estado de MercadoPago al estado local
        // Solo considerar 'authorized' y 'active' como estados activos
        if (subscriptionData.status === 'authorized' || subscriptionData.status === 'active') {
          updateData.status = 'active'
        } else if (subscriptionData.status === 'paused') {
          updateData.status = 'paused'
        } else if (subscriptionData.status === 'cancelled') {
          updateData.status = 'cancelled'
        } else {
          // Para otros estados, mantener el estado actual pero actualizar el timestamp
          updateData.status = subscriptionData.status
        }

        const { error } = await supabase
          .from('user_subscriptions')
          .update(updateData)
          .eq('id', subscription.id)

        if (error) {
          logger.error('Error actualizando suscripción', 'SUBSCRIPTION', {
            subscriptionId: subscriptionData.id,
            error: error.message
          })
        } else {
          logger.info('Suscripción actualizada exitosamente', 'SUBSCRIPTION', {
            subscriptionId: subscriptionData.id,
            newStatus: subscriptionData.status
          })
        }
      } else {
        logger.warn('Suscripción no encontrada para actualizar', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          externalReference: subscriptionData.external_reference
        })
      }
    } catch (error) {
      logger.error('Error manejando actualización de suscripción', 'SUBSCRIPTION', {
        subscriptionId: subscriptionData.id,
        error: error.message
      })
    }
  }

  // Manejar suscripción cancelada
  private async handleSubscriptionCancelled(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    logger.info('Suscripción cancelada', 'SUBSCRIPTION', {
      subscriptionId: subscriptionData.id,
      payerEmail: subscriptionData.payer_email,
      reason: subscriptionData.reason
    })
    
    try {
      // Buscar suscripción por ID o external_reference
      let { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', subscriptionData.id)
        .single()

      if (!subscription && subscriptionData.external_reference) {
        const { data: subscriptionByRef } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('external_reference', subscriptionData.external_reference)
          .single()
        
        subscription = subscriptionByRef
      }

      if (subscription) {
        // Marcar como cancelada en base de datos
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            reason: subscriptionData.reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)

        // Actualizar perfil del usuario si no tiene más suscripciones activas
        const { data: activeSubscriptions } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', subscription.user_id)
          .eq('status', 'active')

        // Log del estado de suscripciones activas del usuario
        logger.info('Usuario después de cancelación', 'SUBSCRIPTION', {
          userId: subscription.user_id,
          remainingActiveSubscriptions: activeSubscriptions?.length || 0
        })

        logger.info('Suscripción marcada como cancelada en BD', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          localId: subscription.id
        })
      } else {
        logger.warn('Suscripción no encontrada para cancelar', 'SUBSCRIPTION', {
          subscriptionId: subscriptionData.id,
          externalReference: subscriptionData.external_reference
        })
      }

      // Enviar email de cancelación
      await this.sendEmail({
        to: subscriptionData.payer_email,
        subject: '📋 Suscripción cancelada - Pet Gourmet',
        html: this.getSubscriptionCancelledEmailTemplate(subscriptionData)
      })
      
      logger.info('Email de cancelación enviado', 'SUBSCRIPTION', {
        subscriptionId: subscriptionData.id,
        payerEmail: subscriptionData.payer_email
      })
    } catch (error) {
      logger.error('Error manejando cancelación de suscripción', 'SUBSCRIPTION', {
        subscriptionId: subscriptionData.id,
        error: error.message
      })
    }
  }

  // Mapear estado de pago a estado de orden
  private mapPaymentStatusToOrderStatus(paymentStatus: string): string {
    const statusMap: Record<string, string> = {
      'approved': 'confirmed',
      'paid': 'confirmed',
      'pending': 'pending_payment',
      'in_process': 'processing',
      'cancelled': 'cancelled',
      'rejected': 'cancelled',
      'refunded': 'refunded'
    }
    
    return statusMap[paymentStatus] || 'pending_payment'
  }

  // Enviar email
  private async sendEmail(emailData: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      })
      
      console.log(`📧 Email enviado a ${emailData.to}`)
    } catch (error) {
      console.error('❌ Error enviando email:', error)
    }
  }

  // Templates de email
  private getSubscriptionCreatedEmailTemplate(subscriptionData: SubscriptionData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">🎉 ¡Bienvenido a Pet Gourmet!</h1>
          <p style="color: #64748b; font-size: 16px;">Tu suscripción ha sido activada exitosamente</p>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #2563eb;">
          <h3 style="color: #1e293b; margin-top: 0;">📋 Detalles de tu suscripción</h3>
          <ul style="color: #475569; line-height: 1.6;">
            <li><strong>Descripción:</strong> ${subscriptionData.reason}</li>
            <li><strong>ID de suscripción:</strong> ${subscriptionData.id}</li>
            <li><strong>Estado:</strong> ${subscriptionData.status}</li>
            ${subscriptionData.next_payment_date ? `<li><strong>Próximo cobro:</strong> ${new Date(subscriptionData.next_payment_date).toLocaleDateString('es-MX')}</li>` : ''}
            ${subscriptionData.auto_recurring ? `<li><strong>Monto:</strong> $${subscriptionData.auto_recurring.transaction_amount} ${subscriptionData.auto_recurring.currency_id}</li>` : ''}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #475569; margin-bottom: 20px;">¡Gracias por confiar en Pet Gourmet para el cuidado de tu mascota!</p>
          <a href="https://petgourmet.mx/perfil" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mi perfil</a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">Pet Gourmet - Nutrición premium para tu mascota</p>
        </div>
      </div>
    `
  }

  private getSubscriptionCancelledEmailTemplate(subscriptionData: SubscriptionData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin-bottom: 10px;">📋 Suscripción cancelada</h1>
          <p style="color: #64748b; font-size: 16px;">Tu suscripción a Pet Gourmet ha sido cancelada</p>
        </div>
        
        <div style="background: #fef2f2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #dc2626;">
          <h3 style="color: #1e293b; margin-top: 0;">📋 Detalles de la cancelación</h3>
          <ul style="color: #475569; line-height: 1.6;">
            <li><strong>Suscripción:</strong> ${subscriptionData.reason}</li>
            <li><strong>ID:</strong> ${subscriptionData.id}</li>
            <li><strong>Fecha de cancelación:</strong> ${new Date().toLocaleDateString('es-MX')}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #475569; margin-bottom: 20px;">Lamentamos verte partir. Si cambias de opinión, estaremos aquí para ti.</p>
          <a href="https://petgourmet.mx/productos" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Explorar productos</a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">Pet Gourmet - Siempre aquí para tu mascota</p>
        </div>
      </div>
    `
  }

  // Enviar email de notificación de nueva compra a administradores
  private async sendNewOrderNotificationEmail(order: any, paymentData: PaymentData): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Parsear datos del pedido si existen
      let orderItems = []
      if (order.shipping_address) {
        try {
          const orderData = typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address
          orderItems = orderData.items || []
        } catch (e) {
          // Si no se puede parsear, continuar sin items
        }
      }

      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; background: #1e40af; color: white; padding: 20px; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">🛒 Nueva Compra Realizada</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Se ha procesado un nuevo pedido en Pet Gourmet</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin-top: 0;">📋 Información del Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Número de Pedido:</td>
                <td style="padding: 8px 0; color: #1e293b;">#${order.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Monto Total:</td>
                <td style="padding: 8px 0; color: #16a34a; font-weight: bold;">$${paymentData.transaction_amount} ${paymentData.currency_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Payment ID:</td>
                <td style="padding: 8px 0; color: #1e293b; font-family: monospace;">${paymentData.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Método de Pago:</td>
                <td style="padding: 8px 0; color: #1e293b;">${paymentData.payment_method_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Fecha de Pago:</td>
                <td style="padding: 8px 0; color: #1e293b;">${new Date(paymentData.date_created).toLocaleString('es-MX')}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin-top: 0;">👤 Información del Cliente</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Nombre:</td>
                <td style="padding: 8px 0; color: #1e293b;">${order.customer_name || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Email:</td>
                <td style="padding: 8px 0; color: #1e293b;">${order.customer_email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Teléfono:</td>
                <td style="padding: 8px 0; color: #1e293b;">${order.customer_phone || 'No especificado'}</td>
              </tr>
            </table>
          </div>
          
          ${orderItems.length > 0 ? `
          <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin-top: 0;">📦 Productos Pedidos</h3>
            ${orderItems.map(item => `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                <strong>${item.title || item.product_name}</strong><br>
                <span style="color: #6b7280;">Cantidad: ${item.quantity} | Precio: $${item.unit_price || item.price}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://petgourmet.mx/admin" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver en Panel de Admin</a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">Pet Gourmet - Sistema de Notificaciones</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">Este email se envía automáticamente cuando se procesa un nuevo pedido</p>
          </div>
        </div>
      `

      await this.sendEmail({
        to: 'contacto@petgourmet.mx',
        subject: `🛒 Nueva Compra #${order.id} - $${paymentData.transaction_amount} ${paymentData.currency_id}`,
        html: emailTemplate
      })

      const duration = Date.now() - startTime
      logger.info('Email de notificación de nueva compra enviado exitosamente', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        amount: paymentData.transaction_amount,
        customerEmail: order.customer_email,
        duration
      })
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error enviando email de notificación de nueva compra', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        error: error.message,
        duration
      })
    }
  }

  // Enviar email de agradecimiento inmediato al completar pago
  private async sendThankYouEmail(order: any, paymentData: PaymentData): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Obtener el email del cliente usando la función utilitaria
      const recipientEmail = extractCustomerEmail(order, paymentData)
      const customerName = extractCustomerName(order, paymentData)
      
      logger.info('Enviando email de agradecimiento', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        recipientEmail,
        amount: paymentData.transaction_amount
      })

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

      await this.sendEmail({
        to: recipientEmail,
        subject: '🎉 ¡Gracias por tu compra! Pago confirmado - Pet Gourmet',
        html: emailTemplate
      })

      const duration = Date.now() - startTime
      logger.info('Email de agradecimiento enviado exitosamente', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        recipientEmail,
        duration
      })
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error enviando email de agradecimiento', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        error: error.message,
        duration
      })
    }
  }

  // Enviar email de confirmación de orden
  private async sendOrderConfirmationEmail(order: any, paymentData: PaymentData): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Obtener el email del cliente usando la función utilitaria
      const recipientEmail = extractCustomerEmail(order, paymentData)
      const customerName = extractCustomerName(order, paymentData)
      
      logger.info('Enviando email de confirmación de orden', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        recipientEmail,
        amount: paymentData.transaction_amount
      })

      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin-bottom: 10px;">✅ ¡Pago confirmado!</h1>
            <p style="color: #64748b; font-size: 16px;">Tu pedido ha sido procesado exitosamente</p>
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
            <p style="color: #475569; margin-bottom: 20px;">¡Gracias por tu compra! Procesaremos tu pedido pronto.</p>
            <a href="https://petgourmet.mx/perfil" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mis pedidos</a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">Pet Gourmet - Nutrición premium para tu mascota</p>
          </div>
        </div>
      `

      await this.sendEmail({
        to: recipientEmail,
        subject: '✅ Pago confirmado - Pet Gourmet',
        html: emailTemplate
      })

      const duration = Date.now() - startTime
      logger.info('Email de confirmación de orden enviado exitosamente', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        recipientEmail,
        duration
      })
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error enviando email de confirmación de orden', 'ORDER', {
        orderId: order.id,
        paymentId: paymentData.id,
        error: error.message,
        duration
      })
    }
  }

  // Enviar email de pago de suscripción
  private async sendSubscriptionPaymentEmail(subscriptionId: string, paymentData: PaymentData, supabase: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Obtener detalles de la suscripción
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*, product:products(*)')
        .eq('id', subscriptionId)
        .single()

      if (!subscription) {
        logger.error('Suscripción no encontrada para email de pago', 'SUBSCRIPTION', {
          subscriptionId,
          paymentId: paymentData.id
        })
        return
      }

      const recipientEmail = paymentData.payer?.email || subscription.customer_email
      
      logger.info('Enviando email de pago de suscripción', 'SUBSCRIPTION', {
        subscriptionId,
        paymentId: paymentData.id,
        recipientEmail,
        productName: subscription.product?.name,
        amount: paymentData.transaction_amount
      })

      const emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin-bottom: 10px;">💳 Pago procesado</h1>
            <p style="color: #64748b; font-size: 16px;">Tu suscripción sigue activa</p>
          </div>
          
          <div style="background: #f0fdf4; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #16a34a;">
            <h3 style="color: #1e293b; margin-top: 0;">💳 Detalles del pago</h3>
            <ul style="color: #475569; line-height: 1.6;">
              <li><strong>Suscripción:</strong> ${subscription.product?.name || 'Suscripción Pet Gourmet'}</li>
              <li><strong>Monto:</strong> $${paymentData.transaction_amount} ${paymentData.currency_id}</li>
              <li><strong>Fecha de pago:</strong> ${new Date(paymentData.date_created).toLocaleDateString('es-MX')}</li>
              <li><strong>Método de pago:</strong> ${paymentData.payment_method_id}</li>
              <li><strong>ID de transacción:</strong> ${paymentData.id}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #475569; margin-bottom: 20px;">¡Gracias por mantener tu suscripción activa!</p>
            <a href="https://petgourmet.mx/perfil" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mi suscripción</a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">Pet Gourmet - Nutrición premium para tu mascota</p>
          </div>
        </div>
      `

      await this.sendEmail({
        to: recipientEmail,
        subject: '💳 Pago procesado - Suscripción Pet Gourmet',
        html: emailTemplate
      })

      const duration = Date.now() - startTime
      logger.info('Email de pago de suscripción enviado exitosamente', 'SUBSCRIPTION', {
        subscriptionId,
        paymentId: paymentData.id,
        recipientEmail,
        duration
      })
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error enviando email de pago de suscripción', 'SUBSCRIPTION', {
        subscriptionId,
        paymentId: paymentData.id,
        error: error.message,
        duration
      })
    }
  }
}

// Funciones auxiliares para manejar tipos específicos de webhooks de suscripción
export async function handleSubscriptionWebhook(webhookData: any): Promise<void> {
  try {
    const { type, data } = webhookData
    
    logger.info(LogCategory.WEBHOOK, 'Procesando webhook de suscripción', {
      type,
      subscriptionId: data?.id,
      status: data?.status,
      externalReference: data?.external_reference
    })
    
    const supabase = await createClient()
    
    // Procesar según el tipo de evento
    switch (type) {
      case 'subscription_preapproval':
        await handleSubscriptionPreapproval(data, supabase)
        break
      case 'subscription_authorized_payment':
        await handleSubscriptionPayment(data, supabase)
        break
      case 'subscription_preapproval_plan':
        await handleSubscriptionPlan(data, supabase)
        break
      default:
        logger.warn(LogCategory.WEBHOOK, 'Tipo de webhook de suscripción no manejado', { type })
    }
    
  } catch (error: any) {
    logger.error(LogCategory.WEBHOOK, 'Error procesando webhook de suscripción', error.message, {
      error: error.message,
      webhookData
    })
    throw error
  }
}

async function handleSubscriptionPreapproval(data: any, supabase: any): Promise<void> {
  try {
    logger.info(LogCategory.WEBHOOK, 'Procesando preapproval de suscripción', {
      subscriptionId: data.id,
      status: data.status,
      payerEmail: data.payer_email,
      externalReference: data.external_reference
    })
    
    // Extraer user_id del external_reference si está disponible
    let extractedUserId = null
    if (data.external_reference) {
      // Formato esperado: PG-SUB-timestamp-userId-planId
      const parts = data.external_reference.split('-')
      if (parts.length >= 4 && parts[0] === 'PG' && parts[1] === 'SUB') {
        extractedUserId = parts[3]
        logger.info(LogCategory.WEBHOOK, 'User ID extraído del external_reference', {
          externalReference: data.external_reference,
          extractedUserId
        })
      }
    }
    
    // Buscar suscripción pendiente y activarla
    if (data.external_reference) {
      const { data: pendingSub, error: findError } = await supabase
        .from('pending_subscriptions')
        .select('*')
        .eq('external_reference', data.external_reference)
        .eq('status', 'pending')
        .single()
      
      if (!findError && pendingSub) {
        // Usar el user_id de la suscripción pendiente o el extraído del external_reference
        const userId = pendingSub.user_id || extractedUserId
        
        if (!userId) {
          logger.error(LogCategory.WEBHOOK, 'No se pudo determinar el user_id para la suscripción', {
            subscriptionId: data.id,
            externalReference: data.external_reference
          })
          return
        }
        
        // Crear suscripción activa
        const subscriptionData = {
          user_id: userId,
          product_id: pendingSub.cart_items?.[0]?.id || null,
          subscription_type: pendingSub.subscription_type,
          status: data.status === 'authorized' ? 'active' : data.status,
          mercadopago_subscription_id: data.id,
          external_reference: data.external_reference,
          payer_email: data.payer_email,
          next_billing_date: data.next_payment_date,
          is_active: data.status === 'authorized',
          created_at: new Date().toISOString()
        }
        
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert(subscriptionData)
        
        if (!insertError) {
          // Marcar suscripción pendiente como procesada
          await supabase
            .from('pending_subscriptions')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              mercadopago_subscription_id: data.id
            })
            .eq('id', pendingSub.id)
          
          // Actualizar perfil del usuario con suscripción activa
          if (data.status === 'authorized') {
            await supabase
              .from('profiles')
              .update({
                has_active_subscription: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId)
          }
          
          logger.info(LogCategory.WEBHOOK, 'Suscripción activada exitosamente', {
            subscriptionId: data.id,
            userId: userId,
            status: data.status
          })
        } else {
          logger.error(LogCategory.WEBHOOK, 'Error creando suscripción activa', insertError.message, {
            error: insertError.message,
            subscriptionData
          })
        }
      } else if (extractedUserId) {
        // Si no hay suscripción pendiente pero tenemos user_id del external_reference,
        // crear la suscripción directamente (para casos de enlaces directos)
        logger.info(LogCategory.WEBHOOK, 'Creando suscripción directa desde external_reference', {
          subscriptionId: data.id,
          userId: extractedUserId
        })
        
        const subscriptionData = {
          user_id: extractedUserId,
          product_id: null, // Se puede determinar del plan_id si está disponible
          subscription_type: 'monthly', // Por defecto, se puede ajustar según el plan
          status: data.status === 'authorized' ? 'active' : data.status,
          mercadopago_subscription_id: data.id,
          external_reference: data.external_reference,
          payer_email: data.payer_email,
          next_billing_date: data.next_payment_date,
          is_active: data.status === 'authorized',
          created_at: new Date().toISOString()
        }
        
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert(subscriptionData)
        
        if (!insertError && data.status === 'authorized') {
          // Actualizar perfil del usuario con suscripción activa
          await supabase
            .from('profiles')
            .update({
              has_active_subscription: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', extractedUserId)
          
          logger.info(LogCategory.WEBHOOK, 'Suscripción directa creada exitosamente', {
            subscriptionId: data.id,
            userId: extractedUserId
          })
        } else if (insertError) {
          logger.error(LogCategory.WEBHOOK, 'Error creando suscripción directa', insertError.message, {
            error: insertError.message,
            subscriptionData
          })
        }
      } else {
        logger.warn(LogCategory.WEBHOOK, 'No se encontró suscripción pendiente ni user_id válido', {
          externalReference: data.external_reference,
          subscriptionId: data.id
        })
      }
    }
  } catch (error: any) {
    logger.error(LogCategory.WEBHOOK, 'Error en handleSubscriptionPreapproval', error.message, {
      error: error.message,
      subscriptionId: data.id,
      externalReference: data.external_reference
    })
  }
}

async function handleSubscriptionPayment(data: any, supabase: any): Promise<void> {
  try {
    logger.info(LogCategory.WEBHOOK, 'Procesando pago de suscripción', {
      paymentId: data.id,
      subscriptionId: data.preapproval_id,
      amount: data.transaction_amount,
      status: data.status
    })
    
    // Registrar pago en historial de facturación
    const billingData = {
      subscription_id: data.preapproval_id,
      mercadopago_payment_id: data.id,
      amount: data.transaction_amount,
      status: data.status,
      payment_method: data.payment_method_id,
      billing_date: data.date_created || new Date().toISOString(),
      created_at: new Date().toISOString()
    }
    
    await supabase
      .from('subscription_billing_history')
      .insert(billingData)
    
    // Actualizar próxima fecha de facturación si el pago fue exitoso
    if (data.status === 'approved') {
      const nextBillingDate = new Date()
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1) // Asumir mensual por defecto
      
      await supabase
        .from('user_subscriptions')
        .update({
          last_billing_date: data.date_created || new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('mercadopago_subscription_id', data.preapproval_id)
    }
    
    logger.info(LogCategory.WEBHOOK, 'Pago de suscripción procesado', {
      paymentId: data.id,
      status: data.status
    })
  } catch (error: any) {
    logger.error(LogCategory.WEBHOOK, 'Error en handleSubscriptionPayment', error.message, {
      error: error.message
    })
  }
}

async function handleSubscriptionPlan(data: any, supabase: any): Promise<void> {
  try {
    logger.info(LogCategory.WEBHOOK, 'Procesando plan de suscripción', {
      planId: data.id,
      status: data.status
    })
    
    // Aquí se puede manejar la lógica de planes de suscripción
    // Por ejemplo, actualizar configuraciones de planes
    
  } catch (error: any) {
    logger.error(LogCategory.WEBHOOK, 'Error en handleSubscriptionPlan', error.message, {
      error: error.message
    })
  }
}

export default WebhookService