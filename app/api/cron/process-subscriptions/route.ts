import { NextResponse } from "next/server"
import { subscriptionService } from "@/lib/subscription-service"

const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

export async function GET() {
  try {
    console.log("🔄 Iniciando procesamiento de suscripciones...")

    if (IS_TEST_MODE) {
      console.log("🧪 MODO PRUEBA: Simulando procesamiento de suscripciones")
    }

    // Obtener suscripciones que necesitan ser cobradas
    const subscriptionsDue = await subscriptionService.getSubscriptionsDueForBilling()

    console.log(`📋 Encontradas ${subscriptionsDue.length} suscripciones para procesar`)

    const results = []

    for (const subscription of subscriptionsDue) {
      try {
        const paymentResult = await subscriptionService.processRecurringPayment({
          subscriptionId: subscription.id,
          amount: subscription.amount,
          paymentMethodId: subscription.user_payment_methods.payment_token,
          customerEmail: subscription.user_payment_methods.cardholder_name, // En producción usar email real
          description: `Suscripción ${subscription.frequency} - ${subscription.product_name}`,
        })

        results.push({
          subscriptionId: subscription.id,
          success: paymentResult.success,
          paymentId: paymentResult.paymentId,
          amount: paymentResult.amount,
        })

        console.log(`✅ Suscripción ${subscription.id} procesada exitosamente`)
      } catch (error) {
        console.error(`❌ Error al procesar suscripción ${subscription.id}:`, error)
        results.push({
          subscriptionId: subscription.id,
          success: false,
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }

    return NextResponse.json({
      success: true,
      testMode: IS_TEST_MODE,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Error en procesamiento de suscripciones:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
