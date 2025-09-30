import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionSyncService } from '@/lib/subscription-sync-service'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutos máximo de ejecución

// Variable global para controlar ejecuciones concurrentes
let lastExecution = 0
const EXECUTION_COOLDOWN = 10 * 60 * 1000 // 10 minutos entre ejecuciones
const subscriptionSyncService = new SubscriptionSyncService()

/**
 * GET /api/cron/sync-subscriptions
 * Endpoint de cron para sincronización automática de suscripciones
 * 
 * Este endpoint debe ser configurado para ejecutarse cada 15 minutos
 * en el servicio de cron (Vercel Cron, GitHub Actions, etc.)
 */
export async function GET(request: NextRequest) {
  const executionId = `sync-${Date.now()}`
  const startTime = Date.now()
  
  try {
    console.log(`🕐 [CRON-${executionId}] Iniciando sincronización automática...`)
    
    // Verificar autorización del cron (opcional)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn(`⚠️ [CRON-${executionId}] Intento de acceso no autorizado`)
      return NextResponse.json(
        { error: 'Unauthorized cron access' },
        { status: 401 }
      )
    }

    // Verificar cooldown para evitar ejecuciones muy frecuentes
    const now = Date.now()
    if (now - lastExecution < EXECUTION_COOLDOWN) {
      const remainingTime = Math.ceil((EXECUTION_COOLDOWN - (now - lastExecution)) / 1000 / 60)
      console.log(`⏳ [CRON-${executionId}] Cooldown activo. Próxima ejecución en ${remainingTime} minutos`)
      
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'cooldown_active',
        next_execution_in_minutes: remainingTime,
        timestamp: new Date().toISOString()
      })
    }

    // Verificar si ya hay una sincronización en curso
    if (subscriptionSyncService.isCurrentlyRunning()) {
      console.warn(`⚠️ [CRON-${executionId}] Sincronización ya en curso, saltando ejecución`)
      
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'sync_in_progress',
        timestamp: new Date().toISOString()
      })
    }

    // Actualizar timestamp de última ejecución
    lastExecution = now

    // Registrar inicio de ejecución
    await logCronExecution(executionId, 'started')

    console.log(`🚀 [CRON-${executionId}] Ejecutando sincronización completa...`)
    
    // Ejecutar sincronización
    const syncResult = await subscriptionSyncService.syncAllSubscriptions()
    
    const executionTime = Date.now() - startTime
    
    // Registrar finalización exitosa
    await logCronExecution(executionId, 'completed', {
      total_processed: syncResult.total_processed,
      updated_count: syncResult.updated_count,
      error_count: syncResult.error_count,
      execution_time_ms: executionTime
    })

    console.log(`✅ [CRON-${executionId}] Sincronización completada en ${executionTime}ms`)
    console.log(`📊 [CRON-${executionId}] Resultados: ${syncResult.updated_count}/${syncResult.total_processed} actualizadas, ${syncResult.error_count} errores`)
    
    // Obtener estadísticas actualizadas
    const stats = await subscriptionSyncService.getSyncStats()

    return NextResponse.json({
      success: true,
      execution_id: executionId,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      sync_result: syncResult,
      stats,
      next_scheduled_execution: new Date(now + 15 * 60 * 1000).toISOString()
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    
    console.error(`❌ [CRON-${executionId}] Error en sincronización automática:`, error)
    
    // Registrar error
    await logCronExecution(executionId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: executionTime
    })

    return NextResponse.json(
      {
        success: false,
        execution_id: executionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        execution_time_ms: executionTime
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/sync-subscriptions
 * Endpoint alternativo para forzar ejecución inmediata (bypass cooldown)
 */
export async function POST(request: NextRequest) {
  const executionId = `force-sync-${Date.now()}`
  
  try {
    console.log(`🔥 [CRON-${executionId}] Forzando sincronización inmediata...`)
    
    // Verificar autorización más estricta para POST
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET
    
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      console.warn(`⚠️ [CRON-${executionId}] Intento de acceso no autorizado para forzar sync`)
      return NextResponse.json(
        { error: 'Unauthorized force sync access' },
        { status: 401 }
      )
    }

    // Verificar si ya hay una sincronización en curso
    if (subscriptionSyncService.isCurrentlyRunning()) {
      return NextResponse.json(
        { 
          error: 'Sync already in progress',
          message: 'Una sincronización ya está en curso'
        },
        { status: 409 }
      )
    }

    // Resetear cooldown para permitir ejecución inmediata
    lastExecution = 0
    
    // Ejecutar sincronización
    const syncResult = await subscriptionSyncService.syncAllSubscriptions()
    
    // Actualizar timestamp después de ejecución exitosa
    lastExecution = Date.now()
    
    await logCronExecution(executionId, 'force_completed', {
      total_processed: syncResult.total_processed,
      updated_count: syncResult.updated_count,
      error_count: syncResult.error_count
    })

    console.log(`✅ [CRON-${executionId}] Sincronización forzada completada`)
    
    return NextResponse.json({
      success: true,
      execution_id: executionId,
      forced: true,
      timestamp: new Date().toISOString(),
      sync_result: syncResult
    })

  } catch (error) {
    console.error(`❌ [CRON-${executionId}] Error en sincronización forzada:`, error)
    
    await logCronExecution(executionId, 'force_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        execution_id: executionId,
        forced: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Registra las ejecuciones del cron en la base de datos
 */
async function logCronExecution(
  executionId: string, 
  status: 'started' | 'completed' | 'failed' | 'force_completed' | 'force_failed',
  metadata?: any
): Promise<void> {
  try {
    const client = createServiceClient()
    
    await client
      .from('cron_logs')
      .insert({
        execution_id: executionId,
        job_name: 'sync-subscriptions',
        status,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })
      
  } catch (error) {
    console.error(`❌ Error logging cron execution ${executionId}:`, error)
    // No lanzar error para no interrumpir la ejecución principal
  }
}