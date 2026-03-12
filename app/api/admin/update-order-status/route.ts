import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendOrderStatusEmail } from "@/lib/email-service"
import { resolveOrderShipping } from "@/lib/admin-email-helpers"

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

    const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Obtener la orden actual con sus items
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id, product_id, product_name, product_image, quantity, price, size
        )
      `)
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
          const orderItems = (currentOrder.order_items || []).map((item: any) => ({
            name: item.product_name,
            image: item.product_image,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
          }))

          const resolvedShipping = resolveOrderShipping(currentOrder, orderItems)

          const orderDataForEmail = {
            id: orderNumber,
            status: newStatus,
            total: currentOrder.total,
            shipping_cost: resolvedShipping,
            products: orderItems,
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
            newStatus as 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded',
            customerEmail,
            orderDataForEmail
          )

          console.log('Email result:', emailResult)

          // Enviar notificación al admin
          try {
            const adminOrderData = {
              ...orderDataForEmail,
              customer_info: {
                name: customerName || 'Cliente',
                email: customerEmail,
                phone: customerPhone || 'No proporcionado'
              }
            }

            const adminEmailResult = await sendOrderStatusEmail(
              newStatus as 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded',
              'contacto@petgourmet.mx',
              adminOrderData
            )

            console.log('Admin email result:', adminEmailResult)
          } catch (adminEmailError) {
            console.error('Error sending admin notification:', adminEmailError)
          }
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
