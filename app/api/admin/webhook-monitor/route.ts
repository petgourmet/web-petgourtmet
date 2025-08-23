import { NextRequest, NextResponse } from 'next/server'
import webhookMonitor from '@/lib/webhook-monitor'
import logger from '@/lib/logger'

// Endpoint para obtener estadísticas y estado del monitor de webhooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (action) {
      case 'stats':
        const stats = webhookMonitor.getStats()
        return NextResponse.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        })

      case 'events':
        const events = webhookMonitor.getRecentEvents(limit)
        return NextResponse.json({
          success: true,
          events,
          count: events.length,
          timestamp: new Date().toISOString()
        })

      case 'health':
        const healthReport = webhookMonitor.generateHealthReport()
        return NextResponse.json({
          success: true,
          health: healthReport,
          timestamp: new Date().toISOString()
        })

      case 'issues':
        const issues = webhookMonitor.detectIssues()
        return NextResponse.json({
          success: true,
          issues,
          count: issues.length,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida. Usa: stats, events, health, issues' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('Error obteniendo datos del monitor de webhooks', 'WEBHOOK_MONITOR_API', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Endpoint para acciones administrativas
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'persist_stats':
        await webhookMonitor.persistStats()
        return NextResponse.json({
          success: true,
          message: 'Estadísticas persistidas exitosamente'
        })

      case 'clear_events':
        // Limpiar eventos (esto requeriría un método adicional en el monitor)
        return NextResponse.json({
          success: true,
          message: 'Eventos limpiados (funcionalidad pendiente)'
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('Error ejecutando acción del monitor', 'WEBHOOK_MONITOR_API', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
}