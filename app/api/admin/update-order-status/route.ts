import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendOrderStatusEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPDATE ORDER STATUS ===')
    
    const body = await request.json()
    const { orderId, newStatus, sendEmail = true } = body
    
    console.log('Request:', { orderId, newStatus, sendEmail })
    
    if (!orderId || !newStatus) {
      return NextResponse.json({ 
        error: 'orderId and newStatus are required' 
      }, { status: 400 })
    }
    
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 })
    }
    
    const supabase = createServiceClient()
    
    // Obtener la orden actual
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (fetchError || !currentOrder) {
      console.error('Order not found:', fetchError)
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 })
    }
    
    console.log('Current order:', currentOrder)
    
    // Verificar si ya tiene este estado
    if (currentOrder.status === newStatus) {
      return NextResponse.json({ 
        message: 'Order already has this status',
        order: currentOrder
      })
    }
    
    // Actualizar el estado de la orden
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating order:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update order' 
      }, { status: 500 })
    }
    
    console.log('Order updated successfully:', updatedOrder)
    
    // Enviar email si está habilitado
    if (sendEmail) {
      try {
        // Extraer información del cliente del shipping_address
        let customerData = null
        let orderNumber = null
        
        if (currentOrder.shipping_address) {
          try {
            const shippingData = typeof currentOrder.shipping_address === 'string' 
              ? JSON.parse(currentOrder.shipping_address) 
              : currentOrder.shipping_address
            
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
          
          const finalOrderNumber = orderNumber || `PG-${currentOrder.id}`
          
          console.log('Sending email:', { 
            status: newStatus, 
            email: customerData.email, 
            name: customerName, 
            orderNumber: finalOrderNumber 
          })
          
          const emailResult = await sendOrderStatusEmail(
            newStatus as 'pending' | 'processing' | 'completed' | 'cancelled',
            customerData.email,
            finalOrderNumber,
            customerName
          )
          
          console.log('Email result:', emailResult)
        } else {
          console.log('No customer email found, skipping email send')
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // No fallar por errores de email
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      order: updatedOrder,
      previousStatus: currentOrder.status
    })
    
  } catch (error) {
    console.error('Error in update-order-status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
