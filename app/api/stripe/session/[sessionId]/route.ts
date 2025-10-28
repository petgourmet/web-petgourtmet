import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/stripe/checkout-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de sesión' },
        { status: 400 }
      )
    }

    // Obtener la sesión de Stripe
    const session = await getCheckoutSession(sessionId)

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error al obtener la sesión de Stripe:', error)
    return NextResponse.json(
      { error: 'Error al obtener los detalles de la sesión' },
      { status: 500 }
    )
  }
}
