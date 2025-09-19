import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

/**
 * Endpoint para activar suscripción inmediatamente desde la página de aterrizaje de MercadoPago
 * Se ejecuta cuando MercadoPago redirige con status=approved
 */
export async function POST(request: NextRequest) {
  let operation_id = null
  
  try {
    const requestData = await request.json()
    operation_id = requestData.operation_id || `activate-landing-${Date.now()}`
    
    logger.info('🎯 Iniciando activación desde landing de MercadoPago', {
      operation_id,
      data: requestData
    })

    const {
      external_reference,
      collection_id,
      payment_id,
      payment_type,
      preference_id,
      site_id,
      status,
      collection_status
    } = requestData

    // Validar parámetros requeridos
    if (!external_reference) {
      return NextResponse.json(
        { error: 'external_reference es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el pago fue aprobado
    const isApproved = status === 'approved' || collection_status === 'approved'
    if (!isApproved) {
      return NextResponse.json(
        { error: `Pago no aprobado. Estado: ${status || collection_status}` },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Buscar la suscripción por external_reference
    const { data: subscription, error: subscriptionError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', external_reference)
      .maybeSingle()

    if (subscriptionError) {
      logger.error('❌ Error buscando suscripción:', {
        operation_id,
        error: subscriptionError,
        external_reference
      })
      return NextResponse.json(
        { error: 'Error al buscar la suscripción' },
        { status: 500 }
      )
    }

    if (!subscription) {
      logger.error('❌ Suscripción no encontrada:', {
        operation_id,
        external_reference
      })
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    logger.info('📋 Suscripción encontrada:', {
      operation_id,
      subscription_id: subscription.id,
      current_status: subscription.status,
      external_reference
    })

    // Si ya está activa, no hacer nada
    if (subscription.status === 'active') {
      logger.info('✅ Suscripción ya está activa:', {
        operation_id,
        subscription_id: subscription.id
      })
      return NextResponse.json({
        success: true,
        message: 'Suscripción ya está activa',
        subscription: {
          id: subscription.id,
          product_name: subscription.product_name,
          subscription_type: subscription.subscription_type,
          discounted_price: subscription.discounted_price,
          status: subscription.status
        }
      })
    }

    // Actualizar la suscripción a activa con los datos del pago
    const updateData: any = {
      status: 'active',
      payment_status: 'approved',
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Agregar información del pago si está disponible
    if (collection_id) updateData.mercadopago_payment_id = collection_id
    if (payment_id) updateData.payment_id = payment_id
    if (payment_type) updateData.payment_method = payment_type
    if (preference_id) updateData.preference_id = preference_id

    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscription.id)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ Error actualizando suscripción:', {
        operation_id,
        error: updateError,
        subscription_id: subscription.id
      })
      return NextResponse.json(
        { error: 'Error al activar la suscripción' },
        { status: 500 }
      )
    }

    logger.info('🎉 Suscripción activada exitosamente:', {
      operation_id,
      subscription_id: updatedSubscription.id,
      previous_status: subscription.status,
      new_status: updatedSubscription.status,
      payment_details: {
        collection_id,
        payment_id,
        payment_type
      }
    })

    // Calcular próxima fecha de pago
    let nextBillingDate = new Date()
    switch (updatedSubscription.subscription_type) {
      case 'weekly':
        nextBillingDate.setDate(nextBillingDate.getDate() + 7)
        break
      case 'biweekly':
        nextBillingDate.setDate(nextBillingDate.getDate() + 14)
        break
      case 'monthly':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        break
      case 'quarterly':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
        break
      case 'annual':
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
        break
      default:
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }

    // Actualizar próxima fecha de pago
    await supabase
      .from('unified_subscriptions')
      .update({ next_billing_date: nextBillingDate.toISOString() })
      .eq('id', updatedSubscription.id)

    return NextResponse.json({
      success: true,
      message: 'Suscripción activada exitosamente',
      subscription: {
        id: updatedSubscription.id,
        product_name: updatedSubscription.product_name,
        subscription_type: updatedSubscription.subscription_type,
        discounted_price: updatedSubscription.discounted_price,
        status: updatedSubscription.status,
        activated_at: updatedSubscription.activated_at,
        next_billing_date: nextBillingDate.toISOString()
      },
      payment_details: {
        collection_id,
        payment_id,
        payment_type,
        preference_id,
        site_id
      }
    })

  } catch (error) {
    logger.error('❌ Error en activación desde landing:', {
      operation_id,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        operation_id 
      },
      { status: 500 }
    )
  }
}