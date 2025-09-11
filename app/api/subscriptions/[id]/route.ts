// app/api/subscriptions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

// GET - Obtener suscripción específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID de suscripción requerido' },
        { status: 400 }
      )
    }

    // Obtener suscripción específica
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        products:product_id (
           name,
           description,
           image
         )
      `)
      .eq('id', id)
      .single()

    if (error || !subscription) {
      console.error('Error fetching subscription:', error)
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Obtener datos del usuario por separado
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, first_name, last_name')
      .eq('id', subscription.user_id)
      .single()

    // Formatear los datos para el frontend
    const formattedSubscription = {
      id: subscription.id,
      user: {
        email: profile?.email || 'N/A',
        name: profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'N/A'
      },
      product: {
         name: subscription.products?.name || subscription.product_name || 'N/A',
         image: subscription.products?.image || subscription.product_image || null
       },
      subscription_type: subscription.subscription_type,
      status: subscription.status,
      quantity: subscription.quantity,
      size: subscription.size,
      base_price: subscription.base_price,
      discounted_price: subscription.discounted_price,
      discount_percentage: subscription.discount_percentage,
      next_billing_date: subscription.next_billing_date,
      created_at: subscription.created_at,
      external_reference: subscription.external_reference
    }

    return NextResponse.json(formattedSubscription)

  } catch (error) {
    console.error('❌ Error obteniendo suscripción específica:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}