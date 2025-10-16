// app/api/mercadopago/payment/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id

    // Verificar que tenemos el token de acceso usando configuración dinámica
    let mercadoPagoAccessToken: string
    try {
      const { getMercadoPagoAccessToken } = await import('@/lib/mercadopago-config')
      mercadoPagoAccessToken = getMercadoPagoAccessToken()
    } catch (error) {
      return NextResponse.json(
        { error: "MercadoPago access token not configured", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

    // Obtener información del pago desde MercadoPago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error fetching payment from MercadoPago:", errorData)
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    const paymentData = await response.json()

    // Formatear los datos para el frontend
    const formattedPayment = {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      currency_id: paymentData.currency_id,
      date_created: paymentData.date_created,
      date_approved: paymentData.date_approved,
      external_reference: paymentData.external_reference,
      payment_method: {
        id: paymentData.payment_method_id,
        type: paymentData.payment_type_id,
      },
      payer: {
        email: paymentData.payer?.email,
        identification: paymentData.payer?.identification,
      },
      // Solo incluir información segura
    }

    return NextResponse.json(formattedPayment)

  } catch (error) {
    console.error('Error in payment API:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
