import { NextRequest, NextResponse } from 'next/server'
import PaymentSyncService from '@/lib/payment-sync-service'
import logger from '@/lib/logger'

/**
 * Endpoint para sincronización manual de pagos desde el admin
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const syncType = searchParams.get('type') || 'full' // 'orders', 'subscriptions', 'full'
    const maxAge = parseInt(searchParams.get('maxAge') || '24') // Horas
    
    logger.info('Iniciando sincronización manual desde admin', 'ADMIN_SYNC', {
      syncType,
      maxAge,
      userAgent: request.headers.get('user-agent')
    })

    const syncService = new PaymentSyncService()
    let result: any

    switch (syncType) {
      case 'orders':
        result = await syncService.syncPendingOrders(maxAge)
        break
      case 'subscriptions':
        result = await syncService.syncPendingSubscriptions(maxAge)
        break
      case 'full':
      default:
        result = await syncService.fullSync()
        break
    }

    logger.info('Sincronización manual completada', 'ADMIN_SYNC', {
      syncType,
      result: {
        processed: result.processed || (result.orders?.processed + result.subscriptions?.processed),
        updated: result.updated || (result.orders?.updated + result.subscriptions?.updated),
        errors: result.errors || (result.orders?.errors + result.subscriptions?.errors)
      }
    })

    return NextResponse.json({
      success: true,
      syncType,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error en sincronización manual', 'ADMIN_SYNC', {
      error: error.message
    })

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Obtener estadísticas de sincronización
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'

    if (action === 'stats') {
      // Obtener estadísticas de órdenes pendientes
      const syncService = new PaymentSyncService()
      await syncService.initializeSupabase()
      
      // Aquí podrías agregar lógica para obtener estadísticas
      // Por ahora, devolvemos información básica
      
      return NextResponse.json({
        service: 'Payment Sync Service',
        status: 'active',
        lastSync: new Date().toISOString(),
        availableActions: {
          'POST /api/admin/sync-payments?type=orders': 'Sincronizar solo órdenes',
          'POST /api/admin/sync-payments?type=subscriptions': 'Sincronizar solo suscripciones',
          'POST /api/admin/sync-payments?type=full': 'Sincronización completa',
          'GET /api/admin/sync-payments?action=stats': 'Obtener estadísticas'
        },
        parameters: {
          maxAge: 'Edad máxima en horas para sincronizar (default: 24)'
        }
      })
    }

    return NextResponse.json({
      error: 'Acción no válida'
    }, { status: 400 })

  } catch (error) {
    logger.error('Error obteniendo estadísticas de sincronización', 'ADMIN_SYNC', {
      error: error.message
    })

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}