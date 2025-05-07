import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const paymentId = url.searchParams.get("payment_id")
    const status = url.searchParams.get("status")
    const orderId = url.searchParams.get("order_id")

    if (!paymentId || !status || !orderId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Obtener el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

    // Verificar el estado del pago en Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error verifying payment status:", errorData)
      return NextResponse.json({ error: "Failed to verify payment status" }, { status: response.status })
    }

    const paymentData = await response.json()

    // Actualizar el estado del pedido en la base de datos
    const { error: updateError } = (await supabaseAdmin
      ?.from("orders")
      .update({
        payment_status: paymentData.status,
        status: paymentData.status === "approved" ? "processing" : "pending",
        mercadopago_payment_id: paymentId,
      })
      .eq("id", orderId)) || { error: new Error("Failed to update order") }

    if (updateError) {
      console.error("Error updating order:", updateError)
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      paymentStatus: paymentData.status,
      orderStatus: paymentData.status === "approved" ? "processing" : "pending",
    })
  } catch (error) {
    console.error("Error in payment-status route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
