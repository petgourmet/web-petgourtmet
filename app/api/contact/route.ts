import { NextRequest, NextResponse } from 'next/server'
import { sendContactEmails, ContactFormData } from '@/lib/contact-email-service'
import { getClientIP, checkRateLimit } from '@/lib/security/rate-limiter'
import { logSecurityEvent } from '@/lib/security/security-logger'

// Patrones de spam mejorados
const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|poker|lottery|winner|congratulations)\b/i,
  /\b(click here|free money|make money|work from home)\b/i,
  /\b(nigerian prince|inheritance|million dollars|urgent|confidential)\b/i,
  /\b(sex|porn|adult|xxx|dating|hook.?up)\b/i,
  /\b(crypto|bitcoin|forex|trading|investment|profit)\b/i,
  /\b(seo|backlink|rank higher|increase traffic)\b/i,
  /https?:\/\/[^\s]+/g, // URLs
  /(.)\1{10,}/, // Caracteres repetidos
  /[A-Z]{20,}/, // Texto en mayúsculas excesivo
  /@\S+\.(com|net|org|info|biz|ru|cn)/gi, // Múltiples emails
]

// Dominios de email sospechosos
const SUSPICIOUS_EMAIL_DOMAINS = [
  'tempmail', 'throwaway', 'guerrillamail', 'mailinator', 
  'maildrop', '10minutemail', 'yopmail', 'temp-mail',
  'fakeinbox', 'sharklasers', 'guerrillamail'
]

function validateContent(text: string): { isValid: boolean; reason?: string } {
  if (!text || text.trim().length < 3) {
    return { isValid: false, reason: 'Contenido muy corto' }
  }

  // Verificar patrones de spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return { isValid: false, reason: 'Contenido sospechoso detectado' }
    }
  }

  // Verificar longitud excesiva
  if (text.length > 5000) {
    return { isValid: false, reason: 'Mensaje demasiado largo' }
  }

  // Verificar múltiples URLs
  const urlMatches = text.match(/https?:\/\/[^\s]+/g)
  if (urlMatches && urlMatches.length > 2) {
    return { isValid: false, reason: 'Demasiados enlaces en el mensaje' }
  }

  return { isValid: true }
}

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
        endpoint: '/api/contact',
        action: 'honeypot_triggered',
        severity: 'high',
        blocked: true,
        rateLimitExceeded: false,
        honeypotTriggered: true,
        details: { honeypotValue: body.honeypot }
      })
      
      // Respuesta genérica para no alertar al bot
      return NextResponse.json(
        { success: true, message: 'Mensaje enviado correctamente' },
        { status: 200 }
      )
    }

    // 2. Verificar reCAPTCHA token
    if (!body.recaptchaToken) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/contact',
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
        action: 'contact_form'
      })
    })

    if (!verifyResponse.ok) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/contact',
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
    if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/contact',
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

    // 4. Verificar rate limiting (máximo 3 envíos)
    const rateLimitResult = checkRateLimit(clientIP, 'contact_form')
    if (!rateLimitResult.allowed) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/contact',
        action: 'rate_limit_exceeded',
        severity: 'medium',
        blocked: true,
        rateLimitExceeded: true,
        details: { remaining: rateLimitResult.remaining }
      })
      
      return NextResponse.json(
        { error: 'Demasiados mensajes enviados. Inténtalo más tarde.' },
        { status: 429 }
      )
    }

    // 5. Validar campos requeridos
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Nombre, email y mensaje son campos requeridos' },
        { status: 400 }
      )
    }
    
    // 6. Validar formato de email y dominios sospechosos
    const emailValidation = validateEmail(body.email)
    if (!emailValidation.isValid) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/contact',
        action: 'invalid_email',
        severity: 'medium',
        blocked: true,
        rateLimitExceeded: false,
        details: { reason: emailValidation.reason, email: body.email }
      })
      
      return NextResponse.json(
        { error: emailValidation.reason || 'Email inválido' },
        { status: 400 }
      )
    }

    // 7. Validar contenido del mensaje
    const contentValidation = validateContent(body.message)
    if (!contentValidation.isValid) {
      await logSecurityEvent({
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/contact',
        action: 'spam_content_detected',
        severity: 'high',
        blocked: true,
        rateLimitExceeded: false,
        spamContentDetected: true,
        details: { reason: contentValidation.reason }
      })
      
      return NextResponse.json(
        { error: 'Contenido no permitido detectado' },
        { status: 400 }
      )
    }

    // 8. Validar nombre
    const nameValidation = validateContent(body.name)
    if (!nameValidation.isValid || body.name.length < 2 || body.name.length > 100) {
      return NextResponse.json(
        { error: 'Nombre inválido' },
        { status: 400 }
      )
    }
    
    // Preparar datos del formulario
    const contactData: ContactFormData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || undefined,
      message: body.message.trim(),
      formType: 'contact'
    }
    
    // Enviar emails
    const emailResult = await sendContactEmails(contactData)
    
    if (!emailResult.success) {
      console.error('Error sending emails:', emailResult.error)
      return NextResponse.json(
        { error: 'Error al enviar emails. Inténtalo de nuevo.' },
        { status: 500 }
      )
    }
    
    // Log para debugging
    console.log('Contact form submitted successfully:', {
      name: contactData.name,
      email: contactData.email,
      customerMessageId: emailResult.customerMessageId,
      adminMessageId: emailResult.adminMessageId
    })
    
    return NextResponse.json({
      success: true,
      message: 'Tu mensaje ha sido enviado correctamente. Te responderemos pronto.',
      data: {
        customerMessageId: emailResult.customerMessageId,
        adminMessageId: emailResult.adminMessageId
      }
    })
    
  } catch (error) {
    console.error('Error in contact API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor. Inténtalo más tarde.' },
      { status: 500 }
    )
  }
}
