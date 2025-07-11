import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Webhook recibido:", body)

    // Verificar la firma del webhook si está configurado el secret
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('x-signature')
      const requestId = request.headers.get('x-request-id')
      
      // Aquí podrías validar la firma usando el secret
      // Por ahora lo dejamos como opcional
      console.log("Webhook signature validation:", { signature, requestId })
    }

    // Verificar si es una notificación de pago
    if (body.type !== "payment" && body.type !== "preapproval") {
      return NextResponse.json({ message: "Non-payment notification received" })
    }

    // Si es un ID de prueba, simular respuesta exitosa
    const paymentId = body.data.id
    if (paymentId.toString().startsWith('test-')) {
      console.log("Webhook de prueba procesado correctamente:", paymentId)
      return NextResponse.json({ 
        message: "Test webhook processed successfully",
        paymentId: paymentId,
        status: "approved"
      })
    }

    // Obtener el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      console.error("Mercado Pago access token not configured")
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

    // Determinar la URL del endpoint según el tipo de notificación
    let apiUrl = ''
    if (body.type === "payment") {
      apiUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`
    } else if (body.type === "preapproval") {
      apiUrl = `https://api.mercadopago.com/preapproval/${paymentId}`
    }

    // Obtener los detalles del pago/suscripción
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error fetching payment/subscription details:", errorData)
      return NextResponse.json({ error: "Failed to fetch payment details" }, { status: response.status })
    }

    const paymentData = await response.json()
    console.log("Detalles del pago:", paymentData)

    // Buscar el pedido por el ID de preferencia o referencia externa
    let orderData = null
    let orderError = null

    if (paymentData.preference_id) {
      const result = await supabaseAdmin
        ?.from("orders")
        .select("*")
        .eq("mercadopago_preference_id", paymentData.preference_id)
        .single()

      orderData = result?.data
      orderError = result?.error
    }

    // Si no encontramos por preference_id, intentamos por external_reference
    if ((!orderData || orderError) && paymentData.external_reference) {
      const result = await supabaseAdmin?.from("orders").select("*").eq("id", paymentData.external_reference).single()

      orderData = result?.data
      orderError = result?.error
    }

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
        payment_method: paymentData.payment_method_id || "mercadopago",
        payment_id: paymentId,
      })
      .eq("id", orderData.id)) || { error: new Error("Failed to update order") }

    if (updateError) {
      console.error("Error updating order:", updateError)
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    }

    console.log("Pedido actualizado correctamente:", orderData.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in webhook route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
