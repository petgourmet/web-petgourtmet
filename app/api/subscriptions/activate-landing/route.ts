import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logger, LogCategory } from '@/lib/logger'
import { subscriptionDeduplicationService } from '@/lib/subscription-deduplication-service'
import { createEnhancedIdempotencyServiceServer } from '@/lib/enhanced-idempotency-service.server'

/**
 * Endpoint para activar suscripción inmediatamente desde la página de aterrizaje de MercadoPago
 * Se ejecuta cuando MercadoPago redirige con status=approved
 */
export async function POST(request: NextRequest) {
  let operation_id = null
  
  try {
    const requestData = await request.json()
    operation_id = requestData.operation_id || `activate-landing-${Date.now()}`
    
    logger.info(LogCategory.SUBSCRIPTION, 'Starting activation from MercadoPago landing', {
      operation_id,
      external_reference: requestData.external_reference,
      collection_status: requestData.collection_status,
      payment_id: requestData.payment_id
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
    
    if (!payment_id) {
      return NextResponse.json(
        { error: 'payment_id es requerido' },
        { status: 400 }
      )
    }
    
    // Generar clave de idempotencia para la activación
    const idempotencyKey = subscriptionDeduplicationService.generateIdempotencyKey(
      external_reference,
      payment_id,
      'activation'
    )

    // Verificar que el pago fue aprobado
    const isApproved = status === 'approved' || collection_status === 'approved'
    if (!isApproved) {
      return NextResponse.json(
        { error: `Pago no aprobado. Estado: ${status || collection_status}` },
        { status: 400 }
      )
    }

    // Usar servicio de idempotencia para la activación
    const idempotencyService = createEnhancedIdempotencyServiceServer()
    const result = await idempotencyService.executeSubscriptionWithIdempotency(
      idempotencyKey,
      async () => {
        const supabase = createServiceClient()
        
        // Buscar TODAS las suscripciones por external_reference para manejar duplicados
        const { data: subscriptions, error: subscriptionError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', external_reference)
          .order('created_at', { ascending: true })

        if (subscriptionError) {
          throw new Error(`Error buscando suscripción: ${subscriptionError.message || subscriptionError}`)
        }

        if (!subscriptions || subscriptions.length === 0) {
          throw new Error(`Suscripción no encontrada con external_reference: ${external_reference}`)
        }
        
        return { supabase, subscriptions }
      },
      {
        timeoutMs: 30000,
        maxRetries: 3
      }
    )
    
    // Manejar resultado desde caché o nueva ejecución
    if (result.fromCache) {
      logger.info(LogCategory.SUBSCRIPTION, 'Subscription activation obtained from idempotency cache')
      return NextResponse.json({
        success: true,
        message: 'Suscripción ya activada (desde caché)',
        ...result.result,
        fromCache: true
      })
    }
    
    const { supabase, subscriptions } = result.result

    // Manejar duplicados: seleccionar la suscripción más completa
    let subscription = subscriptions[0]
    if (subscriptions.length > 1) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Multiple subscriptions found, selecting most complete', {
         operation_id,
         external_reference,
         count: subscriptions.length,
         subscription_ids: subscriptions.map(s => ({ id: s.id, status: s.status, has_customer_data: !!s.customer_data }))
       })
      
      // Seleccionar la suscripción con más datos completos
      subscription = subscriptions.reduce((best, current) => {
        const bestScore = getCompletenessScore(best)
        const currentScore = getCompletenessScore(current)
        return currentScore > bestScore ? current : best
      })
      
      logger.info(LogCategory.SUBSCRIPTION, 'Subscription selected', {
         operation_id,
         selected_id: subscription.id,
         selected_status: subscription.status,
         completeness_score: getCompletenessScore(subscription)
       })
    }

    logger.info(LogCategory.SUBSCRIPTION, 'Subscription found', {
      operation_id,
      subscription_id: subscription.id,
      current_status: subscription.status,
      external_reference
    })

    // Si ya está activa, no hacer nada
    if (subscription.status === 'active') {
      logger.info(LogCategory.SUBSCRIPTION, 'Subscription already active', {
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
    const paymentMetadata = {
      activated_at: new Date().toISOString(),
      collection_id: collection_id || null,
      payment_id: payment_id || null,
      payment_type: payment_type || null,
      preference_id: preference_id || null
    }

    const updateData: any = {
      status: 'active',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: paymentMetadata
    }

    const { data: updatedSubscriptions, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscription.id)
      .select()

    if (updateError || !updatedSubscriptions || updatedSubscriptions.length === 0) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error updating subscription', {
        operation_id,
        subscription_id: subscription.id,
        error: updateError?.message || updateError || 'No se encontró la suscripción',
        updated_count: updatedSubscriptions?.length || 0
      })
      return NextResponse.json(
        { error: 'Error al activar la suscripción' },
        { status: 500 }
      )
    }

    const updatedSubscription = updatedSubscriptions[0]

    logger.info(LogCategory.SUBSCRIPTION, 'Subscription activated successfully', {
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
    logger.error(LogCategory.SUBSCRIPTION, 'Error in activation from landing', {
      operation_id,
      error: error instanceof Error ? error.message : String(error),
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

/**
 * Calcula un puntaje de completitud para una suscripción
 * Prioriza suscripciones con más datos completos
 */
function getCompletenessScore(subscription: any): number {
  let score = 0
  
  // Datos básicos del producto
  if (subscription.product_name) score += 10
  if (subscription.product_id) score += 10
  if (subscription.product_image) score += 5
  
  // Datos del cliente
  if (subscription.customer_data) score += 20
  
  // Datos del carrito
  if (subscription.cart_items) score += 15
  
  // Precios
  if (subscription.base_price) score += 10
  if (subscription.discounted_price) score += 10
  
  // Metadatos
  if (subscription.metadata && subscription.metadata !== '{}') score += 10
  
  // Fechas importantes
  if (subscription.processed_at) score += 5
  if (subscription.next_billing_date) score += 5
  
  // Notas y razón
  if (subscription.notes) score += 3
  if (subscription.reason) score += 3
  
  return score
}