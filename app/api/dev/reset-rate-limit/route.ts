import { NextRequest, NextResponse } from 'next/server'
import { resetRateLimit, getClientIP } from '@/lib/security/rate-limiter'

// Solo disponible en desarrollo
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Esta ruta solo está disponible en desarrollo' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { endpoint } = body

    const clientIP = getClientIP(request)
    
    // Reset para el endpoint específico o todos
    if (endpoint) {
      resetRateLimit(clientIP, endpoint)
      resetRateLimit(clientIP, `form:${endpoint}`)
    } else {
      // Reset para rutas comunes
      const routes = [
        '/api/auth',
        '/auth/login',
        '/api/auth/login',
        'form:/api/auth',
        'form:/api/auth/login'
      ]
      
      routes.forEach(route => resetRateLimit(clientIP, route))
    }

    return NextResponse.json({
      success: true,
      message: 'Rate limit reseteado exitosamente',
      ip: clientIP
    })
  } catch (error) {
    console.error('Error reseteando rate limit:', error)
    return NextResponse.json(
      { error: 'Error al resetear rate limit' },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Esta ruta solo está disponible en desarrollo' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    message: 'Usa POST para resetear el rate limit',
    example: {
      method: 'POST',
      body: { endpoint: '/api/auth' }
    }
  })
}
