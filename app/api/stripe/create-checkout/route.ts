/**
 * API Route: Crear sesión de Stripe Checkout
 * 
 * POST /api/stripe/create-checkout
 * 
 * Crea una sesión de checkout para pagos únicos o suscripciones
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, CartItem, CustomerInfo, ShippingInfo } from '@/lib/stripe/checkout-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CreateCheckoutRequest {
  items: CartItem[]
  customer: CustomerInfo
  shipping: ShippingInfo
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateCheckoutRequest = await request.json()

    // Validaciones básicas
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'El carrito está vacío' },
        { status: 400 }
      )
    }

    if (!body.customer || !body.customer.email) {
      return NextResponse.json(
        { error: 'Información de cliente inválida' },
        { status: 400 }
      )
    }

    if (!body.shipping || !body.shipping.address) {
      return NextResponse.json(
        { error: 'Información de envío inválida' },
        { status: 400 }
      )
    }

    // Validar que los items tengan precio válido
    const invalidItems = body.items.filter(item => !item.price || item.price <= 0)
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: 'Algunos productos tienen precio inválido' },
        { status: 400 }
      )
    }

    // Crear URLs con el dominio correcto
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    // Detectar si hay suscripciones en el carrito
    const hasSubscription = body.items.some(item => item.isSubscription)
    
    // Usar URL correcta según el tipo de compra
    const successUrl = body.successUrl || (
      hasSubscription 
        ? `${baseUrl}/suscripcion/exito`
        : `${baseUrl}/gracias-por-tu-compra`
    )
    const cancelUrl = body.cancelUrl || `${baseUrl}/checkout`

    // Crear sesión de Checkout
    const { url, sessionId } = await createCheckoutSession({
      items: body.items,
      customer: body.customer,
      shipping: body.shipping,
      successUrl,
      cancelUrl,
      metadata: body.metadata,
    })

    return NextResponse.json({
      success: true,
      url,
      sessionId,
    })

  } catch (error) {
    console.error('Error al crear sesión de checkout:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    
    return NextResponse.json(
      { 
        error: 'Error al procesar el pago',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}
