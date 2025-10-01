// lib/mercadopago-service-mock.ts
// Mock del servicio de MercadoPago para pruebas

class MercadoPagoServiceMock {
  private accessToken: string

  constructor(accessToken: string, options?: { sandbox?: boolean }) {
    this.accessToken = accessToken
  }

  // Mock de crear preferencia para pagos únicos
  async createPreference(items: any[], payer: any, notification_url: string, back_urls: any, metadata?: any): Promise<any> {
    // Simular respuesta exitosa
    return {
      id: `mock-preference-${Date.now()}`,
      init_point: 'https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=mock-preference',
      sandbox_init_point: 'https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=mock-preference',
      items,
      payer,
      back_urls,
      metadata
    }
  }

  // Mock de crear plan de suscripción
  async createSubscriptionPlan(planData: any): Promise<any> {
    return {
      id: `mock-plan-${Date.now()}`,
      ...planData,
      status: 'active'
    }
  }

  // Mock de crear suscripción
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
    console.log('🧪 Mock: Creando suscripción con datos:', JSON.stringify(subscriptionData, null, 2))
    
    // Simular respuesta exitosa de MercadoPago
    const mockResponse = {
      id: `mock-subscription-${Date.now()}`,
      version: 1,
      application_id: 123456789,
      collector_id: 987654321,
      external_reference: subscriptionData.external_reference || `mock-ref-${Date.now()}`,
      reason: subscriptionData.reason || 'Mock subscription',
      back_url: subscriptionData.back_url || '/suscripcion',
      init_point: `https://sandbox.mercadopago.com.mx/subscriptions/checkout?preapproval_id=mock-subscription-${Date.now()}`,
      auto_recurring: subscriptionData.auto_recurring,
      payer_id: null,
      card_id: subscriptionData.card_token_id ? `mock-card-${Date.now()}` : null,
      payment_method_id: subscriptionData.card_token_id ? 'visa' : null,
      next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      date_created: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      status: subscriptionData.status || 'pending'
    }
    
    console.log('✅ Mock: Suscripción creada exitosamente:', mockResponse)
    return mockResponse
  }

  // Mock de obtener información de un pago
  async getPayment(paymentId: string): Promise<any> {
    return {
      id: paymentId,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 299,
      currency_id: 'MXN',
      date_created: new Date().toISOString(),
      date_approved: new Date().toISOString()
    }
  }

  // Mock de obtener información de una suscripción
  async getSubscription(subscriptionId: string): Promise<any> {
    return {
      id: subscriptionId,
      status: 'authorized',
      external_reference: `mock-ref-${subscriptionId}`,
      reason: 'Mock subscription',
      payer_email: 'test@example.com',
      next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      date_created: new Date().toISOString(),
      last_modified: new Date().toISOString()
    }
  }

  // Mock de cancelar una suscripción
  async cancelSubscription(subscriptionId: string): Promise<any> {
    return {
      id: subscriptionId,
      status: 'cancelled',
      date_cancelled: new Date().toISOString()
    }
  }
}

export default MercadoPagoServiceMock