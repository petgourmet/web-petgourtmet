import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletterEmail } from '@/lib/contact-email-service'
import { getClientIP, checkRateLimit } from '@/lib/security/rate-limiter'
import { logSecurityEvent } from '@/lib/security/security-logger'

// Dominios de email sospechosos
const SUSPICIOUS_EMAIL_DOMAINS = [
  'tempmail', 'throwaway', 'guerrillamail', 'mailinator', 
  'maildrop', '10minutemail', 'yopmail', 'temp-mail',
  'fakeinbox', 'sharklasers', 'guerrillamail', 'dispostable',
  'trashmail', 'getnada', 'spamgourmet'
]

function validateEmail(email: string): { isValid: boolean; reason?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, reason: 'Formato de email inválido' }
  }

  // Verificar dominios sospechosos
  const domain = email.split('@')[1]?.toLowerCase()
  if (domain && SUSPICIOUS_EMAIL_DOMAINS.some(suspicious => domain.includes(suspicious))) {
    return { isValid: false, reason: 'Dominio de email no permitido' }
  }

  // Verificar patrones sospechosos en el email
  if (email.includes('test') || email.includes('fake') || email.includes('spam')) {
    return { isValid: false, reason: 'Email sospechoso' }
  }

  return { isValid: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const clientIP = getClientIP(request)
    
    // 1. Validar honeypot (campo oculto para detectar bots)
    if (body.honeypot && body.honeypot.trim() !== '') {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'honeypot_triggered',
        severity: 'high',
        blocked: true,
        rateLimitExceeded: false,
        honeypotTriggered: true,
        details: { honeypotValue: body.honeypot }
      })
      
      // Respuesta genérica para no alertar al bot
      return NextResponse.json(
        { success: true, message: 'Suscripción registrada correctamente' },
        { status: 200 }
      )
    }

    // 2. Verificar reCAPTCHA token
    if (!body.recaptchaToken) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'missing_recaptcha',
        severity: 'high',
        blocked: true,
        rateLimitExceeded: false,
        details: {}
      })
      
      return NextResponse.json(
        { error: 'Verificación de seguridad requerida' },
        { status: 400 }
      )
    }

    // 3. Verificar el token de reCAPTCHA
    const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/security/verify-recaptcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: body.recaptchaToken,
        action: 'newsletter_signup'
      })
    })

    if (!verifyResponse.ok) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'recaptcha_failed',
        severity: 'high',
        blocked: true,
        rateLimitExceeded: false,
        details: {}
      })
      
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida' },
        { status: 400 }
      )
    }

    const recaptchaResult = await verifyResponse.json()
    if (!recaptchaResult.success || recaptchaResult.score < 0.4) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'low_recaptcha_score',
        severity: 'high',
        blocked: true,
        rateLimitExceeded: false,
        recaptchaScore: recaptchaResult.score,
        details: { score: recaptchaResult.score }
      })
      
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida. Inténtalo de nuevo.' },
        { status: 400 }
      )
    }
    
    // 4. Verificar rate limiting (máximo 5 intentos)
    const rateLimitResult = checkRateLimit(clientIP, 'newsletter_submit')
    if (!rateLimitResult.allowed) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'rate_limit_exceeded',
        severity: 'medium',
        blocked: true,
        rateLimitExceeded: true,
        details: { remaining: rateLimitResult.remaining, resetTime: rateLimitResult.resetTime }
      })
      
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Inténtalo más tarde.' },
        { status: 429 }
      )
    }
    
    // 5. Validar email requerido
    if (!body.email) {
      return NextResponse.json(
        { error: 'El email es requerido' },
        { status: 400 }
      )
    }
    
    // 6. Validar formato de email y dominios sospechosos
    const email = body.email.trim().toLowerCase()
    const emailValidation = validateEmail(email)
    
    if (!emailValidation.isValid) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'invalid_email',
        severity: 'medium',
        blocked: true,
        rateLimitExceeded: false,
        details: { reason: emailValidation.reason, email }
      })
      
      return NextResponse.json(
        { error: emailValidation.reason || 'Email inválido' },
        { status: 400 }
      )
    }
    
    // Enviar email de confirmación
    const emailResult = await sendNewsletterEmail(email)
    
    if (!emailResult.success) {
      console.error('Error sending newsletter email:', emailResult.error)
      return NextResponse.json(
        { error: 'Error al procesar la suscripción. Inténtalo de nuevo.' },
        { status: 500 }
      )
    }
    
    // Log para debugging
    console.log('Newsletter subscription successful:', {
      email,
      messageId: emailResult.messageId
    })
    
    return NextResponse.json({
      success: true,
      message: '¡Gracias por suscribirte! Revisa tu email para confirmar la suscripción.',
      data: {
        email,
        messageId: emailResult.messageId
      }
    })
    
  } catch (error) {
    console.error('Error in newsletter API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor. Inténtalo más tarde.' },
      { status: 500 }
    )
  }
}
