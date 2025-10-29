import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logSecurityEvent } from '@/lib/security/security-logger'

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

    // Crear cliente de Supabase con manejo de cookies del servidor
    const supabase = await createClient()

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
        const supabaseAdmin = createServiceClient()
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            role: 'user'
          } as any)

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

      // Hacer login automático después del registro para mejorar UX
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        console.warn('Error en login automático después del registro:', loginError)
        // Aún así devolver éxito del registro
        return NextResponse.json({
          success: true,
          message: 'Registro exitoso. Por favor, inicia sesión.',
          autoLoginFailed: true
        })
      }

      // Crear respuesta con sesión establecida
      const response = NextResponse.json({
        success: true,
        message: 'Registro exitoso. Sesión iniciada automáticamente.',
        user: loginData.user,
        session: loginData.session,
        autoLogin: true
      })

      return response

    } else if (action === 'login') {
      // Validaciones para login
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email y contraseña son requeridos' },
          { status: 400 }
        )
      }

      // Iniciar sesión con Supabase - esto establecerá las cookies automáticamente
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

      console.log('✅ Login successful in API route:', { 
        email: data.user?.email,
        sessionExists: !!data.session 
      })

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

      // Crear respuesta con las cookies establecidas
      const response = NextResponse.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        user: data.user,
        session: data.session
      })

      // Las cookies ya están establecidas por el cliente de servidor de Supabase
      // pero nos aseguramos de que se envíen en la respuesta
      return response

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