export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum LogCategory {
  WEBHOOK = 'webhook',
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  ORDER = 'order',
  SYSTEM = 'system',
  AUTH = 'auth',
  EMAIL = 'email',
  USER = 'user',
  DATABASE = 'database'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  orderId?: string;
  subscriptionId?: string;
  paymentId?: string;
  error?: Error | string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Mantener solo los últimos 1000 logs en memoria

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    metadata?: {
      userId?: string;
      orderId?: string;
      subscriptionId?: string;
      paymentId?: string;
      error?: Error | string;
    }
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      ...metadata
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Mantener solo los últimos maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log en consola en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const logMethod = entry.level === LogLevel.ERROR ? console.error :
                       entry.level === LogLevel.WARN ? console.warn :
                       console.log;
      
      // Para errores, mostrar el error real si existe, sino mostrar data
      let logData = entry.level === LogLevel.ERROR && entry.error ? 
                    entry.error : 
                    (entry.data ? entry.data : '');
      
      // Serializar objetos correctamente para evitar [object Object]
      if (typeof logData === 'object' && logData !== null && !(logData instanceof Error)) {
        try {
          logData = JSON.stringify(logData, null, 2);
        } catch (e) {
          logData = String(logData);
        }
      }
      
      // Formatear el mensaje completo con los datos
      const formattedMessage = `[${entry.timestamp}] [${entry.category.toUpperCase()}] ${entry.message}`;
      
      if (logData && logData !== '') {
        logMethod(formattedMessage + '\n' + logData);
      } else {
        logMethod(formattedMessage);
      }
    }

    // En producción, podrías enviar logs críticos a un servicio externo
    if (process.env.NODE_ENV === 'production' && entry.level === LogLevel.ERROR) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    try {
      // Aquí podrías integrar con servicios como Sentry, LogRocket, etc.
      // Por ahora solo guardamos en consola
      console.error('CRITICAL ERROR:', entry);
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(category: LogCategory, message: string, data?: any, metadata?: any) {
    const entry = this.createLogEntry(LogLevel.DEBUG, category, message, data, metadata);
    this.addLog(entry);
  }

  info(category: LogCategory, message: string, data?: any, metadata?: any) {
    const entry = this.createLogEntry(LogLevel.INFO, category, message, data, metadata);
    this.addLog(entry);
  }

  warn(category: LogCategory, message: string, data?: any, metadata?: any) {
    const entry = this.createLogEntry(LogLevel.WARN, category, message, data, metadata);
    this.addLog(entry);
  }

  error(category: LogCategory, message: string, error?: Error | string | any, data?: any, metadata?: any) {
    let errorMessage: string | undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      // Manejar errores de Supabase y otros objetos de error
      errorMessage = String(error.message);
    } else if (error) {
      errorMessage = JSON.stringify(error);
    }
    
    const entry = this.createLogEntry(LogLevel.ERROR, category, message, data, {
      ...metadata,
      error: errorMessage
    });
    this.addLog(entry);
  }

  // Métodos específicos para casos comunes
  webhookReceived(type: string, id: string, data?: any) {
    this.info(LogCategory.WEBHOOK, `Webhook recibido: ${type}`, data, { paymentId: id });
  }

  webhookProcessed(type: string, id: string, success: boolean, data?: any) {
    if (success) {
      this.info(LogCategory.WEBHOOK, `Webhook procesado exitosamente: ${type}`, data, { paymentId: id });
    } else {
      this.error(LogCategory.WEBHOOK, `Error procesando webhook: ${type}`, undefined, data, { paymentId: id });
    }
  }

  paymentStatusChanged(paymentId: string, oldStatus: string, newStatus: string, orderId?: string) {
    this.info(LogCategory.PAYMENT, `Estado de pago cambiado: ${oldStatus} -> ${newStatus}`, 
             { paymentId, oldStatus, newStatus }, { paymentId, orderId });
  }

  subscriptionEvent(subscriptionId: string, event: string, data?: any) {
    this.info(LogCategory.SUBSCRIPTION, `Subscription ${event}`, data, { subscriptionId });
  }

  // 🔥 MÉTODOS ESPECÍFICOS PARA DEBUGGING DE ACTIVACIÓN AUTOMÁTICA
  subscriptionActivationAttempt(subscriptionId: string, method: string, data?: any) {
    this.info(LogCategory.SUBSCRIPTION, `🔄 ACTIVACIÓN INTENTO: Suscripción ${subscriptionId} via ${method}`, data, { subscriptionId });
  }

  subscriptionActivationSuccess(subscriptionId: string, method: string, previousStatus: string, data?: any) {
    this.info(LogCategory.SUBSCRIPTION, `✅ ACTIVACIÓN EXITOSA: Suscripción ${subscriptionId} via ${method} (${previousStatus} → active)`, data, { subscriptionId });
  }

  subscriptionActivationFailed(subscriptionId: string, method: string, error: string, data?: any) {
    this.error(LogCategory.SUBSCRIPTION, `❌ ACTIVACIÓN FALLIDA: Suscripción ${subscriptionId} via ${method}`, error, data, { subscriptionId });
  }

  subscriptionPollingCheck(totalFound: number, processed: number, activated: number, duration: string) {
    this.info(LogCategory.SUBSCRIPTION, `⚡ POLLING CHECK: ${totalFound} encontradas, ${processed} procesadas, ${activated} activadas (${duration})`, {
      totalFound,
      processed,
      activated,
      duration
    });
  }

  subscriptionWebhookBackup(totalFound: number, processed: number, activated: number, duration: string) {
    this.info(LogCategory.SUBSCRIPTION, `🔄 WEBHOOK BACKUP: ${totalFound} encontradas, ${processed} procesadas, ${activated} activadas (${duration})`, {
      totalFound,
      processed,
      activated,
      duration
    });
  }

  subscriptionRealTimeVerification(subscriptionId: string, status: 'started' | 'checking' | 'found_pending' | 'activated' | 'stopped', data?: any) {
    const emoji = status === 'started' ? '🚀' : status === 'checking' ? '🔍' : status === 'found_pending' ? '⏳' : status === 'activated' ? '✅' : '🛑';
    this.info(LogCategory.SUBSCRIPTION, `${emoji} TIEMPO REAL: ${status.toUpperCase()} - Suscripción ${subscriptionId}`, data, { subscriptionId });
  }

  orderStatusChanged(orderId: string, oldStatus: string, newStatus: string, userId?: string) {
    this.info(LogCategory.ORDER, `Estado de orden cambiado: ${oldStatus} -> ${newStatus}`, 
             { orderId, oldStatus, newStatus }, { orderId, userId });
  }

  systemError(message: string, error: Error, context?: any) {
    this.error(LogCategory.SYSTEM, message, error, context);
  }

  // Métodos para obtener logs
  getLogs(filters?: {
    level?: LogLevel;
    category?: LogCategory;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= filters.endDate!);
      }
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }

    return filteredLogs.reverse(); // Más recientes primero
  }

  getRecentErrors(limit: number = 10): LogEntry[] {
    return this.getLogs({ level: LogLevel.ERROR, limit });
  }

  getWebhookLogs(limit: number = 50): LogEntry[] {
    return this.getLogs({ category: LogCategory.WEBHOOK, limit });
  }

  getPaymentLogs(paymentId: string): LogEntry[] {
    return this.logs.filter(log => log.paymentId === paymentId).reverse();
  }

  getOrderLogs(orderId: string): LogEntry[] {
    return this.logs.filter(log => log.orderId === orderId).reverse();
  }

  clearLogs() {
    this.logs = [];
  }

  getLogStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<LogLevel, number>,
      byCategory: {} as Record<LogCategory, number>,
      recentErrors: this.getRecentErrors(5).length
    };

    // Contar por nivel
    Object.values(LogLevel).forEach(level => {
      stats.byLevel[level] = this.logs.filter(log => log.level === level).length;
    });

    // Contar por categoría
    Object.values(LogCategory).forEach(category => {
      stats.byCategory[category] = this.logs.filter(log => log.category === category).length;
    });

    return stats;
  }
}

// Exportar la instancia singleton
export const logger = Logger.getInstance();
export default Logger;