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
        // Extraer información del cliente y orden
        let customerEmail = currentOrder.customer_email
        let customerName = currentOrder.customer_name
        let customerPhone = currentOrder.customer_phone
        let shippingInfo = null
        
        // Intentar extraer más detalles desde shipping_address
        if (currentOrder.shipping_address) {
          try {
            const shippingData = typeof currentOrder.shipping_address === 'string' 
              ? JSON.parse(currentOrder.shipping_address) 
              : currentOrder.shipping_address
            
            // Extraer datos del cliente
            if (shippingData.customer) {
              customerEmail = shippingData.customer.email || customerEmail
              customerName = shippingData.customer.name || customerName
              customerPhone = shippingData.customer.phone || customerPhone
            }
            
            // Extraer dirección de envío
            if (shippingData.shipping) {
              shippingInfo = shippingData.shipping
            }
          } catch (e) {
            console.error('Error parsing shipping_address:', e)
          }
        }
        
        if (customerEmail) {
          const orderNumber = `PG-${currentOrder.id}`
          
          console.log('Sending email:', { 
            status: newStatus, 
            email: customerEmail, 
            name: customerName, 
            orderNumber 
          })
          
          // Preparar datos completos de la orden para el email
          const orderDataForEmail = {
            id: orderNumber,
            status: newStatus,
            total: currentOrder.total,
            products: currentOrder.products || [],
            shipping_address: {
              full_name: customerName || 'Cliente',
              email: customerEmail,
              address_line_1: shippingInfo?.address || '',
              city: shippingInfo?.city || '',
              state: shippingInfo?.state || '',
              postal_code: shippingInfo?.postalCode || '',
              phone: customerPhone || ''
            },
            customer_name: customerName || 'Cliente',
            created_at: currentOrder.created_at
          }
          
          const emailResult = await sendOrderStatusEmail(
            newStatus as 'pending' | 'processing' | 'completed' | 'cancelled',
            customerEmail,
            orderDataForEmail
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
