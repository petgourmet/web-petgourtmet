// app/api/subscriptions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

// GET - Obtener todas las suscripciones (para admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Obtener todas las suscripciones con información del usuario y producto
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        products:product_id (
           name,
           description,
           image
         )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Error fetching subscriptions' }, { status: 500 })
    }

    // Obtener datos de usuarios por separado
    const userIds = [...new Set(subscriptions?.map(sub => sub.user_id).filter(Boolean))] || []
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, first_name, last_name')
      .in('id', userIds)

    // Crear un mapa de usuarios para acceso rápido
    const userMap = new Map(profiles?.map(profile => [profile.id, profile]) || [])

    // Formatear los datos para el frontend
    const formattedSubscriptions = subscriptions?.map(sub => {
      const user = userMap.get(sub.user_id)
      return {
        id: sub.id,
        user: {
          email: user?.email || 'N/A',
          name: user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'N/A'
        },
        product: {
           name: sub.products?.name || sub.product_name || 'N/A',
           image: sub.products?.image || sub.product_image || null
         },
        subscription_type: sub.subscription_type,
        status: sub.status,
        quantity: sub.quantity,
        size: sub.size,
        base_price: sub.base_price,
        discounted_price: sub.discounted_price,
        discount_percentage: sub.discount_percentage,
        next_billing_date: sub.next_billing_date,
        created_at: sub.created_at,
        external_reference: sub.external_reference
      }
    }) || []

    return NextResponse.json(formattedSubscriptions)

  } catch (error) {
    console.error('❌ Error obteniendo suscripciones:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// GET específico por ID
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json()
    const { subscriptionId } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId es requerido' },
        { status: 400 }
      )
    }

    // Obtener suscripción específica
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        profiles (
          id,
          email,
          full_name,
          phone
        ),
        products (
          id,
          name,
          description,
          image,
          price
        )
      `)
      .eq('id', subscriptionId)
      .single()

    if (error) {
      console.error('❌ Error obteniendo suscripción:', error)
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Formatear datos para respuesta
    const formattedSubscription = {
      id: subscription.id,
      user_id: subscription.user_id,
      status: subscription.status,
      billing_period: subscription.subscription_type,
      next_billing_date: subscription.next_payment_date,
      external_reference: subscription.external_reference,
      mercadopago_subscription_id: subscription.mercadopago_subscription_id,
      transaction_amount: subscription.transaction_amount,
      discounted_price: subscription.discounted_price,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
      user: subscription.profiles,
      product: subscription.products
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