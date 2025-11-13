/**
 * Validaciones anti-spam sin reCAPTCHA
 * Sistema de detección basado en patrones y comportamiento
 */

export interface SpamCheckResult {
  isSpam: boolean
  score: number
  reasons: string[]
}

export interface EmailAnalysis {
  hasMultipleConsecutiveNumbers: boolean
  hasSuspiciousPattern: boolean
  isDisposableDomain: boolean
  hasExcessiveSpecialChars: boolean
}

// Dominios de email desechables conocidos
const DISPOSABLE_DOMAINS = [
  'tempmail', 'throwaway', 'guerrillamail', 'mailinator', 
  'maildrop', '10minutemail', 'yopmail', 'temp-mail',
  'fakeinbox', 'sharklasers', 'dispostable', 'trashmail',
  'getnada', 'spamgourmet', 'mintemail', 'emailondeck',
  'throwawaymail', 'mailcatch', 'tempinbox', 'mohmal'
]

// Patrones sospechosos en texto
const SPAM_PATTERNS = [
  /viagra|cialis|pharmacy/i,
  /bitcoin|crypto|lottery|winner/i,
  /click here|act now|limited time/i,
  /free money|make money/i,
  /enlarge|enhancement/i,
  /nigerian prince|inheritance/i,
  /weight loss|diet pills/i,
  /casino|poker|gambling/i,
  /russian|ukrainian.*bride/i,
  /work from home|earn \$\d+/i
]

/**
 * Analiza un email para detectar patrones sospechosos
 */
export function analyzeEmail(email: string): EmailAnalysis {
  const localPart = email.split('@')[0]?.toLowerCase() || ''
  const domain = email.split('@')[1]?.toLowerCase() || ''
  
  return {
    hasMultipleConsecutiveNumbers: /\d{4,}/.test(localPart),
    hasSuspiciousPattern: /test|fake|spam|bot|temp/i.test(localPart),
    isDisposableDomain: DISPOSABLE_DOMAINS.some(d => domain.includes(d)),
    hasExcessiveSpecialChars: (localPart.match(/[^a-z0-9._-]/gi) || []).length > 3
  }
}

/**
 * Verifica si un texto contiene spam
 */
export function checkTextForSpam(text: string): SpamCheckResult {
  let score = 0
  const reasons: string[] = []
  
  // Verificar patrones de spam conocidos
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      score += 30
      reasons.push('Contiene palabras sospechosas')
      break
    }
  }
  
  // Exceso de mayúsculas
  const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length
  if (upperCaseRatio > 0.5 && text.length > 10) {
    score += 20
    reasons.push('Exceso de mayúsculas')
  }
  
  // Exceso de signos de exclamación o interrogación
  const excessivePunctuation = (text.match(/[!?]{2,}/g) || []).length
  if (excessivePunctuation > 0) {
    score += 15
    reasons.push('Puntuación excesiva')
  }
  
  // URLs sospechosas
  const suspiciousUrls = text.match(/https?:\/\/[^\s]+/gi) || []
  if (suspiciousUrls.length > 2) {
    score += 25
    reasons.push('Múltiples URLs')
  }
  
  // Números de teléfono en formato extraño
  if (/\+?\d{10,}/.test(text)) {
    score += 10
    reasons.push('Contiene número de teléfono')
  }
  
  return {
    isSpam: score >= 50,
    score,
    reasons
  }
}

/**
 * Validación completa de email
 */
export function validateEmailSecurity(email: string): {
  isValid: boolean
  reason?: string
  score: number
} {
  const analysis = analyzeEmail(email)
  let score = 0
  const reasons: string[] = []
  
  // Formato básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, reason: 'Formato de email inválido', score: 100 }
  }
  
  // Verificar dominio desechable
  if (analysis.isDisposableDomain) {
    score += 60
    reasons.push('Dominio de email desechable')
  }
  
  // Verificar patrón sospechoso
  if (analysis.hasSuspiciousPattern) {
    score += 30
    reasons.push('Patrón sospechoso en email')
  }
  
  // Números consecutivos excesivos
  if (analysis.hasMultipleConsecutiveNumbers) {
    score += 20
    reasons.push('Números consecutivos sospechosos')
  }
  
  // Caracteres especiales excesivos
  if (analysis.hasExcessiveSpecialChars) {
    score += 20
    reasons.push('Demasiados caracteres especiales')
  }
  
  return {
    isValid: score < 60,
    reason: reasons.length > 0 ? reasons[0] : undefined,
    score
  }
}

