import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// Rutas que deben activar la validación de pagos
const PAYMENT_ROUTES = [
  '/checkout',
  '/perfil',
  '/admin/orders',
  '/admin/subscription-orders',
  '/processing-payment',
  '/pago-pendiente'
]

// Cache para evitar validaciones muy frecuentes
const validationCache = new Map<string, number>()
const VALIDATION_COOLDOWN = 30000 // 30 segundos

export async function validatePendingPayments() {
  const now = Date.now()
  const cacheKey = 'last_validation'
  const lastValidation = validationCache.get(cacheKey) || 0
  
  // Solo validar si han pasado más de 30 segundos desde la última validación
  if (now - lastValidation < VALIDATION_COOLDOWN) {
    return
  }
  
  validationCache.set(cacheKey, now)
  
  try {
    // Llamar al endpoint de validación automática
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/auto-validate-payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const result = await response.json()
      // Validación completada silenciosamente
    }
  } catch (error) {
    // Error manejado silenciosamente en producción
  }
}

export function shouldValidatePayments(pathname: string): boolean {
  return PAYMENT_ROUTES.some(route => pathname.startsWith(route))
}

async function processPaymentValidation() {
  // Implementación de validación de pagos
  return {
    validated: 0,
    errors: []
  }
}

export async function validatePayments() {
  try {
    // Ejecutar validación automática de pagos
    const result = await processPaymentValidation()
    
    return {
      success: true,
      validated: result.validated,
      errors: result.errors
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

export async function paymentValidatorMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Solo validar en rutas relacionadas con pagos
  if (shouldValidatePayments(pathname)) {
    // Ejecutar validación en background (no bloquear la request)
    validatePendingPayments().catch(() => {
      // Error manejado silenciosamente
    })
  }
  
  return NextResponse.next()
}