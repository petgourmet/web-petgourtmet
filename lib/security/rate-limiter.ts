import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockUntil?: number
}

// Almacenamiento en memoria para rate limiting (en producción usar Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuración del rate limiter
const isDevelopment = process.env.NODE_ENV === 'development'

const RATE_LIMIT_CONFIG = {
  windowMs: isDevelopment 
    ? 60000 // 1 minuto en desarrollo
    : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos en producción
  maxRequests: isDevelopment
    ? 100 // 100 requests en desarrollo
    : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'), // 10 requests en producción
  blockDurationMs: isDevelopment
    ? 60000 // 1 minuto de bloqueo en desarrollo
    : 30 * 60 * 1000, // 30 minutos de bloqueo en producción
  suspiciousThreshold: isDevelopment ? 50 : 5, // Umbral para marcar como sospechoso
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  blocked: boolean
  suspicious: boolean
}

export function getClientIP(request: NextRequest): string {
  // Obtener IP del cliente considerando proxies
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  // En desarrollo, usar una IP por defecto
  return process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'unknown'
}

export function checkRateLimit(clientIP: string, endpoint: string = 'default'): RateLimitResult {
  const key = `${clientIP}:${endpoint}`
  const now = Date.now()
  
  let entry = rateLimitStore.get(key)
  
  // Si no existe entrada o ha pasado la ventana de tiempo, crear nueva
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
      blocked: false
    }
  }
  
  // Verificar si está bloqueado
  if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      blocked: true,
      suspicious: true
    }
  }
  
  // Incrementar contador
  entry.count++
  
  // Verificar si excede el límite
  const allowed = entry.count <= RATE_LIMIT_CONFIG.maxRequests
  const suspicious = entry.count >= RATE_LIMIT_CONFIG.suspiciousThreshold
  
  // Si excede el límite, bloquear
  if (!allowed && !entry.blocked) {
    entry.blocked = true
    entry.blockUntil = now + RATE_LIMIT_CONFIG.blockDurationMs
  }
  
  // Actualizar entrada en el store
  rateLimitStore.set(key, entry)
  
  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.maxRequests - entry.count),
    resetTime: entry.resetTime,
    blocked: entry.blocked,
    suspicious
  }
}

export function resetRateLimit(clientIP: string, endpoint: string = 'default'): void {
  const key = `${clientIP}:${endpoint}`
  rateLimitStore.delete(key)
}

// Limpiar entradas expiradas periódicamente
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Limpiar si ha pasado el tiempo de reset y no está bloqueado
    if (now > entry.resetTime && (!entry.blocked || (entry.blockUntil && now > entry.blockUntil))) {
      rateLimitStore.delete(key)
    }
  }
}

// Ejecutar limpieza cada 5 minutos
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}