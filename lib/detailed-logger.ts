import { SupabaseClient } from '@supabase/supabase-js';
import {
  LogEntry,
  LogLevel,
  LoggerConfig,
  OperationType,
  PerformanceMetrics,
  IdempotencyError
} from './unified-idempotency.types';

/**
 * DetailedLogger - Sistema de logging avanzado para el sistema de idempotencia unificado
 * 
 * Características:
 * - Múltiples niveles de log (trace, info, warn, error)
 * - Almacenamiento en base de datos con rotación automática
 * - Métricas de rendimiento y estadísticas
 * - Filtrado y búsqueda de logs
 * - Logging estructurado con contexto
 * - Buffer de logs para optimizar escritura
 */
export class DetailedLogger {
  private supabase: SupabaseClient;
  private config: LoggerConfig;
  private stats: any;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(supabase: SupabaseClient, config: Partial<LoggerConfig> = {}) {
    this.supabase = supabase;
    this.config = {
      level: config?.level || 'info',
      enableConsole: config?.enableConsole ?? true,
      enableDatabase: config?.enableDatabase ?? true,
      enableFile: config?.enableFile ?? false,
      maxLogSize: config?.maxLogSize || 1000000,
      retentionDays: 30,
      batchSize: config?.batchSize || 100,
      flushInterval: 5000,
      bufferSize: 100,
      enableMetrics: true,
      contextFields: ['operation_id', 'user_id', 'subscription_id'],
      ...config
    };

    this.stats = {
      totalLogs: 0,
      logsByLevel: {
        trace: 0,
        info: 0,
        warn: 0,
        error: 0
      },
      averageLogSize: 0,
      lastFlushTime: new Date(),
      bufferUtilization: 0,
      errorRate: 0
    };

    this.initialize();
  }