/**
 * Verifica comportamiento de bot basado en métricas del cliente
 */
export function detectBotBehavior(metrics: {
  timeSinceLoad?: number
  interactions?: number
  mouseMovements?: number
  keystrokes?: number
}): {
  isBot: boolean
  confidence: number
  reasons: string[]
} {
  let botScore = 0
  const reasons: string[] = []
  
  // Envío demasiado rápido
  if (metrics.timeSinceLoad !== undefined && metrics.timeSinceLoad < 2000) {
    botScore += 40
    reasons.push('Envío demasiado rápido')
  }
  
  // Sin interacciones
  if (metrics.interactions === 0) {
    botScore += 30
    reasons.push('Sin interacciones con la página')
  }
  
  // Sin movimiento del mouse
  if (metrics.mouseMovements === 0) {
    botScore += 20
    reasons.push('Sin movimiento del mouse')
  }
  
  // Sin teclas presionadas
  if (metrics.keystrokes === 0) {
    botScore += 30
    reasons.push('Sin teclas presionadas')
  }
  
  return {
    isBot: botScore >= 50,
    confidence: Math.min(botScore, 100),
    reasons
  }
}

/**
 * Validación del User-Agent
 */
export function validateUserAgent(userAgent: string): {
  isSuspicious: boolean
  reason?: string
} {
  // User agents de bots conocidos
  const botPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python-requests/i,
    /headless|phantom|selenium/i
  ]
  
  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      return {
        isSuspicious: true,
        reason: 'User-Agent de bot detectado'
      }
    }
  }
  
  // User agent vacío o muy corto
  if (!userAgent || userAgent.length < 10) {
    return {
      isSuspicious: true,
      reason: 'User-Agent inválido'
    }
  }
  
  return { isSuspicious: false }
}

/**
 * Validación completa anti-spam
 */
export function performAntiSpamCheck(data: {
  email: string
  userAgent?: string
  timeSinceLoad?: number
  interactions?: number
  mouseMovements?: number
  keystrokes?: number
}): {
  passed: boolean
  score: number
  reasons: string[]
  category: 'safe' | 'suspicious' | 'blocked'
} {
  const reasons: string[] = []
  let totalScore = 0
  
  // 1. Validar email
  const emailCheck = validateEmailSecurity(data.email)
  totalScore += emailCheck.score
  if (!emailCheck.isValid) {
    reasons.push(emailCheck.reason || 'Email inválido')
  }
  
  // 2. Detectar comportamiento de bot
  const botCheck = detectBotBehavior({
    timeSinceLoad: data.timeSinceLoad,
    interactions: data.interactions,
    mouseMovements: data.mouseMovements,
    keystrokes: data.keystrokes
  })
  totalScore += botCheck.confidence
  reasons.push(...botCheck.reasons)
  
  // 3. Validar User-Agent
  if (data.userAgent) {
    const uaCheck = validateUserAgent(data.userAgent)
    if (uaCheck.isSuspicious) {
      totalScore += 40
      reasons.push(uaCheck.reason || 'User-Agent sospechoso')
    }
  }
  
  // Determinar categoría
  let category: 'safe' | 'suspicious' | 'blocked'
  if (totalScore >= 100) {
    category = 'blocked'
  } else if (totalScore >= 60) {
    category = 'suspicious'
  } else {
    category = 'safe'
  }
  
  return {
    passed: category === 'safe',
    score: totalScore,
    reasons: [...new Set(reasons)], // Eliminar duplicados
    category
  }
}
