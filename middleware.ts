import { NextRequest, NextResponse } from 'next/server'
import { paymentValidatorMiddleware } from './middleware/payment-validator'

export async function middleware(request: NextRequest) {
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