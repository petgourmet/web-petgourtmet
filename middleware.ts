import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limiter'
import { logSecurityEvent } from '@/lib/security/security-logger'

// Rutas que requieren protección anti-spam
const PROTECTED_ROUTES = [
  '/api/contact',
  '/api/newsletter',
  '/api/auth',
  '/api/checkout',
  '/api/subscription',
  '/api/admin',
  '/contacto',
  '/auth',
  '/checkout'
]

// Rutas de formularios que necesitan rate limiting más estricto
const FORM_ROUTES = [
  '/api/contact',
  '/api/newsletter',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/reset-password'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // En desarrollo, desactivar rate limiting
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }
  
  // Verificar si la ruta necesita protección
  const needsProtection = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  
  if (!needsProtection) {
    return NextResponse.next()
  }
  
  const clientIP = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Aplicar rate limiting más estricto para formularios
  const isFormRoute = FORM_ROUTES.some(route => pathname.startsWith(route))
  const endpoint = isFormRoute ? `form:${pathname}` : pathname
  
  const rateLimitResult = checkRateLimit(clientIP, endpoint)
  
  // Log del intento
  logSecurityEvent({
    ip: clientIP,
    userAgent,
    endpoint: pathname,
    action: 'route_access',
    severity: rateLimitResult.blocked ? 'medium' : 'low',
    details: {
      method: request.method,
      rateLimitRemaining: rateLimitResult.remaining,
      suspicious: rateLimitResult.suspicious
    },
    blocked: rateLimitResult.blocked,
    rateLimitExceeded: !rateLimitResult.allowed
  })
  
  // Si está bloqueado por rate limiting
  if (rateLimitResult.blocked) {
    return new NextResponse(
      JSON.stringify({
        error: 'Demasiados intentos. Inténtalo más tarde.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '10',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }
  
  // Si no está permitido por rate limiting
  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Límite de solicitudes excedido. Inténtalo más tarde.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '10',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }
  
  // Agregar headers de rate limiting a la respuesta
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', process.env.RATE_LIMIT_MAX_REQUESTS || '10')
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString())
  
  // Marcar requests sospechosos
  if (rateLimitResult.suspicious) {
    response.headers.set('X-Security-Warning', 'suspicious-activity')
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}