import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Esta ruta solo está disponible en desarrollo' },
      { status: 403 }
    )
  }

  try {
    // Obtener todas las suscripciones de Stripe
    const { data: stripeSubscriptions, error: stripeError } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })

    // Obtener todas las suscripciones (incluyendo MercadoPago)
    const { data: allSubscriptions, error: allError } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    // Obtener todas las órdenes
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      stripe_subscriptions: {
        count: stripeSubscriptions?.length || 0,
        data: stripeSubscriptions
      },
      all_subscriptions: {
        count: allSubscriptions?.length || 0,
        data: allSubscriptions
      },
      recent_orders: {
        count: orders?.length || 0,
        data: orders
      },
      errors: {
        stripe: stripeError,
        all: allError,
        orders: ordersError
      }
    })
  } catch (error) {
    console.error('Error checking subscriptions:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
