import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import logger, { LogCategory } from '@/lib/logger'

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
      this.supabase = await createClient()
    }
    return this.supabase
  }

  // Validar firma del webhook
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret || !signature) {
      logger.warn(LogCategory.WEBHOOK, 'Webhook secret o signature no configurados - permitiendo en desarrollo', {
        hasSecret: !!this.webhookSecret,
        hasSignature: !!signature
      })
      return true // En desarrollo, permitir sin validación
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex')
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
      
      logger.info(LogCategory.WEBHOOK, 'Validación de firma de webhook', {
        isValid,
        signatureLength: signature.length,
        payloadLength: payload.length
      })
      
      return isValid
    } catch (error: any) {
      logger.error(LogCategory.WEBHOOK, 'Error validando firma del webhook', error.message, { error: error.message })
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
      logger.info('Obteniendo datos de suscripción desde MercadoPago', 'SUBSCRIPTION', { subscriptionId })
      
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
        duration
      })
      
      return subscriptionData
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error en API de MercadoPago para suscripción', 'SUBSCRIPTION', {
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
    
    try {
      logger.info('Iniciando procesamiento de webhook de pago', 'WEBHOOK', {
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
          paymentId,
          isSubscriptionPayment,
          duration
        })
      } else {
        logger.error('Fallo en el procesamiento del webhook de pago', 'WEBHOOK', {
          paymentId,
          isSubscriptionPayment,
          duration
        })
      }
      
      return result

    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Error procesando webhook de pago', 'WEBHOOK', {
        paymentId,
        error: error.message,
        stack: error.stack,
        duration
      })
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
        mercadopago_payment_id: paymentData.id.toString()
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

      // Enviar email de confirmación si el pago fue aprobado
      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        logger.info('Enviando email de confirmación de orden', 'ORDER', {
          paymentId,
          orderId,
          payerEmail: paymentData.payer?.email
        })
        await this.sendOrderConfirmationEmail(order, paymentData)
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

      // Actualizar fecha de último pago en la suscripción si fue aprobado
      if (paymentData.status === 'approved' || paymentData.status === 'paid') {
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .update({
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
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: subscriptionData.status,
          next_payment_date: subscriptionData.next_payment_date,
          updated_at: new Date().toISOString()
        })
        .eq('mercadopago_subscription_id', subscriptionData.id)

      if (error) {
        console.error('❌ Error actualizando suscripción local:', error)
      } else {
        console.log(`✅ Suscripción ${subscriptionData.id} actualizada localmente`)
      }
    } catch (error) {
      console.error('❌ Error en updateLocalSubscription:', error)
    }
  }

  // Manejar suscripción creada
  private async handleSubscriptionCreated(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    console.log(`🎉 Suscripción creada: ${subscriptionData.id}`)
    
    try {
      await this.sendEmail({
        to: subscriptionData.payer_email,
        subject: '🎉 ¡Tu suscripción a Pet Gourmet está activa!',
        html: this.getSubscriptionCreatedEmailTemplate(subscriptionData)
      })
    } catch (error) {
      console.error('❌ Error enviando email de suscripción creada:', error)
    }
  }

  // Manejar suscripción actualizada
  private async handleSubscriptionUpdated(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    console.log(`📝 Suscripción actualizada: ${subscriptionData.id} - Estado: ${subscriptionData.status}`)
  }

  // Manejar suscripción cancelada
  private async handleSubscriptionCancelled(subscriptionData: SubscriptionData, supabase: any): Promise<void> {
    console.log(`❌ Suscripción cancelada: ${subscriptionData.id}`)
    
    try {
      // Marcar como cancelada en base de datos
      await supabase
        .from('user_subscriptions')
        .update({
          is_active: false,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('mercadopago_subscription_id', subscriptionData.id)

      // Enviar email de cancelación
      await this.sendEmail({
        to: subscriptionData.payer_email,
        subject: '📋 Suscripción cancelada - Pet Gourmet',
        html: this.getSubscriptionCancelledEmailTemplate(subscriptionData)
      })
    } catch (error) {
      console.error('❌ Error manejando cancelación de suscripción:', error)
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

  // Enviar email de confirmación de orden
  private async sendOrderConfirmationEmail(order: any, paymentData: PaymentData): Promise<void> {
    const startTime = Date.now()
    
    try {
      const recipientEmail = paymentData.payer?.email || order.customer_email
      
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

export default WebhookService