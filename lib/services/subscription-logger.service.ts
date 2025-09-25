import { createServiceClient } from '@/lib/supabase/service'
import logger from '@/lib/logger'

export interface SubscriptionLogEntry {
  subscription_id?: string
  external_reference?: string
  user_id?: string
  event_type: string
  event_source: 'webhook' | 'url_redirect' | 'manual' | 'system'
  event_data: any
  result_data?: any
  success: boolean
  error_message?: string
  processing_time_ms?: number
  metadata?: any
}

export interface SubscriptionMetrics {
  total_activations: number
  successful_activations: number
  failed_activations: number
  duplicate_attempts: number
  webhook_activations: number
  url_redirect_activations: number
  average_processing_time: number
  success_rate: number
}

export interface AlertCondition {
  id: string
  name: string
  condition: (entry: SubscriptionLogEntry) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  cooldown_minutes: number
  last_triggered?: Date
}

export class SubscriptionLoggerService {
  private static instance: SubscriptionLoggerService
  private supabase: any
  private alertConditions: AlertCondition[] = []
  private metricsCache: SubscriptionMetrics | null = null
  private metricsCacheExpiry: Date | null = null

  private constructor() {
    this.initializeSupabase()
    this.setupDefaultAlertConditions()
  }

  public static getInstance(): SubscriptionLoggerService {
    if (!SubscriptionLoggerService.instance) {
      SubscriptionLoggerService.instance = new SubscriptionLoggerService()
    }
    return SubscriptionLoggerService.instance
  }

  private async initializeSupabase() {
    if (!this.supabase) {
      this.supabase = createServiceClient()
    }
    return this.supabase
  }

