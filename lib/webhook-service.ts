import { WebhookPayload } from '../lib/mercadopago/types'
import { PaymentData } from '../lib/mercadopago/types'
import { SubscriptionData } from '../lib/mercadopago/types'
import { createIdempotencyService } from '../lib/idempotency/service'
import logger from './logger'
import { getMercadoPagoAccessToken } from './mercadopago-config'

class WebhookService {

  /**
   * SISTEMA DE MAPEO ROBUSTO: Relaciona pagos con suscripciones usando múltiples estrategias
   * Especialmente útil cuando hay mismatch entre external_reference de pagos y suscripciones
   */
  private async createPaymentSubscriptionMapping(
    supabase: any,
    paymentData: any,
    subscriptionData?: any
  ): Promise<{ success: boolean; subscription?: any; mappingMethod?: string }> {
    
    logger.info('Iniciando mapeo pago-suscripción', {
      paymentId: paymentData.id,
      paymentExternalRef: paymentData.external_reference,
      subscriptionId: subscriptionData?.id,
      subscriptionExternalRef: subscriptionData?.external_reference
    })

    try {
      // ESTRATEGIA 1: Mapeo directo por external_reference
      if (paymentData.external_reference && subscriptionData?.external_reference) {
        if (paymentData.external_reference === subscriptionData.external_reference) {
          logger.info('Mapeo directo por external_reference exitoso', {
            externalReference: paymentData.external_reference
          })
          return { success: true, subscription: subscriptionData, mappingMethod: 'direct_external_reference' }
        }
      }

      // ESTRATEGIA 2: Mapeo por timestamp y user_id (ventana de 10 minutos)
      if (paymentData.payer?.email || subscriptionData?.customer_email) {
        const paymentTime = new Date(paymentData.date_created || paymentData.created_at)
        const timeWindow = 10 * 60 * 1000 // 10 minutos en millisegundos
        
        const startTime = new Date(paymentTime.getTime() - timeWindow).toISOString()
        const endTime = new Date(paymentTime.getTime() + timeWindow).toISOString()
        
        const email = paymentData.payer?.email || subscriptionData?.customer_email
        
        const { data: timeBasedSubs, error: timeError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('customer_email', email)
          .gte('created_at', startTime)
          .lte('created_at', endTime)
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false })
        
        if (!timeError && timeBasedSubs && timeBasedSubs.length > 0) {
          logger.info('Mapeo por timestamp exitoso', {
            email,
            subscriptionFound: timeBasedSubs[0].id,
            timeWindow: '10 minutos'
          })
          return { success: true, subscription: timeBasedSubs[0], mappingMethod: 'timestamp_email_window' }
        }
      }

      // ESTRATEGIA 3: Mapeo por product_id y user_id (extraídos del external_reference)
      if (paymentData.external_reference || subscriptionData?.external_reference) {
        const paymentRef = paymentData.external_reference
        const subscriptionRef = subscriptionData?.external_reference
        
        // Extraer información de ambos external_reference
        let paymentUserId, paymentProductId, subscriptionUserId, subscriptionProductId
        
        if (paymentRef && paymentRef.includes('-')) {
          const paymentParts = paymentRef.split('-')
          if (paymentParts.length >= 4 && paymentParts[0] === 'SUB') {
            paymentUserId = paymentParts[1]
            paymentProductId = paymentParts[2]
          }
        }
        
        if (subscriptionRef && subscriptionRef.includes('-')) {
          const subParts = subscriptionRef.split('-')
          if (subParts.length >= 4 && subParts[0] === 'SUB') {
            subscriptionUserId = subParts[1]
            subscriptionProductId = subParts[2]
          }
        }
        
        // Si tenemos user_id y product_id de ambos, verificar coincidencia
        if (paymentUserId && paymentProductId && subscriptionUserId && subscriptionProductId) {
          if (paymentUserId === subscriptionUserId && paymentProductId === subscriptionProductId) {
            logger.info('Mapeo por user+product exitoso', {
              userId: paymentUserId,
              productId: paymentProductId
            })

            return { success: true, subscription: subscriptionData, mappingMethod: 'user_product_match' }
          }
        }
        
        // Buscar suscripción por user_id y product_id si solo tenemos datos del pago
        if (paymentUserId && paymentProductId && !subscriptionData) {
          const { data: productBasedSubs, error: productError } = await supabase
            .from('unified_subscriptions')
            .select('*')
            .eq('user_id', paymentUserId)
            .eq('product_id', paymentProductId)
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: false })
            .limit(3)
          
          if (!productError && productBasedSubs && productBasedSubs.length > 0) {
            console.log('✅ MAPEO POR USER+PRODUCT: Suscripción encontrada por criterios', {
              userId: paymentUserId,
              productId: paymentProductId,
              subscriptionFound: productBasedSubs[0].id
            })
            return { success: true, subscription: productBasedSubs[0], mappingMethod: 'user_product_search' }
          }
        }
      }

      // ESTRATEGIA 4: Mapeo por metadata (buscar referencias cruzadas)
      if (paymentData.external_reference) {
        const { data: metadataSubs, error: metadataError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .or(`metadata->>mercadopago_external_reference.eq.${paymentData.external_reference},metadata->>payment_external_reference.eq.${paymentData.external_reference}`)
          .in('status', ['pending', 'processing', 'active'])
        
        if (!metadataError && metadataSubs && metadataSubs.length > 0) {
          console.log('✅ MAPEO POR METADATA: Referencia encontrada en metadata', {
            externalReference: paymentData.external_reference,
            subscriptionFound: metadataSubs[0].id
          })
          return { success: true, subscription: metadataSubs[0], mappingMethod: 'metadata_reference' }
        }
      }

      // ESTRATEGIA 5: Mapeo por monto y email (último recurso)
      if (paymentData.transaction_amount && (paymentData.payer?.email || subscriptionData?.customer_email)) {
        const email = paymentData.payer?.email || subscriptionData?.customer_email
        const amount = paymentData.transaction_amount
        
        const { data: amountBasedSubs, error: amountError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('customer_email', email)
          .eq('amount', amount)
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false })
          .limit(3)
        
        if (!amountError && amountBasedSubs && amountBasedSubs.length > 0) {
          console.log('✅ MAPEO POR MONTO+EMAIL: Suscripción encontrada', {
            email,
            amount,
            subscriptionFound: amountBasedSubs[0].id
          })
          return { success: true, subscription: amountBasedSubs[0], mappingMethod: 'amount_email_match' }
        }
      }

      console.warn('❌ MAPEO FALLIDO: No se pudo relacionar pago con suscripción', {
        paymentId: paymentData.id,
        paymentExternalRef: paymentData.external_reference,
        subscriptionId: subscriptionData?.id,
        subscriptionExternalRef: subscriptionData?.external_reference,
        strategiesAttempted: [
          'direct_external_reference',
          'timestamp_email_window',
          'user_product_match',
          'metadata_reference',
          'amount_email_match'
        ]
      })

      return { success: false }

    } catch (error: any) {
      console.error('❌ ERROR EN MAPEO ROBUSTO', {
        error: error.message,
        stack: error.stack,
        paymentId: paymentData.id,
        subscriptionId: subscriptionData?.id
      })
      return { success: false }
    }
  }

  /**
   * Procesa webhooks de suscripciones dinámicas de MercadoPago
   * Solo activa suscripciones después de confirmar el pago
   */
  /**
   * Procesa webhooks de pagos normales
   * Detecta si es el primer pago de una suscripción y crea el preapproval en MercadoPago
   */
  async processPaymentWebhook(webhookData: any): Promise<boolean> {
    try {
      const supabase = this.createSupabaseClient()
      
      const paymentId = webhookData.data?.id
      if (!paymentId) {
        logger.error('ID de pago no encontrado en webhook', { webhookData })
        return false
      }

      // Esperar 2 segundos antes de consultar la API si es payment.created
      // MercadoPago a veces envía el webhook antes de que el pago esté disponible
      if (webhookData.action === 'payment.created') {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Obtener datos del pago de MercadoPago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${getMercadoPagoAccessToken()}`
        }
      })

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text()
        logger.error('Error obteniendo datos de pago de MercadoPago', {
          status: mpResponse.status,
          payment_id: paymentId,
          error: errorText
        })
        return false
      }

      const paymentData = await mpResponse.json()

      // Log de auditoría para pago procesado
      logger.info('Pago procesado desde webhook', {
        paymentId: paymentData.id,
        status: paymentData.status,
        externalReference: paymentData.external_reference,
        amount: paymentData.transaction_amount,
        payerEmail: paymentData.payer?.email
      })

      // Verificar si el pago está aprobado
      if (paymentData.status !== 'approved') {
        logger.info('Pago no aprobado, no se procesa', {
          status: paymentData.status,
          payment_id: paymentId
        })
        return true // No es un error, simplemente no está aprobado aún
      }

      // Verificar si es un pago de suscripción mediante metadata
      const metadata = paymentData.metadata || {}
      const isSubscription = metadata.is_subscription === true || metadata.is_subscription === 'true'
      const isFirstPayment = metadata.first_payment === true || metadata.first_payment === 'true'

      // Si no hay metadata pero hay external_reference, buscar suscripción pendiente
      let shouldProcessAsSubscription = isSubscription && isFirstPayment

      if (!shouldProcessAsSubscription && paymentData.external_reference) {
        // Buscar si existe una suscripción pendiente con este external_reference
        const { data: pendingSubscription } = await supabase
          .from('unified_subscriptions')
          .select('id, status, external_reference')
          .eq('external_reference', paymentData.external_reference)
          .in('status', ['pending', 'processing'])
          .single()
        
        if (pendingSubscription) {
          logger.info('Suscripción pendiente encontrada por external_reference', {
            subscription_id: pendingSubscription.id,
            status: pendingSubscription.status
          })
          shouldProcessAsSubscription = true
        }
      }

      if (!shouldProcessAsSubscription) {
        logger.info('Pago no es de suscripción o no requiere procesamiento de activación')
        return true
      }

      logger.info('Activando flujo de suscripción', {
        payment_id: paymentId,
        subscription_id: metadata.subscription_id,
        external_reference: paymentData.external_reference
      })

      // Buscar la suscripción pendiente en la DB
      let subscription: any = null
      let subError: any = null

      // Intentar buscar por subscription_id en metadata
      const subscriptionId = metadata.subscription_id
      if (subscriptionId) {
        const result = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single()
        
        subscription = result.data
        subError = result.error
      }

      // Si no se encontró por ID, intentar buscar por external_reference
      if (!subscription && paymentData.external_reference) {
        const result = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', paymentData.external_reference)
          .single()
        
        subscription = result.data
        subError = result.error
      }

      // Si aún no se encontró, intentar buscar por mercadopago_payment_id
      if (!subscription && paymentId) {
        const result = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('mercadopago_payment_id', paymentId)
          .single()
        
        subscription = result.data
        subError = result.error
      }

      if (subError || !subscription) {
        logger.error('Suscripción no encontrada en DB', {
          tried_subscription_id: subscriptionId,
          tried_external_reference: paymentData.external_reference,
          tried_payment_id: paymentId,
          error: subError?.message
        })
        return false
      }

      logger.info('Suscripción encontrada, creando preapproval en MercadoPago', {
        subscription_id: subscription.id,
        product_id: subscription.product_id,
        frequency: subscription.frequency,
        frequency_type: subscription.frequency_type
      })

      // Calcular próxima fecha de pago
      const nextPaymentDate = this.calculateNextPaymentDate(
        subscription.frequency || 1,
        subscription.frequency_type || 'months'
      )

      // Extraer datos del cliente de la suscripción
      const customerData = subscription.customer_data || {}
      
      // Crear preapproval en MercadoPago
      const preapprovalData = {
        reason: subscription.reason || `Suscripción ${subscription.product_name}`,
        external_reference: subscription.external_reference,
        payer_email: customerData.email || subscription.customer_email,
        auto_recurring: {
          frequency: subscription.frequency || 1,
          frequency_type: subscription.frequency_type || 'months',
          start_date: nextPaymentDate,
          end_date: this.calculateEndDate(nextPaymentDate),
          transaction_amount: subscription.transaction_amount || subscription.discounted_price,
          currency_id: 'MXN'
        },
        back_url: `${process.env.NEXT_PUBLIC_BASE_URL}/suscripcion/exito?ref=${subscription.external_reference}`,
        status: 'authorized' // Ya fue autorizado porque el pago fue aprobado
      }

      console.log('📤 Enviando preapproval a MercadoPago', preapprovalData)

      const preapprovalResponse = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getMercadoPagoAccessToken()}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${subscription.external_reference}-preapproval-${Date.now()}`
        },
        body: JSON.stringify(preapprovalData)
      })

      if (!preapprovalResponse.ok) {
        const errorData = await preapprovalResponse.json()
        console.error('❌ Error creando preapproval en MercadoPago', {
          status: preapprovalResponse.status,
          error: errorData,
          subscription_id: subscription.id
        })
        return false
      }

      const preapprovalResult = await preapprovalResponse.json()

      console.log('✅ Preapproval creado exitosamente en MercadoPago', {
        preapproval_id: preapprovalResult.id,
        status: preapprovalResult.status,
        subscription_id: subscription.id
      })

      // Actualizar la suscripción en la DB con el ID del preapproval y marcarla como activa
      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          mercadopago_subscription_id: preapprovalResult.id,
          status: 'active',
          next_billing_date: preapprovalResult.next_payment_date,
          last_billing_date: new Date().toISOString(),
          charges_made: 1,
          updated_at: new Date().toISOString(),
          metadata: {
            ...subscription.metadata,
            preapproval_created_at: new Date().toISOString(),
            first_payment_id: paymentId,
            preapproval_status: preapprovalResult.status
          }
        })
        .eq('id', subscription.id)

      if (updateError) {
        console.error('❌ Error actualizando suscripción en DB', {
          error: updateError.message,
          subscription_id: subscription.id
        })
        return false
      }

      console.log('🎉 Suscripción activada exitosamente', {
        subscription_id: subscription.id,
        mercadopago_subscription_id: preapprovalResult.id,
        status: 'active',
        first_payment_id: paymentId
      })

      return true

    } catch (error) {
      console.error('❌ Error procesando webhook de pago', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      })
      return false
    }
  }

  /**
   * Calcula la próxima fecha de pago
   */
  private calculateNextPaymentDate(frequency: number, frequencyType: string): string {
    const now = new Date()
    
    if (frequencyType === 'days') {
      now.setDate(now.getDate() + frequency)
    } else if (frequencyType === 'weeks') {
      now.setDate(now.getDate() + (frequency * 7))
    } else {
      now.setMonth(now.getMonth() + frequency)
    }
    
    return now.toISOString()
  }

  /**
   * Calcula la fecha de finalización (1 año después del start_date)
   */
  private calculateEndDate(startDate: string): string {
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1)
    return endDate.toISOString()
  }

  async processSubscriptionWebhook(webhookData: WebhookPayload): Promise<boolean> {
    try {
      const supabase = this.createSupabaseClient()
      
      console.log('🔄 Procesando webhook de suscripción dinámica', {
        action: webhookData.action,
        type: webhookData.type,
        data_id: webhookData.data?.id
      })

      // Validar que es un webhook de suscripción
      if (webhookData.type !== 'subscription_preapproval' && webhookData.type !== 'subscription_authorized_payment') {
        console.warn('⚠️ Webhook no es de suscripción, ignorando', {
          type: webhookData.type,
          action: webhookData.action
        })
        return false
      }

      const subscriptionId = webhookData.data?.id
      if (!subscriptionId) {
        console.error('❌ ID de suscripción no encontrado en webhook')
        return false
      }

      // Obtener datos actualizados de MercadoPago
      const subscriptionData = await this.getSubscriptionData(subscriptionId)
      if (!subscriptionData) {
        console.error('❌ No se pudieron obtener datos de suscripción de MercadoPago', {
          subscription_id: subscriptionId
        })
        return false
      }

      console.log('📊 Datos de suscripción obtenidos de MercadoPago', {
        id: subscriptionData.id,
        status: subscriptionData.status,
        external_reference: subscriptionData.external_reference,
        payer_email: subscriptionData.payer_email
      })

      // Buscar suscripción local por external_reference
      const { data: localSubscription, error: findError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', subscriptionData.external_reference)
        .single()

      if (findError || !localSubscription) {
        console.error('❌ Suscripción local no encontrada', {
          external_reference: subscriptionData.external_reference,
          error: findError?.message
        })
        return false
      }

      console.log('✅ Suscripción local encontrada', {
        local_id: localSubscription.id,
        current_status: localSubscription.status,
        mercadopago_status: subscriptionData.status
      })

      // Mapear estados de MercadoPago a estados internos
      let newStatus = localSubscription.status
      switch (subscriptionData.status) {
        case 'authorized':
          newStatus = 'active'
          break
        case 'paused':
          newStatus = 'paused'
          break
        case 'cancelled':
          newStatus = 'cancelled'
          break
        case 'pending':
          newStatus = 'pending'
          break
        default:
          console.warn('⚠️ Estado de MercadoPago no reconocido', {
            status: subscriptionData.status
          })
          return false
      }

      // Solo actualizar si el estado cambió
      if (newStatus !== localSubscription.status) {
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: newStatus,
            mercadopago_subscription_id: subscriptionData.id,
            updated_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString()
          })
          .eq('id', localSubscription.id)

        if (updateError) {
          console.error('❌ Error actualizando estado de suscripción', {
            subscription_id: localSubscription.id,
            error: updateError.message
          })
          return false
        }

        console.log('✅ Suscripción actualizada exitosamente', {
          subscription_id: localSubscription.id,
          old_status: localSubscription.status,
          new_status: newStatus,
          mercadopago_id: subscriptionData.id
        })

        // Si se activó la suscripción, enviar email de confirmación
        if (newStatus === 'active' && localSubscription.status === 'pending') {
          try {
            await this.sendSubscriptionConfirmationEmail(localSubscription, supabase)
            console.log('📧 Email de confirmación enviado', {
              subscription_id: localSubscription.id
            })
          } catch (emailError: any) {
            console.error('❌ Error enviando email de confirmación', {
              subscription_id: localSubscription.id,
              error: emailError?.message
            })
            // No fallar el webhook por error de email
          }
        }
      } else {
        console.log('ℹ️ Estado de suscripción sin cambios', {
          subscription_id: localSubscription.id,
          status: newStatus
        })
      }

      return true

    } catch (error: any) {
      console.error('❌ Error crítico procesando webhook de suscripción', {
        error: error.message,
        stack: error.stack,
        webhook_data: webhookData
      })
      return false
    }
  }

  /**
   * Obtener datos de suscripción desde MercadoPago
   */
  private async getSubscriptionData(subscriptionId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${getMercadoPagoAccessToken()}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn('Error obteniendo datos de suscripción desde MercadoPago', {
          subscriptionId,
          status: response.status,
          statusText: response.statusText
        })
        return null
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error en API de MercadoPago para suscripción', {
        subscriptionId,
        error: error.message
      })
      return null
    }
  }

  /**
   * Enviar email de confirmación de suscripción
   */
  private async sendSubscriptionConfirmationEmail(subscription: any, supabase: any): Promise<void> {
    try {
      // Obtener datos del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', subscription.user_id)
        .single()

      if (!profile?.email) {
        console.warn('No se pudo obtener email del usuario para confirmación', {
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

      // Aquí se enviarían los emails usando el transporter configurado
      // Por ahora solo loggeamos que se enviarían
      console.log('📧 Emails de confirmación preparados', {
        subscriptionId: subscription.id,
        customerEmail: profile.email,
        customerEmailHtml: customerEmailHtml.length,
        adminEmailHtml: adminEmailHtml.length
      })

    } catch (error: any) {
      console.error('Error preparando emails de confirmación', {
        error: error.message,
        subscriptionId: subscription.id
      })
    }
  }

  // Método auxiliar: Crear cliente de Supabase
  private createSupabaseClient() {
    const { createServiceClient } = require('../lib/supabase/service')
    return createServiceClient()
  }

}

const webhookService = new WebhookService()
export default webhookService