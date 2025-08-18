import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId = 'test-product', amount = 1000, userEmail = 'test@petgourmet.com' } = body
    
    const supabase = createClient()
    
    // Crear orden de prueba
    const orderId = uuidv4()
    const testOrder = {
      id: orderId,
      user_email: userEmail,
      total_amount: amount,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'mercadopago',
      items: [
        {
          product_id: productId,
          name: 'Producto de Prueba',
          price: amount,
          quantity: 1
        }
      ],
      shipping_address: {
        street: 'Calle de Prueba 123',
        city: 'Ciudad de Prueba',
        state: 'Estado de Prueba',
        zip_code: '12345',
        country: 'Argentina'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Insertar orden en la base de datos
    const { error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
    
    if (orderError) {
      console.error('Error creating test order:', orderError)
      return NextResponse.json(
        { error: 'Error al crear orden de prueba', details: orderError.message },
        { status: 500 }
      )
    }
    
    // Simular webhook de pago exitoso después de 2 segundos
    setTimeout(async () => {
      try {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            payment_id: `test_payment_${Date.now()}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
        
        if (updateError) {
          console.error('Error updating test order:', updateError)
        }
        
        // Registrar webhook simulado
        await supabase
          .from('webhook_logs')
          .insert({
            event_type: 'payment.approved',
            payment_id: `test_payment_${Date.now()}`,
            order_id: orderId,
            status: 'processed',
            raw_data: {
              action: 'payment.approved',
              api_version: 'v1',
              data: {
                id: `test_payment_${Date.now()}`
              },
              date_created: new Date().toISOString(),
              id: Date.now(),
              live_mode: false,
              type: 'payment',
              user_id: 'test_user'
            },
            created_at: new Date().toISOString()
          })
      } catch (error) {
        console.error('Error in simulated webhook:', error)
      }
    }, 2000)
    
    return NextResponse.json({
      success: true,
      message: 'Compra de prueba creada exitosamente',
      orderId,
      amount,
      userEmail,
      note: 'El pago se simulará como exitoso en 2 segundos'
    })
    
  } catch (error) {
    console.error('Error simulating purchase:', error)
    return NextResponse.json(
      { error: 'Error al simular compra' },
      { status: 500 }
    )
  }
}