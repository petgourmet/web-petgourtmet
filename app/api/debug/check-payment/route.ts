import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST(request: Request) {
  try {
    console.log('=== MANUAL PAYMENT CHECK ===')
    
    const body = await request.json()
    const { orderId } = body
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    console.log('Checking payment for order:', orderId)

    // Buscar la orden en nuestra base de datos
    const supabase = createServiceClient()
    
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (findError || !order) {
      console.error('Error finding order:', findError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('Found order:', order)

    // Si no hay payment_intent_id, la orden no se procesó correctamente
    if (!order.payment_intent_id) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        error: 'No payment intent ID found',
        suggestion: 'Order may not have been submitted to MercadoPago'
      })
    }

    // Verificar el estado del pago en MercadoPago
    console.log('Checking payment status for preference:', order.payment_intent_id)

    // Primero intentar obtener la preferencia para ver si hay pagos asociados
    const preferenceResponse = await fetch(`https://api.mercadopago.com/checkout/preferences/${order.payment_intent_id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!preferenceResponse.ok) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        error: 'Failed to fetch preference from MercadoPago',
        preferenceId: order.payment_intent_id
      })
    }

    const preferenceData = await preferenceResponse.json()
    console.log('Preference data:', JSON.stringify(preferenceData, null, 2))

    // Buscar pagos asociados con esta preferencia usando external_reference
    const paymentsResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!paymentsResponse.ok) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        error: 'Failed to search payments in MercadoPago'
      })
    }

    const paymentsData = await paymentsResponse.json()
    console.log('Payments search result:', JSON.stringify(paymentsData, null, 2))

    if (!paymentsData.results || paymentsData.results.length === 0) {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        paymentStatus: order.payment_status,
        message: 'No payments found for this order',
        preferenceId: order.payment_intent_id,
        externalReference: order.id
      })
    }

    // Obtener el pago más reciente
    const latestPayment = paymentsData.results[0]
    console.log('Latest payment:', JSON.stringify(latestPayment, null, 2))

    // Determinar el nuevo estado basado en el estado del pago
    let newPaymentStatus = 'pending'
    let newOrderStatus = order.status

    switch (latestPayment.status) {
      case 'approved':
        newPaymentStatus = 'completed'
        newOrderStatus = 'completed'
        break
      case 'pending':
        newPaymentStatus = 'pending'
        break
      case 'rejected':
      case 'cancelled':
        newPaymentStatus = 'failed'
        newOrderStatus = 'cancelled'
        break
    }

    // Actualizar la orden si el estado ha cambiado
    if (newPaymentStatus !== order.payment_status || newOrderStatus !== order.status) {
      console.log('Updating order status:', { newPaymentStatus, newOrderStatus })

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: newPaymentStatus,
          status: newOrderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Error updating order:', updateError)
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      return NextResponse.json({
        orderId: order.id,
        previousStatus: order.status,
        previousPaymentStatus: order.payment_status,
        newStatus: newOrderStatus,
        newPaymentStatus: newPaymentStatus,
        updated: true,
        paymentData: latestPayment
      })
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      paymentStatus: order.payment_status,
      updated: false,
      message: 'Status is already up to date',
      paymentData: latestPayment
    })

  } catch (error) {
    console.error('Payment check error:', error)
    return NextResponse.json({
      error: 'Payment check failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Manual payment check endpoint',
    usage: 'POST with { "orderId": "123" }',
    timestamp: new Date().toISOString()
  })
}
