/**
 * API Route: Cancelar Suscripción
 * 
 * POST /api/subscriptions/cancel
 * 
 * Cancela una suscripción activa en Stripe y actualiza el estado en la base de datos
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createClient as createServerClient } from '@supabase/supabase-js'

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, cancelAtPeriodEnd = false } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscription ID es requerido' },
        { status: 400 }
      )
    }

    // Obtener la suscripción de la base de datos
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    if (subscription.status === 'canceled') {
      return NextResponse.json(
        { error: 'La suscripción ya está cancelada' },
        { status: 400 }
      )
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No se encontró el ID de Stripe' },
        { status: 400 }
      )
    }

    // Verificar si la suscripción ya está cancelada en Stripe antes de intentar cancelar
    let canceledStripeSubscription
    try {
      // Intentar obtener la suscripción de Stripe primero
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id) as any
      
      if (stripeSubscription.status === 'canceled') {
        console.log('⚠️ Suscripción ya cancelada en Stripe:', subscription.stripe_subscription_id)
        // No intentar cancelar de nuevo, solo actualizar BD
      } else if (stripeSubscription.cancel_at_period_end === true) {
        console.log('⚠️ Suscripción ya programada para cancelarse al final del período:', subscription.stripe_subscription_id)
        // Ya está programada para cancelarse, no hacer nada más
      } else {
        // Cancelar en Stripe INMEDIATAMENTE (no al final del período)
        console.log('🔄 Cancelando suscripción en Stripe:', subscription.stripe_subscription_id)
        canceledStripeSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            cancel_at_period_end: true, // Cancelar al final del período pagado
          }
        )
        console.log('✅ Suscripción cancelada en Stripe (cancel_at_period_end: true)')
      }
    } catch (stripeError: any) {
      // Si el error es que no existe la suscripción, continuar con la actualización en BD
      if (stripeError.code === 'resource_missing') {
        console.log('⚠️ Suscripción no encontrada en Stripe (ya fue eliminada):', subscription.stripe_subscription_id)
      } else {
        console.error('Error cancelando en Stripe:', stripeError)
        throw stripeError
      }
    }

    // Actualizar en la base de datos
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('unified_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error actualizando suscripción:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando la suscripción' },
        { status: 500 }
      )
    }

    // Enviar email de notificación
    try {
      const { sendSubscriptionEmail } = await import('@/lib/email-service')
      
      // Email al cliente
      await sendSubscriptionEmail('cancelled', {
        user_email: subscription.customer_email,
        user_name: subscription.customer_name,
        subscription_type: subscription.subscription_type,
        amount: subscription.transaction_amount || subscription.discounted_price || 0,
        plan_description: subscription.product_name,
        external_reference: subscription.stripe_subscription_id
      })

      // Email al admin
      await sendSubscriptionEmail('cancelled', {
        user_email: 'contacto@petgourmet.mx',
        user_name: 'Admin Pet Gourmet',
        subscription_type: subscription.subscription_type,
        amount: subscription.transaction_amount || subscription.discounted_price || 0,
        plan_description: `${subscription.customer_name} - ${subscription.product_name}`,
        external_reference: subscription.stripe_subscription_id
      })
    } catch (emailError) {
      console.error('Error enviando email de cancelación:', emailError)
      // No fallar la operación por error de email
    }

    return NextResponse.json({
      success: true,
      subscription: updated,
      message: 'Suscripción cancelada exitosamente'
    })

  } catch (error) {
    console.error('Error cancelando suscripción:', error)
    return NextResponse.json(
      { 
        error: 'Error al cancelar la suscripción',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
