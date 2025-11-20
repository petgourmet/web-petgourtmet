import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendOrderStatusEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    console.log('=== AUTO CANCEL EXPIRED ORDERS ===')
    
    const supabase = createServiceClient()
    
    // Calcular la fecha de 3 días atrás
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    console.log('Looking for orders older than:', threeDaysAgo.toISOString())
    
    // Buscar órdenes que:
    // 1. Tienen más de 3 días
    // 2. Status = 'pending'
    // 3. payment_status = 'pending'
    const { data: expiredOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .lt('created_at', threeDaysAgo.toISOString())
    
    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError)
      return NextResponse.json({ 
        error: 'Error fetching orders' 
      }, { status: 500 })
    }
    
    console.log(`Found ${expiredOrders?.length || 0} expired orders`)
    
    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({
        message: 'No expired orders found',
        processedCount: 0
      })
    }
    
    const results = []
    
    // Procesar cada orden expirada
    for (const order of expiredOrders) {
      try {
        console.log(`Processing expired order ${order.id}`)
        
        // Actualizar estado a cancelado
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            payment_status: 'failed', // También marcar pago como fallido
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)
        
        if (updateError) {
          console.error(`Error updating order ${order.id}:`, updateError)
          results.push({
            orderId: order.id,
            success: false,
            error: updateError.message
          })
          continue
        }
        
        // Enviar email de cancelación
        try {
          let customerData = null
          let orderNumber = null
          
          if (order.shipping_address) {
            try {
              const shippingData = typeof order.shipping_address === 'string' 
                ? JSON.parse(order.shipping_address) 
                : order.shipping_address
              
              customerData = shippingData.customer_data
              orderNumber = shippingData.order_number
            } catch (e) {
              console.error('Error parsing shipping_address:', e)
            }
          }
          
          if (customerData?.email) {
            const customerName = customerData.firstName && customerData.lastName 
              ? `${customerData.firstName} ${customerData.lastName}`
              : customerData.firstName || customerData.email
            
            const finalOrderNumber = orderNumber || `PG-${order.id}`
            
            await sendOrderStatusEmail(
              'cancelled',
              customerData.email,
              finalOrderNumber,
              customerName
            )
            
            console.log(`Cancellation email sent for order ${order.id}`)

            // Enviar notificación al admin
            try {
              await sendOrderStatusEmail(
                'cancelled',
                'contacto@petgourmet.mx',
                finalOrderNumber,
                `Admin - Orden auto-cancelada: ${customerName}`
              )
              console.log(`Admin notification sent for auto-cancelled order ${order.id}`)
            } catch (adminError) {
              console.error(`Error sending admin notification for order ${order.id}:`, adminError)
            }
          }
        } catch (emailError) {
          console.error(`Error sending email for order ${order.id}:`, emailError)
          // No fallar por errores de email
        }
        
        results.push({
          orderId: order.id,
          success: true,
          message: 'Order cancelled and email sent'
        })
        
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError)
        results.push({
          orderId: order.id,
          success: false,
          error: orderError instanceof Error ? orderError.message : 'Unknown error'
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length
    
    console.log(`Auto-cancellation complete: ${successCount} success, ${errorCount} errors`)
    
    return NextResponse.json({
      message: 'Auto-cancellation process completed',
      processedCount: expiredOrders.length,
      successCount,
      errorCount,
      results
    })
    
  } catch (error) {
    console.error('Error in auto-cancel-orders:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint para verificar cuántas órdenes serían canceladas
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('id, created_at, total, customer_name')
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .lt('created_at', threeDaysAgo.toISOString())
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      expiredOrdersCount: expiredOrders?.length || 0,
      cutoffDate: threeDaysAgo.toISOString(),
      orders: expiredOrders || []
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
