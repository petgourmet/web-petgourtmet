import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendOrderStatusEmail } from "@/lib/email-service"
import { resolveSubscriptionShipping, resolveSubscriptionProducts, resolveCustomerEmail, resolveCustomerName } from "@/lib/admin-email-helpers"

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

    // Actualizar el estado en columna order_status y en metadata
    const updatedMetadata = { ...(subscription.metadata || {}), order_status: newStatus }
    
    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        order_status: newStatus,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    console.log(`✅ Subscription ${subscriptionId} order_status updated to: ${newStatus}`)

    // Enviar email de notificación al cliente
    if (sendEmail) {
      try {
        const customerEmail = resolveCustomerEmail(subscription)
        const customerName = resolveCustomerName(subscription)

        let shippingInfo = null
        if (subscription.shipping_address) {
          shippingInfo = typeof subscription.shipping_address === 'string'
            ? JSON.parse(subscription.shipping_address)
            : subscription.shipping_address
          shippingInfo = shippingInfo.shipping || shippingInfo
        }

        if (customerEmail) {
          const orderNumber = `SUB-${subscription.id}`
          const resolvedShipping = resolveSubscriptionShipping(subscription)
          const products = resolveSubscriptionProducts(subscription)
          const orderTotal = Number(subscription.transaction_amount || subscription.discounted_price || subscription.base_price || 0)

          const orderDataForEmail = {
            id: orderNumber,
            status: newStatus,
            total: orderTotal,
            shipping_cost: resolvedShipping,
            products,
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
