// lib/mercadopago-service.ts

import { MercadoPagoConfig, Preference, Payment } from "mercadopago"

class MercadoPagoService {
  private config: MercadoPagoConfig

  constructor(accessToken: string) {
    this.config = new MercadoPagoConfig({ accessToken })
  }

  async createPreference(items: any[], payer: any, notification_url: string, back_urls: any): Promise<any> {
    const preference = new Preference(this.config)

    const preferenceData = {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "MXN", // Ensure currency is MXN
      })),
      payer: payer,
      notification_url: notification_url,
      back_urls: back_urls,
      auto_return: "approved",
    }

    try {
      const result = await preference.create({ body: preferenceData })
      return result
    } catch (error) {
      console.error("Error creating preference:", error)
      throw error
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      const payment = await Payment.get({ id: paymentId }, this.config)
      return payment
    } catch (error) {
      console.error("Error getting payment:", error)
      throw error
    }
  }
}

export default MercadoPagoService
