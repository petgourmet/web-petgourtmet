import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DynamicSubscriptionService } from '@/lib/services/dynamic-subscription-service'
import { NotificationService } from '@/lib/services/notification-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ManageSubscriptionRequest {
  subscription_id: string
  action: 'pause' | 'resume' | 'cancel' | 'modify'
  user_id?: string
  admin_reason?: string
  cancel_reason?: string
  modifications?: {
    subscription_type?: string
    quantity?: number
    delivery_address?: {
      street: string
      city: string
      state: string
      postal_code: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ManageSubscriptionRequest = await request.json()
    
    // Validate required fields
    if (!body.subscription_id || !body.action) {
      return NextResponse.json(
        { error: 'subscription_id y action son requeridos' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['pause', 'resume', 'cancel', 'modify']
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      )
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        products (
          id,
          name,
          price,
          image_url
        )
      `)
      .eq('id', body.subscription_id)
      .single()

    if (subscriptionError || !subscription) {
      console.error('Error fetching subscription:', subscriptionError)
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Verify user ownership (unless admin action)
    if (body.user_id && subscription.user_id !== body.user_id && !body.admin_reason) {
      return NextResponse.json(
        { error: 'No autorizado para gestionar esta suscripción' },
        { status: 403 }
      )
    }

    // Validate current status for action
    const currentStatus = subscription.status
    if (body.action === 'pause' && currentStatus !== 'active') {
      return NextResponse.json(
        { error: 'Solo se pueden pausar suscripciones activas' },
        { status: 400 }
      )
    }

    if (body.action === 'resume' && currentStatus !== 'paused') {
      return NextResponse.json(
        { error: 'Solo se pueden reanudar suscripciones pausadas' },
        { status: 400 }
      )
    }

    if (body.action === 'cancel' && !['active', 'paused'].includes(currentStatus)) {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar suscripciones activas o pausadas' },
        { status: 400 }
      )
    }

    // Initialize services
    const dynamicSubscriptionService = new DynamicSubscriptionService()
    const notificationService = new NotificationService()

    let result
    let newStatus = currentStatus

    switch (body.action) {
      case 'pause':
        result = await handlePauseSubscription(subscription, body.admin_reason)
        newStatus = 'paused'
        break

      case 'resume':
        result = await handleResumeSubscription(subscription, body.admin_reason)
        newStatus = 'active'
        break

      case 'cancel':
        result = await handleCancelSubscription(
          subscription, 
          body.cancel_reason || body.admin_reason
        )
        newStatus = 'cancelled'
        break

      case 'modify':
        if (!body.modifications) {
          return NextResponse.json(
            { error: 'Modificaciones requeridas para la acción modify' },
            { status: 400 }
          )
        }
        result = await handleModifySubscription(subscription, body.modifications)
        break

      default:
        return NextResponse.json(
          { error: 'Acción no implementada' },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Send notification
    try {
      await sendActionNotification(
        subscription,
        body.action,
        newStatus,
        body.admin_reason || body.cancel_reason
      )
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
      // Don't fail the request if notification fails
    }

    // Log action
    await logSubscriptionAction(
      body.subscription_id,
      body.action,
      body.user_id || 'admin',
      body.admin_reason || body.cancel_reason
    )

    return NextResponse.json({
      success: true,
      message: `Suscripción ${getActionMessage(body.action)} exitosamente`,
      subscription: {
        id: subscription.id,
        status: newStatus,
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error managing subscription:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

async function handlePauseSubscription(subscription: any, reason?: string) {
  try {
    // Update subscription status
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        pause_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      throw updateError
    }

    // Cancel any pending MercadoPago subscription if exists
    if (subscription.mercadopago_subscription_id) {
      try {
        // Note: MercadoPago API call would go here
        console.log(`Pausing MercadoPago subscription: ${subscription.mercadopago_subscription_id}`)
      } catch (mpError) {
        console.error('Error pausing MercadoPago subscription:', mpError)
        // Don't fail the entire operation
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error pausing subscription:', error)
    return { success: false, error: 'Error al pausar la suscripción' }
  }
}

async function handleResumeSubscription(subscription: any, reason?: string) {
  try {
    // Calculate next payment date
    const nextPaymentDate = calculateNextPaymentDate(subscription.subscription_type)

    // Update subscription status
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        paused_at: null,
        pause_reason: null,
        resumed_at: new Date().toISOString(),
        resume_reason: reason,
        next_payment_date: nextPaymentDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      throw updateError
    }

    // Reactivate MercadoPago subscription if exists
    if (subscription.mercadopago_subscription_id) {
      try {
        // Note: MercadoPago API call would go here
        console.log(`Resuming MercadoPago subscription: ${subscription.mercadopago_subscription_id}`)
      } catch (mpError) {
        console.error('Error resuming MercadoPago subscription:', mpError)
        // Don't fail the entire operation
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error resuming subscription:', error)
    return { success: false, error: 'Error al reanudar la suscripción' }
  }
}

async function handleCancelSubscription(subscription: any, reason?: string) {
  try {
    // Update subscription status
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      throw updateError
    }

    // Cancel MercadoPago subscription if exists
    if (subscription.mercadopago_subscription_id) {
      try {
        // Note: MercadoPago API call would go here
        console.log(`Cancelling MercadoPago subscription: ${subscription.mercadopago_subscription_id}`)
      } catch (mpError) {
        console.error('Error cancelling MercadoPago subscription:', mpError)
        // Don't fail the entire operation
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return { success: false, error: 'Error al cancelar la suscripción' }
  }
}

async function handleModifySubscription(subscription: any, modifications: any) {
  try {
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    // Handle subscription type change
    if (modifications.subscription_type && modifications.subscription_type !== subscription.subscription_type) {
      updates.subscription_type = modifications.subscription_type
      updates.next_payment_date = calculateNextPaymentDate(modifications.subscription_type)
    }

    // Handle quantity change
    if (modifications.quantity && modifications.quantity !== subscription.quantity) {
      updates.quantity = modifications.quantity
      
      // Recalculate total price
      const newTotalPrice = subscription.unit_price * modifications.quantity
      const discountAmount = subscription.discount_percentage 
        ? (newTotalPrice * subscription.discount_percentage / 100)
        : 0
      updates.total_price = newTotalPrice - discountAmount
    }

    // Handle delivery address change
    if (modifications.delivery_address) {
      updates.delivery_address = modifications.delivery_address
    }

    // Update subscription
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updates)
      .eq('id', subscription.id)

    if (updateError) {
      throw updateError
    }

    // Update MercadoPago subscription if needed
    if (subscription.mercadopago_subscription_id && (updates.quantity || updates.subscription_type)) {
      try {
        // Note: MercadoPago API call would go here
        console.log(`Updating MercadoPago subscription: ${subscription.mercadopago_subscription_id}`)
      } catch (mpError) {
        console.error('Error updating MercadoPago subscription:', mpError)
        // Don't fail the entire operation
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error modifying subscription:', error)
    return { success: false, error: 'Error al modificar la suscripción' }
  }
}

async function sendActionNotification(
  subscription: any,
  action: string,
  newStatus: string,
  reason?: string
) {
  const notificationService = new NotificationService()

  const actionMessages = {
    pause: 'pausada',
    resume: 'reanudada',
    cancel: 'cancelada',
    modify: 'modificada'
  }

  const title = `Suscripción ${actionMessages[action as keyof typeof actionMessages]}`
  const message = `Tu suscripción de ${subscription.products?.name || 'producto'} ha sido ${actionMessages[action as keyof typeof actionMessages]}${reason ? `. Motivo: ${reason}` : ''}`

  await notificationService.sendNotification({
    user_id: subscription.user_id,
    type: `subscription_${action}` as any,
    title,
    message,
    data: {
      subscription_id: subscription.id,
      product_name: subscription.products?.name,
      action,
      reason
    }
  })
}

async function logSubscriptionAction(
  subscriptionId: string,
  action: string,
  userId: string,
  reason?: string
) {
  try {
    await supabase
      .from('subscription_activity_log')
      .insert({
        subscription_id: subscriptionId,
        action,
        performed_by: userId,
        reason,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging subscription action:', error)
  }
}

function calculateNextPaymentDate(subscriptionType: string): string {
  const now = new Date()
  
  switch (subscriptionType) {
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'biweekly':
      now.setDate(now.getDate() + 14)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
    case 'quarterly':
      now.setMonth(now.getMonth() + 3)
      break
    case 'semiannual':
      now.setMonth(now.getMonth() + 6)
      break
    case 'annual':
      now.setFullYear(now.getFullYear() + 1)
      break
    default:
      now.setMonth(now.getMonth() + 1) // Default to monthly
  }
  
  return now.toISOString()
}

function getActionMessage(action: string): string {
  const messages = {
    pause: 'pausada',
    resume: 'reanudada',
    cancel: 'cancelada',
    modify: 'modificada'
  }
  return messages[action as keyof typeof messages] || 'actualizada'
}