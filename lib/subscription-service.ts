import { createClient } from "@/lib/supabase/client"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

export interface SubscriptionPayment {
  subscriptionId: string
  amount: number
  paymentMethodId: string
  customerEmail: string
  description: string
}

export class SubscriptionService {
  private supabase = createClient()

  async processRecurringPayment(payment: SubscriptionPayment) {
    try {
      if (IS_TEST_MODE) {
        // Simular pago en modo prueba
        console.log("🧪 MODO PRUEBA: Simulando cobro recurrente")
        return {
          success: true,
          paymentId: `test_payment_${Date.now()}`,
          status: "approved",
          amount: payment.amount,
        }
      }

      // Realizar cobro real con MercadoPago
      const paymentResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          transaction_amount: payment.amount,
          description: payment.description,
          payment_method_id: payment.paymentMethodId,
          payer: {
            email: payment.customerEmail,
          },
          external_reference: payment.subscriptionId,
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook-subscription`,
        }),
      })

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok) {
        throw new Error(`Error en pago: ${paymentData.message}`)
      }

      return {
        success: paymentData.status === "approved",
        paymentId: paymentData.id,
        status: paymentData.status,
        amount: paymentData.transaction_amount,
        statusDetail: paymentData.status_detail,
      }
    } catch (error) {
      console.error("Error al procesar pago recurrente:", error)
      throw error
    }
  }

  async getSubscriptionsDueForBilling() {
    const today = new Date().toISOString().split("T")[0]

    const { data: subscriptions, error } = await this.supabase
      .from("user_subscriptions")
      .select(
        `
        *,
        user_payment_methods!inner(*)
      `,
      )
      .eq("status", "active")
      .lte("next_billing_date", today)

    if (error) {
      console.error("Error al obtener suscripciones:", error)
      return []
    }

    return subscriptions || []
  }

  async validateCard(cardNumber: string, expiryDate: string, cvv: string): Promise<boolean> {
    // Validación de número de tarjeta usando algoritmo de Luhn
    const luhnCheck = (num: string) => {
      let sum = 0
      let isEven = false
      for (let i = num.length - 1; i >= 0; i--) {
        let digit = Number.parseInt(num.charAt(i), 10)
        if (isEven) {
          digit *= 2
          if (digit > 9) {
            digit -= 9
          }
        }
        sum += digit
        isEven = !isEven
      }
      return sum % 10 === 0
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, "")

    // Validar formato básico
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      return false
    }

    // Validar con algoritmo de Luhn
    if (!luhnCheck(cleanCardNumber)) {
      return false
    }

    // Validar fecha de expiración
    const [month, year] = expiryDate.split("/")
    const expDate = new Date(Number.parseInt(`20${year}`), Number.parseInt(month) - 1)
    const now = new Date()

    if (expDate <= now) {
      return false
    }

    // Validar CVV
    if (!/^\d{3,4}$/.test(cvv)) {
      return false
    }

    return true
  }

  async implement3DSecure(paymentData: any) {
    if (IS_TEST_MODE) {
      console.log("🧪 MODO PRUEBA: Simulando 3D Secure")
      return { success: true, secure: true }
    }

    // Implementar 3D Secure real con MercadoPago
    // Esta funcionalidad depende de la configuración específica de MercadoPago
    // y puede requerir integración adicional con el frontend

    return { success: true, secure: false }
  }
}

export const subscriptionService = new SubscriptionService()
