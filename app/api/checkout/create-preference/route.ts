import { NextRequest, NextResponse } from 'next/server'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { checkRateLimit } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security-logger'

export async function POST(request: NextRequest) {
  try {
    const { items, customerData, externalReference, backUrls, honeypot, recaptchaToken } = await request.json()

    // Verificar honeypot
    if (honeypot && honeypot.trim() !== '') {
      await logSecurityEvent({
        type: 'honeypot_triggered',
        action: 'checkout',
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { honeypot }
      })
      
      return NextResponse.json(
        { error: 'Solicitud inválida' },
        { status: 400 }
      )
    }

    // Verificar rate limiting
    const clientIp = request.ip || 'unknown'
    const rateLimitResult = await checkRateLimit(clientIp, 'checkout')
    
    if (!rateLimitResult.allowed) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        action: 'checkout',
        ip: clientIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          attempts: rateLimitResult.count,
          resetTime: rateLimitResult.resetTime 
        }
      })
      
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { status: 429 }
      )
    }

    // Verificar reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: 'Token de verificación requerido' },
        { status: 400 }
      )
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'checkout')
    
    if (!recaptchaResult.success || recaptchaResult.score < 0.6) {
      await logSecurityEvent({
        type: 'recaptcha_failed',
        action: 'checkout',
        ip: clientIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { 
          score: recaptchaResult.score,
          errors: recaptchaResult.errors 
        }
      })
      
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida' },
        { status: 400 }
      )
    }

    // Validar datos requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items del carrito son requeridos' },
        { status: 400 }
      )
    }

    if (!customerData || !customerData.firstName || !customerData.email) {
      return NextResponse.json(
        { error: 'Datos del cliente son requeridos' },
        { status: 400 }
      )
    }

    // Crear preferencia de MercadoPago
    const mercadoPagoResponse = await fetch('/api/mercadopago/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        customerData,
        externalReference,
        backUrls
      })
    })

    if (!mercadoPagoResponse.ok) {
      const errorData = await mercadoPagoResponse.json()
      throw new Error(errorData.error || 'Error al crear la preferencia de pago')
    }

    const mercadoPagoData = await mercadoPagoResponse.json()

    // Log de éxito
    await logSecurityEvent({
      type: 'checkout_success',
      action: 'checkout',
      ip: clientIp,
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { 
        externalReference,
        itemCount: items.length,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      preferenceId: mercadoPagoData.preferenceId,
      initPoint: mercadoPagoData.initPoint
    })

  } catch (error: any) {
    console.error('Error en checkout:', error)
    
    await logSecurityEvent({
      type: 'checkout_error',
      action: 'checkout',
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { error: error.message }
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}