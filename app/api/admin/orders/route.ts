import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET ADMIN ORDERS ===')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const status = url.searchParams.get('status')
    const paymentStatus = url.searchParams.get('payment_status')
    const search = url.searchParams.get('search')
    
    const offset = (page - 1) * limit

    // Construir query base
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items(
          id,
          product_id,
          product_name,
          product_image,
          quantity,
          price,
          size
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Aplicar filtros
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus)
    }
    
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,id.eq.${search}`)
    }

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Error obteniendo órdenes:', error)
      return NextResponse.json({ error: 'Error obteniendo órdenes' }, { status: 500 })
    }

    // Procesar órdenes para incluir información adicional
    const processedOrders = orders?.map(order => {
      let orderData = null
      let customerData = null
      
      // Parsear shipping_address si existe
      if (order.shipping_address) {
        try {
          orderData = typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address
          customerData = orderData.customer_data || null
        } catch (e) {
          console.error('Error parsing shipping_address:', e)
        }
      }

      return {
        ...order,
        customer_data: customerData,
        order_data: orderData,
        items_count: order.order_items?.length || 0,
        has_subscription: false // TODO: Determinar si tiene suscripciones basado en otros campos
      }
    }) || []

    console.log(`✅ Obtenidas ${processedOrders.length} órdenes de ${count} totales`)

    return NextResponse.json({
      success: true,
      orders: processedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: {
        status,
        paymentStatus,
        search
      }
    })

  } catch (error) {
    console.error('Error en GET /api/admin/orders:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// POST para crear una nueva orden (opcional)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 })
    }

    // Aquí se podría implementar la creación de órdenes si es necesario
    return NextResponse.json({ error: "Método no implementado" }, { status: 501 })
    
  } catch (error) {
    console.error('Error en POST /api/admin/orders:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error interno del servidor' 
    }, { status: 500 })
  }
}