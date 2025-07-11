// lib/mercadopago-service.ts

import { MercadoPagoConfig, Preference, Payment, PreApprovalPlan, PreApproval } from "mercadopago"

class MercadoPagoService {
  private config: MercadoPagoConfig

  constructor(accessToken: string, options?: { sandbox?: boolean }) {
    this.config = new MercadoPagoConfig({ 
      accessToken,
      options: {
        timeout: 5000,
        idempotencyKey: undefined,
      }
    })
  }

  // Crear preferencia para pagos únicos
  async createPreference(items: any[], payer: any, notification_url: string, back_urls: any, metadata?: any): Promise<any> {
    const preference = new Preference(this.config)

    const preferenceData = {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "MXN",
        description: item.description,
        picture_url: item.picture_url,
        category_id: "food_and_beverages",
      })),
      payer: {
        name: payer.name,
        surname: payer.surname,
        email: payer.email,
        phone: payer.phone ? {
          area_code: "",
          number: payer.phone.number || payer.phone,
        } : undefined,
        address: payer.address ? {
          street_name: payer.address.street_name,
          street_number: payer.address.street_number,
          zip_code: payer.address.zip_code,
        } : undefined,
      },
      notification_url: notification_url,
      back_urls: back_urls,
      auto_return: "approved",
      metadata: metadata,
      statement_descriptor: "PETGOURMET",
      binary_mode: false,
      expires: false,
    }

    try {
      const result = await preference.create({ body: preferenceData })
      return result
    } catch (error) {
      console.error("Error creating preference:", error)
      throw error
    }
  }

  // Crear plan de suscripción
  async createSubscriptionPlan(planData: {
    reason: string,
    frequency: number,
    frequency_type: "months" | "days",
    repetitions?: number,
    billing_day?: number,
    billing_day_proportional?: boolean,
    free_trial?: {
      frequency: number,
      frequency_type: "months" | "days"
    },
    transaction_amount: number,
    currency_id: "MXN",
    setup_fee?: number
  }): Promise<any> {
    const preapprovalPlan = new PreApprovalPlan(this.config)

    try {
      const result = await preapprovalPlan.create({ body: planData })
      return result
    } catch (error) {
      console.error("Error creating subscription plan:", error)
      throw error
    }
  }

  // Crear suscripción basada en un plan
  async createSubscription(subscriptionData: {
    preapproval_plan_id: string,
    reason: string,
    payer_email: string,
    card_token_id?: string,
    back_url: string,
    auto_recurring: {
      frequency: number,
      frequency_type: "months" | "days",
      start_date: string,
      end_date?: string,
      transaction_amount: number,
      currency_id: "MXN"
    }
  }): Promise<any> {
    const preapproval = new PreApproval(this.config)

    try {
      const result = await preapproval.create({ body: subscriptionData })
      return result
    } catch (error) {
      console.error("Error creating subscription:", error)
      throw error
    }
  }

  // Obtener información de un pago
  async getPayment(paymentId: string): Promise<any> {
    try {
      const payment = new Payment(this.config)
      const response = await payment.get({ id: paymentId })
      return response
    } catch (error) {
      console.error("Error getting payment:", error)
      throw error
    }
  }

  // Obtener información de una suscripción
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const preapproval = new PreApproval(this.config)
      const response = await preapproval.get({ id: subscriptionId })
      return response
    } catch (error) {
      console.error("Error getting subscription:", error)
      throw error
    }
  }

  // Cancelar una suscripción
  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      const preapproval = new PreApproval(this.config)
      const response = await preapproval.update({ 
        id: subscriptionId, 
        body: { status: "cancelled" } 
      })
      return response
    } catch (error) {
      console.error("Error cancelling subscription:", error)
      throw error
    }
  }
}

export default MercadoPagoService
