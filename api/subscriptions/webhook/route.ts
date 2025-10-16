import { NextRequest, NextResponse } from 'next/server'
import { WebhookValidationService } from '@/lib/services/webhook-validation-service'
import { DynamicSubscriptionService } from '@/lib/services/dynamic-subscription-service'
import { NotificationService } from '@/lib/services/notification-service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookValidation = new WebhookValidationService()
const subscriptionService = new DynamicSubscriptionService()
const notificationService = new NotificationService()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let webhookId = ''

  try {
    // Extract headers
    const signature = request.headers.get('x-signature') || ''
    const timestamp = request.headers.get('x-request-id') || ''
    const requestId = request.headers.get('x-request-id') || ''

    // Get raw body
    const body = await request.text()

    console.log('Webhook received:', {
      signature: signature.substring(0, 20) + '...',
      timestamp,
      requestId,
      bodyLength: body.length
    })

    // Ultra-fast validation (<100ms)
    const validation = await webhookValidation.validateWebhook(
      body,
      signature,
      timestamp,
      requestId
    )

    if (!validation.isValid) {
      console.error('Webhook validation failed:', validation.error)
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const payload = validation.payload!
    webhookId = payload.id

    console.log('Webhook validated successfully:', {
      id: payload.id,
      type: payload.type,
      action: payload.action,
      dataId: payload.data.id
    })

    // Process webhook based on type
    let processingResult
    switch (payload.type) {
      case 'subscription':
      case 'subscription_preapproval':
        processingResult = await processSubscriptionWebhook(payload)
        break
      
      case 'subscription_authorized_payment':
        processingResult = await processPaymentWebhook(payload)
        break
      
      case 'payment':
        processingResult = await processStandalonePaymentWebhook(payload)
        break
      
      default:
        console.log(`Unhandled webhook type: ${payload.type}`)
        processingResult = { success: true, message: 'Webhook type not processed' }
    }

    // Mark webhook as processed
    await webhookValidation.markWebhookProcessed(
      webhookId,
      processingResult.success,
      processingResult.error
    )

    const endTime = Date.now()
    const processingTime = endTime - startTime

    console.log(`Webhook processed in ${processingTime}ms:`, {
      webhookId,
      success: processingResult.success,
      message: processingResult.message
    })

    return NextResponse.json({
      success: true,
      message: processingResult.message,
      processing_time: processingTime
    })

  } catch (error) {
    console.error('Webhook processing error:', error)

    // Mark webhook as failed if we have the ID
    if (webhookId) {
      await webhookValidation.markWebhookProcessed(
        webhookId,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process subscription-related webhooks
 */
async function processSubscriptionWebhook(payload: any) {
  try {
    const subscriptionId = payload.data.id
    const action = payload.action

    console.log(`Processing subscription webhook: ${action} for ${subscriptionId}`)

    // Get subscription from database
    const { data: subscription } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('mercadopago_subscription_id', subscriptionId)
      .single()

    if (!subscription) {
      console.log(`Subscription not found: ${subscriptionId}`)
      return { success: true, message: 'Subscription not found in database' }
    }

    let newStatus = subscription.status
    let notificationMessage = ''

    switch (action) {
      case 'created':
        newStatus = 'active'
        notificationMessage = 'Tu suscripción ha sido activada exitosamente'
        break
      
      case 'updated':
        // Fetch latest subscription data from MercadoPago
        // This would require MercadoPago API call
        notificationMessage = 'Tu suscripción ha sido actualizada'
        break
      
      case 'cancelled':
        newStatus = 'cancelled'
        notificationMessage = 'Tu suscripción ha sido cancelada'
        break
      
      case 'paused':
        newStatus = 'paused'
        notificationMessage = 'Tu suscripción ha sido pausada'
        break
      
      case 'resumed':
        newStatus = 'active'
        notificationMessage = 'Tu suscripción ha sido reactivada'
        break
      
      default:
        console.log(`Unhandled subscription action: ${action}`)
        return { success: true, message: 'Action not processed' }
    }

    // Update subscription status
    if (newStatus !== subscription.status) {
      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`)
      }

      console.log(`Subscription ${subscription.id} status updated to ${newStatus}`)
    }

    // Send notification to user
    if (notificationMessage) {
      await notificationService.sendSubscriptionNotification(
        subscription.user_id,
        'subscription_update',
        notificationMessage,
        {
          subscription_id: subscription.id,
          action,
          status: newStatus
        }
      )
    }

    return {
      success: true,
      message: `Subscription ${action} processed successfully`
    }

  } catch (error) {
    console.error('Error processing subscription webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process subscription payment webhooks
 */
async function processPaymentWebhook(payload: any) {
  try {
    const paymentId = payload.data.id
    const action = payload.action

    console.log(`Processing payment webhook: ${action} for ${paymentId}`)

    // This would typically involve:
    // 1. Fetching payment details from MercadoPago
    // 2. Finding the associated subscription
    // 3. Updating payment records
    // 4. Sending notifications

    // For now, we'll log and acknowledge
    console.log('Payment webhook processed:', { paymentId, action })

    return {
      success: true,
      message: `Payment ${action} processed successfully`
    }

  } catch (error) {
    console.error('Error processing payment webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process standalone payment webhooks (non-subscription)
 */
async function processStandalonePaymentWebhook(payload: any) {
  try {
    const paymentId = payload.data.id
    const action = payload.action

    console.log(`Processing standalone payment webhook: ${action} for ${paymentId}`)

    // This would handle regular payments not related to subscriptions
    // For now, we'll just acknowledge
    console.log('Standalone payment webhook processed:', { paymentId, action })

    return {
      success: true,
      message: `Standalone payment ${action} processed successfully`
    }

  } catch (error) {
    console.error('Error processing standalone payment webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Health check endpoint
export async function GET() {
  try {
    const stats = await webhookValidation.getWebhookStats('hour')
    
    return NextResponse.json({
      status: 'healthy',
      webhook_stats: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Health check failed' },
      { status: 500 }
    )
  }
}