/**
 * Middleware de seguridad para proteger las rutas de API en producción
 */

import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTION_CONFIG, validateProductionConfig } from '@/lib/production-config'
import { checkRateLimit } from '@/lib/checkout-validators'

/**
 * Middleware de seguridad principal
 */
export function securityMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Solo aplicar a rutas de API
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  console.log(`🔒 Aplicando middleware de seguridad a: ${pathname}`)

  try {
    // 1. Validar configuración de producción
    const configValidation = validateProductionConfig()
    if (!configValidation.isValid && process.env.NODE_ENV === 'production') {
      console.error('❌ Configuración de producción inválida:', configValidation.errors)
      return NextResponse.json(
        { error: 'Configuración del servidor inválida' },
        { status: 500 }
      )
    }

    // 2. Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    let rateLimit
    if (pathname.includes('/webhook')) {
      rateLimit = PRODUCTION_CONFIG.RATE_LIMITS.WEBHOOK
    } else if (pathname.includes('/checkout') || pathname.includes('/mercadopago')) {
      rateLimit = PRODUCTION_CONFIG.RATE_LIMITS.CHECKOUT
    } else {
      rateLimit = PRODUCTION_CONFIG.RATE_LIMITS.API_GENERAL
    }

    if (!checkRateLimit(clientIP, rateLimit.maxRequests, rateLimit.windowMs)) {
      console.warn(`⚠️ Rate limit excedido para IP: ${clientIP} en ruta: ${pathname}`)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes, intenta más tarde' },
        { status: 429 }
      )
    }

    // 3. Validar headers de seguridad
    const contentType = request.headers.get('content-type')
    const userAgent = request.headers.get('user-agent')

    if (request.method === 'POST' && !contentType) {
      return NextResponse.json(
        { error: 'Content-Type header requerido' },
        { status: 400 }
      )
    }

    if (!userAgent) {
      console.warn(`⚠️ Solicitud sin User-Agent desde IP: ${clientIP}`)
    }

    // 4. Validar tamaño del payload para webhooks
    if (pathname.includes('/webhook')) {
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > PRODUCTION_CONFIG.SECURITY.WEBHOOK.maxPayloadSize) {
        return NextResponse.json(
          { error: 'Payload demasiado grande' },
          { status: 413 }
        )
      }
    }

    // 5. CORS para rutas específicas
    if (request.method === 'OPTIONS') {
      return handleCORS(request)
    }

    // 6. Log de seguridad para rutas críticas
    if (pathname.includes('/webhook') || pathname.includes('/payment') || pathname.includes('/subscription')) {
      console.log(`🔐 Acceso a ruta crítica: ${pathname} desde IP: ${clientIP}`)
    }

    // Continuar con la solicitud
    const response = NextResponse.next()
    
    // Agregar headers de seguridad
    addSecurityHeaders(response)
    
    return response

  } catch (error) {
    console.error('❌ Error en middleware de seguridad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Maneja las solicitudes CORS
 */
function handleCORS(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')
  const { allowedOrigins, allowedMethods, allowedHeaders } = PRODUCTION_CONFIG.SECURITY.CORS

  // Verificar origen
  const isAllowedOrigin = !origin || allowedOrigins.includes(origin)
  
  if (!isAllowedOrigin) {
    console.warn(`⚠️ Origen no permitido: ${origin}`)
    return NextResponse.json(
      { error: 'Origen no permitido' },
      { status: 403 }
    )
  }

  const response = new NextResponse(null, { status: 200 })
  
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '))
  response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
}

/**
 * Agrega headers de seguridad a la respuesta
 */
function addSecurityHeaders(response: NextResponse): void {
  // Headers de seguridad estándar
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // CSP básico para APIs
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none';"
  )
  
  // HSTS en producción
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
}

/**
 * Middleware específico para rutas de webhook
 */
export function webhookSecurityMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  if (!pathname.includes('/webhook')) {
    return NextResponse.next()
  }

  console.log(`🔗 Aplicando middleware de webhook a: ${pathname}`)

  // Validaciones específicas para webhooks
  const signature = request.headers.get('x-signature')
  const contentType = request.headers.get('content-type')

  // En producción, la firma es obligatoria
  if (process.env.NODE_ENV === 'production' && !signature) {
    console.error('❌ Webhook sin firma en producción')
    return NextResponse.json(
      { error: 'Firma requerida' },
      { status: 401 }
    )
  }

  // Validar content-type para webhooks
  if (!contentType || !contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type debe ser application/json' },
      { status: 400 }
    )
  }

  return NextResponse.next()
}

/**
 * Función para validar la configuración de seguridad al inicio
 */
export function validateSecuritySetup(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Validar configuración de producción
  const configValidation = validateProductionConfig()
  errors.push(...configValidation.errors)
  warnings.push(...configValidation.warnings)

  // Validaciones adicionales de seguridad
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      errors.push('MERCADOPAGO_WEBHOOK_SECRET es crítico para la seguridad en producción')
    }
    
    if (!process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')) {
      warnings.push('NEXT_PUBLIC_SITE_URL debería usar HTTPS en producción')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}