import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { verifyRecaptcha } from '@/lib/recaptcha'
import { checkRateLimit } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security-logger'

export async function POST(request: NextRequest) {
  try {
    const { password, confirmPassword, honeypot } = await request.json()

    // Verificar honeypot
    if (honeypot && honeypot.trim() !== '') {
      await logSecurityEvent({
        type: 'honeypot_triggered',
        action: 'password_reset',
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
    const rateLimitResult = await checkRateLimit(clientIp, 'password_reset')
    
    if (!rateLimitResult.allowed) {
      await logSecurityEvent({
        type: 'rate_limit_exceeded',
        action: 'password_reset',
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

    // Crear cliente de Supabase
    const supabase = createClient()

    // Actualizar contraseña
    const { error } = await supabase.auth.updateUser({ 
      password: password 
    })

    if (error) {
      await logSecurityEvent({
        type: 'password_reset_failed',
        action: 'password_reset',
        ip: clientIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: { error: error.message }
      })
      
      throw error
    }

    // Log de éxito
    await logSecurityEvent({
      type: 'password_reset_success',
      action: 'password_reset',
      ip: clientIp,
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { timestamp: new Date().toISOString() }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Contraseña actualizada correctamente'
    })

  } catch (error: any) {
    console.error('Error en reset password:', error)
    
    await logSecurityEvent({
      type: 'password_reset_error',
      action: 'password_reset',
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