import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger, LogCategory } from '@/lib/logger'
import webhookService from '@/lib/webhook-service'

/**
 * ENDPOINT DE VERIFICACIÓN POST-RETORNO DE MERCADOPAGO
 * 
 * Este endpoint se ejecuta cuando el usuario regresa de MercadoPago después del pago.
 * Verifica inmediatamente si el pago fue aprobado y activa la suscripción correspondiente.
 * 
 * Casos de uso:
 * - Activación inmediata al regresar de MercadoPago
 * - Verificación de pagos aprobados que no activaron automáticamente
 * - Garantizar que nunca quede una suscripción pendiente con pago aprobado
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let operation_id = null
  
  try {
    const body = await request.json()
    const {
      external_reference,
      collection_id,
      payment_id,
      status,
      collection_status,
      preference_id,
      user_id,
      user_email
    } = body
    
    operation_id = `verify-return-${external_reference || Date.now()}`
    
    logger.info('🔍 VERIFY-RETURN: Iniciando verificación post-retorno de MercadoPago', 'VERIFY_RETURN_START', {
      operation_id,
      external_reference,
      collection_id,
      payment_id,
      status,
      collection_status,
      user_id,
      timestamp: new Date().toISOString()
    })
    
    // Validar parámetros mínimos requeridos
    if (!external_reference && !collection_id && !payment_id) {
      logger.warn('Parámetros insuficientes para verificación', 'VERIFY_RETURN_ERROR', {
        operation_id,
        external_reference,
        collection_id,
        payment_id
      })
      return NextResponse.json(
        { error: 'Se requiere al menos external_reference, collection_id o payment_id' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceClient()
    
    // PASO 1: Búsqueda múltiple de suscripción usando estrategias mejoradas
    let targetSubscription = null
    let searchMethod = 'not_found'
    
    if (external_reference) {
      // Estrategia 1: Búsqueda directa por external_reference
      logger.info('🔍 Estrategia 1: Búsqueda directa por external_reference', 'SEARCH_STRATEGY', {
        operation_id,
        external_reference
      })
      
      const { data: subscriptionByRef, error: refError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', external_reference)
        .maybeSingle()
      
      if (subscriptionByRef && !refError) {
        targetSubscription = subscriptionByRef
        searchMethod = 'direct'
        logger.info('✅ Suscripción encontrada por external_reference directo', 'SUBSCRIPTION_FOUND', {
          operation_id,
          subscriptionId: targetSubscription.id,
          status: targetSubscription.status,
          external_reference,
          searchMethod
        })
      }
      
      // Estrategia 2: Búsqueda en metadata por mercadopago_external_reference
      if (!targetSubscription) {
        logger.info('🔍 Estrategia 2: Búsqueda en metadata', 'SEARCH_STRATEGY', {
          operation_id,
          external_reference
        })
        
        const { data: metadataResults, error: metadataError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .contains('metadata', { mercadopago_external_reference: external_reference })
        
        if (!metadataError && metadataResults && metadataResults.length > 0) {
          // Si hay múltiples resultados, priorizar por usuario
          let selectedSubscription = metadataResults[0]
          
          if (metadataResults.length > 1 && user_id) {
            const filtered = metadataResults.filter(sub => sub.user_id === user_id)
            if (filtered.length > 0) {
              selectedSubscription = filtered[0]
              logger.info('🎯 Suscripción filtrada por usuario en metadata', 'SUBSCRIPTION_FILTERED', {
                operation_id,
                totalFound: metadataResults.length,
                filteredCount: filtered.length
              })
            }
          }
          
          targetSubscription = selectedSubscription
          searchMethod = 'metadata'
          logger.info('✅ Suscripción encontrada por metadata', 'SUBSCRIPTION_FOUND', {
            operation_id,
            subscriptionId: targetSubscription.id,
            status: targetSubscription.status,
            external_reference,
            searchMethod,
            totalFound: metadataResults.length
          })
        }
      }
    }
    
    // Estrategia 3: Búsqueda por user_id y estado pendiente (más reciente)
    if (!targetSubscription && user_id) {
      logger.info('🔍 Estrategia 3: Búsqueda por user_id y estado pendiente', 'SEARCH_STRATEGY', {
        operation_id,
        user_id
      })
      
      const { data: recentPendingSubs, error: pendingError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', user_id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (recentPendingSubs && recentPendingSubs.length > 0) {
        targetSubscription = recentPendingSubs[0]
        searchMethod = 'user_pending'
        logger.info('✅ Suscripción encontrada por user_id (más reciente pendiente)', 'SUBSCRIPTION_FOUND', {
          operation_id,
          subscriptionId: targetSubscription.id,
          status: targetSubscription.status,
          user_id,
          pendingCount: recentPendingSubs.length,
          searchMethod
        })
      }
    }
    
    if (!targetSubscription) {
      logger.warn('❌ No se encontró suscripción para verificar', 'SUBSCRIPTION_NOT_FOUND', {
        operation_id,
        external_reference,
        user_id,
        collection_id,
        payment_id
      })
      return NextResponse.json(
        { error: 'No se encontró suscripción para verificar' },
        { status: 404 }
      )
    }
    
    // PASO 3: Si la suscripción ya está activa, retornar éxito
    if (targetSubscription.status === 'active') {
      logger.info('✅ Suscripción ya está activa', 'SUBSCRIPTION_ALREADY_ACTIVE', {
        operation_id,
        subscriptionId: targetSubscription.id,
        external_reference: targetSubscription.external_reference
      })
      return NextResponse.json({
        success: true,
        message: 'Suscripción ya está activa',
        subscription: {
          id: targetSubscription.id,
          product_name: targetSubscription.product_name,
          status: targetSubscription.status,
          already_active: true
        }
      })
    }
    
    // PASO 4: Verificar estado del pago en MercadoPago
    let paymentApproved = false
    let paymentData = null
    
    // Verificar por collection_id o payment_id
    const paymentIdToCheck = collection_id || payment_id
    if (paymentIdToCheck) {
      try {
        paymentData = await webhookService.getPaymentData(paymentIdToCheck)
        if (paymentData && (paymentData.status === 'approved' || paymentData.status === 'authorized')) {
          paymentApproved = true
          logger.info('✅ Pago verificado como aprobado en MercadoPago', 'PAYMENT_VERIFIED', {
            operation_id,
            paymentId: paymentIdToCheck,
            status: paymentData.status,
            amount: paymentData.transaction_amount
          })
        }
      } catch (paymentError) {
        logger.warn('⚠️ Error verificando pago en MercadoPago', 'PAYMENT_VERIFICATION_ERROR', {
          operation_id,
          paymentId: paymentIdToCheck,
          error: paymentError.message
        })
      }
    }
    
    // Verificar también por status de URL params
    if (!paymentApproved && (status === 'approved' || collection_status === 'approved')) {
      paymentApproved = true
      logger.info('✅ Pago aprobado según parámetros URL', 'PAYMENT_APPROVED_BY_PARAMS', {
        operation_id,
        status,
        collection_status
      })
    }
    
    // PASO 5: Si el pago no está aprobado, retornar estado actual
    if (!paymentApproved) {
      logger.info('⏳ Pago aún no aprobado', 'PAYMENT_NOT_APPROVED', {
        operation_id,
        subscriptionId: targetSubscription.id,
        status,
        collection_status,
        paymentStatus: paymentData?.status
      })
      return NextResponse.json({
        success: false,
        message: 'Pago aún no aprobado',
        subscription: {
          id: targetSubscription.id,
          product_name: targetSubscription.product_name,
          status: targetSubscription.status,
          payment_status: paymentData?.status || status || 'unknown'
        }
      })
    }
    
    // PASO 6: ACTIVAR SUSCRIPCIÓN INMEDIATAMENTE
    try {
      logger.info('🚀 Activando suscripción con pago aprobado', 'ACTIVATING_SUBSCRIPTION', {
        operation_id,
        subscriptionId: targetSubscription.id,
        paymentId: paymentIdToCheck,
        paymentStatus: paymentData?.status || status
      })
      
      // Calcular next_billing_date
      const now = new Date()
      let nextBillingDate = new Date(now)
      
      switch (targetSubscription.subscription_type) {
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
      
      // Preparar metadata actualizada para sincronización
      const currentMetadata = targetSubscription.metadata || {}
      const updatedMetadata = {
        ...currentMetadata,
        mercadopago_external_reference: external_reference,
        search_method: searchMethod,
        activation_source: 'verify-return',
        activation_timestamp: new Date().toISOString(),
        payment_verification: {
          payment_id: paymentIdToCheck,
          status: paymentData?.status || status,
          verified_at: new Date().toISOString()
        }
      }
      
      // Actualizar suscripción a activa
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          charges_made: (targetSubscription.charges_made || 0) + 1,
          last_billing_date: new Date().toISOString(),
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetSubscription.id)
        .select()
        .single()
      
      if (updateError) {
        throw new Error(`Error actualizando suscripción: ${updateError.message}`)
      }
      
      // Crear registro en subscription_billing_history
      const { error: billingError } = await supabase
        .from('subscription_billing_history')
        .insert({
          subscription_id: targetSubscription.id,
          user_id: targetSubscription.user_id,
          amount: targetSubscription.transaction_amount || targetSubscription.discounted_price,
          status: 'completed',
          payment_method: 'mercadopago',
          mercadopago_payment_id: paymentIdToCheck,
          billing_date: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          created_at: new Date().toISOString()
        })
      
      if (billingError) {
        logger.warn('⚠️ Error creando registro de billing history', 'BILLING_HISTORY_ERROR', {
          operation_id,
          subscriptionId: targetSubscription.id,
          error: billingError.message
        })
      }
      
      // Enviar email de confirmación
      try {
        await webhookService.sendSubscriptionConfirmationEmail(
          user_email || targetSubscription.customer_data?.email,
          targetSubscription.product_name,
          targetSubscription.subscription_type,
          targetSubscription.discounted_price || targetSubscription.transaction_amount
        )
        logger.info('✅ Email de confirmación enviado', 'EMAIL_SENT', {
          operation_id,
          subscriptionId: targetSubscription.id,
          email: user_email || targetSubscription.customer_data?.email
        })
      } catch (emailError) {
        logger.warn('⚠️ Error enviando email de confirmación', 'EMAIL_ERROR', {
          operation_id,
          subscriptionId: targetSubscription.id,
          error: emailError.message
        })
      }
      
      const duration = Date.now() - startTime
      
      logger.info('🎉 VERIFY-RETURN: Suscripción activada exitosamente', 'VERIFY_RETURN_SUCCESS', {
        operation_id,
        subscriptionId: targetSubscription.id,
        productName: targetSubscription.product_name,
        paymentId: paymentIdToCheck,
        duration,
        nextBillingDate: nextBillingDate.toISOString()
      })
      
      return NextResponse.json({
        success: true,
        message: 'Suscripción activada exitosamente',
        subscription: {
          id: updatedSubscription.id,
          product_name: updatedSubscription.product_name,
          subscription_type: updatedSubscription.subscription_type,
          status: updatedSubscription.status,
          activated_at: updatedSubscription.activated_at,
          next_billing_date: nextBillingDate.toISOString(),
          discounted_price: updatedSubscription.discounted_price
        },
        payment_details: {
          payment_id: paymentIdToCheck,
          status: paymentData?.status || status,
          amount: paymentData?.transaction_amount || targetSubscription.transaction_amount
        }
      })
      
    } catch (activationError) {
      logger.error('❌ Error crítico activando suscripción', 'ACTIVATION_ERROR', {
        operation_id,
        subscriptionId: targetSubscription.id,
        error: activationError.message,
        stack: activationError.stack
      })
      
      return NextResponse.json(
        { error: `Error activando suscripción: ${activationError.message}` },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.error('❌ Error crítico en verify-return endpoint', 'VERIFY_RETURN_CRITICAL_ERROR', {
      operation_id,
      error: error.message,
      stack: error.stack,
      duration
    })
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET - Obtener estadísticas de verificaciones recientes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Obtener suscripciones recientes que necesitan verificación
    const { data: recentPendingSubs, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('id, external_reference, status, created_at, product_name, user_id')
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (pendingError) {
      throw new Error(`Error obteniendo suscripciones pendientes: ${pendingError.message}`)
    }
    
    // Obtener estadísticas de estados
    const { data: statusStats, error: statsError } = await supabase
      .from('unified_subscriptions')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    if (statsError) {
      throw new Error(`Error obteniendo estadísticas: ${statsError.message}`)
    }
    
    const stats = statusStats.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return NextResponse.json({
      success: true,
      statistics: {
        total_last_24h: statusStats.length,
        by_status: stats,
        pending_count: recentPendingSubs.length
      },
      recent_pending_subscriptions: recentPendingSubs.map(sub => ({
        id: sub.id,
        external_reference: sub.external_reference,
        product_name: sub.product_name,
        created_at: sub.created_at,
        minutes_ago: Math.floor((Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60))
      }))
    })
    
  } catch (error: any) {
    logger.error('Error en GET verify-return endpoint', 'VERIFY_RETURN_GET_ERROR', {
      error: error.message
    })
    
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  }
}