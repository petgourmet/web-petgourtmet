// app/api/test-mercadopago-config/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verificar variables de entorno del servidor
    const hasAccessToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN
    const hasPublicKey = !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    const environment = process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT
    const locale = process.env.NEXT_PUBLIC_MERCADOPAGO_LOCALE
    
    // Verificar si las credenciales tienen el formato correcto
    const accessTokenFormat = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('APP_USR-') || false
    const publicKeyFormat = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.startsWith('APP_USR-') || false

    return NextResponse.json({
      success: true,
      environment: environment || 'no configurado',
      locale: locale || 'no configurado',
      hasAccessToken,
      hasPublicKey,
      accessTokenFormat,
      publicKeyFormat,
      isProduction: environment === 'production',
      isSandbox: environment === 'sandbox',
      recommendations: [
        ...(environment !== 'sandbox' && environment !== 'production' ? ['⚠️ Configure NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT'] : []),
        ...(!hasAccessToken ? ['⚠️ Configure MERCADOPAGO_ACCESS_TOKEN'] : []),
        ...(!hasPublicKey ? ['⚠️ Configure NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'] : []),
        ...(!accessTokenFormat && hasAccessToken ? ['⚠️ ACCESS_TOKEN debe comenzar con APP_USR-'] : []),
        ...(!publicKeyFormat && hasPublicKey ? ['⚠️ PUBLIC_KEY debe comenzar con APP_USR-'] : []),
        ...(environment === 'production' ? ['🔥 MODO PRODUCCIÓN - Cuidado con los pagos reales'] : []),
        ...(environment === 'sandbox' ? ['✅ MODO SANDBOX - Perfecto para pruebas'] : [])
      ]
    })
  } catch (error) {
    console.error('Error checking MercadoPago config:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al verificar configuración de MercadoPago',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
