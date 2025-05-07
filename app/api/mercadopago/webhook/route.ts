import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Verificar si es una notificación de pago
    if (body.type !== "payment") {
      return NextResponse.json({ message: "Non-payment notification received" })
    }

    // Obtener el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      console.error("Mercado Pago access token not configured")
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

    // Obtener los detalles del pago
    const paymentId = body.data.id
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error fetching payment details:", errorData)
      return NextResponse.json({ error: "Failed to fetch payment details" }, { status: response.status })
    }

    const paymentData = await response.json()

    // Buscar el pedido por el ID de preferencia
    const { data: orderData, error: orderError } = (await supabaseAdmin
      ?.from("orders")
      .select("*")
      .eq("mercadopago_preference_id", paymentData.preference_id)
      .single()) || { data: null, error: new Error("Failed to find order") }

    if (orderError || !orderData) {
      console.error("Error finding order:", orderError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Actualizar el estado del pedido
    let newOrderStatus = "pending"
    if (paymentData.status === "approved") {
      newOrderStatus = "processing"
    } else if (paymentData.status === "rejected") {
      newOrderStatus = "cancelled"
    }

    const { error: updateError } = (await supabaseAdmin
      ?.from("orders")
      .update({
        payment_status: paymentData.status,
        status: newOrderStatus,
        mercadopago_payment_id: paymentId,
      })
      .eq("id", orderData.id)) || { error: new Error("Failed to update order") }

    if (updateError) {
      console.error("Error updating order:", updateError)
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in webhook route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
