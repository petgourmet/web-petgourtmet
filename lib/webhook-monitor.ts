import { logger, LogCategory } from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase/service'

interface WebhookEvent {
  id: string
  type: string
  action: string
  dataId: string
  liveMode: boolean
  timestamp: string
  processed: boolean
  error?: string
  processingTime?: number
}

interface WebhookStats {
  totalReceived: number
  totalProcessed: number
  totalErrors: number
  averageProcessingTime: number
  errorRate: number
  lastProcessed: string | null
  recentErrors: Array<{
    timestamp: string
    error: string
    webhookId: string
  }>
}

class WebhookMonitor {
  private events: Map<string, WebhookEvent> = new Map()
  private maxEvents = 1000 // Mantener solo los últimos 1000 eventos

  // Registrar un webhook recibido
  logWebhookReceived(webhookData: any): string {
    const eventId = `${webhookData.id}_${Date.now()}`
    
    const event: WebhookEvent = {
      id: eventId,
      type: webhookData.type,
      action: webhookData.action,
      dataId: webhookData.data?.id,
      liveMode: webhookData.live_mode,
      timestamp: new Date().toISOString(),
      processed: false
    }

    this.events.set(eventId, event)
    this.cleanupOldEvents()

    logger.info(LogCategory.WEBHOOK, 'Webhook recibido y registrado', {
      eventId,
      type: event.type,
      action: event.action,
      dataId: event.dataId,
      liveMode: event.liveMode
    })

    return eventId
  }

  // Marcar un webhook como procesado exitosamente
  logWebhookProcessed(eventId: string, processingTime: number): void {
    const event = this.events.get(eventId)
    if (event) {
      event.processed = true
      event.processingTime = processingTime
      
      logger.info(LogCategory.WEBHOOK, 'Webhook procesado exitosamente', {
        eventId,
        type: event.type,
        action: event.action,
        dataId: event.dataId,
        processingTime
      })
    }
  }

  // Marcar un webhook como fallido
  logWebhookError(eventId: string, error: string, processingTime?: number): void {
    const event = this.events.get(eventId)
    if (event) {
      event.processed = false
      event.error = error
      event.processingTime = processingTime
      
      logger.error(LogCategory.WEBHOOK, 'Error procesando webhook', error, {
        eventId,
        type: event.type,
        action: event.action,
        dataId: event.dataId,
        processingTime
      })
    }
  }

  // Obtener estadísticas de los webhooks
  getStats(): WebhookStats {
    const events = Array.from(this.events.values())
    const processedEvents = events.filter(e => e.processed)
    const errorEvents = events.filter(e => e.error)
    
    const totalProcessingTime = processedEvents.reduce((sum, e) => sum + (e.processingTime || 0), 0)
    const averageProcessingTime = processedEvents.length > 0 ? totalProcessingTime / processedEvents.length : 0
    
    const recentErrors = errorEvents
      .slice(-10) // Últimos 10 errores
      .map(e => ({
        timestamp: e.timestamp,
        error: e.error || 'Error desconocido',
        webhookId: e.id
      }))

    const lastProcessedEvent = processedEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    return {
      totalReceived: events.length,
      totalProcessed: processedEvents.length,
      totalErrors: errorEvents.length,
      averageProcessingTime: Math.round(averageProcessingTime),
      errorRate: events.length > 0 ? (errorEvents.length / events.length) * 100 : 0,
      lastProcessed: lastProcessedEvent?.timestamp || null,
      recentErrors
    }
  }

