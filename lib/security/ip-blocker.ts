/**
 * Sistema de bloqueo de IPs basado en comportamiento sospechoso
 * Bloquea automáticamente IPs que muestren patrones de spam o abuso
 */

export interface IPBlockEntry {
  ip: string
  reason: string
  blockedAt: number
  blockedUntil: number
  violations: number
  severity: 'low' | 'medium' | 'high' | 'permanent'
}

export interface IPViolation {
  ip: string
  type: 'spam' | 'rate_limit' | 'honeypot' | 'low_recaptcha' | 'suspicious_content'
  severity: 'low' | 'medium' | 'high'
  timestamp: number
  details?: Record<string, any>
}

// Almacenamiento en memoria (en producción usar Redis o base de datos)
const blockedIPs = new Map<string, IPBlockEntry>()
const ipViolations = new Map<string, IPViolation[]>()

// Configuración de bloqueos
const BLOCK_CONFIG = {
  // Duraciones de bloqueo en milisegundos
  lowSeverity: 5 * 60 * 1000,        // 5 minutos
  mediumSeverity: 30 * 60 * 1000,    // 30 minutos
  highSeverity: 24 * 60 * 60 * 1000, // 24 horas
  permanent: Infinity,
  
  // Umbrales para bloqueo automático
  violationThresholds: {
    spam: 2,           // 2 intentos de spam = bloqueo
    honeypot: 1,       // 1 honeypot activado = bloqueo inmediato
    lowRecaptcha: 3,   // 3 scores bajos de reCAPTCHA
    rateLimit: 5,      // 5 violaciones de rate limit
  },
  
  // Ventana de tiempo para contar violaciones (15 minutos)
  violationWindow: 15 * 60 * 1000
}

/**
 * Registra una violación para una IP
 */
export function recordViolation(violation: IPViolation): void {
  const { ip } = violation
  
  // Obtener violaciones existentes
  const violations = ipViolations.get(ip) || []
  
  // Agregar nueva violación
  violations.push(violation)
  
  // Limpiar violaciones antiguas (fuera de la ventana de tiempo)
  const now = Date.now()
  const recentViolations = violations.filter(
    v => now - v.timestamp < BLOCK_CONFIG.violationWindow
  )
  
  ipViolations.set(ip, recentViolations)
  
  // Evaluar si debe bloquearse la IP
  evaluateIPForBlocking(ip, recentViolations)
}

/**
 * Evalúa si una IP debe ser bloqueada basándose en sus violaciones
 */
function evaluateIPForBlocking(ip: string, violations: IPViolation[]): void {
  // Contar violaciones por tipo
  const violationCounts = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  let shouldBlock = false
  let severity: 'low' | 'medium' | 'high' | 'permanent' = 'low'
  let reason = ''
  
  // Verificar honeypot (bloqueo inmediato)
  if (violationCounts.honeypot >= BLOCK_CONFIG.violationThresholds.honeypot) {
    shouldBlock = true
    severity = 'high'
    reason = 'Bot detectado (honeypot activado)'
  }
  
  // Verificar spam
  if (violationCounts.spam >= BLOCK_CONFIG.violationThresholds.spam) {
    shouldBlock = true
    severity = 'high'
    reason = 'Múltiples intentos de spam detectados'
  }
  
  // Verificar reCAPTCHA bajo
  if (violationCounts.low_recaptcha >= BLOCK_CONFIG.violationThresholds.lowRecaptcha) {
    shouldBlock = true
    severity = 'medium'
    reason = 'Múltiples fallos en verificación de seguridad'
  }
  
  // Verificar rate limiting
  if (violationCounts.rate_limit >= BLOCK_CONFIG.violationThresholds.rateLimit) {
    shouldBlock = true
    severity = 'medium'
    reason = 'Demasiadas solicitudes en poco tiempo'
  }
  
  // Si debe bloquearse, agregar al registro de bloqueos
  if (shouldBlock) {
    blockIP(ip, reason, severity, violations.length)
  }
}

