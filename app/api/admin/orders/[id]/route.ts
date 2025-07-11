import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json({ error: "ID de orden requerido" }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 })
    }

    // Obtener detalles de la orden
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        profiles(email, full_name, phone),
        order_items(*)
      `)
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
    }

    // Parsear datos del formulario
    let formData = null
    let subscriptionInfo = null

    try {
      if (order.notes) {
        formData = JSON.parse(order.notes)
        
        // Verificar si es una suscripción
        if (formData.frequency && formData.frequency !== "none") {
          // Buscar suscripción relacionada si existe
          const { data: subscription } = await supabaseAdmin
            .from("user_subscriptions")
            .select("*")
            .eq("order_id", orderId)
            .single()

          subscriptionInfo = {
            isSubscription: true,
            frequency: formData.frequency,
            startDate: formData.subscriptionStartDate,
            subscription: subscription
          }
        }
      }
    } catch (e) {
      console.error("Error parsing order data:", e)
    }

    // Formatear respuesta
    const response = {
      order: {
        ...order,
        formData,
        subscriptionInfo,
        customerInfo: {
          name: formData?.firstName && formData?.lastName 
            ? `${formData.firstName} ${formData.lastName}`
            : order.customer_name || order.profiles?.full_name || "No especificado",
          email: formData?.email || order.profiles?.email || "No especificado",
          phone: formData?.phone || order.customer_phone || order.profiles?.phone || "No especificado",
          address: order.shipping_address || formData?.address || "No especificada"
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error fetching order details:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status, payment_status, notes } = await request.json()
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json({ error: "ID de orden requerido" }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (payment_status) updateData.payment_status = payment_status
    if (notes) updateData.admin_notes = notes

    // Si el pago se marca como pagado, actualizar fecha de confirmación
    if (payment_status === "paid") {
      updateData.confirmed_at = new Date().toISOString()
    }

    const { data: updatedOrder, error } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single()

    if (error) {
      console.error("Error updating order:", error)
      return NextResponse.json({ error: "Error al actualizar orden" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      order: updatedOrder,
      message: "Orden actualizada exitosamente"
    })

  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
