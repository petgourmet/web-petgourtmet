/**
 * Rate limiting service
 */

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  error?: string
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// Configuraciones por defecto para diferentes tipos de endpoints
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  default: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  password_reset: { windowMs: 15 * 60 * 1000, maxRequests: 3 }, // 3 requests per 15 minutes
  newsletter: { windowMs: 5 * 60 * 1000, maxRequests: 5 }, // 5 requests per 5 minutes
  contact: { windowMs: 10 * 60 * 1000, maxRequests: 3 }, // 3 requests per 10 minutes
  checkout: { windowMs: 5 * 60 * 1000, maxRequests: 10 }, // 10 requests per 5 minutes
}

// Store en memoria para rate limiting (en producción usar Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export async function checkRateLimit(
  identifier: string,
  type: string = 'default'
): Promise<RateLimitResult> {
  try {
    const config = DEFAULT_CONFIGS[type] || DEFAULT_CONFIGS.default
    const key = `${type}:${identifier}`
    const now = Date.now()
    
    // Limpiar entradas expiradas periódicamente
    if (Math.random() < 0.01) { // 1% de probabilidad
      cleanExpiredEntries()
    }
    
    const existing = rateLimitStore.get(key)
    
    if (!existing || now > existing.resetTime) {
      // Primera request o ventana expirada
      const resetTime = now + config.windowMs
      rateLimitStore.set(key, { count: 1, resetTime })
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime
      }
    }
    
    if (existing.count >= config.maxRequests) {
      // Límite excedido
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        error: 'Rate limit exceeded'
      }
    }
    
    // Incrementar contador
    existing.count++
    rateLimitStore.set(key, existing)
    
    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime
    }
    
  } catch (error) {
    console.error('Error en rate limiting:', error)
    
    // En caso de error, permitir la request pero logear
    return {
      allowed: true,
      remaining: 0,
      resetTime: Date.now() + 15 * 60 * 1000,
      error: 'Rate limit check failed'
    }
  }
}

function cleanExpiredEntries() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': DEFAULT_CONFIGS.default.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }
}

export default checkRateLimit