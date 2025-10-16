/**
 * reCAPTCHA v3 verification service
 */

interface RecaptchaResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
}

export async function verifyRecaptcha(token: string, expectedAction?: string): Promise<{
  success: boolean
  score?: number
  error?: string
}> {
  try {
    // Si no hay token, fallar silenciosamente en desarrollo
    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        return { success: true, score: 0.9 }
      }
      return { success: false, error: 'Token de reCAPTCHA requerido' }
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    
    // Si no hay clave secreta configurada, simular éxito en desarrollo
    if (!secretKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ RECAPTCHA_SECRET_KEY no configurada, simulando verificación exitosa')
        return { success: true, score: 0.8 }
      }
      return { success: false, error: 'Configuración de reCAPTCHA incompleta' }
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data: RecaptchaResponse = await response.json()

    if (!data.success) {
      return {
        success: false,
        error: `Verificación de reCAPTCHA falló: ${data['error-codes']?.join(', ') || 'Error desconocido'}`
      }
    }

    // Verificar acción si se proporciona
    if (expectedAction && data.action !== expectedAction) {
      return {
        success: false,
        error: 'Acción de reCAPTCHA no coincide'
      }
    }

    // Verificar score mínimo (0.5 por defecto)
    const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5')
    if (data.score !== undefined && data.score < minScore) {
      return {
        success: false,
        score: data.score,
        error: `Score de reCAPTCHA muy bajo: ${data.score}`
      }
    }

    return {
      success: true,
      score: data.score
    }

  } catch (error) {
    console.error('Error verificando reCAPTCHA:', error)
    
    // En desarrollo, permitir continuar si hay error de red
    if (process.env.NODE_ENV === 'development') {
      return { success: true, score: 0.7 }
    }
    
    return {
      success: false,
      error: 'Error interno verificando reCAPTCHA'
    }
  }
}

export default verifyRecaptcha