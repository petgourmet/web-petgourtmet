import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import crypto from 'crypto'
import { 
  validateWebhookSignature,
  checkRateLimit,
  logValidationErrors
} from "@/lib/checkout-validators"

// Función para validar la firma del webhook (ahora usa el validador centralizado)
function validateWebhookSignatureLocal(payload: string, signature: string): boolean {
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
  return validateWebhookSignature(payload, signature, webhookSecret)
}

// Función para actualizar historial de suscripciones
async function updateSubscriptionBilling(paymentData: any) {
  try {
    // Buscar la suscripción relacionada
    let subscriptionId = paymentData.metadata?.subscription_id
    
    if (!subscriptionId && paymentData.external_reference) {
      // Intentar encontrar la suscripción por external_reference
      const { data: subscription } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .eq('id', paymentData.external_reference)
        .single()
      
      subscriptionId = subscription?.id
    }

    if (!subscriptionId) {
      console.warn(`⚠️ No se pudo encontrar suscripción para el pago ${paymentData.id}`)
      return false
    }

    // Verificar si ya existe un registro para este pago
    const { data: existingRecord } = await supabaseAdmin
      .from('subscription_billing_history')
      .select('id')
      .eq('mercadopago_payment_id', paymentData.id.toString())
      .single()

    const billingData = {
      subscription_id: subscriptionId,
      billing_date: paymentData.date_created,
      amount: paymentData.transaction_amount,
      status: paymentData.status,
      payment_method: paymentData.payment_method_id,
      mercadopago_payment_id: paymentData.id.toString(),
      payment_details: {
        status_detail: paymentData.status_detail,
        currency_id: paymentData.currency_id,
        payment_type_id: paymentData.payment_type_id,
        date_approved: paymentData.date_approved,
        payer_email: paymentData.payer?.email
      }
    }

    if (existingRecord) {
      // Actualizar registro existente
      const { error } = await supabaseAdmin
        .from('subscription_billing_history')
        .update(billingData)
        .eq('id', existingRecord.id)

      if (error) {
        console.error('❌ Error al actualizar historial de suscripción:', error)
        return false
      } else {
        console.log(`✅ Historial de suscripción actualizado para pago ${paymentData.id}`)
      }
    } else {
      // Crear nuevo registro
      const { error } = await supabaseAdmin
        .from('subscription_billing_history')
        .insert(billingData)

      if (error) {
        console.error('❌ Error al crear historial de suscripción:', error)
        return false
      } else {
        console.log(`✅ Nuevo historial de suscripción creado para pago ${paymentData.id}`)
      }
    }

    // Actualizar la fecha de último cobro en la suscripción si el pago fue aprobado
    if (paymentData.status === 'approved' || paymentData.status === 'paid') {
      const { error: subscriptionError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ 
          last_billing_date: paymentData.date_created,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

      if (subscriptionError) {
        console.error('❌ Error al actualizar suscripción:', subscriptionError)
        return false
      } else {
        console.log(`✅ Suscripción ${subscriptionId} actualizada con último cobro`)
      }
    }

    return true
  } catch (error) {
    console.error('💥 Error al procesar suscripción:', error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    console.log('🔔 Webhook de MercadoPago recibido')
    
    // Rate limiting para webhooks
    const clientIP = request.headers.get('x-forwarded-for') || 'webhook'
    if (!checkRateLimit(`webhook_${clientIP}`, 50, 60000)) {
      console.log(`Rate limit exceeded for webhook IP: ${clientIP}`)
      return NextResponse.json({ error: "Too many webhook requests" }, { status: 429 })
    }
    
    const bodyText = await request.text()
    const signature = request.headers.get('x-signature') || ''
    
    // Validar firma del webhook
    if (!validateWebhookSignatureLocal(bodyText, signature)) {
      console.error('❌ Firma del webhook inválida')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(bodyText)
    
    console.log('📋 Datos del webhook:', {
      id: body.id,
      type: body.type,
      action: body.action,
      data_id: body.data?.id,
      live_mode: body.live_mode
    })

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
    
    // Logging detallado del pago
    console.log('💳 Detalles completos del pago:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      payment_method: paymentData.payment_method_id,
      payment_type: paymentData.payment_type_id,
      external_reference: paymentData.external_reference,
      date_created: paymentData.date_created,
      date_approved: paymentData.date_approved,
      payer_email: paymentData.payer?.email,
      metadata: paymentData.metadata
    })

    // Intentar procesar como suscripción primero
    const subscriptionProcessed = await updateSubscriptionBilling(paymentData)
    
    if (subscriptionProcessed) {
      console.log('✅ Pago procesado como suscripción exitosamente')
      return NextResponse.json({ 
        success: true, 
        type: 'subscription',
        payment_id: paymentData.id,
        status: paymentData.status
      })
    }
    
    console.log('🛒 Procesando como pedido regular...')

    // Buscar el pedido por el ID de referencia externa o payment_intent_id
    let orderData = null
    let orderError = null

    if (paymentData.external_reference) {
      // Buscar por external_reference (que debería ser el ID de la orden)
      const result = await supabaseAdmin
        ?.from("orders")
        .select("*")
        .eq("id", paymentData.external_reference)
        .single()

      orderData = result?.data
      orderError = result?.error
    }

    // Si no encontramos por external_reference, intentamos por payment_intent_id
    if ((!orderData || orderError) && paymentData.preference_id) {
      const result = await supabaseAdmin
        ?.from("orders")
        .select("*")
        .ilike("payment_intent_id", `%${paymentData.preference_id}%`)
        .single()

      orderData = result?.data
      orderError = result?.error
    }

    if (orderError || !orderData) {
      console.error("Error finding order:", orderError)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Actualizar el estado del pedido según el tipo de pago y estado
    let newOrderStatus = "pending"
    let paymentStatus = paymentData.status
    
    // Determinar el estado del pedido basado en el estado del pago
    if (paymentData.status === "approved") {
      newOrderStatus = "processing"
      paymentStatus = "paid"
    } else if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
      newOrderStatus = "cancelled"
      paymentStatus = "failed"
    } else if (paymentData.status === "pending") {
      // Para pagos en efectivo o transferencia, mantener como pendiente
      newOrderStatus = "pending"
      paymentStatus = "pending"
    }

    // Información adicional del método de pago
    let paymentMethodInfo = paymentData.payment_method_id || "mercadopago"
    if (paymentData.payment_type_id === "ticket" || paymentData.payment_type_id === "bank_transfer") {
      paymentMethodInfo = "efectivo"
    }

    const updateData: any = {
      payment_status: paymentStatus,
      status: newOrderStatus,
      mercadopago_payment_id: paymentId,
      payment_method: paymentMethodInfo,
      payment_id: paymentId,
    }

    // Si el pago es aprobado, también actualizar la fecha de confirmación
    if (paymentStatus === "paid") {
      updateData.confirmed_at = new Date().toISOString()
    }

    const { error: updateError } = (await supabaseAdmin
      ?.from("orders")
      .update(updateData)
      .eq("id", orderData.id)) || { error: new Error("Failed to update order") }

    if (updateError) {
      console.error("Error updating order:", updateError)
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    }

    console.log('✅ Pedido actualizado correctamente:', {
      order_id: orderData.id,
      payment_id: paymentId,
      new_status: newOrderStatus,
      payment_status: paymentStatus,
      payment_method: paymentMethodInfo
    })
    
    return NextResponse.json({ 
      success: true, 
      type: 'order',
      order_id: orderData.id,
      payment_id: paymentId,
      status: newOrderStatus
    })
  } catch (error) {
    console.error('💥 Error crítico en webhook de MercadoPago:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Endpoint GET para verificar que el webhook está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'MercadoPago Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    version: '2.0 - Enhanced with subscription support'
  })
}
