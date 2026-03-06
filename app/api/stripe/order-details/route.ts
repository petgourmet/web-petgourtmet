import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createOrderFromSession } from '@/lib/stripe/create-order'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Formatea una orden de la BD al formato esperado por el frontend
 */
function formatOrderResponse(order: any) {
  const subtotal = order.order_items?.reduce((sum: number, item: any) =>
    sum + (item.price * item.quantity), 0
  ) || 0
  const shipping = order.total - subtotal

  let shippingAddress = null
  try {
    const shippingData = typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : order.shipping_address
    shippingAddress = shippingData?.shipping || null
  } catch (e) {
    console.error('Error parsing shipping address:', e)
  }

  return {
    orderId: order.id,
    orderNumber: `PG-${order.id}`,
    total: order.total,
    subtotal,
    shipping,
    items: order.order_items?.map((item: any) => ({
      product_id: item.product_id,
      name: item.product_name,
      image: item.product_image,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      category: item.products?.categories?.name || null,
      brand: 'PET GOURMET',
      variant: item.size || null,
    })) || [],
    customerEmail: order.customer_email,
    customerName: order.customer_name,
    shippingAddress,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')
    const attempt = parseInt(searchParams.get('attempt') || '1')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // 1. BUSCAR ORDEN EN BASE DE DATOS (lo más rápido)
    const { data: order, error: orderError } = await supabaseAdmin
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
            category_id,
            categories (
              name
            )
          )
        )
      `)
      .eq('stripe_session_id', sessionId)
      .single()

    if (orderError && orderError.code !== 'PGRST116') {
      console.error('[ORDER-DETAILS] Error fetching order:', orderError)
    }

    // Si la orden ya existe, retornar inmediatamente
    if (order) {
      console.log('[ORDER-DETAILS] ✅ Orden encontrada en DB:', order.id)
      return NextResponse.json(formatOrderResponse(order))
    }

    // 2. ORDEN NO EXISTE EN DB → FALLBACK: CREAR DESDE STRIPE
    // A partir del intento 2, intentamos crear la orden nosotros mismos
    // (dando tiempo al webhook en el intento 1)
    if (attempt >= 2) {
      console.log(`[ORDER-DETAILS] 🔄 Intento ${attempt}: Orden no en DB, creando desde Stripe...`)
      
      try {
        const result = await createOrderFromSession(sessionId, 'api-fallback')
        console.log(`[ORDER-DETAILS] ✅ Orden ${result.isNew ? 'creada' : 'encontrada'}: ${result.order.id}`)
        return NextResponse.json(formatOrderResponse(result.order))
      } catch (createError: any) {
        // Si el pago no está completado aún, es normal
        if (createError.message?.includes('no pagada') || createError.message?.includes('not paid')) {
          console.log('[ORDER-DETAILS] ⏳ Pago aún no completado')
        } else {
          console.error('[ORDER-DETAILS] ❌ Error creando orden fallback:', createError.message)
        }
      }
    }

    // 3. RESPUESTA PENDIENTE: La orden aún no está lista
    // Obtener datos básicos de Stripe para mostrar algo al usuario
    console.log('[ORDER-DETAILS] ⏳ Orden pendiente, obteniendo datos de Stripe...')

    try {
      const { stripe } = await import('@/lib/stripe/config')
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'line_items.data.price.product'],
      })

      const lineItems = session.line_items?.data || []
      const items = lineItems.map((item: any) => {
        const product = item.price?.product as any
        return {
          name: item.description || product?.name || 'Producto',
          image: product?.images?.[0] || null,
          quantity: item.quantity || 1,
          price: (item.amount_total || 0) / 100 / (item.quantity || 1),
        }
      })

      const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
      const shipping = ((session.amount_total || 0) / 100) - subtotal

      return NextResponse.json({
        orderId: null,
        orderNumber: 'Procesando...',
        total: (session.amount_total || 0) / 100,
        subtotal,
        shipping,
        items,
        customerEmail: session.customer_email || session.customer_details?.email,
        customerName: session.customer_details?.name,
        shippingAddress: (session as any).shipping_details?.address || null,
        pending: true,
      })
    } catch (stripeError: any) {
      console.error('[ORDER-DETAILS] Error retrieving Stripe session:', stripeError.message)
      return NextResponse.json({
        orderId: null,
        orderNumber: 'Procesando...',
        total: 0,
        subtotal: 0,
        shipping: 0,
        items: [],
        customerEmail: null,
        customerName: null,
        shippingAddress: null,
        pending: true,
        message: 'Tu orden está siendo procesada. Por favor espera un momento.',
      })
    }
  } catch (error: any) {
    console.error('[ORDER-DETAILS] Error crítico:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
