import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST(request: Request) {
  try {
    console.log('=== MERCADOPAGO WEBHOOK ===')
    
    const body = await request.json()
    console.log('Webhook payload:', JSON.stringify(body, null, 2))
    
    // Verificar que es una notificación de pago
    if (body.type !== 'payment') {
      console.log('Not a payment notification, ignoring')
      return NextResponse.json({ received: true })
    }

    // Obtener el ID del pago
    const paymentId = body.data?.id
    if (!paymentId) {
      console.log('No payment ID found in webhook')
      return NextResponse.json({ error: 'No payment ID' }, { status: 400 })
    }

    console.log('Processing payment ID:', paymentId)

    // Obtener información del pago desde MercadoPago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!mpResponse.ok) {
      console.error('Failed to fetch payment from MercadoPago:', mpResponse.status)
      return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 })
    }

    const paymentData = await mpResponse.json()
    console.log('Payment data from MercadoPago:', JSON.stringify(paymentData, null, 2))

    // Obtener external_reference que debería corresponder al ID de nuestra orden
    const externalReference = paymentData.external_reference
    if (!externalReference) {
      console.log('No external_reference found in payment')
      return NextResponse.json({ error: 'No external reference' }, { status: 400 })
    }

    console.log('Looking for order with external_reference:', externalReference)

    // Buscar la orden en nuestra base de datos
    const supabase = createServiceClient()
    
    const { data: orders, error: findError } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${externalReference},external_reference.eq.${externalReference}`)
      .limit(1)

    if (findError) {
      console.error('Error finding order:', findError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      console.log('No order found with external_reference:', externalReference)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orders[0]
    console.log('Found order:', order.id)

    // Determinar el nuevo estado basado en el estado del pago
    let newPaymentStatus = 'pending'
    let newOrderStatus = order.status

    switch (paymentData.status) {
      case 'approved':
        newPaymentStatus = 'completed'
        newOrderStatus = 'completed' // Cambiar orden a completada cuando el pago es aprobado
        break
      case 'pending':
        newPaymentStatus = 'pending'
        break
      case 'rejected':
      case 'cancelled':
        newPaymentStatus = 'failed'
        break
      default:
        console.log('Unknown payment status:', paymentData.status)
        newPaymentStatus = 'pending'
    }

    console.log('Updating order status:', { newPaymentStatus, newOrderStatus })

    // Actualizar la orden en la base de datos
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        payment_intent_id: paymentData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    console.log('Order updated successfully')

    // Si el pago fue aprobado, podrías enviar un email de confirmación aquí
    if (newPaymentStatus === 'completed') {
      console.log('Payment completed for order:', order.id)
      // TODO: Enviar email de confirmación al cliente
    }

    return NextResponse.json({ 
      received: true, 
      orderId: order.id,
      paymentStatus: newPaymentStatus,
      orderStatus: newOrderStatus
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// MercadoPago también puede enviar GET requests para validar el endpoint
export async function GET() {
  return NextResponse.json({ 
    message: 'MercadoPago webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  })
}