  // Obtener eventos recientes
  getRecentEvents(limit = 50): WebhookEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Detectar problemas potenciales
  detectIssues(): Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    recommendation: string
  }> {
    const stats = this.getStats()
    const issues = []
    const recentEvents = this.getRecentEvents(20)
    
    // Alta tasa de errores
    if (stats.errorRate > 50) {
      issues.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL' as const,
        description: `Tasa de errores muy alta: ${stats.errorRate.toFixed(1)}%`,
        recommendation: 'Revisar logs de errores y configuración del webhook'
      })
    } else if (stats.errorRate > 20) {
      issues.push({
        type: 'ELEVATED_ERROR_RATE',
        severity: 'HIGH' as const,
        description: `Tasa de errores elevada: ${stats.errorRate.toFixed(1)}%`,
        recommendation: 'Monitorear errores y verificar conectividad'
      })
    }

    // Tiempo de procesamiento alto
    if (stats.averageProcessingTime > 5000) {
      issues.push({
        type: 'SLOW_PROCESSING',
        severity: 'MEDIUM' as const,
        description: `Tiempo de procesamiento lento: ${stats.averageProcessingTime}ms`,
        recommendation: 'Optimizar el procesamiento de webhooks'
      })
    }

    // No se han recibido webhooks recientemente
    const lastEventTime = recentEvents[0]?.timestamp
    if (lastEventTime) {
      const timeSinceLastEvent = Date.now() - new Date(lastEventTime).getTime()
      const hoursSinceLastEvent = timeSinceLastEvent / (1000 * 60 * 60)
      
      if (hoursSinceLastEvent > 24) {
        issues.push({
          type: 'NO_RECENT_WEBHOOKS',
          severity: 'MEDIUM' as const,
          description: `No se han recibido webhooks en ${hoursSinceLastEvent.toFixed(1)} horas`,
          recommendation: 'Verificar configuración del webhook en MercadoPago'
        })
      }
    }

    // Errores consecutivos
    const recentErrorCount = recentEvents.slice(0, 5).filter(e => e.error).length
    if (recentErrorCount >= 3) {
      issues.push({
        type: 'CONSECUTIVE_ERRORS',
        severity: 'HIGH' as const,
        description: `${recentErrorCount} errores consecutivos en los últimos webhooks`,
        recommendation: 'Investigar causa raíz de los errores'
      })
    }

    return issues
  }

  // Limpiar eventos antiguos para evitar uso excesivo de memoria
  private cleanupOldEvents(): void {
    if (this.events.size > this.maxEvents) {
      const events = Array.from(this.events.entries())
        .sort((a, b) => new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime())
      
      // Mantener solo los más recientes
      const eventsToKeep = events.slice(0, this.maxEvents)
      this.events.clear()
      
      eventsToKeep.forEach(([id, event]) => {
        this.events.set(id, event)
      })
    }
  }

  // Generar reporte de salud del webhook
  generateHealthReport(): {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    summary: string
    stats: WebhookStats
    issues: Array<any>
    recommendations: string[]
  } {
    const stats = this.getStats()
    const issues = this.detectIssues()
    
    let score = 100
    
    // Penalizar por errores
    score -= stats.errorRate * 2
    
    // Penalizar por tiempo de procesamiento lento
    if (stats.averageProcessingTime > 3000) {
      score -= 10
    }
    
    // Penalizar por problemas detectados
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'CRITICAL': score -= 30; break
        case 'HIGH': score -= 20; break
        case 'MEDIUM': score -= 10; break
        case 'LOW': score -= 5; break
      }
    })
    
    score = Math.max(0, Math.min(100, score))
    
    const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'
    
    const summary = status === 'healthy' 
      ? 'Sistema de webhooks funcionando correctamente'
      : status === 'warning'
      ? 'Sistema de webhooks con advertencias'
      : 'Sistema de webhooks con problemas críticos'
    
    const recommendations = [
      ...issues.map(issue => issue.recommendation),
      ...(stats.errorRate > 0 ? ['Revisar logs de errores para identificar patrones'] : []),
      ...(stats.totalReceived === 0 ? ['Verificar que los webhooks estén configurados en MercadoPago'] : [])
    ]
    
    return {
      status,
      score: Math.round(score),
      summary,
      stats,
      issues,
      recommendations: [...new Set(recommendations)] // Eliminar duplicados
    }
  }

  // Persistir estadísticas en la base de datos (opcional)
  async persistStats(): Promise<void> {
    try {
      const supabase = createServiceClient()
      const stats = this.getStats()
      const healthReport = this.generateHealthReport()
      
      const { error } = await supabase
        .from('webhook_stats')
        .insert({
          timestamp: new Date().toISOString(),
          total_received: stats.totalReceived,
          total_processed: stats.totalProcessed,
          total_errors: stats.totalErrors,
          error_rate: stats.errorRate,
          average_processing_time: stats.averageProcessingTime,
          health_score: healthReport.score,
          health_status: healthReport.status,
          issues: healthReport.issues,
          recommendations: healthReport.recommendations
        })
      
      if (error) {
        logger.error('Error persistiendo estadísticas de webhook', 'WEBHOOK_MONITOR', {
          error: error.message
        })
      } else {
        logger.info('Estadísticas de webhook persistidas', 'WEBHOOK_MONITOR', {
          healthScore: healthReport.score,
          healthStatus: healthReport.status
        })
      }
    } catch (error) {
      logger.error('Error en persistencia de estadísticas', 'WEBHOOK_MONITOR', {
        error: error.message
      })
    }
  }
}

// Instancia singleton del monitor
const webhookMonitor = new WebhookMonitor()

export default webhookMonitor
export type { WebhookEvent, WebhookStats }