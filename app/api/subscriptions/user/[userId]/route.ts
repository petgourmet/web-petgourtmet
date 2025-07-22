// app/api/subscriptions/user/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import MercadoPagoService from '@/lib/mercadopago-service'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

// GET - Obtener suscripciones de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    // Obtener suscripciones del usuario desde la base de datos
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        products (
          id,
          name,
          description,
          images,
          price
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error obteniendo suscripciones:', error)
      return NextResponse.json(
        { error: 'Error obteniendo suscripciones' },
        { status: 500 }
      )
    }

    // Sincronizar estado con MercadoPago
    const syncedSubscriptions = await Promise.all(
      (subscriptions || []).map(async (subscription) => {
        try {
          if (subscription.mercadopago_subscription_id) {
            const mpSubscription = await mercadoPagoService.getSubscription(
              subscription.mercadopago_subscription_id
            )
            
            // Actualizar estado si es diferente
            if (mpSubscription.status !== subscription.status) {
              await supabase
                .from('user_subscriptions')
                .update({ 
                  status: mpSubscription.status,
                  next_payment_date: mpSubscription.next_payment_date,
                  updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id)
              
              subscription.status = mpSubscription.status
              subscription.next_payment_date = mpSubscription.next_payment_date
            }
          }
          
          return subscription
        } catch (mpError) {
          console.error('⚠️ Error sincronizando con MercadoPago:', mpError)
          return subscription
        }
      })
    )

    return NextResponse.json({
      success: true,
      subscriptions: syncedSubscriptions
    })

  } catch (error) {
    console.error('❌ Error obteniendo suscripciones de usuario:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar suscripción (cancelar, pausar, reactivar)
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params
    const body = await request.json()
    
    const { subscriptionId, action } = body

    if (!userId || !subscriptionId || !action) {
      return NextResponse.json(
        { error: 'userId, subscriptionId y action son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la suscripción pertenece al usuario
    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    let newStatus = subscription.status
    let mpResult = null

    // Realizar acción en MercadoPago
    switch (action) {
      case 'cancel':
        if (subscription.mercadopago_subscription_id) {
          mpResult = await mercadoPagoService.cancelSubscription(
            subscription.mercadopago_subscription_id
          )
          newStatus = 'cancelled'
        }
        break
        
      case 'pause':
        // MercadoPago no tiene pausa directa, se cancela y se puede recrear después
        if (subscription.mercadopago_subscription_id) {
          mpResult = await mercadoPagoService.cancelSubscription(
            subscription.mercadopago_subscription_id
          )
          newStatus = 'paused'
        }
        break
        
      case 'reactivate':
        // Para reactivar, necesitaríamos crear una nueva suscripción
        // Por ahora solo cambiamos el estado local
        newStatus = 'pending'
        break
        
      default:
        return NextResponse.json(
          { error: 'Acción no válida. Use: cancel, pause, reactivate' },
          { status: 400 }
        )
    }

    // Actualizar estado en base de datos
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error actualizando suscripción:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando suscripción' },
        { status: 500 }
      )
    }

    console.log('✅ Suscripción actualizada:', {
      id: subscriptionId,
      action,
      newStatus,
      mpResult: mpResult?.status
    })

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      action,
      mercadopago_result: mpResult
    })

  } catch (error) {
    console.error('❌ Error actualizando suscripción:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
