import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletterEmail } from '@/lib/contact-email-service'
import { getClientIP, checkRateLimit } from '@/lib/security/rate-limiter'
import { logSecurityEvent } from '@/lib/security/security-logger'
import { isIPBlocked, recordViolation } from '@/lib/security/ip-blocker'
import { performAntiSpamCheck, validateEmailSecurity } from '@/lib/security/anti-spam-validator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const clientIP = getClientIP(request)
    
    // 0. Verificar si la IP está bloqueada
    const blockCheck = isIPBlocked(clientIP)
    if (blockCheck.blocked) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'blocked_ip_attempt',
        severity: 'high',
        blocked: true,
        rateLimitExceeded: false,
        details: {
          reason: blockCheck.entry?.reason,
          blockedUntil: blockCheck.entry?.blockedUntil
        }
      })
      
      return NextResponse.json(
        { error: 'Tu acceso ha sido temporalmente bloqueado.' },
        { status: 403 }
      )
    }
    
    // 1. Validar honeypot (campo oculto para detectar bots)
    if (body.honeypot && body.honeypot.trim() !== '') {
      // Registrar violación crítica
      recordViolation({
        ip: clientIP,
        type: 'honeypot',
        severity: 'high',
        timestamp: Date.now(),
        details: { honeypotValue: body.honeypot }
      })
      
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

    // 2. Validar tiempo de envío (anti-bot: mínimo 2 segundos desde que cargó la página)
    const submissionTime = body.submissionTime
    if (submissionTime) {
      const timeDiff = Date.now() - submissionTime
      if (timeDiff < 2000) {
        // Submission demasiado rápida - probablemente un bot
        recordViolation({
          ip: clientIP,
          type: 'fast_submission',
          severity: 'high',
          timestamp: Date.now(),
          details: { timeDiff }
        })
        
        await logSecurityEvent({
          ip: clientIP,
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/newsletter',
          action: 'fast_submission',
          severity: 'high',
          blocked: true,
          rateLimitExceeded: false,
          details: { timeDiff }
        })
        
        return NextResponse.json(
          { error: 'Por favor, espera unos segundos antes de enviar' },
          { status: 400 }
        )
      }
    }
    
    // 4. Verificar rate limiting (máximo 5 intentos en 1 hora)
    const rateLimitResult = checkRateLimit(clientIP, 'newsletter_submit')
    if (!rateLimitResult.allowed) {
      // Registrar violación de rate limit
      recordViolation({
        ip: clientIP,
        type: 'rate_limit',
        severity: 'low',
        timestamp: Date.now()
      })
      
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
    
    // 6. Validación adicional de email
    const email = body.email.trim().toLowerCase()
    const emailValidation = validateEmailSecurity(email)
    
    if (!emailValidation.isValid) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/newsletter',
        action: 'invalid_email',
        severity: 'medium',
        blocked: true,
        rateLimitExceeded: false,
        details: { reason: emailValidation.reason, email, score: emailValidation.score }
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
