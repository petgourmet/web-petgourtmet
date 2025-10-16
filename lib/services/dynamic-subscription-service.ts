import { createClient } from '@supabase/supabase-js'
import { logger, LogCategory } from '../logger'
import { getMercadoPagoAccessToken, isTestMode } from '../mercadopago-config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CreateDynamicSubscriptionParams {
  user_id: string
  product_id: number
  frequency: number
  frequency_type: 'days' | 'months'
  payment_method: 'pending' | 'authorized'
  customer_data: {
    email: string
    name: string
    phone?: string
    address: {
      street: string
      number: string
      city: string
      state: string
      zip_code: string
      country: string
    }
  }
  card_token?: string
  product_data: {
    name: string
    price: number
    base_price: number
    discount_percentage: number
  }
}

interface MercadoPagoPreapprovalResponse {
  id: string
  status: 'pending' | 'authorized' | 'paused' | 'cancelled'
  external_reference: string
  init_point?: string
  sandbox_init_point?: string
  next_payment_date: string
  auto_recurring: {
    frequency: number
    frequency_type: string
    transaction_amount: number
  }
  payer_id?: string
  date_created: string
}

interface SubscriptionResult {
  success: boolean
  subscription?: {
    id: string
    external_reference: string
    status: 'pending' | 'authorized' | 'active'
    init_point?: string
    next_payment_date: string
    amount: number
    mercadopago_subscription_id?: string
  }
  error?: string
}

export class DynamicSubscriptionService {
  private mercadoPagoAccessToken: string
  private isTestMode: boolean

  constructor() {
    this.mercadoPagoAccessToken = getMercadoPagoAccessToken()
    this.isTestMode = isTestMode()
    
    if (!this.mercadoPagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado')
    }
  }

