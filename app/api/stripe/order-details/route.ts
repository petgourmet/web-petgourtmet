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

    // Buscar la orden en la base de datos con información completa de productos
    // Reintentar hasta 5 veces con delay si no se encuentra (dar tiempo al webhook)
    let order = null
    let orderError = null
    
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await supabaseAdmin
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
            size,
            products (
              id,
              name,
              brand,
              category_id,
              subcategory,
              categories (
                name
              )
            )
          )
        `)
        .eq('stripe_session_id', sessionId)
        .single()
      
      if (result.data) {
        order = result.data
        console.log(`✅ Orden encontrada en intento ${attempt + 1}:`, order.id)
        break
      }
      
      orderError = result.error
      
      // Si no es el último intento, esperar más tiempo
      if (attempt < 4) {
        const waitTime = (attempt + 1) * 1500 // 1.5s, 3s, 4.5s, 6s
        console.log(`⏳ Orden no encontrada, esperando ${waitTime}ms... (intento ${attempt + 1}/5)`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    if (orderError && !order) {
      console.error('Error fetching order after 5 attempts:', orderError)
    }

    if (!order) {
      // La orden aún no ha sido procesada por el webhook
      // Devolver información básica de la sesión de Stripe
      console.log('Order not found in DB yet, returning session data')
      
      const lineItems = session.line_items?.data || []
      const items = lineItems.map((item: any) => {
        const product = item.price?.product as any
        return {
          name: item.description || product?.name || 'Producto',
          image: product?.images?.[0] || null,
          quantity: item.quantity || 1,
          price: (item.amount_total || 0) / 100 / (item.quantity || 1)
        }
      })
      
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const shipping = ((session.amount_total || 0) / 100) - subtotal
      
      return NextResponse.json({
        orderId: null,
        orderNumber: 'Procesando...',
        total: (session.amount_total || 0) / 100,
        subtotal: subtotal,
        shipping: shipping,
        items: items,
        customerEmail: session.customer_email || session.customer_details?.email,
        customerName: session.customer_details?.name,
        shippingAddress: (session as any).shipping_details?.address || null,
        pending: true // Indicar que aún está pendiente
      })
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

    // Formatear respuesta con información completa de productos
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
        size: item.size,
        // Agregar información de productos desde la relación
        category: item.products?.categories?.name || null,
        subcategory: item.products?.subcategory || null,
        brand: item.products?.brand || 'PET GOURMET',
        variant: item.size || null // Usar el tamaño como variante
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
