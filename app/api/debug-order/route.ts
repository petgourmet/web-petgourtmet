import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId') || '155'
    
    // Obtener la orden específica
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', parseInt(orderId))
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }
    
    // Analizar el shipping_address
    let shippingAnalysis = {
      raw: order.shipping_address,
      type: typeof order.shipping_address,
      parsed: null,
      email: null,
      customer_data: null
    }
    
    if (order.shipping_address) {
      try {
        const parsed = typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address
        
        shippingAnalysis.parsed = parsed
        shippingAnalysis.email = parsed.email || null
        shippingAnalysis.customer_data = parsed.customer_data || null
      } catch (e) {
        shippingAnalysis.parsed = 'Error parsing JSON'
      }
    }
    
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        user_id: order.user_id,
        status: order.status,
        total: order.total,
        created_at: order.created_at,
        customer_email: order.customer_email || null
      },
      shipping_analysis: shippingAnalysis
    })
    
  } catch (error) {
    console.error('Error en debug-order:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}