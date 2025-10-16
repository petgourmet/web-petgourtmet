/**
 * Security logging service
 */

interface SecurityEvent {
  type: string
  action: string
  ip: string
  userAgent: string
  timestamp?: Date
  details?: any
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

interface LogEntry extends SecurityEvent {
  id: string
  timestamp: Date
}

// Store en memoria para logs (en producción usar base de datos)
const securityLogs: LogEntry[] = []
const MAX_LOGS = 10000 // Límite de logs en memoria

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const logEntry: LogEntry = {
      ...event,
      id: generateId(),
      timestamp: event.timestamp || new Date(),
      severity: event.severity || 'medium'
    }

    // Agregar al store en memoria
    securityLogs.push(logEntry)

    // Mantener límite de logs
    if (securityLogs.length > MAX_LOGS) {
      securityLogs.splice(0, securityLogs.length - MAX_LOGS)
    }

    // Log en consola para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Security Event [${logEntry.severity.toUpperCase()}]:`, {
        type: logEntry.type,
        action: logEntry.action,
        ip: logEntry.ip,
        details: logEntry.details
      })
    }

    // En producción, aquí se enviaría a un servicio de logging externo
    if (process.env.NODE_ENV === 'production' && logEntry.severity === 'critical') {
      console.error('🚨 CRITICAL Security Event:', logEntry)
    }

  } catch (error) {
    console.error('Error logging security event:', error)
  }
}

export function getSecurityLogs(limit: number = 100): LogEntry[] {
  return securityLogs
    .slice(-limit)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export function getSecurityLogsByType(type: string, limit: number = 100): LogEntry[] {
  return securityLogs
    .filter(log => log.type === type)
    .slice(-limit)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export function getSecurityLogsByIP(ip: string, limit: number = 100): LogEntry[] {
  return securityLogs
    .filter(log => log.ip === ip)
    .slice(-limit)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export function clearSecurityLogs(): void {
  securityLogs.length = 0
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Tipos de eventos de seguridad comunes
export const SECURITY_EVENT_TYPES = {
  HONEYPOT_TRIGGERED: 'honeypot_triggered',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  RECAPTCHA_FAILED: 'recaptcha_failed',
  SUSPICIOUS_CONTENT: 'suspicious_content',
  INVALID_REQUEST: 'invalid_request',
  AUTHENTICATION_FAILED: 'authentication_failed',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  BRUTE_FORCE_ATTEMPT: 'brute_force_attempt'
} as const

export default logSecurityEvent