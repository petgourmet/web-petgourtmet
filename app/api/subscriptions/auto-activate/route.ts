import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * ENDPOINT DE ACTIVACIÓN AUTOMÁTICA DE SUSCRIPCIONES
 * 
 * Este endpoint se ejecuta automáticamente para detectar y activar
 * suscripciones pendientes que ya han sido pagadas en MercadoPago
 * 
 * Funcionalidades:
 * - Busca suscripciones en estado "pending"
 * - Verifica el estado en MercadoPago
 * - Activa automáticamente las que están pagadas
 * - Registra logs detallados
 */

interface MercadoPagoPreapproval {
  id: string
  status: string
  external_reference: string
  payer_email: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.info('🔄 Iniciando proceso de activación automática de suscripciones')
    
    const supabase = createClient()
    
    // PASO 1: Obtener suscripciones pendientes
    const { data: pendingSubscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .not('external_reference', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50) // Procesar máximo 50 por vez
    
    if (fetchError) {
      logger.error('❌ Error obteniendo suscripciones pendientes:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: 'Error obteniendo suscripciones pendientes',
        details: fetchError.message 
      }, { status: 500 })
    }

    if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
      logger.info('✅ No hay suscripciones pendientes para procesar')
      return NextResponse.json({ 
        success: true, 
        message: 'No hay suscripciones pendientes',
        processed: 0,
        activated: 0,
        duration: Date.now() - startTime
      })
    }

    logger.info(`📋 Encontradas ${pendingSubscriptions.length} suscripciones pendientes`)

    // PASO 2: Procesar cada suscripción
    const results = {
      processed: 0,
      activated: 0,
      errors: 0,
      details: [] as any[]
    }

    for (const subscription of pendingSubscriptions) {
      try {
        results.processed++
        
        logger.info(`🔍 Procesando suscripción ${subscription.id} - ${subscription.external_reference}`)
        
        // Verificar estado en MercadoPago
        const mercadoPagoStatus = await checkMercadoPagoStatus(subscription.external_reference)
        
        if (mercadoPagoStatus.shouldActivate) {
          // Activar suscripción
          const activationResult = await activateSubscription(supabase, subscription, mercadoPagoStatus)
          
          if (activationResult.success) {
            results.activated++
            logger.info(`✅ Suscripción ${subscription.id} activada exitosamente`)
            
            results.details.push({
              subscription_id: subscription.id,
              external_reference: subscription.external_reference,
              user_email: JSON.parse(subscription.customer_data || '{}').email,
              status: 'activated',
              mercadopago_status: mercadoPagoStatus.status
            })
          } else {
            results.errors++
            logger.error(`❌ Error activando suscripción ${subscription.id}:`, activationResult.error)
            
            results.details.push({
              subscription_id: subscription.id,
              external_reference: subscription.external_reference,
              status: 'error',
              error: activationResult.error
            })
          }
        } else {
          logger.info(`⏳ Suscripción ${subscription.id} aún no está lista para activar - Estado MP: ${mercadoPagoStatus.status}`)
          
          results.details.push({
            subscription_id: subscription.id,
            external_reference: subscription.external_reference,
            status: 'pending',
            mercadopago_status: mercadoPagoStatus.status,
            reason: mercadoPagoStatus.reason
          })
        }
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error: any) {
        results.errors++
        logger.error(`❌ Error procesando suscripción ${subscription.id}:`, error)
        
        results.details.push({
          subscription_id: subscription.id,
          external_reference: subscription.external_reference,
          status: 'error',
          error: error.message
        })
      }
    }

    const duration = Date.now() - startTime
    
    logger.info(`🎯 Proceso completado en ${duration}ms:`)
    logger.info(`   📊 Procesadas: ${results.processed}`)
    logger.info(`   ✅ Activadas: ${results.activated}`)
    logger.info(`   ❌ Errores: ${results.errors}`)

    return NextResponse.json({
      success: true,
      message: 'Proceso de activación automática completado',
      ...results,
      duration
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('❌ Error crítico en activación automática:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error crítico en el proceso de activación',
      details: error.message,
      duration
    }, { status: 500 })
  }
}

