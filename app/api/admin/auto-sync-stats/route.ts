import { NextRequest, NextResponse } from 'next/server'
import autoSyncService from '@/lib/auto-sync-service'
import logger from '@/lib/logger'

// Endpoint para obtener estadísticas del servicio de auto-sincronización
export async function GET(request: NextRequest) {
  try {
    const stats = autoSyncService.getStats()
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error obteniendo estadísticas de auto-sync', 'AUTO_SYNC_STATS', {
      error: error.message
    })
    
    return NextResponse.json(
      { 
        error: 'Error obteniendo estadísticas',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Endpoint para ejecutar acciones en el servicio de auto-sincronización
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json()

    switch (action) {
      case 'sync_pending':
        const maxAge = params.maxAge || 2
        const result = await autoSyncService.syncPendingOrders(maxAge)
        
        return NextResponse.json({
          success: true,
          action: 'sync_pending',
          result,
          timestamp: new Date().toISOString()
        })

      case 'validate_order':
        if (!params.orderId) {
          return NextResponse.json(
            { error: 'orderId es requerido para validate_order' },
            { status: 400 }
          )
        }
        
        const validationResult = await autoSyncService.validateOrderPayment(params.orderId)
        
        return NextResponse.json({
          success: true,
          action: 'validate_order',
          result: validationResult,
          timestamp: new Date().toISOString()
        })

      case 'auto_sync_webhook_failure':
        if (!params.paymentId) {
          return NextResponse.json(
            { error: 'paymentId es requerido para auto_sync_webhook_failure' },
            { status: 400 }
          )
        }
        
        const autoSyncResult = await autoSyncService.autoSyncOnWebhookFailure(
          params.paymentId,
          params.externalReference
        )
        
        return NextResponse.json({
          success: true,
          action: 'auto_sync_webhook_failure',
          result: autoSyncResult,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('Error ejecutando acción de auto-sync', 'AUTO_SYNC_STATS', {
      error: error.message
    })
    
    return NextResponse.json(
      { 
        error: 'Error ejecutando acción',
        details: error.message
      },
      { status: 500 }
    )
  }
}