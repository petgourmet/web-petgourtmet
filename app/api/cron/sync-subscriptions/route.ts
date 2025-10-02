// app/api/cron/sync-subscriptions/route.ts
// Endpoint de cron job para sincronizar automáticamente suscripciones pendientes

import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoSyncService } from '@/lib/mercadopago-sync-service'
import { logger, LogCategory } from '@/lib/logger'

// Configuración del cron job
const CRON_SECRET = process.env.CRON_SECRET || 'default-secret'
const STALE_THRESHOLD_MINUTES = parseInt(process.env.STALE_SUBSCRIPTION_THRESHOLD_MINUTES || '10')

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verificar autorización del cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-cron-secret')
    
    if (cronSecret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Intento de acceso no autorizado al cron job de sincronización', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
      
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    logger.info(LogCategory.SUBSCRIPTION, '🚀 Iniciando cron job de sincronización de suscripciones', {
      staleThresholdMinutes: STALE_THRESHOLD_MINUTES
    })

    // Inicializar servicio de sincronización
    const syncService = new MercadoPagoSyncService()

    // Sincronizar suscripciones obsoletas (prioritarias)
    const staleResults = await syncService.syncStaleSubscriptions(STALE_THRESHOLD_MINUTES)
    
    // Si hay tiempo y recursos, sincronizar todas las pendientes
    let allResults = { synced: 0, errors: 0, total: 0 }
    const elapsedTime = Date.now() - startTime
    
    // Solo sincronizar todas si el proceso de obsoletas fue rápido (< 30 segundos)
    if (elapsedTime < 30000) {
      logger.info(LogCategory.SUBSCRIPTION, 'Sincronizando todas las suscripciones pendientes restantes')
      allResults = await syncService.syncAllPendingSubscriptions()
    } else {
      logger.info(LogCategory.SUBSCRIPTION, 'Saltando sincronización completa por tiempo límite', {
        elapsedTime: `${elapsedTime}ms`
      })
    }

    const totalDuration = Date.now() - startTime
    
    // Preparar respuesta
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${totalDuration}ms`,
      staleSubscriptions: {
        total: staleResults.total,
        synced: staleResults.synced,
        errors: staleResults.errors
      },
      allSubscriptions: {
        total: allResults.total,
        synced: allResults.synced,
        errors: allResults.errors
      },
      summary: {
        totalProcessed: staleResults.total + allResults.total,
        totalSynced: staleResults.synced + allResults.synced,
        totalErrors: staleResults.errors + allResults.errors
      }
    }

    // Log del resultado
    if (response.summary.totalSynced > 0) {
      logger.info(LogCategory.SUBSCRIPTION, '✅ Cron job completado exitosamente con activaciones', {
        ...response.summary,
        duration: totalDuration
      })
    } else if (response.summary.totalProcessed > 0) {
      logger.info(LogCategory.SUBSCRIPTION, '⚠️ Cron job completado sin activaciones', {
        ...response.summary,
        duration: totalDuration
      })
    } else {
      logger.info(LogCategory.SUBSCRIPTION, '✅ Cron job completado - no hay suscripciones pendientes', {
        duration: totalDuration
      })
    }

    return NextResponse.json(response)

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.error(LogCategory.SUBSCRIPTION, '❌ Error en cron job de sincronización', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      },
      { status: 500 }
    )
  }
}

// También permitir POST para flexibilidad
export async function POST(request: NextRequest) {
  return GET(request)
}

// Configuración de runtime para evitar timeouts
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 segundos máximo