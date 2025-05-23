import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📨 Webhook recibido:", body)

    // Verificar que es una notificación de pago
    if (body.type !== "payment") {
      return NextResponse.json({ status: "ignored" })
    }

    const paymentId = body.data.id

    // Obtener detalles del pago desde MercadoPago
    let paymentData
    if (IS_TEST_MODE) {
      // Simular datos de pago en modo prueba
      paymentData = {
        id: paymentId,
        status: "approved",
        status_detail: "accredited",
        transaction_amount: 100,
        external_reference: "test_subscription_123",
        payer: {
          email: "test@example.com",
        },
        date_created: new Date().toISOString(),
      }
    } else {
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      })

      if (!paymentResponse.ok) {
        console.error("Error al obtener datos del pago")
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      paymentData = await paymentResponse.json()
    }

    // Crear cliente de Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    // Registrar el cobro en la base de datos
    const { error: billingError } = await supabase.from("subscription_billing").insert({
      subscription_id: paymentData.external_reference,
      payment_id: paymentData.id,
      amount: paymentData.transaction_amount,
      status: paymentData.status === "approved" ? "completed" : "failed",
      payment_date: paymentData.date_created,
      mercadopago_status: paymentData.status,
      mercadopago_detail: paymentData.status_detail,
      is_test: IS_TEST_MODE,
    })

    if (billingError) {
      console.error("Error al registrar facturación:", billingError)
    }

    // Actualizar estado de la suscripción si el pago falló
    if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
      const { error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .update({
          status: "payment_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentData.external_reference)

      if (subscriptionError) {
        console.error("Error al actualizar suscripción:", subscriptionError)
      }

      // Enviar notificación al usuario sobre el fallo de pago
      // TODO: Implementar envío de email
    }

    // Si el pago fue exitoso, actualizar la próxima fecha de cobro
    if (paymentData.status === "approved") {
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("frequency")
        .eq("id", paymentData.external_reference)
        .single()

      if (subscription) {
        const nextBillingDate = new Date()
        switch (subscription.frequency) {
          case "monthly":
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
            break
          case "quarterly":
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
            break
          case "yearly":
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
            break
        }

        await supabase
          .from("user_subscriptions")
          .update({
            next_billing_date: nextBillingDate.toISOString(),
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentData.external_reference)
      }
    }

    return NextResponse.json({ status: "processed" })
  } catch (error) {
    console.error("Error en webhook de suscripción:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
