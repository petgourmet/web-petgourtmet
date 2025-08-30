import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Crear una orden de prueba con un usuario existente
    const testOrder = {
      total: 135.00,
      status: 'pending',
      shipping_address: {
        email: 'camilogomezm@gmail.com',
        full_name: 'Camilo Gomez Test',
        phone: '5551234567',
        street: 'Calle Test 123',
        city: 'Ciudad Test',
        state: 'Estado Test',
        postal_code: '12345',
        country: 'México'
      }
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single()
    
    if (error) {
      console.error('Error creando orden de prueba:', error)
      return NextResponse.json({ error: 'Error creando orden' }, { status: 500 })
    }
    
    // Crear los items de la orden
    const orderItem = {
      order_id: order.id,
      product_name: 'Producto de Prueba',
      product_image: 'https://via.placeholder.com/150',
      quantity: 1,
      price: 135.00
    }
    
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .insert(orderItem)
      .select()
      .single()
    
    if (itemError) {
      console.error('Error creando item de orden:', itemError)
      return NextResponse.json({ error: 'Error creando item de orden' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Orden de prueba creada exitosamente',
      order
    })
    
  } catch (error) {
    console.error('Error en test-order:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}