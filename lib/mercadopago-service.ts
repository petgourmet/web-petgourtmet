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
  async createSubscriptionPlan(planData: any): Promise<any> {
    const preapprovalPlan = new PreApprovalPlan(this.config)
    try {
      const result = await preapprovalPlan.create({ body: planData })
      return result
    } catch (error) {
      console.error("Error creating subscription plan:", error)
      throw error
    }
  }

  // Crear suscripción basada en un plan o sin plan
  async createSubscription(subscriptionData: {
    preapproval_plan_id?: string,
    reason?: string,
    external_reference?: string,
    payer_email: string,
    card_token_id?: string,
    back_url?: string,
    status?: "pending" | "authorized",
    auto_recurring?: {
      frequency: number,
      frequency_type: "months" | "days",
      start_date: string,
      end_date?: string,
      transaction_amount: number,
      currency_id: "MXN"
    }
  }): Promise<any> {
    const preapproval = new PreApproval(this.config)

    // Preparar datos según documentación de MercadoPago
    const requestBody: any = {
      payer_email: subscriptionData.payer_email
    }

    // Campos opcionales según documentación
    if (subscriptionData.preapproval_plan_id) {
      requestBody.preapproval_plan_id = subscriptionData.preapproval_plan_id
    }

    if (subscriptionData.reason) {
      requestBody.reason = subscriptionData.reason
    }

    if (subscriptionData.external_reference) {
      requestBody.external_reference = subscriptionData.external_reference
    }

    if (subscriptionData.card_token_id) {
      requestBody.card_token_id = subscriptionData.card_token_id
    }

    if (subscriptionData.back_url) {
      requestBody.back_url = subscriptionData.back_url
    }

    if (subscriptionData.status) {
      requestBody.status = subscriptionData.status
    }

    if (subscriptionData.auto_recurring) {
      requestBody.auto_recurring = subscriptionData.auto_recurring
    }

    try {
      console.log('📤 Enviando datos a MercadoPago:', JSON.stringify(requestBody, null, 2))
      const result = await preapproval.create({ body: requestBody })
      console.log('📥 Respuesta de MercadoPago:', JSON.stringify(result, null, 2))
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

  // NUEVO: Obtener información de una suscripción (preapproval) para extraer payer_email
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
