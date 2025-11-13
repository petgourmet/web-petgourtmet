/**
 * API Route: Pausar Suscripción
 * 
 * POST /api/subscriptions/pause
 * 
 * Pausa una suscripción activa en Stripe y actualiza el estado en la base de datos
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@supabase/supabase-js'

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId } = await request.json()

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

    if (subscription.status === 'paused') {
      return NextResponse.json(
        { error: 'La suscripción ya está pausada' },
        { status: 400 }
      )
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No se encontró el ID de Stripe' },
        { status: 400 }
      )
    }

    // Pausar en Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      pause_collection: {
        behavior: 'void', // No cobra durante la pausa
      },
    })

    // Actualizar en la base de datos
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('unified_subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
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
      
      await sendSubscriptionEmail('paused', {
        user_email: subscription.customer_email,
        user_name: subscription.customer_name,
        subscription_type: subscription.subscription_type,
        amount: subscription.transaction_amount || subscription.discounted_price || 0,
        plan_description: subscription.product_name,
        external_reference: subscription.stripe_subscription_id
      })

      // Enviar copia al admin
      await sendSubscriptionEmail('paused', {
        user_email: 'contacto@petgourmet.mx',
        user_name: 'Admin Pet Gourmet',
        subscription_type: subscription.subscription_type,
        amount: subscription.transaction_amount || subscription.discounted_price || 0,
        plan_description: `${subscription.customer_name} - ${subscription.product_name}`,
        external_reference: subscription.stripe_subscription_id
      })
    } catch (emailError) {
      console.error('Error enviando email de pausa:', emailError)
      // No fallar la operación por error de email
    }

    return NextResponse.json({
      success: true,
      subscription: updated,
      message: 'Suscripción pausada exitosamente'
    })

  } catch (error) {
    console.error('Error pausando suscripción:', error)
    return NextResponse.json(
      { 
        error: 'Error al pausar la suscripción',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
