// app/api/subscriptions/handle-orphaned/route.ts
// Endpoint para manejar suscripciones huérfanas detectadas

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Obtener datos del request
    const { subscriptionId, userId, action } = await request.json()
    
    if (!subscriptionId || !userId || !action) {
      return NextResponse.json(
        { error: 'ID de suscripción, usuario y acción requeridos' },
        { status: 400 }
      )
    }

    // Usar cliente de Supabase con service role para acceso directo
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar que la suscripción existe y pertenece al usuario
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'retry':
        // Reintentar activación - cambiar de error a pending
        const { error: retryError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString(),
            notes: `Reintento de activación - ${new Date().toISOString()}`
          })
          .eq('id', subscriptionId)
          .eq('user_id', userId)

        if (retryError) {
          return NextResponse.json(
            { error: 'Error al reintentar activación' },
            { status: 500 }
          )
        }

        logger.subscriptionEvent(subscriptionId.toString(), 'orphaned-subscription-retry', {
          userId,
          previousStatus: subscription.status,
          duration: Date.now() - startTime
        })

        return NextResponse.json({
          success: true,
          message: 'Suscripción marcada para reintento',
          subscription: { ...subscription, status: 'pending' }
        })

      case 'cancel':
        // Cancelar suscripción huérfana
        const { error: cancelError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            notes: `Cancelada por ser huérfana - ${new Date().toISOString()}`
          })
          .eq('id', subscriptionId)
          .eq('user_id', userId)

        if (cancelError) {
          return NextResponse.json(
            { error: 'Error al cancelar suscripción' },
            { status: 500 }
          )
        }

        logger.subscriptionEvent(subscriptionId.toString(), 'orphaned-subscription-cancelled', {
          userId,
          previousStatus: subscription.status,
          duration: Date.now() - startTime
        })

        return NextResponse.json({
          success: true,
          message: 'Suscripción huérfana cancelada',
          subscription: { ...subscription, status: 'cancelled' }
        })

      case 'recreate':
        // Crear nueva suscripción basada en los datos de la huérfana
        const subscriptionData = {
          user_id: subscription.user_id,
          subscription_type: subscription.subscription_type,
          status: 'pending',
          external_reference: `SUB-${subscription.user_id}-${subscription.product_id}-${Date.now()}`,
          customer_data: subscription.customer_data,
          cart_items: subscription.cart_items,
          processed_at: new Date().toISOString(),
          notes: `Recreada desde suscripción huérfana ID ${subscriptionId}`,
          product_id: subscription.product_id,
          quantity: subscription.quantity,
          size: subscription.size,
          discount_percentage: subscription.discount_percentage,
          base_price: subscription.base_price,
          discounted_price: subscription.discounted_price,
          next_billing_date: subscription.next_billing_date,
          product_name: subscription.product_name,
          product_image: subscription.product_image,
          metadata: subscription.metadata,
          reason: subscription.reason,
          charges_made: 0,
          frequency: subscription.frequency,
          frequency_type: subscription.frequency_type,
          version: subscription.version + 1,
          back_url: subscription.back_url,
          start_date: new Date().toISOString(),
          currency_id: subscription.currency_id,
          transaction_amount: subscription.transaction_amount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: newSubscription, error: createError } = await supabase
          .from('unified_subscriptions')
          .insert(subscriptionData)
          .select()
          .single()

        if (createError) {
          return NextResponse.json(
            { error: 'Error al crear nueva suscripción' },
            { status: 500 }
          )
        }

        // Marcar la original como reemplazada
        await supabase
          .from('unified_subscriptions')
          .update({
            status: 'replaced',
            updated_at: new Date().toISOString(),
            notes: `Reemplazada por suscripción ID ${newSubscription.id}`
          })
          .eq('id', subscriptionId)
          .eq('user_id', userId)

        logger.subscriptionEvent(subscriptionId.toString(), 'orphaned-subscription-recreated', {
          userId,
          newSubscriptionId: newSubscription.id,
          duration: Date.now() - startTime
        })

        return NextResponse.json({
          success: true,
          message: 'Nueva suscripción creada',
          originalSubscription: { ...subscription, status: 'replaced' },
          newSubscription
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.systemError('Handle orphaned subscription error', error, {
      subscriptionId: request.body?.subscriptionId,
      duration
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'Endpoint para manejar suscripciones huérfanas' },
    { status: 200 }
  )
}