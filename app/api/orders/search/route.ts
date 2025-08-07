import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * API endpoint para buscar órdenes por diferentes criterios
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalReference = searchParams.get('external_reference')
    const orderId = searchParams.get('order_id')
    const email = searchParams.get('email')
    
    if (!externalReference && !orderId && !email) {
      return NextResponse.json(
        { error: 'Se requiere al menos un parámetro de búsqueda' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    let query = supabase.from('orders').select('*')

    if (externalReference) {
      // Buscar por external_reference (que normalmente es el ID de la orden)
      query = query.eq('id', externalReference)
    } else if (orderId) {
      // Buscar por order_id directo
      query = query.eq('id', orderId)
    } else if (email) {
      // Buscar por email en shipping_address
      const { data: allOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        return NextResponse.json(
          { error: 'Error al buscar órdenes', details: fetchError.message },
          { status: 500 }
        )
      }
      
      // Filtrar por email en shipping_address
      const filteredOrders = allOrders?.filter(order => {
        if (order.shipping_address) {
          try {
            const parsedShipping = typeof order.shipping_address === 'string' 
              ? JSON.parse(order.shipping_address) 
              : order.shipping_address
            
            const customerEmail = parsedShipping?.customer_data?.email
            return customerEmail?.toLowerCase() === email.toLowerCase()
          } catch (e) {
            return false
          }
        }
        return false
      }) || []
      
      return NextResponse.json({
        success: true,
        orders: filteredOrders,
        order: filteredOrders[0] || null,
        count: filteredOrders.length
      })
    }

    const { data: order, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: true, order: null, message: 'Orden no encontrada' },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: 'Error al buscar orden', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Orden encontrada'
    })

  } catch (error) {
    console.error('Error in orders search:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}