  /**
   * Inicializa el logger y configura el timer de flush
   */
  private async initialize(): Promise<void> {
    try {
      // Configurar timer de flush automático
      if (this.config.flushInterval > 0) {
        this.flushTimer = setInterval(() => {
          this.flushBuffer().catch(error => {
            console.error('Error flushing log buffer:', error);
          });
        }, this.config.flushInterval);
      }

      // Limpiar logs antiguos si está habilitado
      if (this.config.enableDatabase && this.config.retentionDays > 0) {
        await this.cleanupOldLogs();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing DetailedLogger:', error);
      throw new IdempotencyError(
        'LOGGER_INIT_ERROR',
        'Failed to initialize logger',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Log de nivel trace
   */
  async trace(message: string, context: Record<string, any> = {}): Promise<void> {
    await this.log('trace', message, context);
  }

  /**
   * Log de nivel info
   */
  async info(message: string, context: Record<string, any> = {}): Promise<void> {
    await this.log('info', message, context);
  }

  /**
   * Log de nivel warn
   */
  async warn(message: string, context: Record<string, any> = {}): Promise<void> {
    await this.log('warn', message, context);
  }

  /**
   * Log de nivel error
   */
  async error(message: string, context: Record<string, any> = {}): Promise<void> {
    await this.log('error', message, context);
  }

  /**
   * Método principal de logging
   */
  private async log(level: LogLevel, message: string, context: Record<string, any> = {}): Promise<void> {
    try {
      // Verificar si el nivel está habilitado
      if (!this.shouldLog(level)) {
        return;
      }

      const logEntry: LogEntry = {
        id: this.generateLogId(),
        timestamp: new Date(),
        level,
        message,
        context: this.filterContext(context),
        operationType: context.operation_type as OperationType || 'unknown',
        operationId: context.operation_id || null,
        userId: context.user_id || null,
        subscriptionId: context.subscription_id || null,
        durationMs: context.duration_ms || null,
        errorDetails: context.error_details || null,
        metadata: {
          source: 'unified-idempotency-service',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          ...context.metadata
        }
      };

      // Log en consola si está habilitado
      if (this.config.enableConsole) {
        this.logToConsole(logEntry);
      }

      // Agregar al buffer para base de datos
      if (this.config.enableDatabase) {
        this.logBuffer.push(logEntry);

        // Flush automático si el buffer está lleno
        if (this.logBuffer.length >= this.config.bufferSize) {
          await this.flushBuffer();
        }
      }

      // Actualizar estadísticas
      this.updateStats(logEntry);

    } catch (error) {
      console.error('Error logging message:', error);
      // No lanzar error para evitar interrumpir el flujo principal
    }
  }

  /**
   * Determina si se debe loggear según el nivel configurado
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= configLevelIndex;
  }

  /**
   * Filtra el contexto según los campos configurados
   */
  private filterContext(context: Record<string, any>): Record<string, any> {
    if (!this.config.contextFields || this.config.contextFields.length === 0) {
      return context;
    }

    const filtered: Record<string, any> = {};
    for (const field of this.config.contextFields) {
      if (context[field] !== undefined) {
        filtered[field] = context[field];
      }
    }

    // Siempre incluir campos especiales
    const specialFields = ['error_details', 'duration_ms', 'metadata'];
    for (const field of specialFields) {
      if (context[field] !== undefined) {
        filtered[field] = context[field];
      }
    }

    return filtered;
  }

  /**
   * Log en consola con formato
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context && Object.keys(entry.context).length > 0
      ? ` | ${JSON.stringify(entry.context)}`
      : '';

    const logMessage = `[${timestamp}] ${level} | ${entry.message}${context}`;

    switch (entry.level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'trace':
        console.debug(logMessage);
        break;
    }
  }

  /**
   * Flush del buffer de logs a la base de datos
   */
  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const { error } = await this.supabase
        .from('operation_logs')
        .insert(logsToFlush.map(entry => ({
          id: entry.id,
          timestamp: entry.timestamp.toISOString(),
          level: entry.level,
          message: entry.message,
          context: entry.context,
          operation_type: entry.operationType,
          operation_id: entry.operationId,
          user_id: entry.userId,
          subscription_id: entry.subscriptionId,
          duration_ms: entry.durationMs,
          error_details: entry.errorDetails,
          metadata: entry.metadata
        })));

      if (error) {
        console.error('Error flushing logs to database:', error);
        // Volver a agregar los logs al buffer para reintento
        this.logBuffer.unshift(...logsToFlush);
      } else {
        this.stats.lastFlushTime = new Date();
      }
    } catch (error) {
      console.error('Error flushing logs to database:', error);
      // Volver a agregar los logs al buffer para reintento
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Actualiza las estadísticas del logger
   */
  private updateStats(entry: LogEntry): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.stats.totalLogs++;
    this.stats.logsByLevel[entry.level]++;
    
    // Calcular tamaño promedio del log
    const logSize = JSON.stringify(entry).length;
    this.stats.averageLogSize = 
      (this.stats.averageLogSize * (this.stats.totalLogs - 1) + logSize) / this.stats.totalLogs;

    // Calcular utilización del buffer
    this.stats.bufferUtilization = (this.logBuffer.length / this.config.bufferSize) * 100;

    // Calcular tasa de error
    const errorLogs = this.stats.logsByLevel.error + this.stats.logsByLevel.warn;
    this.stats.errorRate = (errorLogs / this.stats.totalLogs) * 100;
  }

  /**
   * Genera un ID único para el log
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpia logs antiguos según la configuración de retención
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const { error } = await this.supabase
        .from('operation_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old logs:', error);
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  /**
   * Busca logs según criterios específicos
   */
  async searchLogs(criteria: {
    level?: LogLevel;
    operation_type?: OperationType;
    operation_id?: string;
    user_id?: string;
    subscription_id?: string;
    start_date?: Date;
    end_date?: Date;
    message_contains?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    try {
      let query = this.supabase
        .from('operation_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (criteria.level) {
        query = query.eq('level', criteria.level);
      }

      if (criteria.operation_type) {
        query = query.eq('operation_type', criteria.operation_type);
      }

      if (criteria.operation_id) {
        query = query.eq('operation_id', criteria.operation_id);
      }

      if (criteria.user_id) {
        query = query.eq('user_id', criteria.user_id);
      }

      if (criteria.subscription_id) {
        query = query.eq('subscription_id', criteria.subscription_id);
      }

      if (criteria.start_date) {
        query = query.gte('timestamp', criteria.start_date.toISOString());
      }

      if (criteria.end_date) {
        query = query.lte('timestamp', criteria.end_date.toISOString());
      }

      if (criteria.message_contains) {
        query = query.ilike('message', `%${criteria.message_contains}%`);
      }

      if (criteria.limit) {
        query = query.limit(criteria.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new IdempotencyError(
          'LOG_SEARCH_ERROR',
          'Failed to search logs',
          error.message
        );
      }

      return (data || []).map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        level: row.level as LogLevel,
        message: row.message,
        context: row.context,
        operationType: row.operation_type as OperationType,
        operationId: row.operation_id,
        user_id: row.user_id,
        subscription_id: row.subscription_id,
        duration_ms: row.duration_ms,
        error_details: row.error_details,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Error searching logs:', error);
      throw error;
    }
  }

  /**
   * Obtiene las estadísticas del logger
   */
  getStats(): any {
    return { ...this.stats };
  }

  /**
   * Obtiene la configuración actual del logger
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración del logger
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Fuerza el flush del buffer
   */
  async forceFlush(): Promise<void> {
    await this.flushBuffer();
  }

  /**
   * Limpia el buffer sin escribir a la base de datos
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Destruye el logger y limpia recursos
   */
  async destroy(): Promise<void> {
    try {
      // Limpiar timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = undefined;
      }

      // Flush final del buffer
      await this.flushBuffer();

      this.isInitialized = false;
    } catch (error) {
      console.error('Error destroying logger:', error);
    }
  }

  /**
   * Verifica si el logger está inicializado
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * Factory function para crear una instancia de DetailedLogger
 */
export function createDetailedLogger(
  supabase: SupabaseClient,
  config?: Partial<LoggerConfig>
): DetailedLogger {
  return new DetailedLogger(supabase, config);
}

/**
 * Instancia singleton del logger (opcional)
 */
let loggerInstance: DetailedLogger | null = null;

export function getGlobalLogger(): DetailedLogger | null {
  return loggerInstance;
}

export function setGlobalLogger(logger: DetailedLogger): void {
  loggerInstance = logger;
}

export function clearGlobalLogger(): void {
  if (loggerInstance) {
    loggerInstance.destroy().catch(console.error);
    loggerInstance = null;
  }
}

// Export default instance for backward compatibility
export const detailedLogger = {
  info: (message: string, context: Record<string, any> = {}) => {
    console.log(`[INFO] ${message}`, context);
  },
  warn: (message: string, context: Record<string, any> = {}) => {
    console.warn(`[WARN] ${message}`, context);
  },
  error: (message: string, context: Record<string, any> = {}) => {
    console.error(`[ERROR] ${message}`, context);
  },
  trace: (message: string, context: Record<string, any> = {}) => {
    console.log(`[TRACE] ${message}`, context);
  }
};