import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'
import { logSecurityEvent } from '@/lib/security/security-logger'

// Cliente de Supabase con service role para operaciones administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper para obtener la IP del request
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, confirmPassword, acceptTerms, honeypot } = body

    // Verificar honeypot
    if (honeypot && honeypot.trim() !== '') {
      await logSecurityEvent({
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/auth',
        action: 'honeypot_triggered',
        severity: 'high',
        details: { email, action },
        blocked: true,
        rateLimitExceeded: false
      })
      
      return NextResponse.json(
        { error: 'Solicitud inválida detectada' },
        { status: 400 }
      )
    }

    if (action === 'register') {
      // Validaciones para registro
      if (!email || !password || !confirmPassword) {
        return NextResponse.json(
          { error: 'Todos los campos son requeridos' },
          { status: 400 }
        )
      }

      if (password !== confirmPassword) {
        return NextResponse.json(
          { error: 'Las contraseñas no coinciden' },
          { status: 400 }
        )
      }

      if (!acceptTerms) {
        return NextResponse.json(
          { error: 'Debes aceptar los términos y condiciones' },
          { status: 400 }
        )
      }

      // Registro con Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // No enviar email de confirmación
        }
      })

      if (error) {
        await logSecurityEvent({
          ip: getClientIp(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/auth',
          action: 'auth_failure',
          severity: 'medium',
          details: { email, action: 'register', error: error.message },
          blocked: false,
          rateLimitExceeded: false
        })
        
        throw error
      }

      // Si el usuario se creó exitosamente, crear el perfil manualmente
      if (data.user && !data.user.email_confirmed_at) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            role: 'user'
          })

        if (profileError) {
          console.warn('Error creando perfil:', profileError)
        }
      }

      await logSecurityEvent({
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/auth',
        action: 'auth_success',
        severity: 'low',
        details: { email, action: 'register' },
        blocked: false,
        rateLimitExceeded: false
      })

      return NextResponse.json({
        success: true,
        message: 'Registro exitoso'
      })

    } else if (action === 'login') {
      // Validaciones para login
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email y contraseña son requeridos' },
          { status: 400 }
        )
      }

      // Iniciar sesión con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        await logSecurityEvent({
          ip: getClientIp(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/auth',
          action: 'auth_failure',
          severity: 'medium',
          details: { email, action: 'login', error: error.message },
          blocked: false,
          rateLimitExceeded: false
        })
        
        throw error
      }

      await logSecurityEvent({
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/auth',
        action: 'auth_success',
        severity: 'low',
        details: { email, action: 'login' },
        blocked: false,
        rateLimitExceeded: false
      })

      return NextResponse.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        user: data.user
      })

    } else {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('Error en autenticación:', error)
    
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}