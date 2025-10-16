import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/security/rate-limiter'
import { logSecurityEvent } from '@/lib/security/security-logger'

interface RecaptchaVerificationResponse {
  success: boolean
  score: number
  action: string
  challenge_ts: string
  hostname: string
  'error-codes'?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { token, action } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token de reCAPTCHA requerido' },
        { status: 400 }
      )
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY no configurada')
      return NextResponse.json(
        { error: 'Configuración de reCAPTCHA no disponible' },
        { status: 500 }
      )
    }

    // Verificar el token con Google reCAPTCHA
    const verificationResponse = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      }
    )

    const verificationData: RecaptchaVerificationResponse = await verificationResponse.json()
    
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log del resultado de la verificación
    logSecurityEvent({
      ip: clientIP,
      userAgent,
      endpoint: '/api/security/verify-recaptcha',
      action: 'recaptcha_verification',
      severity: verificationData.success && verificationData.score >= 0.5 ? 'low' : 'medium',
      details: {
        success: verificationData.success,
        score: verificationData.score,
        action: verificationData.action,
        expectedAction: action,
        errorCodes: verificationData['error-codes']
      },
      blocked: !verificationData.success || verificationData.score < 0.3,
      rateLimitExceeded: false,
      recaptchaScore: verificationData.score
    })

    if (!verificationData.success) {
      return NextResponse.json(
        { 
          error: 'Verificación de reCAPTCHA fallida',
          success: false,
          score: 0,
          errorCodes: verificationData['error-codes']
        },
        { status: 400 }
      )
    }

    // Verificar que la acción coincida (opcional pero recomendado)
    if (action && verificationData.action !== action) {
      return NextResponse.json(
        { 
          error: 'Acción de reCAPTCHA no válida',
          success: false,
          score: verificationData.score
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      score: verificationData.score,
      action: verificationData.action,
      timestamp: verificationData.challenge_ts
    })

  } catch (error) {
    console.error('Error verificando reCAPTCHA:', error)
    
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    logSecurityEvent({
      ip: clientIP,
      userAgent,
      endpoint: '/api/security/verify-recaptcha',
      action: 'recaptcha_error',
      severity: 'high',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      blocked: true,
      rateLimitExceeded: false
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}