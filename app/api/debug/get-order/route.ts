import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orderId = url.searchParams.get('id')
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        total: order.total,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        payment_intent_id: order.payment_intent_id,
        created_at: order.created_at,
        updated_at: order.updated_at,
        shipping_address: order.shipping_address
      }
    })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({
      error: 'Failed to fetch order',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