/**
 * Verificar estado de suscripción en MercadoPago
 */
async function checkMercadoPagoStatus(externalReference: string): Promise<{
  shouldActivate: boolean
  status: string
  reason: string
  preapprovals?: MercadoPagoPreapproval[]
}> {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    
    if (!accessToken) {
      return {
        shouldActivate: false,
        status: 'error',
        reason: 'Token de MercadoPago no configurado'
      }
    }

    // Buscar preapprovals por external_reference
    const searchUrl = `https://api.mercadopago.com/preapproval/search?external_reference=${externalReference}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return {
        shouldActivate: false,
        status: 'error',
        reason: `Error HTTP ${response.status} consultando MercadoPago`
      }
    }

    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      return {
        shouldActivate: false,
        status: 'not_found',
        reason: 'No se encontró la suscripción en MercadoPago'
      }
    }

    // Buscar preapprovals autorizados
    const authorizedPreapprovals = data.results.filter((p: MercadoPagoPreapproval) => 
      p.status === 'authorized'
    )

    if (authorizedPreapprovals.length > 0) {
      return {
        shouldActivate: true,
        status: 'authorized',
        reason: `Encontrados ${authorizedPreapprovals.length} preapprovals autorizados`,
        preapprovals: authorizedPreapprovals
      }
    }

    return {
      shouldActivate: false,
      status: data.results[0]?.status || 'unknown',
      reason: `Estado en MercadoPago: ${data.results[0]?.status || 'desconocido'}`,
      preapprovals: data.results
    }

  } catch (error: any) {
    logger.error('❌ Error verificando estado en MercadoPago:', error)
    return {
      shouldActivate: false,
      status: 'error',
      reason: `Error consultando MercadoPago: ${error.message}`
    }
  }
}

/**
 * Activar suscripción en la base de datos
 */
async function activateSubscription(
  supabase: any, 
  subscription: any, 
  mercadoPagoStatus: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar duplicados antes de activar
    const { data: existingActive } = await supabase
      .from('unified_subscriptions')
      .select('id, status')
      .eq('user_id', subscription.user_id)
      .eq('product_id', subscription.product_id)
      .eq('status', 'active')

    // Si hay duplicados, cancelar los anteriores
    if (existingActive && existingActive.length > 0) {
      logger.info(`⚠️ Cancelando ${existingActive.length} suscripciones duplicadas`)
      
      for (const duplicate of existingActive) {
        await supabase
          .from('unified_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reason: `Cancelada automáticamente por duplicación - Nueva suscripción ${subscription.id}`
          })
          .eq('id', duplicate.id)
      }
    }

    // Activar la suscripción
    const activationData = {
      status: 'active',
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      start_date: new Date().toISOString(),
      metadata: {
        ...subscription.metadata,
        activation_method: 'auto_polling',
        activation_timestamp: new Date().toISOString(),
        mercadopago_status: mercadoPagoStatus.status,
        mercadopago_preapprovals: mercadoPagoStatus.preapprovals?.length || 0
      }
    }

    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(activationData)
      .eq('id', subscription.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Registrar evento
    await supabase
      .from('subscription_events')
      .insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        event_type: 'auto_activation',
        event_data: {
          method: 'auto_polling',
          external_reference: subscription.external_reference,
          timestamp: new Date().toISOString(),
          previous_status: 'pending',
          new_status: 'active',
          mercadopago_status: mercadoPagoStatus.status
        },
        created_at: new Date().toISOString()
      })

    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * GET endpoint para verificar estado del sistema
 */
export async function GET() {
  try {
    const supabase = createClient()
    
    // Contar suscripciones pendientes
    const { count: pendingCount } = await supabase
      .from('unified_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .not('external_reference', 'is', null)

    // Contar suscripciones activas
    const { count: activeCount } = await supabase
      .from('unified_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    return NextResponse.json({
      success: true,
      system_status: 'operational',
      pending_subscriptions: pendingCount || 0,
      active_subscriptions: activeCount || 0,
      last_check: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      system_status: 'error',
      error: error.message
    }, { status: 500 })
  }
}