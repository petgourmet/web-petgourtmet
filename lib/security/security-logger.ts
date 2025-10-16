export interface SecurityLogEntry {
  id?: string
  timestamp: Date
  ip: string
  userAgent: string
  endpoint: string
  action: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, any>
  blocked: boolean
  rateLimitExceeded: boolean
  recaptchaScore?: number
  honeypotTriggered?: boolean
  spamContentDetected?: boolean
}

export interface SecurityMetrics {
  totalAttempts: number
  blockedAttempts: number
  suspiciousAttempts: number
  rateLimitViolations: number
  honeypotTriggers: number
  spamDetections: number
  averageRecaptchaScore: number
  topOffendingIPs: Array<{ ip: string; count: number }>
}

// Almacenamiento en memoria para logs (en producción usar base de datos)
const securityLogs: SecurityLogEntry[] = []
const MAX_LOGS_IN_MEMORY = 1000

export function logSecurityEvent(entry: Omit<SecurityLogEntry, 'id' | 'timestamp'>): void {
  const logEntry: SecurityLogEntry = {
    id: generateLogId(),
    timestamp: new Date(),
    ...entry
  }
  
  // Agregar al almacenamiento en memoria
  securityLogs.unshift(logEntry)
  
  // Mantener solo los últimos MAX_LOGS_IN_MEMORY logs
  if (securityLogs.length > MAX_LOGS_IN_MEMORY) {
    securityLogs.splice(MAX_LOGS_IN_MEMORY)
  }
  
  // Log en consola para desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SECURITY ${entry.severity.toUpperCase()}]`, {
      ip: entry.ip,
      endpoint: entry.endpoint,
      action: entry.action,
      blocked: entry.blocked,
      details: entry.details
    })
  }
  
  // En producción, aquí se enviaría a un servicio de logging externo
  if (entry.severity === 'critical' || entry.severity === 'high') {
    // TODO: Implementar alertas automáticas
    console.warn('🚨 ALERTA DE SEGURIDAD:', logEntry)
  }
}

export function getSecurityLogs(limit: number = 100): SecurityLogEntry[] {
  return securityLogs.slice(0, limit)
}

export function getSecurityMetrics(hoursBack: number = 24): SecurityMetrics {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
  const recentLogs = securityLogs.filter(log => log.timestamp > cutoffTime)
  
  const ipCounts = new Map<string, number>()
  let totalRecaptchaScore = 0
  let recaptchaCount = 0
  
  const metrics = recentLogs.reduce((acc, log) => {
    acc.totalAttempts++
    
    if (log.blocked) acc.blockedAttempts++
    if (log.rateLimitExceeded) acc.rateLimitViolations++
    if (log.honeypotTriggered) acc.honeypotTriggers++
    if (log.spamContentDetected) acc.spamDetections++
    
    if (log.severity === 'medium' || log.severity === 'high' || log.severity === 'critical') {
      acc.suspiciousAttempts++
    }
    
    if (log.recaptchaScore !== undefined) {
      totalRecaptchaScore += log.recaptchaScore
      recaptchaCount++
    }
    
    // Contar IPs
    const currentCount = ipCounts.get(log.ip) || 0
    ipCounts.set(log.ip, currentCount + 1)
    
    return acc
  }, {
    totalAttempts: 0,
    blockedAttempts: 0,
    suspiciousAttempts: 0,
    rateLimitViolations: 0,
    honeypotTriggers: 0,
    spamDetections: 0,
    averageRecaptchaScore: 0,
    topOffendingIPs: [] as Array<{ ip: string; count: number }>
  })
  
  // Calcular promedio de reCAPTCHA score
  metrics.averageRecaptchaScore = recaptchaCount > 0 ? totalRecaptchaScore / recaptchaCount : 0
  
  // Top IPs ofensivas (más de 5 intentos)
  metrics.topOffendingIPs = Array.from(ipCounts.entries())
    .filter(([, count]) => count > 5)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return metrics
}

export function clearSecurityLogs(): void {
  securityLogs.length = 0
}

function generateLogId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Funciones de utilidad para logging específico
export function logFormSubmission(
  ip: string,
  userAgent: string,
  endpoint: string,
  formData: Record<string, any>,
  result: {
    allowed: boolean
    recaptchaScore?: number
    honeypotTriggered?: boolean
    spamDetected?: boolean
    rateLimitExceeded?: boolean
  }
): void {
  logSecurityEvent({
    ip,
    userAgent,
    endpoint,
    action: 'form_submission',
    severity: result.allowed ? 'low' : 'medium',
    details: {
      formFields: Object.keys(formData),
      dataLength: JSON.stringify(formData).length
    },
    blocked: !result.allowed,
    rateLimitExceeded: result.rateLimitExceeded || false,
    recaptchaScore: result.recaptchaScore,
    honeypotTriggered: result.honeypotTriggered,
    spamContentDetected: result.spamDetected
  })
}

export function logSuspiciousActivity(
  ip: string,
  userAgent: string,
  endpoint: string,
  reason: string,
  details: Record<string, any> = {}
): void {
  logSecurityEvent({
    ip,
    userAgent,
    endpoint,
    action: 'suspicious_activity',
    severity: 'high',
    details: { reason, ...details },
    blocked: true,
    rateLimitExceeded: false
  })
}