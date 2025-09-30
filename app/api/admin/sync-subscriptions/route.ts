import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionSyncService } from '@/lib/subscription-sync-service'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

// Estado global para evitar ejecuciones concurrentes
let isRunning = false
let lastSyncStats: any = null
const subscriptionSyncService = new SubscriptionSyncService()

/**
 * POST /api/admin/sync-subscriptions
 * Endpoint para sincronización manual de suscripciones
 * 
 * Body (opcional):
 * {
 *   "external_reference": "string" // Para sincronizar una suscripción específica
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [ADMIN] Iniciando sincronización manual de suscripciones...')
    
    // Verificar autenticación de admin (opcional - agregar según necesidades)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ [ADMIN] Intento de acceso sin autorización')
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    // Verificar si ya hay una sincronización en curso
    if (subscriptionSyncService.isCurrentlyRunning()) {
      console.warn('⚠️ [ADMIN] Sincronización ya en curso')
      return NextResponse.json(
        { 
          error: 'Sync already in progress',
          message: 'Una sincronización ya está en curso. Espere a que termine.'
        },
        { status: 409 }
      )
    }

    let body: any = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.warn('⚠️ [ADMIN] Error parsing request body, usando valores por defecto')
    }

    const { external_reference } = body

    let result
    
    if (external_reference) {
      // Sincronizar suscripción específica
      console.log(`🎯 [ADMIN] Sincronizando suscripción específica: ${external_reference}`)
      
      const singleResult = await subscriptionSyncService.syncSingleSubscription(external_reference)
      
      result = {
        type: 'single',
        external_reference,
        result: singleResult,
        success: !singleResult.error
      }
      
    } else {
      // Sincronizar todas las suscripciones
      console.log('🌐 [ADMIN] Sincronizando todas las suscripciones')
      
      const syncSummary = await subscriptionSyncService.syncAllSubscriptions()
      
      result = {
        type: 'all',
        summary: syncSummary,
        success: syncSummary.error_count === 0
      }
    }

    // Obtener estadísticas actualizadas
    const stats = await subscriptionSyncService.getSyncStats()

    console.log('✅ [ADMIN] Sincronización completada exitosamente')
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
      stats
    })

  } catch (error) {
    console.error('❌ [ADMIN] Error en sincronización:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/sync-subscriptions
 * Obtiene el estado actual del servicio de sincronización
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [ADMIN] Consultando estado de sincronización')
    
    // Verificar autenticación de admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const isRunning = subscriptionSyncService.isCurrentlyRunning()
    const stats = await subscriptionSyncService.getSyncStats()
    
    // Obtener conteo de suscripciones por estado
    const client = createServiceClient()
    const { data: subscriptionCounts } = await client
      .from('unified_subscriptions')
      .select('status')
      .in('status', ['pending', 'authorized', 'paused', 'cancelled'])
    
    const statusCounts = subscriptionCounts?.reduce((acc: any, sub: any) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sync_status: {
        is_running: isRunning,
        last_24h_syncs: stats.last_24h_syncs,
        last_sync: stats.last_sync
      },
      subscription_counts: statusCounts,
      total_active_subscriptions: (statusCounts.pending || 0) + (statusCounts.authorized || 0) + (statusCounts.paused || 0)
    })

  } catch (error) {
    console.error('❌ [ADMIN] Error obteniendo estado:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/sync-subscriptions
 * Cancela una sincronización en curso (si es posible)
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🛑 [ADMIN] Solicitando cancelación de sincronización')
    
    // Verificar autenticación de admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const isRunning = subscriptionSyncService.isCurrentlyRunning()
    
    if (!isRunning) {
      return NextResponse.json({
        success: true,
        message: 'No hay sincronización en curso',
        timestamp: new Date().toISOString()
      })
    }

    // Nota: En esta implementación básica, no podemos cancelar una sincronización en curso
    // Se podría implementar un mecanismo de cancelación más sofisticado si es necesario
    
    return NextResponse.json({
      success: false,
      message: 'No se puede cancelar una sincronización en curso. Espere a que termine.',
      is_running: isRunning,
      timestamp: new Date().toISOString()
    }, { status: 409 })

  } catch (error) {
    console.error('❌ [ADMIN] Error cancelando sincronización:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}