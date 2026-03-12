import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendOrderStatusEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriptionId, newStatus, sendEmail = true } = body

    if (!subscriptionId || !newStatus) {
      return NextResponse.json({
        error: 'subscriptionId and newStatus are required'
      }, { status: 400 })
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Obtener la suscripción actual
    const { data: subscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      console.error('Subscription not found:', fetchError)
      return NextResponse.json({
        error: 'Subscription not found'
      }, { status: 404 })
    }

    // Determinar el estado actual del pedido
    const currentOrderStatus = subscription.order_status || subscription.metadata?.order_status || 'pending'
    if (currentOrderStatus === newStatus) {
      return NextResponse.json({
        message: 'Subscription already has this order status',
        subscription
      })
    }

    // Actualizar el estado - usar metadata.order_status (compatible sin columna nueva)
    const updatedMetadata = { ...(subscription.metadata || {}), order_status: newStatus }
    
    // Intentar actualizar order_status como columna directa, si falla solo usar metadata
    const updateData: Record<string, any> = {
      metadata: updatedMetadata,
      updated_at: new Date().toISOString()
    }

    // Intentar incluir order_status directo (si la columna existe, funciona; si no, Supabase lo ignora con el catch)
    try {
      const { data: testUpdate, error: testError } = await supabase
        .from('unified_subscriptions')
        .update({ ...updateData, order_status: newStatus })
        .eq('id', subscriptionId)
        .select()
        .single()

      if (testError) {
        // Si falla por columna inexistente, actualizar solo metadata
        const { error: fallbackError } = await supabase
          .from('unified_subscriptions')
          .update(updateData)
          .eq('id', subscriptionId)

        if (fallbackError) {
          console.error('Error updating subscription:', fallbackError)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }
      }
    } catch {
      // Fallback: solo actualizamos metadata
      const { error: fallbackError } = await supabase
        .from('unified_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)

      if (fallbackError) {
        console.error('Error updating subscription (fallback):', fallbackError)
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }
    }

    console.log(`✅ Subscription ${subscriptionId} order_status updated to: ${newStatus}`)

    // Enviar email de notificación al cliente
    if (sendEmail) {
      try {
        const customerEmail = subscription.customer_email || subscription.customer_data?.email || subscription.user_profile?.email
        const customerName = subscription.customer_name || subscription.customer_data?.firstName 
          ? `${subscription.customer_data?.firstName || ''} ${subscription.customer_data?.lastName || ''}`.trim()
          : 'Cliente'
        
        let shippingInfo = null
        if (subscription.shipping_address) {
          shippingInfo = typeof subscription.shipping_address === 'string'
            ? JSON.parse(subscription.shipping_address)
            : subscription.shipping_address
          shippingInfo = shippingInfo.shipping || shippingInfo
        }

        if (customerEmail) {
          const orderNumber = `SUB-${subscription.id}`

          const orderDataForEmail = {
            id: orderNumber,
            status: newStatus,
            total: subscription.transaction_amount || subscription.discounted_price || 0,
            products: (subscription.cart_items || []).map((item: any) => ({
              name: item.product_name || item.name || subscription.product_name,
              image: item.image || subscription.product_image,
              quantity: item.quantity || 1,
              price: item.price || subscription.discounted_price || 0,
              size: item.size || subscription.size,
            })),
            shipping_address: {
              full_name: customerName,
              email: customerEmail,
              address_line_1: shippingInfo?.address || '',
              city: shippingInfo?.city || '',
              state: shippingInfo?.state || '',
              postal_code: shippingInfo?.postalCode || '',
              phone: subscription.customer_phone || subscription.customer_data?.phone || ''
            },
            customer_name: customerName,
            created_at: subscription.created_at
          }

          await sendOrderStatusEmail(
            newStatus as 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded',
            customerEmail,
            orderDataForEmail
          )

          console.log(`✉️ Email sent to ${customerEmail} for status: ${newStatus}`)

          // Enviar notificación al admin
          try {
            const adminOrderData = {
              ...orderDataForEmail,
              customer_info: {
                name: customerName,
                email: customerEmail,
                phone: subscription.customer_phone || subscription.customer_data?.phone || 'No proporcionado'
              }
            }

            await sendOrderStatusEmail(
              newStatus as 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded',
              'contacto@petgourmet.mx',
              adminOrderData
            )

            console.log(`✉️ Admin email sent for subscription ${subscriptionId} status: ${newStatus}`)
          } catch (adminEmailError) {
            console.error('Error sending admin notification:', adminEmailError)
          }
        }
      } catch (emailError) {
        console.error('Error sending subscription status email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Subscription order status updated to ${newStatus}`,
      newStatus
    })

  } catch (error: any) {
    console.error('Error in update-subscription-order-status:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
