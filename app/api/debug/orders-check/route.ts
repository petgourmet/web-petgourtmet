import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET() {
  try {
    console.log('=== ORDERS CHECK WITH SERVICE CLIENT ===')
    
    const supabase = createServiceClient()
    
    // Obtener las últimas órdenes usando service client (bypassa RLS)
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('Orders query result:', { recentOrders, ordersError })
    
    // Obtener estadísticas de la tabla
    const { count, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
    
    console.log('Count query result:', { count, countError })
    
    return NextResponse.json({
      message: "Orders Check with Service Client",
      timestamp: new Date().toISOString(),
      ordersQuery: {
        success: !ordersError,
        data: recentOrders,
        error: ordersError
      },
      countQuery: {
        success: !countError,
        count,
        error: countError
      }
    })
    
  } catch (error) {
    console.error('Error in orders check:', error)
    return NextResponse.json({
      error: "Failed to check orders",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('=== TESTING ORDER INSERTION WITH SERVICE CLIENT ===')
    
    const supabase = createServiceClient()
    
    const testOrder = {
      id: `service_test_${Date.now()}`,
      customer_email: 'service-test@petgourmet.mx',
      customer_name: 'Service Test User',
      customer_phone: '5555555555',
      total_amount: 399.00,
      status: 'pending',
      payment_status: 'pending',
      items: JSON.stringify([{ 
        name: 'Service Test Product', 
        price: 399.00, 
        quantity: 1 
      }]),
      external_reference: `service_test_${Date.now()}`,
      mercadopago_preference_id: `test_pref_${Date.now()}`,
      created_at: new Date().toISOString()
    }
    
    console.log('Inserting test order:', testOrder)
    
    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select('*')
    
    console.log('Insert result:', { data, error })
    
    // Si se insertó correctamente, eliminarlo para no contaminar la BD
    if (!error && data) {
      await supabase
        .from('orders')
        .delete()
        .eq('id', testOrder.id)
      
      console.log('Test order cleaned up')
    }
    
    return NextResponse.json({
      message: "Order Insertion Test with Service Client",
      timestamp: new Date().toISOString(),
      testOrder,
      insertResult: {
        success: !error,
        data,
        error
      }
    })
    
  } catch (error) {
    console.error('Error in order insertion test:', error)
    return NextResponse.json({
      error: "Failed to test order insertion",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
