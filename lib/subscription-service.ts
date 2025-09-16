import { createClient } from "@/lib/supabase/client"
import { 
  validateEnvironmentVariables,
  logValidationErrors,
  type ValidationResult
} from './checkout-validators'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

export interface SubscriptionPayment {
  subscriptionId: string
  amount: number
  paymentMethodId: string
  customerEmail: string
  description: string
}

export class SubscriptionService {
  private supabase = createClient()
  private isValidEnvironment: boolean

  constructor() {
    // Validar variables de entorno al inicializar
    const envValidation = validateEnvironmentVariables()
    this.isValidEnvironment = envValidation.isValid
    
    if (!this.isValidEnvironment) {
      console.error('❌ Error en configuración del entorno:')
      logValidationErrors('SubscriptionService', envValidation)
    }
  }

  async processRecurringPayment(payment: SubscriptionPayment) {
    console.log(`🔄 Procesando pago recurrente para suscripción: ${payment.subscriptionId}`)
    
    // Verificar configuración del entorno
    if (!this.isValidEnvironment) {
      throw new Error('Configuración del entorno inválida para procesar pagos')
    }
    
    // Validar parámetros de entrada
    if (!payment.subscriptionId || typeof payment.subscriptionId !== 'string') {
      throw new Error('ID de suscripción inválido')
    }
    
    if (!payment || typeof payment !== 'object') {
      throw new Error('Datos de pago inválidos')
    }
    
    try {
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
      .from("unified_subscriptions")
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

  // Función para calcular la próxima fecha de facturación según el período
  calculateNextBillingDate(frequency: string, currentDate: Date = new Date()): Date {
    const nextDate = new Date(currentDate)

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
        // Por defecto, mensual
        nextDate.setMonth(nextDate.getMonth() + 1)
    }

    return nextDate
  }

  // Función para obtener el descuento según el período y producto
  async getDiscountForPeriod(productId: number, frequency: string): Promise<number> {
    try {
      const { data: product, error } = await this.supabase
        .from("products")
        .select("weekly_discount, biweekly_discount, monthly_discount, quarterly_discount, annual_discount")
        .eq("id", productId)
        .single()

      if (error || !product) {
        // Si no se encuentra el producto, retornar 0
        console.error("Error al obtener producto para descuento:", error)
        return 0
      }

      switch (frequency) {
        case "weekly":
          return product.weekly_discount || 0
        case "biweekly":
          return product.biweekly_discount || 0
        case "monthly":
          return product.monthly_discount || 0
        case "quarterly":
          return product.quarterly_discount || 0
        case "annual":
          return product.annual_discount || 0
        default:
          return 0
      }
    } catch (error) {
      console.error("Error al obtener descuento:", error)
      return 0
    }
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
    // Implementar 3D Secure real con MercadoPago
    // Esta funcionalidad depende de la configuración específica de MercadoPago
    // y puede requerir integración adicional con el frontend

    return { success: true, secure: false }
  }
}

export const subscriptionService = new SubscriptionService()
