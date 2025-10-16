import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const paymentId = params.paymentId
    const supabase = createServiceClient()

    // Buscar la orden por payment_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          price,
          products (
            id,
            name,
            image
          )
        )
      `)
      .eq('mercadopago_payment_id', paymentId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada para este payment_id' },
        { status: 404 }
      )
    }

    // Formatear la respuesta
    const orderDetails = {
      orderId: order.id,
      orderNumber: order.order_number || `ORD-${order.id}`,
      paymentId: order.mercadopago_payment_id,
      total: order.total,
      status: order.status,
      paymentStatus: order.payment_status,
      customerEmail: order.customer_email || order.payer_email,
      customerName: order.customer_name,
      createdAt: order.created_at,
      items: order.order_items?.map((item: any) => ({
        id: item.products?.id || item.id,
        title: item.products?.name || 'Producto',
        quantity: item.quantity,
        unit_price: item.price,
        image: item.products?.image
      })) || []
    }

    return NextResponse.json(orderDetails)
  } catch (error) {
    console.error('Error fetching order by payment ID:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}