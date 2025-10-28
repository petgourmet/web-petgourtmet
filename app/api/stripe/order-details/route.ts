import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // Obtener la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product']
    })

    // Buscar la orden en la base de datos
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          product_image,
          quantity,
          price,
          size
        )
      `)
      .eq('stripe_session_id', sessionId)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Calcular subtotal y envío
    const subtotal = order.order_items?.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    ) || 0
    const shipping = order.total - subtotal

    // Extraer dirección de envío
    let shippingAddress = null
    try {
      const shippingData = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address)
        : order.shipping_address
      
      shippingAddress = shippingData?.shipping || null
    } catch (e) {
      console.error('Error parsing shipping address:', e)
    }

    // Formatear respuesta
    const orderDetails = {
      orderId: order.id,
      orderNumber: `PG-${order.id}`,
      total: order.total,
      subtotal: subtotal,
      shipping: shipping,
      items: order.order_items?.map((item: any) => ({
        product_id: item.product_id,
        name: item.product_name,
        image: item.product_image,
        quantity: item.quantity,
        price: item.price,
        size: item.size
      })) || [],
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      shippingAddress: shippingAddress
    }

    return NextResponse.json(orderDetails)
  } catch (error: any) {
    console.error('Error fetching order details:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
