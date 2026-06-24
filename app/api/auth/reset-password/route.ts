import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { verifyRecaptcha } from '@/lib/recaptcha'
import { checkRateLimit } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security/security-logger'

// Helper para obtener la IP del request (compatible con Node.js runtime)
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const { password, confirmPassword, honeypot } = await request.json()
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Verificar honeypot
    if (honeypot && honeypot.trim() !== '') {
      await logSecurityEvent({
        ip: clientIp,
        userAgent,
        endpoint: '/api/auth/reset-password',
        action: 'honeypot_triggered',
        severity: 'high',
        details: { honeypot },
        blocked: true,
        rateLimitExceeded: false
      })
      
      return NextResponse.json(
        { error: 'Solicitud inválida' },
        { status: 400 }
      )
    }

    // Verificar rate limiting
    const rateLimitResult = await checkRateLimit(clientIp, 'password_reset')
    
    if (!rateLimitResult.allowed) {
      await logSecurityEvent({
        ip: clientIp,
        userAgent,
        endpoint: '/api/auth/reset-password',
        action: 'rate_limit_exceeded',
        severity: 'medium',
        details: { 
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime 
        },
        blocked: true,
        rateLimitExceeded: true
      })
      
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        { status: 429 }
      )
    }

    // Verificar reCAPTCHA - DESHABILITADO para evitar errores
    // if (!recaptchaToken) {
    //   return NextResponse.json(
    //     { error: 'Token de verificación requerido' },
    //     { status: 400 }
    //   )
    // }

    // const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'password_reset')
    
    // if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
    //   await logSecurityEvent({
    //     type: 'recaptcha_failed',
    //     action: 'password_reset',
    //     ip: clientIp,
    //     userAgent: request.headers.get('user-agent') || 'unknown',
    //     details: { 
    //       score: recaptchaResult.score,
    //       errors: recaptchaResult.errors 
    //     }
    //   })
      
    //   return NextResponse.json(
    //     { error: 'Verificación de seguridad fallida' },
    //     { status: 400 }
    //   )
    // }

    // Validar contraseñas
    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Contraseña y confirmación son requeridas' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Las contraseñas no coinciden' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Crear cliente de Supabase (await requerido — createClient es async en server.ts)
    const supabase = await createClient()

    // Actualizar contraseña
    const { error } = await supabase.auth.updateUser({ 
      password: password 
    })

    if (error) {
      await logSecurityEvent({
        ip: clientIp,
        userAgent,
        endpoint: '/api/auth/reset-password',
        action: 'password_reset_failed',
        severity: 'medium',
        details: { error: error.message },
        blocked: false,
        rateLimitExceeded: false
      })
      
      throw error
    }

    // Log de éxito
    await logSecurityEvent({
      ip: clientIp,
      userAgent,
      endpoint: '/api/auth/reset-password',
      action: 'auth_success',
      severity: 'low',
      details: { timestamp: new Date().toISOString() },
      blocked: false,
      rateLimitExceeded: false
    })

    return NextResponse.json({ 
      success: true,
      message: 'Contraseña actualizada correctamente'
    })

  } catch (error: any) {
    console.error('Error en reset password:', error)

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}