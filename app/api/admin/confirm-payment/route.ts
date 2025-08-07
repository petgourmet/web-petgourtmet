import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const { orderId, paymentMethod, notes, adminId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: "ID de orden requerido" }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 })
    }

    // Verificar que la orden existe y está pendiente
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({ error: "Esta orden ya ha sido pagada" }, { status: 400 })
    }

    // Actualizar el estado de la orden
    const updateData = {
      payment_status: "paid",
      status: "processing",
      payment_method: paymentMethod || "efectivo",
      confirmed_at: new Date().toISOString(),
      admin_notes: notes || "",
      confirmed_by_admin: adminId || null,
      updated_at: new Date().toISOString()
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating order:", updateError)
      return NextResponse.json({ error: "Error al confirmar el pago" }, { status: 500 })
    }

    // Si la orden incluye una suscripción, activarla
    try {
      let orderNotes = null
      try {
        orderNotes = order.notes ? JSON.parse(order.notes) : null
      } catch (e) {
        console.error("Error parsing order notes:", e)
      }

      if (orderNotes && orderNotes.frequency && orderNotes.frequency !== "none") {
        // Solo crear suscripción si tiene un mercadopago_subscription_id válido
        // Las suscripciones deben estar conectadas a los webhooks de Mercado Pago
        if (orderNotes.mercadopago_subscription_id) {
          const subscriptionData = {
            user_id: order.user_id,
            order_id: orderId,
            product_id: orderNotes.productId || null,
            product_name: orderNotes.productName || "Producto de suscripción",
            subscription_type: orderNotes.frequency,
            quantity: orderNotes.quantity || 1,
            base_price: order.subtotal,
            discounted_price: order.total,
            status: "active",
            mercadopago_subscription_id: orderNotes.mercadopago_subscription_id,
            next_billing_date: calculateNextBillingDate(orderNotes.frequency),
            created_at: new Date().toISOString()
          }

          const { error: subscriptionError } = await supabaseAdmin
            .from("user_subscriptions")
            .insert(subscriptionData)

          if (subscriptionError) {
            console.error("Error creating subscription:", subscriptionError)
            // No fallar la confirmación del pago por esto, solo loggear
          }
        } else {
          console.log("Skipping subscription creation - no mercadopago_subscription_id provided")
        }
      }
    } catch (subscriptionError) {
      console.error("Error processing subscription:", subscriptionError)
      // Continuar aunque falle la suscripción
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Pago confirmado exitosamente"
    })

  } catch (error) {
    console.error("Error confirming payment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function calculateNextBillingDate(frequency: string): string {
  const nextDate = new Date()

  switch (frequency) {
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case "biweekly":
      nextDate.setDate(nextDate.getDate() + 14)
      break
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    case "annual":
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    default:
      nextDate.setMonth(nextDate.getMonth() + 1)
  }

  return nextDate.toISOString().split('T')[0]
}