  /**
   * Crea una suscripción dinámica sin plan asociado usando MercadoPago API
   */
  async createDynamicSubscription(params: CreateDynamicSubscriptionParams): Promise<SubscriptionResult> {
    const startTime = Date.now()
    
    try {
      // Generar external_reference único
      const externalReference = this.generateExternalReference(params.user_id, params.product_id)
      
      // Calcular próxima fecha de pago
      const nextPaymentDate = this.calculateNextPaymentDate(params.frequency, params.frequency_type)
      const endDate = this.calculateEndDate(nextPaymentDate)
      
      // Preparar datos para MercadoPago según documentación oficial
      // Usar email de usuario de prueba válido para modo test
      const payerEmail = this.isTestMode ? 'test_user_123456@testuser.com' : params.customer_data.email
      
      const preapprovalData = {
        reason: `Suscripción ${params.product_data.name}`,
        external_reference: externalReference,
        payer_email: payerEmail,
        auto_recurring: {
          frequency: params.frequency,
          frequency_type: params.frequency_type === 'days' ? 'days' : 'months',
          start_date: nextPaymentDate,
          end_date: endDate,
          transaction_amount: params.product_data.price,
          currency_id: 'MXN'
        },
        back_url: `${process.env.NEXT_PUBLIC_BASE_URL}/suscripcion/exito?ref=${externalReference}`,
        status: params.payment_method === 'authorized' ? 'authorized' : 'pending'
      }

      // Si es método autorizado, agregar token de tarjeta
      if (params.payment_method === 'authorized' && params.card_token) {
        preapprovalData.card_token_id = params.card_token
        preapprovalData.status = 'authorized'
      }

      logger.info(LogCategory.SUBSCRIPTION, 'Creando preapproval en MercadoPago', {
        external_reference: externalReference,
        payment_method: params.payment_method,
        amount: params.product_data.price,
        frequency: `${params.frequency} ${params.frequency_type}`
      })

      // Crear preapproval en MercadoPago
      const mpResponse = await this.createMercadoPagoPreapproval(preapprovalData)
      
      if (!mpResponse.success) {
        return {
          success: false,
          error: `Error en MercadoPago: ${mpResponse.error}`
        }
      }

      const mpSubscription = mpResponse.data!

      // Crear registro en base de datos
      const dbResult = await this.createDatabaseSubscription({
        user_id: params.user_id,
        product_id: params.product_id,
        external_reference: externalReference,
        mercadopago_subscription_id: mpSubscription.id,
        status: mpSubscription.status,
        frequency: params.frequency,
        frequency_type: params.frequency_type,
        base_price: params.product_data.base_price,
        discount_percentage: params.product_data.discount_percentage,
        next_billing_date: mpSubscription.next_payment_date,
        customer_data: params.customer_data,
        cart_items: [{
          product_id: params.product_id,
          product_name: params.product_data.name,
          quantity: 1,
          unit_price: params.product_data.price
        }]
      })

      if (!dbResult.success) {
        // Si falla la DB, intentar cancelar en MercadoPago
        await this.cancelMercadoPagoSubscription(mpSubscription.id)
        return {
          success: false,
          error: `Error guardando en base de datos: ${dbResult.error}`
        }
      }

      const processingTime = Date.now() - startTime

      logger.info(LogCategory.SUBSCRIPTION, 'Suscripción dinámica creada exitosamente', {
        subscription_id: dbResult.subscription_id,
        external_reference: externalReference,
        mercadopago_id: mpSubscription.id,
        status: mpSubscription.status,
        processing_time_ms: processingTime
      })

      return {
        success: true,
        subscription: {
          id: dbResult.subscription_id!,
          external_reference: externalReference,
          status: 'pending', // Siempre pending hasta confirmación de pago
          init_point: mpSubscription.init_point || mpSubscription.sandbox_init_point,
          next_payment_date: mpSubscription.next_payment_date,
          amount: params.product_data.price,
          mercadopago_subscription_id: mpSubscription.id
        }
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      logger.error(LogCategory.SUBSCRIPTION, 'Error inesperado creando suscripción dinámica', {
        error: error.message,
        stack: error.stack,
        processing_time_ms: processingTime,
        user_id: params.user_id,
        product_id: params.product_id
      })

      return {
        success: false,
        error: 'Error interno creando suscripción'
      }
    }
  }

  /**
   * Crea preapproval en MercadoPago usando API directa
   */
  private async createMercadoPagoPreapproval(data: any): Promise<{ success: boolean; data?: MercadoPagoPreapprovalResponse; error?: string }> {
    try {
      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.mercadoPagoAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${data.external_reference}-${Date.now()}`
        },
        body: JSON.stringify(data)
      })

      const responseData = await response.json()

      if (!response.ok) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error en MercadoPago API', {
          status: response.status,
          error: responseData,
          request_data: data
        })
        
        // Log detallado para debugging
        console.log('🔍 DEBUGGING MERCADOPAGO ERROR:')
        console.log('Status:', response.status)
        console.log('Response Data:', JSON.stringify(responseData, null, 2))
        console.log('Request Data:', JSON.stringify(data, null, 2))
        
        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP ${response.status}`
        }
      }

      return {
        success: true,
        data: responseData
      }

    } catch (error) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error de red con MercadoPago', {
        error: error.message,
        request_data: data
      })
      
      return {
        success: false,
        error: 'Error de conexión con MercadoPago'
      }
    }
  }

  /**
   * Crea registro de suscripción en base de datos
   */
  private async createDatabaseSubscription(data: any): Promise<{ success: boolean; subscription_id?: string; error?: string }> {
    try {
      const { data: subscription, error } = await supabase
        .from('unified_subscriptions')
        .insert({
          user_id: data.user_id,
          product_id: data.product_id,
          external_reference: data.external_reference,
          mercadopago_subscription_id: data.mercadopago_subscription_id,
          status: 'pending', // Siempre pending hasta confirmación de pago
          subscription_type: 'dynamic',
          frequency_type: data.frequency_type,
          base_price: data.base_price,
          discount_percentage: data.discount_percentage,
          next_billing_date: data.next_billing_date,
          customer_data: data.customer_data,
          cart_items: data.cart_items,
          quantity: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error insertando suscripción en DB', {
          error: error.message,
          external_reference: data.external_reference
        })
        
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        subscription_id: subscription.id
      }

    } catch (error) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error inesperado insertando en DB', {
        error: error.message,
        external_reference: data.external_reference
      })
      
      return {
        success: false,
        error: 'Error interno de base de datos'
      }
    }
  }

  /**
   * Cancela suscripción en MercadoPago
   */
  private async cancelMercadoPagoSubscription(subscriptionId: string): Promise<void> {
    try {
      await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.mercadoPagoAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      })
    } catch (error) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Error cancelando suscripción en MercadoPago', {
        subscription_id: subscriptionId,
        error: error.message
      })
    }
  }

  /**
   * Genera external_reference único
   */
  private generateExternalReference(userId: string, productId: number): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `SUB_${userId.substring(0, 8)}_${productId}_${timestamp}_${random}`
  }

  /**
   * Calcula próxima fecha de pago en formato ISO completo
   */
  private calculateNextPaymentDate(frequency: number, frequencyType: 'days' | 'months'): string {
    const now = new Date()
    
    if (frequencyType === 'days') {
      now.setDate(now.getDate() + frequency)
    } else {
      now.setMonth(now.getMonth() + frequency)
    }
    
    return now.toISOString() // Formato ISO completo: YYYY-MM-DDTHH:mm:ss.sssZ
  }

  /**
   * Calcula fecha de finalización de suscripción (1 año después del start_date)
   */
  private calculateEndDate(startDate: string): string {
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1)
    return endDate.toISOString()
  }
}