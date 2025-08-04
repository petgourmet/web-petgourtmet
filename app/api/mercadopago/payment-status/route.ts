import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const paymentId = url.searchParams.get("payment_id")
    const status = url.searchParams.get("status")
    const orderId = url.searchParams.get("order_id") || url.searchParams.get("external_reference")
    const collectionId = url.searchParams.get("collection_id")
    const collectionStatus = url.searchParams.get("collection_status")
    const paymentType = url.searchParams.get("payment_type")
    const merchantOrderId = url.searchParams.get("merchant_order_id")

    console.log('Payment status request params:', {
      paymentId,
      status,
      orderId,
      collectionId,
      collectionStatus,
      paymentType,
      merchantOrderId
    })

    if (!paymentId || !status) {
      return NextResponse.json({ error: "Missing required parameters: payment_id and status" }, { status: 400 })
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

    // Determinar el estado de la orden basado en el estado del pago
    let orderStatus = "pending"
    let paymentStatus = paymentData.status
    let paymentMethod = "mercadopago"

    if (paymentData.status === "approved") {
      orderStatus = "processing"
      paymentStatus = "paid"
    } else if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
      orderStatus = "cancelled"
      paymentStatus = "failed"
    } else if (paymentData.status === "pending") {
      orderStatus = "pending"
      paymentStatus = "pending"
    }

    // Determinar el método de pago
    if (paymentType) {
      switch (paymentType) {
        case 'credit_card':
          paymentMethod = 'tarjeta_credito'
          break
        case 'debit_card':
          paymentMethod = 'tarjeta_debito'
          break
        case 'bank_transfer':
          paymentMethod = 'transferencia'
          break
        case 'cash':
          paymentMethod = 'efectivo'
          break
        default:
          paymentMethod = paymentType
      }
    }

    // Preparar datos para actualizar con todos los metadatos de MercadoPago
    const updateData = {
      payment_status: paymentStatus,
      status: orderStatus,
      mercadopago_payment_id: paymentId,
      payment_method: paymentMethod,
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
      collection_id: collectionId,
      merchant_order_id: merchantOrderId,
      external_reference: searchParams.get('external_reference'),
       payment_type: searchParams.get('payment_type'),
       site_id: searchParams.get('site_id'),
       processing_mode: searchParams.get('processing_mode'),
       merchant_account_id: searchParams.get('merchant_account_id')
    }

    console.log('Updating order with data:', updateData)

    // Actualizar el estado del pedido en la base de datos
    let updateResult
    if (orderId) {
      updateResult = await supabaseAdmin
        ?.from("orders")
        .update(updateData)
        .eq("id", orderId)
    } else {
      // Si no tenemos orderId, buscar por payment_intent_id o mercadopago_payment_id
      updateResult = await supabaseAdmin
        ?.from("orders")
        .update(updateData)
        .eq("mercadopago_payment_id", paymentId)
    }

    const { error: updateError } = updateResult || { error: new Error("Failed to update order") }

    if (updateError) {
      console.error("Error updating order:", updateError)
      return NextResponse.json({ error: "Failed to update order", details: updateError.message }, { status: 500 })
    }

    console.log('Order updated successfully')

    return NextResponse.json({
      success: true,
      paymentStatus: paymentData.status,
      orderStatus: orderStatus,
      paymentMethod: paymentMethod,
      paymentData: {
        id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        payment_method_id: paymentData.payment_method_id,
        payment_type_id: paymentData.payment_type_id,
        transaction_amount: paymentData.transaction_amount,
        currency_id: paymentData.currency_id,
        date_created: paymentData.date_created,
        date_approved: paymentData.date_approved
      }
    })
  } catch (error) {
    console.error("Error in payment-status route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