/**
 * Bloquea una IP
 */
export function blockIP(
  ip: string,
  reason: string,
  severity: 'low' | 'medium' | 'high' | 'permanent',
  violations: number = 1
): void {
  const now = Date.now()
  let blockDuration: number
  
  switch (severity) {
    case 'low':
      blockDuration = BLOCK_CONFIG.lowSeverity
      break
    case 'medium':
      blockDuration = BLOCK_CONFIG.mediumSeverity
      break
    case 'high':
      blockDuration = BLOCK_CONFIG.highSeverity
      break
    case 'permanent':
      blockDuration = BLOCK_CONFIG.permanent
      break
    default:
      blockDuration = BLOCK_CONFIG.lowSeverity
  }
  
  const blockEntry: IPBlockEntry = {
    ip,
    reason,
    blockedAt: now,
    blockedUntil: blockDuration === Infinity ? Infinity : now + blockDuration,
    violations,
    severity
  }
  
  blockedIPs.set(ip, blockEntry)
  
  // Log para monitoreo
  console.warn(`🚫 IP bloqueada: ${ip} | Razón: ${reason} | Severidad: ${severity} | Hasta: ${new Date(blockEntry.blockedUntil).toISOString()}`)
}

/**
 * Verifica si una IP está bloqueada
 */
export function isIPBlocked(ip: string): { blocked: boolean; entry?: IPBlockEntry } {
  const entry = blockedIPs.get(ip)
  
  if (!entry) {
    return { blocked: false }
  }
  
  const now = Date.now()
  
  // Si el bloqueo ha expirado, eliminar del registro
  if (entry.blockedUntil !== Infinity && now > entry.blockedUntil) {
    blockedIPs.delete(ip)
    return { blocked: false }
  }
  
  return { blocked: true, entry }
}

/**
 * Desbloquea una IP manualmente (para uso administrativo)
 */
export function unblockIP(ip: string): boolean {
  const existed = blockedIPs.has(ip)
  blockedIPs.delete(ip)
  ipViolations.delete(ip)
  
  if (existed) {
    console.log(`✅ IP desbloqueada: ${ip}`)
  }
  
  return existed
}

/**
 * Obtiene todas las IPs bloqueadas
 */
export function getBlockedIPs(): IPBlockEntry[] {
  const now = Date.now()
  const blocked: IPBlockEntry[] = []
  
  for (const [ip, entry] of blockedIPs.entries()) {
    // Limpiar bloqueos expirados
    if (entry.blockedUntil !== Infinity && now > entry.blockedUntil) {
      blockedIPs.delete(ip)
      continue
    }
    
    blocked.push(entry)
  }
  
  return blocked.sort((a, b) => b.blockedAt - a.blockedAt)
}

/**
 * Obtiene el historial de violaciones de una IP
 */
export function getIPViolations(ip: string): IPViolation[] {
  return ipViolations.get(ip) || []
}

/**
 * Limpia violaciones y bloqueos expirados (ejecutar periódicamente)
 */
export function cleanupExpiredData(): void {
  const now = Date.now()
  
  // Limpiar bloqueos expirados
  for (const [ip, entry] of blockedIPs.entries()) {
    if (entry.blockedUntil !== Infinity && now > entry.blockedUntil) {
      blockedIPs.delete(ip)
    }
  }
  
  // Limpiar violaciones antiguas
  for (const [ip, violations] of ipViolations.entries()) {
    const recentViolations = violations.filter(
      v => now - v.timestamp < BLOCK_CONFIG.violationWindow
    )
    
    if (recentViolations.length === 0) {
      ipViolations.delete(ip)
    } else {
      ipViolations.set(ip, recentViolations)
    }
  }
}

// Ejecutar limpieza cada 10 minutos en entorno servidor
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredData, 10 * 60 * 1000)
}