  /**
   * Registra un evento de suscripción con logging detallado
   * @param entry - Entrada de log de suscripción
   */
  async logSubscriptionEvent(entry: SubscriptionLogEntry): Promise<void> {
    const startTime = Date.now()
    
    try {
      await this.initializeSupabase()
      
      const logEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        processing_time_ms: entry.processing_time_ms || (Date.now() - startTime),
        session_id: this.generateSessionId(),
        ip_address: this.getClientIP(),
        user_agent: this.getUserAgent()
      }

      // Log en consola con formato detallado
      this.logToConsole(logEntry)
      
      // Guardar en base de datos
      await this.saveToDatabase(logEntry)
      
      // Verificar condiciones de alerta
      await this.checkAlertConditions(logEntry)
      
      // Actualizar métricas en tiempo real
      this.updateMetricsCache(logEntry)
      
    } catch (error: any) {
      logger.error('❌ Error registrando evento de suscripción', 'SUBSCRIPTION_LOGGER', {
        error: error.message,
        entry: {
          subscription_id: entry.subscription_id,
          external_reference: entry.external_reference,
          event_type: entry.event_type
        }
      })
    }
  }

  /**
   * Registra el inicio de un proceso de activación
   * @param data - Datos del proceso
   * @returns ID de sesión para tracking
   */
  async logActivationStart(data: {
    external_reference: string
    user_id?: string
    source: 'webhook' | 'url_redirect'
    initial_data: any
  }): Promise<string> {
    const sessionId = this.generateSessionId()
    
    await this.logSubscriptionEvent({
      external_reference: data.external_reference,
      user_id: data.user_id,
      event_type: 'activation_start',
      event_source: data.source,
      event_data: {
        ...data.initial_data,
        session_id: sessionId,
        start_timestamp: new Date().toISOString()
      },
      success: true,
      metadata: {
        session_id: sessionId,
        phase: 'initialization'
      }
    })
    
    return sessionId
  }

  /**
   * Registra el final de un proceso de activación
   * @param data - Datos del resultado
   */
  async logActivationEnd(data: {
    session_id: string
    external_reference: string
    subscription_id?: string
    success: boolean
    error_message?: string
    processing_time_ms: number
    final_data?: any
  }): Promise<void> {
    await this.logSubscriptionEvent({
      subscription_id: data.subscription_id,
      external_reference: data.external_reference,
      event_type: 'activation_end',
      event_source: 'system',
      event_data: {
        session_id: data.session_id,
        end_timestamp: new Date().toISOString(),
        total_processing_time: data.processing_time_ms
      },
      result_data: data.final_data,
      success: data.success,
      error_message: data.error_message,
      processing_time_ms: data.processing_time_ms,
      metadata: {
        session_id: data.session_id,
        phase: 'completion'
      }
    })
  }

  /**
   * Registra un intento de duplicado detectado
   * @param data - Datos del duplicado
   */
  async logDuplicateAttempt(data: {
    external_reference: string
    user_id?: string
    detection_method: string
    original_subscription_id?: string
    duplicate_data: any
  }): Promise<void> {
    await this.logSubscriptionEvent({
      subscription_id: data.original_subscription_id,
      external_reference: data.external_reference,
      user_id: data.user_id,
      event_type: 'duplicate_detected',
      event_source: 'system',
      event_data: {
        detection_method: data.detection_method,
        duplicate_attempt_data: data.duplicate_data,
        timestamp: new Date().toISOString()
      },
      success: true,
      metadata: {
        prevention_type: 'idempotency',
        severity: 'medium'
      }
    })
  }

  /**
   * Registra un error crítico en el procesamiento
   * @param data - Datos del error
   */
  async logCriticalError(data: {
    external_reference?: string
    subscription_id?: string
    user_id?: string
    error: Error
    context: any
    recovery_attempted?: boolean
  }): Promise<void> {
    await this.logSubscriptionEvent({
      subscription_id: data.subscription_id,
      external_reference: data.external_reference,
      user_id: data.user_id,
      event_type: 'critical_error',
      event_source: 'system',
      event_data: {
        error_name: data.error.name,
        error_message: data.error.message,
        error_stack: data.error.stack,
        context: data.context,
        recovery_attempted: data.recovery_attempted || false,
        timestamp: new Date().toISOString()
      },
      success: false,
      error_message: data.error.message,
      metadata: {
        severity: 'critical',
        requires_attention: true
      }
    })
  }

  /**
   * Obtiene métricas de suscripciones
   * @param forceRefresh - Forzar actualización de caché
   * @returns Métricas de suscripciones
   */
  async getSubscriptionMetrics(forceRefresh: boolean = false): Promise<SubscriptionMetrics> {
    // Verificar caché
    if (!forceRefresh && this.metricsCache && this.metricsCacheExpiry && new Date() < this.metricsCacheExpiry) {
      return this.metricsCache
    }

    try {
      await this.initializeSupabase()
      
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      // Obtener logs de las últimas 24 horas
      const { data: logs, error } = await this.supabase
        .from('subscription_logs')
        .select('*')
        .gte('timestamp', last24Hours.toISOString())
        .in('event_type', ['activation_end', 'duplicate_detected'])
      
      if (error) {
        logger.error('Error obteniendo métricas de suscripciones', 'SUBSCRIPTION_LOGGER', {
          error: error.message
        })
        return this.getDefaultMetrics()
      }
      
      const activationLogs = logs?.filter(log => log.event_type === 'activation_end') || []
      const duplicateLogs = logs?.filter(log => log.event_type === 'duplicate_detected') || []
      
      const totalActivations = activationLogs.length
      const successfulActivations = activationLogs.filter(log => log.success).length
      const failedActivations = totalActivations - successfulActivations
      const duplicateAttempts = duplicateLogs.length
      
      const webhookActivations = activationLogs.filter(log => 
        log.event_data?.session_id && log.event_source === 'webhook'
      ).length
      
      const urlRedirectActivations = activationLogs.filter(log => 
        log.event_data?.session_id && log.event_source === 'url_redirect'
      ).length
      
      const processingTimes = activationLogs
        .filter(log => log.processing_time_ms)
        .map(log => log.processing_time_ms)
      
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0
      
      const successRate = totalActivations > 0 
        ? (successfulActivations / totalActivations) * 100 
        : 0
      
      const metrics: SubscriptionMetrics = {
        total_activations: totalActivations,
        successful_activations: successfulActivations,
        failed_activations: failedActivations,
        duplicate_attempts: duplicateAttempts,
        webhook_activations: webhookActivations,
        url_redirect_activations: urlRedirectActivations,
        average_processing_time: Math.round(averageProcessingTime),
        success_rate: Math.round(successRate * 100) / 100
      }
      
      // Actualizar caché
      this.metricsCache = metrics
      this.metricsCacheExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
      
      return metrics
      
    } catch (error: any) {
      logger.error('Error calculando métricas de suscripciones', 'SUBSCRIPTION_LOGGER', {
        error: error.message
      })
      return this.getDefaultMetrics()
    }
  }

  /**
   * Obtiene logs de suscripción con filtros
   * @param filters - Filtros de búsqueda
   * @returns Logs filtrados
   */
  async getSubscriptionLogs(filters: {
    external_reference?: string
    subscription_id?: string
    user_id?: string
    event_type?: string
    event_source?: string
    success?: boolean
    from_date?: Date
    to_date?: Date
    limit?: number
  } = {}): Promise<any[]> {
    try {
      await this.initializeSupabase()
      
      let query = this.supabase
        .from('subscription_logs')
        .select('*')
        .order('timestamp', { ascending: false })
      
      if (filters.external_reference) {
        query = query.eq('external_reference', filters.external_reference)
      }
      
      if (filters.subscription_id) {
        query = query.eq('subscription_id', filters.subscription_id)
      }
      
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      
      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type)
      }
      
      if (filters.event_source) {
        query = query.eq('event_source', filters.event_source)
      }
      
      if (filters.success !== undefined) {
        query = query.eq('success', filters.success)
      }
      
      if (filters.from_date) {
        query = query.gte('timestamp', filters.from_date.toISOString())
      }
      
      if (filters.to_date) {
        query = query.lte('timestamp', filters.to_date.toISOString())
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      
      const { data, error } = await query
      
      if (error) {
        logger.error('Error obteniendo logs de suscripciones', 'SUBSCRIPTION_LOGGER', {
          error: error.message,
          filters
        })
        return []
      }
      
      return data || []
      
    } catch (error: any) {
      logger.error('Error crítico obteniendo logs', 'SUBSCRIPTION_LOGGER', {
        error: error.message,
        filters
      })
      return []
    }
  }

  // Métodos privados
  private logToConsole(entry: any): void {
    const emoji = this.getEventEmoji(entry.event_type, entry.success)
    const level = entry.success ? 'info' : 'error'
    
    logger[level](`${emoji} ${entry.event_type.toUpperCase()}`, 'SUBSCRIPTION_DETAILED', {
      external_reference: entry.external_reference,
      subscription_id: entry.subscription_id,
      user_id: entry.user_id,
      source: entry.event_source,
      processing_time: entry.processing_time_ms ? `${entry.processing_time_ms}ms` : undefined,
      session_id: entry.metadata?.session_id,
      success: entry.success,
      error: entry.error_message,
      timestamp: entry.timestamp
    })
  }

  private async saveToDatabase(entry: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('subscription_logs')
        .insert({
          subscription_id: entry.subscription_id,
          external_reference: entry.external_reference,
          user_id: entry.user_id,
          event_type: entry.event_type,
          event_source: entry.event_source,
          event_data: entry.event_data,
          result_data: entry.result_data,
          success: entry.success,
          error_message: entry.error_message,
          processing_time_ms: entry.processing_time_ms,
          metadata: entry.metadata,
          timestamp: entry.timestamp,
          session_id: entry.session_id,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent
        })
      
      if (error) {
        logger.error('Error guardando log en base de datos', 'SUBSCRIPTION_LOGGER', {
          error: error.message
        })
      }
    } catch (error: any) {
      logger.error('Error crítico guardando log', 'SUBSCRIPTION_LOGGER', {
        error: error.message
      })
    }
  }

  private setupDefaultAlertConditions(): void {
    this.alertConditions = [
      {
        id: 'high_failure_rate',
        name: 'Alta tasa de fallos',
        condition: (entry) => !entry.success && entry.event_type === 'activation_end',
        severity: 'high',
        cooldown_minutes: 15
      },
      {
        id: 'slow_processing',
        name: 'Procesamiento lento',
        condition: (entry) => (entry.processing_time_ms || 0) > 10000, // > 10 segundos
        severity: 'medium',
        cooldown_minutes: 30
      },
      {
        id: 'critical_error',
        name: 'Error crítico',
        condition: (entry) => entry.event_type === 'critical_error',
        severity: 'critical',
        cooldown_minutes: 5
      },
      {
        id: 'duplicate_spike',
        name: 'Pico de duplicados',
        condition: (entry) => entry.event_type === 'duplicate_detected',
        severity: 'medium',
        cooldown_minutes: 20
      }
    ]
  }

  private async checkAlertConditions(entry: SubscriptionLogEntry): Promise<void> {
    for (const condition of this.alertConditions) {
      if (condition.condition(entry)) {
        await this.triggerAlert(condition, entry)
      }
    }
  }

  private async triggerAlert(condition: AlertCondition, entry: SubscriptionLogEntry): Promise<void> {
    const now = new Date()
    
    // Verificar cooldown
    if (condition.last_triggered) {
      const timeSinceLastTrigger = now.getTime() - condition.last_triggered.getTime()
      const cooldownMs = condition.cooldown_minutes * 60 * 1000
      
      if (timeSinceLastTrigger < cooldownMs) {
        return // Aún en cooldown
      }
    }
    
    // Actualizar último trigger
    condition.last_triggered = now
    
    // Log de alerta
    logger.warn(`🚨 ALERTA: ${condition.name}`, 'SUBSCRIPTION_ALERT', {
      condition_id: condition.id,
      severity: condition.severity,
      triggered_by: {
        external_reference: entry.external_reference,
        subscription_id: entry.subscription_id,
        event_type: entry.event_type,
        success: entry.success
      },
      timestamp: now.toISOString()
    })
    
    // Aquí se podría integrar con servicios de notificación externos
    // como Slack, Discord, email, etc.
  }

  private updateMetricsCache(entry: SubscriptionLogEntry): void {
    // Invalidar caché si es un evento relevante para métricas
    if (['activation_end', 'duplicate_detected'].includes(entry.event_type)) {
      this.metricsCache = null
      this.metricsCacheExpiry = null
    }
  }

  private getEventEmoji(eventType: string, success: boolean): string {
    const emojiMap: { [key: string]: string } = {
      'activation_start': '🚀',
      'activation_end': success ? '✅' : '❌',
      'duplicate_detected': '🔄',
      'critical_error': '💥',
      'webhook_received': '📨',
      'lock_acquired': '🔒',
      'lock_released': '🔓'
    }
    
    return emojiMap[eventType] || '📝'
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getClientIP(): string {
    // En un entorno real, esto vendría de headers de request
    return 'unknown'
  }

  private getUserAgent(): string {
    // En un entorno real, esto vendría de headers de request
    return 'unknown'
  }

  private getDefaultMetrics(): SubscriptionMetrics {
    return {
      total_activations: 0,
      successful_activations: 0,
      failed_activations: 0,
      duplicate_attempts: 0,
      webhook_activations: 0,
      url_redirect_activations: 0,
      average_processing_time: 0,
      success_rate: 0
    }
  }
}

// Exportar instancia singleton
export const subscriptionLoggerService = SubscriptionLoggerService.getInstance()
export default subscriptionLoggerService