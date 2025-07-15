import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userEmail = url.searchParams.get('email')
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Obtener todas las órdenes para debug
    const { data: allOrders, error: allError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (allError) {
      return NextResponse.json({ error: 'Database error', details: allError }, { status: 500 })
    }

    // Procesar órdenes para encontrar coincidencias con el email
    const userOrders = []
    const debugInfo = []

    for (const order of allOrders || []) {
      let orderData = null
      let emailMatch = false
      
      if (order.shipping_address) {
        try {
          orderData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
          
          // Verificar si el email coincide en customer_data
          if (orderData?.customer_data?.email?.toLowerCase() === userEmail.toLowerCase()) {
            emailMatch = true
            userOrders.push({
              ...order,
              orderData,
              emailMatch: true
            })
          }
        } catch (e) {
          debugInfo.push({
            orderId: order.id,
            error: 'Failed to parse shipping_address',
            shipping_address: order.shipping_address
          })
        }
      }
      
      debugInfo.push({
        orderId: order.id,
        customer_name: order.customer_name,
        user_id: order.user_id,
        emailMatch,
        hasShippingAddress: !!order.shipping_address,
        customerEmail: orderData?.customer_data?.email || null
      })
    }

    return NextResponse.json({
      userEmail,
      totalOrders: allOrders?.length || 0,
      userOrders: userOrders.length,
      userOrdersData: userOrders,
      debugInfo,
      message: `Found ${userOrders.length} orders for ${userEmail}`
    })

  } catch (error) {
    console.error('Error in user orders debug:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
