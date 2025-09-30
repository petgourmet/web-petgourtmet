import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import { enhancedEmailService } from '@/lib/email-service-enhanced'

/**
 * ENDPOINT DE AUTO-ACTIVACIÓN DE SUSCRIPCIONES
 * 
 * Este endpoint procesa automáticamente pagos aprobados que no activaron suscripciones,
 * busca suscripciones pendientes por external_reference y las activa automáticamente.
 * 
 * Funcionalidades:
 * - Procesar pagos aprobados pendientes de activación
 * - Buscar suscripciones por external_reference o criterios alternativos
 * - Activar automáticamente y enviar correos de confirmación
 * - Ser llamado desde webhook como sistema de respaldo
 * - Prevenir duplicaciones y condiciones de carrera
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      external_reference, 
      subscription_id, 
      payment_id, 
      user_id,
      force = false 
    } = body
    
    if (!external_reference && !subscription_id && !payment_id && !user_id) {
      return NextResponse.json(
        { error: 'Se requiere al menos uno: external_reference, subscription_id, payment_id o user_id' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceClient()
    
    logger.info('🔄 Iniciando auto-activación de suscripción', 'AUTO_ACTIVATION_START', {
      external_reference,
      subscription_id,
      payment_id,
      user_id,
      force
    })
    
    // PASO 1: Buscar la suscripción objetivo
    let targetSubscription = null
    
    if (subscription_id) {
      const { data, error } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('id', subscription_id)
        .single()
      
      if (!error && data) {
        targetSubscription = data
      }
    }
    
    if (!targetSubscription && external_reference) {
      const { data, error } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', external_reference)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (!error && data) {
        targetSubscription = data
      }
    }
    
    if (!targetSubscription && user_id) {
      const { data, error } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (!error && data) {
        targetSubscription = data
      }
    }
    
    if (!targetSubscription) {
      logger.warn('⚠️ No se encontró suscripción para auto-activar', 'AUTO_ACTIVATION_NOT_FOUND', {
        external_reference,
        subscription_id,
        payment_id,
        user_id
      })
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Suscripción no encontrada',
          searched_criteria: { external_reference, subscription_id, payment_id, user_id }
        },
        { status: 404 }
      )
    }
    
    // PASO 2: Verificar si ya está activa
    if (targetSubscription.status === 'active' && !force) {
      logger.info('✅ Suscripción ya está activa', 'AUTO_ACTIVATION_ALREADY_ACTIVE', {
        subscription_id: targetSubscription.id,
        external_reference: targetSubscription.external_reference,
        activated_at: targetSubscription.activated_at
      })
      
      return NextResponse.json({
        success: true,
        message: 'Suscripción ya está activa',
        subscription: {
          id: targetSubscription.id,
          status: targetSubscription.status,
          activated_at: targetSubscription.activated_at,
          product_name: targetSubscription.product_name
        },
        already_active: true
      })
    }
    
    // PASO 3: Verificar estado del pago en MercadoPago (si tenemos external_reference)
    let paymentApproved = force
    let mercadoPagoData = null
    
    if (targetSubscription.external_reference && !force) {
      try {
        // Verificar con MercadoPago API
        const mpResponse = await fetch(
          `https://api.mercadopago.com/preapproval/${targetSubscription.external_reference}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
            }
          }
        )
        
        if (mpResponse.ok) {
          mercadoPagoData = await mpResponse.json()
          paymentApproved = mercadoPagoData.status === 'authorized'
          
          logger.info('📋 Estado de pago verificado en MercadoPago', 'MERCADOPAGO_STATUS_CHECK', {
            external_reference: targetSubscription.external_reference,
            mp_status: mercadoPagoData.status,
            payment_approved: paymentApproved
          })
        } else {
          logger.warn('⚠️ No se pudo verificar estado en MercadoPago', 'MERCADOPAGO_CHECK_FAILED', {
            external_reference: targetSubscription.external_reference,
            status: mpResponse.status
          })
        }
      } catch (error: any) {
        logger.error('❌ Error verificando MercadoPago', 'MERCADOPAGO_ERROR', {
          external_reference: targetSubscription.external_reference,
          error: error.message
        })
      }
    }
    
    if (!paymentApproved) {
      logger.warn('⚠️ Pago no aprobado, no se puede auto-activar', 'AUTO_ACTIVATION_PAYMENT_NOT_APPROVED', {
        subscription_id: targetSubscription.id,
        external_reference: targetSubscription.external_reference,
        mp_status: mercadoPagoData?.status,
        force
      })
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Pago no está aprobado',
          subscription_id: targetSubscription.id,
          payment_status: mercadoPagoData?.status || 'unknown',
          requires_approval: true
        },
        { status: 400 }
      )
    }
    
    // PASO 4: Activar la suscripción
    const now = new Date()
    const nextBillingDate = new Date(now)
    
    // Calcular próxima fecha de facturación según el plan
    if (targetSubscription.product_name?.toLowerCase().includes('mensual')) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    } else if (targetSubscription.product_name?.toLowerCase().includes('anual')) {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    } else {
      // Default: mensual
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }
    
    // Actualizar suscripción
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        activated_at: now.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        charges_made: (targetSubscription.charges_made || 0) + 1,
        updated_at: now.toISOString()
      })
      .eq('id', targetSubscription.id)
      .select()
      .single()
    
    if (updateError) {
      throw new Error(`Error actualizando suscripción: ${updateError.message}`)
    }
    
    // PASO 5: Crear registro en billing history
    const { error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert({
        subscription_id: targetSubscription.id,
        user_id: targetSubscription.user_id,
        amount: targetSubscription.price || 0,
        currency: 'ARS',
        status: 'completed',
        payment_method: 'mercadopago',
        external_payment_id: targetSubscription.external_reference,
        billing_date: now.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        metadata: {
          auto_activated: true,
          activation_source: 'auto-activate-endpoint',
          mercadopago_data: mercadoPagoData,
          original_external_reference: targetSubscription.external_reference
        }
      })
    
    if (billingError) {
      logger.error('❌ Error creando registro de billing', 'BILLING_HISTORY_ERROR', {
        subscription_id: targetSubscription.id,
        error: billingError.message
      })
    }
    
    // PASO 6: Enviar email de confirmación
    let emailSent = false
    try {
      if (targetSubscription.customer_data?.email) {
        const emailData = {
          userEmail: targetSubscription.customer_data.email,
          userName: targetSubscription.customer_data.name || 'Cliente',
          subscriptionId: targetSubscription.id,
          productName: targetSubscription.product_name || 'Suscripción',
          planType: 'monthly',
          amount: targetSubscription.price || 0,
          currency: 'MXN',
          nextBillingDate: nextBillingDate.toISOString(),
          status: 'active'
        }
        
        const result = await enhancedEmailService.sendSubscriptionConfirmationEmail(emailData)
        emailSent = result.success
        
        logger.info('📧 Email de confirmación enviado', 'CONFIRMATION_EMAIL_SENT', {
          subscription_id: targetSubscription.id,
          email: targetSubscription.customer_data.email,
          success: result.success
        })
      }
    } catch (emailError: any) {
      logger.error('❌ Error enviando email de confirmación', 'EMAIL_ERROR', {
        subscription_id: targetSubscription.id,
        error: emailError.message
      })
    }
    
    // PASO 7: Log de éxito
    logger.info('✅ Suscripción auto-activada exitosamente', 'AUTO_ACTIVATION_SUCCESS', {
      subscription_id: targetSubscription.id,
      external_reference: targetSubscription.external_reference,
      user_id: targetSubscription.user_id,
      product_name: targetSubscription.product_name,
      activated_at: now.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      email_sent: emailSent,
      charges_made: (targetSubscription.charges_made || 0) + 1,
      activation_source: 'auto-activate-endpoint'
    })
    
    return NextResponse.json({
      success: true,
      message: 'Suscripción activada automáticamente',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        activated_at: updatedSubscription.activated_at,
        next_billing_date: updatedSubscription.next_billing_date,
        product_name: updatedSubscription.product_name,
        charges_made: updatedSubscription.charges_made
      },
      email_sent: emailSent,
      billing_record_created: !billingError,
      activation_source: 'auto-activate-endpoint'
    })
    
  } catch (error: any) {
    logger.error('❌ Error en auto-activación de suscripción', 'AUTO_ACTIVATION_ERROR', {
      error: error.message,
      stack: error.stack,
      request_body: await request.json().catch(() => ({}))
    })
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error en auto-activación',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Obtener estadísticas de auto-activaciones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    
    const supabase = createServiceClient()
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    // Obtener suscripciones activadas recientemente
    const { data: recentActivations, error } = await supabase
      .from('unified_subscriptions')
      .select('id, activated_at, product_name, external_reference')
      .eq('status', 'active')
      .gte('activated_at', startDate.toISOString())
      .order('activated_at', { ascending: false })
    
    if (error) {
      throw new Error(`Error obteniendo activaciones: ${error.message}`)
    }
    
    // Obtener registros de billing recientes
    const { data: billingRecords, error: billingError } = await supabase
      .from('subscription_billing_history')
      .select('subscription_id, status, created_at, metadata')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
    
    const autoActivatedCount = billingRecords?.filter(
      record => record.metadata?.auto_activated === true
    ).length || 0
    
    return NextResponse.json({
      success: true,
      timeframe_hours: hours,
      statistics: {
        total_activations: recentActivations?.length || 0,
        auto_activations: autoActivatedCount,
        manual_activations: (recentActivations?.length || 0) - autoActivatedCount,
        auto_activation_rate: recentActivations?.length ? 
          Math.round((autoActivatedCount / recentActivations.length) * 100) : 0
      },
      recent_activations: recentActivations?.slice(0, 10).map(sub => ({
        id: sub.id,
        product_name: sub.product_name,
        activated_at: sub.activated_at,
        external_reference: sub.external_reference,
        minutes_ago: Math.round((Date.now() - new Date(sub.activated_at!).getTime()) / (1000 * 60))
      })) || []
    })
    
  } catch (error: any) {
    logger.error('❌ Error obteniendo estadísticas de auto-activación', 'AUTO_ACTIVATION_STATS_ERROR', {
      error: error.message
    })
    
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  }
}