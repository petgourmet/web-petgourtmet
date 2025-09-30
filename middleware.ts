import { NextRequest, NextResponse } from 'next/server'
import { paymentValidatorMiddleware } from './middleware/payment-validator'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  
  // CRÍTICO: Interceptar URLs de MercadoPago y redirigir a página local
  if (url.hostname === 'www.mercadopago.com.mx' && 
      url.pathname === '/subscriptions/checkout/congrats') {
    
    console.log('🔄 Interceptando URL de MercadoPago:', url.toString())
    
    // Construir URL local con todos los parámetros preservados
    const localUrl = new URL('/suscripcion', request.url)
    
    // Preservar todos los parámetros de la URL original
    url.searchParams.forEach((value, key) => {
      localUrl.searchParams.set(key, value)
    })
    
    console.log('➡️ Redirigiendo a URL local:', localUrl.toString())
    
    // Redirección permanente para preservar parámetros
    return NextResponse.redirect(localUrl, 301)
  }
  
  // Ejecutar validación de pagos en rutas relevantes
  const paymentResponse = await paymentValidatorMiddleware(request)
  
  // Si el middleware de pagos devuelve una respuesta específica, usarla
  if (paymentResponse && paymentResponse !== NextResponse.next()) {
    return paymentResponse
  }
  
  // Continuar con el procesamiento normal
  return NextResponse.next()
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}