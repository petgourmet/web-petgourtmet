// app/api/admin/subscription-cleanup/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import MercadoPagoService from '@/lib/mercadopago-service'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CleanupResult {
  subscriptionId: string
  externalId: string
  previousStatus: string
  newStatus: string
  userEmail: string
  planName: string
  updatedAt: string
}

interface CleanupReport {
  totalProcessed: number
  totalUpdated: number
  totalErrors: number
  updatedSubscriptions: CleanupResult[]
  errors: string[]
  executedAt: string
}

export async function POST(request: NextRequest) {
  try {
    logger.info('🧹 Iniciando proceso de limpieza de suscripciones')
    
    // Verificar token de acceso de MercadoPago
    const mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoToken) {
      logger.error('❌ Token de MercadoPago no configurado')
      return NextResponse.json(
        { error: 'Token de MercadoPago no configurado' },
        { status: 500 }
      )
    }

    // Inicializar servicio de MercadoPago
    const mpService = new MercadoPagoService(mercadoPagoToken)
    
    // Obtener todas las suscripciones activas de la base de datos
    const { data: subscriptions, error: dbError } = await supabase
      .from('unified_subscriptions')
      .select(`
        id,
        external_subscription_id,
        status,
        user_email,
        plan_name,
        created_at,
        updated_at
      `)
      .in('status', ['active', 'pending', 'authorized'])
      .not('external_subscription_id', 'is', null)

    if (dbError) {
      logger.error('❌ Error al obtener suscripciones de la BD:', dbError)
      return NextResponse.json(
        { error: 'Error al obtener suscripciones de la base de datos' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      logger.info('ℹ️ No se encontraron suscripciones activas para limpiar')
      return NextResponse.json({
        message: 'No se encontraron suscripciones activas para procesar',
        report: {
          totalProcessed: 0,
          totalUpdated: 0,
          totalErrors: 0,
          updatedSubscriptions: [],
          errors: [],
          executedAt: new Date().toISOString()
        }
      })
    }

    logger.info(`📊 Procesando ${subscriptions.length} suscripciones`)

    const report: CleanupReport = {
      totalProcessed: 0,
      totalUpdated: 0,
      totalErrors: 0,
      updatedSubscriptions: [],
      errors: [],
      executedAt: new Date().toISOString()
    }

    // Procesar cada suscripción
    for (const subscription of subscriptions) {
      report.totalProcessed++
      
      try {
        logger.info(`🔍 Verificando suscripción ${subscription.external_subscription_id}`)
        
        // Consultar estado en MercadoPago
        const mpSubscription = await mpService.getSubscription(subscription.external_subscription_id)
        
        if (!mpSubscription) {
          const errorMsg = `Suscripción ${subscription.external_subscription_id} no encontrada en MercadoPago`
          logger.warn(`⚠️ ${errorMsg}`)
          report.errors.push(errorMsg)
          report.totalErrors++
          continue
        }

        const mpStatus = mpSubscription.status
        const currentStatus = subscription.status
        
        logger.info(`📋 Suscripción ${subscription.external_subscription_id}: BD=${currentStatus}, MP=${mpStatus}`)

        // Verificar si necesita actualización
        const needsUpdate = shouldUpdateStatus(currentStatus, mpStatus)
        
        if (needsUpdate) {
          const newStatus = mapMercadoPagoStatus(mpStatus)
          
          logger.info(`🔄 Actualizando suscripción ${subscription.id}: ${currentStatus} → ${newStatus}`)
          
          // Actualizar en la base de datos
          const { error: updateError } = await supabase
            .from('unified_subscriptions')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
              mercadopago_status: mpStatus,
              last_sync_at: new Date().toISOString()
            })
            .eq('id', subscription.id)

          if (updateError) {
            const errorMsg = `Error al actualizar suscripción ${subscription.id}: ${updateError.message}`
            logger.error(`❌ ${errorMsg}`)
            report.errors.push(errorMsg)
            report.totalErrors++
          } else {
            // Registrar actualización exitosa
            const cleanupResult: CleanupResult = {
              subscriptionId: subscription.id,
              externalId: subscription.external_subscription_id,
              previousStatus: currentStatus,
              newStatus: newStatus,
              userEmail: subscription.user_email,
              planName: subscription.plan_name,
              updatedAt: new Date().toISOString()
            }
            
            report.updatedSubscriptions.push(cleanupResult)
            report.totalUpdated++
            
            logger.info(`✅ Suscripción ${subscription.id} actualizada exitosamente`)
          }
        } else {
          logger.info(`✓ Suscripción ${subscription.external_subscription_id} ya está sincronizada`)
        }
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error: any) {
        const errorMsg = `Error al procesar suscripción ${subscription.external_subscription_id}: ${error.message}`
        logger.error(`❌ ${errorMsg}`)
        report.errors.push(errorMsg)
        report.totalErrors++
      }
    }

    // Log del resumen final
    logger.info(`🏁 Proceso de limpieza completado:`, {
      totalProcessed: report.totalProcessed,
      totalUpdated: report.totalUpdated,
      totalErrors: report.totalErrors
    })

    return NextResponse.json({
      message: 'Proceso de limpieza completado',
      report
    })

  } catch (error: any) {
    logger.error('❌ Error general en el proceso de limpieza:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

// Función para determinar si el estado necesita actualización
function shouldUpdateStatus(currentStatus: string, mercadoPagoStatus: string): boolean {
  // Estados que indican que la suscripción ya no está activa en MercadoPago
  const inactiveStatuses = ['cancelled', 'paused', 'finished', 'expired']
  
  // Si en MercadoPago está inactiva pero en BD está activa, necesita actualización
  if (inactiveStatuses.includes(mercadoPagoStatus) && 
      ['active', 'pending', 'authorized'].includes(currentStatus)) {
    return true
  }
  
  // Si en MercadoPago está activa pero en BD está inactiva, también actualizar
  if (mercadoPagoStatus === 'authorized' && currentStatus !== 'active') {
    return true
  }
  
  return false
}

// Función para mapear estados de MercadoPago a nuestros estados internos
function mapMercadoPagoStatus(mercadoPagoStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'authorized': 'active',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'paused': 'paused',
    'finished': 'cancelled',
    'expired': 'cancelled'
  }
  
  return statusMap[mercadoPagoStatus] || 'unknown'
}

export async function GET(request: NextRequest) {
  try {
    // Endpoint para obtener estadísticas de suscripciones sin hacer limpieza
    const { data: stats, error } = await supabase
      .from('unified_subscriptions')
      .select('status, count(*)')
      .not('external_subscription_id', 'is', null)
    
    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener estadísticas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Estadísticas de suscripciones',
      stats
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}