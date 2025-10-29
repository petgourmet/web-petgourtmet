import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limiter'
import { logSecurityEvent } from '@/lib/security/security-logger'

// Rutas que requieren protección anti-spam (sin incluir /api/auth)
const PROTECTED_ROUTES = [
  '/api/contact',
  '/api/newsletter',
  '/api/checkout',
  '/api/subscription',
  '/api/admin',
  '/contacto',
  '/checkout'
]

// Rutas de formularios que necesitan rate limiting más estricto (sin auth)
const FORM_ROUTES = [
  '/api/contact',
  '/api/newsletter'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // IMPORTANTE: Refrescar la sesión de Supabase en cada request
  // Esto asegura que las cookies de autenticación se mantengan sincronizadas
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refrescar la sesión (importante para mantener las cookies actualizadas)
  await supabase.auth.getSession()
  
  // En desarrollo, desactivar rate limiting
  if (process.env.NODE_ENV === 'development') {
    return response
  }
  
  // Verificar si la ruta necesita protección
  const needsProtection = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  
  if (!needsProtection) {
    return response
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