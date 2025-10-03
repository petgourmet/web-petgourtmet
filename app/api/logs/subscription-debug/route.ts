// app/api/logs/subscription-debug/route.ts
// Endpoint para obtener logs detallados del sistema de activación automática

import { NextRequest, NextResponse } from 'next/server'
import { logger, LogCategory, LogLevel } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')
    const category = searchParams.get('category') as LogCategory
    const level = searchParams.get('level') as LogLevel
    const limit = parseInt(searchParams.get('limit') || '50')
    const hours = parseInt(searchParams.get('hours') || '24')

    // Calcular fecha de inicio (últimas X horas)
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Obtener logs filtrados
    const filters: any = {
      limit,
      startDate
    }

    if (category) {
      filters.category = category
    }

    if (level) {
      filters.level = level
    }

    const logs = logger.getLogs(filters)

    // Filtrar por subscriptionId si se proporciona
    const filteredLogs = subscriptionId 
      ? logs.filter(log => log.subscriptionId === subscriptionId)
      : logs

    // Obtener estadísticas específicas de suscripciones
    const subscriptionLogs = logger.getLogs({ 
      category: LogCategory.SUBSCRIPTION, 
      limit: 1000,
      startDate 
    })

    const stats = {
      totalLogs: filteredLogs.length,
      subscriptionLogs: subscriptionLogs.length,
      activationAttempts: subscriptionLogs.filter(log => 
        log.message.includes('ACTIVACIÓN INTENTO')
      ).length,
      activationSuccesses: subscriptionLogs.filter(log => 
        log.message.includes('ACTIVACIÓN EXITOSA')
      ).length,
      activationFailures: subscriptionLogs.filter(log => 
        log.message.includes('ACTIVACIÓN FALLIDA')
      ).length,
      pollingChecks: subscriptionLogs.filter(log => 
        log.message.includes('POLLING CHECK')
      ).length,
      webhookBackups: subscriptionLogs.filter(log => 
        log.message.includes('WEBHOOK BACKUP')
      ).length,
      realTimeVerifications: subscriptionLogs.filter(log => 
        log.message.includes('TIEMPO REAL')
      ).length,
      mpSyncAttempts: subscriptionLogs.filter(log => 
        log.message.includes('MP SYNC')
      ).length
    }

    // Obtener errores recientes
    const recentErrors = logger.getRecentErrors(10)

    return NextResponse.json({
      success: true,
      data: {
        logs: filteredLogs,
        stats,
        recentErrors,
        filters: {
          subscriptionId,
          category,
          level,
          limit,
          hours,
          startDate: startDate.toISOString()
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Error obteniendo logs de debug',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, subscriptionId, data } = body

    switch (action) {
      case 'clear_logs':
        logger.clearLogs()
        return NextResponse.json({
          success: true,
          message: 'Logs limpiados correctamente'
        })

      case 'test_log':
        if (subscriptionId) {
          logger.subscriptionActivationAttempt(subscriptionId, 'test_manual', data)
          logger.subscriptionActivationSuccess(subscriptionId, 'test_manual', 'pending', data)
        }
        return NextResponse.json({
          success: true,
          message: 'Logs de prueba generados'
        })

      case 'get_stats':
        const stats = logger.getLogStats()
        return NextResponse.json({
          success: true,
          stats
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Error procesando solicitud',
        message: error.message 
      },
      { status: 500 }
    )
  }
}