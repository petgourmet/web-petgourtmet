import { createClient } from "@/lib/supabase/client"
import { 
  validateEnvironmentVariables,
  logValidationErrors,
  type ValidationResult
} from './checkout-validators'

interface SubscriptionData {
  id: string
  user_id: string
  product_id: string
  amount: number
  frequency: 'monthly' | 'quarterly' | 'yearly'
  status: 'active' | 'paused' | 'cancelled'
  next_billing_date: string
  payment_method_id: string
  created_at: string
  updated_at: string
}

interface MercadoPagoPayment {
  id: string
  status: string
  status_detail: string
  transaction_amount: number
  external_reference: string
  payer?: {
    email: string
  }
  payment_method_id?: string
}

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
    const startTime = Date.now()
    console.log(`🔄 Iniciando procesamiento de pago recurrente para suscripción: ${payment.subscriptionId}`, {
      amount: payment.amount,
      customerEmail: payment.customerEmail,
      timestamp: new Date().toISOString()
    })

    try {
      // Verificar configuración del entorno
      if (!this.isValidEnvironment) {
        console.error(`❌ Configuración del entorno inválida para suscripción: ${payment.subscriptionId}`)
        throw new Error('Configuración del entorno inválida para procesar pagos')
      }
      
      // Validar parámetros de entrada con logging detallado
      const missingParams = []
      if (!payment.subscriptionId || typeof payment.subscriptionId !== 'string') missingParams.push('subscriptionId')
      if (!payment.amount) missingParams.push('amount')
      if (!payment.customerEmail) missingParams.push('customerEmail')
      if (!payment.paymentMethodId) missingParams.push('paymentMethodId')
      
      if (missingParams.length > 0) {
        console.error(`❌ Parámetros faltantes en pago recurrente:`, { missingParams, subscriptionId: payment.subscriptionId })
        throw new Error(`Parámetros de pago incompletos: ${missingParams.join(', ')}`)
      }
      
      if (!payment || typeof payment !== 'object') {
        console.error(`❌ Datos de pago inválidos para suscripción: ${payment.subscriptionId}`)
        throw new Error('Datos de pago inválidos')
      }
      
      // ✅ VALIDACIÓN DE ESTADO DE SUSCRIPCIÓN ANTES DE PROCESAR PAGO
      console.log(`🔍 Validando estado de suscripción: ${payment.subscriptionId}`)
      
      // Obtener información de la suscripción con retry
      let subscription = null
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries && !subscription) {
        const { data, error: subscriptionError } = await this.supabase
          .from('unified_subscriptions')
          .select('id, status, user_id, product_id, frequency, next_billing_date, created_at')
          .eq('id', payment.subscriptionId)
          .single()

        if (subscriptionError) {
          retryCount++
          console.warn(`⚠️ Error al obtener suscripción (intento ${retryCount}/${maxRetries}):`, { 
            error: subscriptionError.message, 
            subscriptionId: payment.subscriptionId 
          })
          
          if (retryCount >= maxRetries) {
            console.error(`❌ Falló obtener suscripción después de ${maxRetries} intentos:`, { 
              subscriptionId: payment.subscriptionId, 
              finalError: subscriptionError.message 
            })
            throw new Error(`No se pudo verificar el estado de la suscripción después de ${maxRetries} intentos: ${subscriptionError.message}`)
          }
          
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        } else {
          subscription = data
          console.log(`✅ Suscripción obtenida exitosamente:`, {
            id: subscription.id,
            status: subscription.status,
            userId: subscription.user_id,
            productId: subscription.product_id,
            nextBillingDate: subscription.next_billing_date
          })
        }
      }
      
      if (!subscription) {
        console.error(`❌ Suscripción no encontrada: ${payment.subscriptionId}`)
        throw new Error('Suscripción no encontrada')
      }
    
    // Validar que la suscripción esté en estado válido para procesar pagos
    const validStatuses = ['active', 'pending']
    if (!validStatuses.includes(subscription.status)) {
      console.warn(`⚠️ Intento de procesar pago para suscripción en estado inválido: ${subscription.status} (ID: ${payment.subscriptionId})`)
      throw new Error(`No se puede procesar pago para suscripción en estado: ${subscription.status}`)
    }
    
    // Validar que la fecha de facturación sea correcta
    const today = new Date()
    const nextBillingDate = new Date(subscription.next_billing_date)
    
    if (nextBillingDate > today) {
      console.warn(`⚠️ Intento de procesar pago antes de la fecha de facturación. Fecha programada: ${subscription.next_billing_date}, Hoy: ${today.toISOString().split('T')[0]} (ID: ${payment.subscriptionId})`)
      throw new Error('El pago no está programado para esta fecha')
    }
    
    console.log(`✅ Suscripción válida para procesamiento: Estado=${subscription.status}, Usuario=${subscription.user_id}, Producto=${subscription.product_id}`)
    
      try {
        console.log(`💳 Iniciando cobro con MercadoPago para suscripción: ${payment.subscriptionId}`, {
          amount: payment.amount,
          paymentMethodId: payment.paymentMethodId
        })

        // Realizar cobro real con MercadoPago con retry
        let paymentResponse = null
        let paymentRetryCount = 0
        const maxPaymentRetries = 2
        
        while (paymentRetryCount <= maxPaymentRetries && !paymentResponse) {
          try {
            const requestBody = {
              transaction_amount: payment.amount,
              description: payment.description,
              payment_method_id: payment.paymentMethodId,
              payer: {
                email: payment.customerEmail,
              },
              external_reference: payment.subscriptionId,
              notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook-subscription`,
            }
            
            console.log(`📤 Enviando solicitud de pago a MercadoPago (intento ${paymentRetryCount + 1}/${maxPaymentRetries + 1}):`, {
              subscriptionId: payment.subscriptionId,
              amount: requestBody.transaction_amount,
              paymentMethodId: requestBody.payment_method_id
            })

            paymentResponse = await fetch("https://api.mercadopago.com/v1/payments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
              },
              body: JSON.stringify(requestBody),
            })
            
            break
          } catch (fetchError) {
            paymentRetryCount++
            console.warn(`⚠️ Error de red al procesar pago (intento ${paymentRetryCount}/${maxPaymentRetries + 1}):`, {
              error: fetchError.message,
              subscriptionId: payment.subscriptionId
            })
            
            if (paymentRetryCount > maxPaymentRetries) {
              console.error(`❌ Falló conexión con MercadoPago después de ${maxPaymentRetries + 1} intentos:`, {
                subscriptionId: payment.subscriptionId,
                finalError: fetchError.message
              })
              throw new Error(`Error de conexión con MercadoPago: ${fetchError.message}`)
            }
            
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 2000 * paymentRetryCount))
          }
        }

        const paymentData = await paymentResponse.json()
        
        console.log(`📥 Respuesta de MercadoPago recibida:`, {
          subscriptionId: payment.subscriptionId,
          paymentId: paymentData.id,
          status: paymentData.status,
          statusDetail: paymentData.status_detail,
          responseOk: paymentResponse.ok
        })

        if (!paymentResponse.ok) {
          console.error(`❌ Error en respuesta de MercadoPago:`, {
            subscriptionId: payment.subscriptionId,
            status: paymentResponse.status,
            statusText: paymentResponse.statusText,
            errorMessage: paymentData.message || 'Error desconocido',
            errorDetails: paymentData
          })
          throw new Error(`Error en pago de MercadoPago: ${paymentData.message || 'Error desconocido'}`)
        }

        const result = {
          success: paymentData.status === "approved",
          paymentId: paymentData.id,
          status: paymentData.status,
          amount: paymentData.transaction_amount,
          statusDetail: paymentData.status_detail,
        }
        
        const processingTime = Date.now() - startTime
        console.log(`✅ Pago recurrente procesado exitosamente:`, {
          subscriptionId: payment.subscriptionId,
          paymentId: result.paymentId,
          success: result.success,
          status: result.status,
          amount: result.amount,
          processingTimeMs: processingTime
        })

        return result
      } catch (error) {
        const processingTime = Date.now() - startTime
        console.error(`❌ Error crítico al procesar pago recurrente:`, {
          subscriptionId: payment.subscriptionId,
          error: error.message,
          stack: error.stack,
          processingTimeMs: processingTime
        })
        throw error
      }
    } catch (outerError) {
      const processingTime = Date.now() - startTime
      console.error(`❌ Error general en processRecurringPayment:`, {
        subscriptionId: payment.subscriptionId,
        error: outerError.message,
        processingTimeMs: processingTime
      })
      throw outerError
    }
  }

  async getSubscriptionsDueForBilling() {
    const startTime = Date.now()
    const today = new Date().toISOString().split("T")[0]
    
    console.log(`🔍 Buscando suscripciones pendientes de facturación para fecha: ${today}`)

    try {
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
        console.error(`❌ Error al obtener suscripciones pendientes de facturación:`, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          date: today
        })
        return []
      }

      const processingTime = Date.now() - startTime
      const subscriptionCount = subscriptions?.length || 0
      
      console.log(`✅ Suscripciones pendientes de facturación obtenidas:`, {
        count: subscriptionCount,
        date: today,
        processingTimeMs: processingTime,
        subscriptionIds: subscriptions?.map(s => s.id) || []
      })
      
      // Log detallado de cada suscripción encontrada
      if (subscriptions && subscriptions.length > 0) {
        subscriptions.forEach((subscription, index) => {
          console.log(`📋 Suscripción ${index + 1}/${subscriptionCount}:`, {
            id: subscription.id,
            userId: subscription.user_id,
            productId: subscription.product_id,
            frequency: subscription.frequency,
            nextBillingDate: subscription.next_billing_date,
            amount: subscription.amount,
            status: subscription.status
          })
        })
      } else {
        console.log(`ℹ️ No se encontraron suscripciones pendientes de facturación para la fecha: ${today}`)
      }

      return subscriptions || []
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`❌ Error crítico al obtener suscripciones pendientes:`, {
        error: error.message,
        stack: error.stack,
        date: today,
        processingTimeMs: processingTime
      })
      return []
    }
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

  // ✅ VALIDACIÓN DE INTEGRIDAD DE DATOS - FASE 2
  async validateDataIntegrity(subscriptionId: string, paymentData?: MercadoPagoPayment): Promise<ValidationResult> {
    console.log(`🔍 Iniciando validación de integridad de datos para suscripción: ${subscriptionId}`)
    
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // 1. Verificar consistencia de suscripción en base de datos
      const { data: subscription, error: subError } = await this.supabase
        .from('unified_subscriptions')
        .select(`
          *,
          user_payment_methods!inner(*),
          products!inner(id, name, price)
        `)
        .eq('id', subscriptionId)
        .single()
      
      if (subError || !subscription) {
        errors.push(`Suscripción no encontrada en base de datos: ${subError?.message || 'No existe'}`)
        return { isValid: false, errors, warnings }
      }
      
      // 2. Validar consistencia de datos de suscripción
      if (!subscription.user_id || !subscription.product_id) {
        errors.push('Datos de suscripción incompletos: falta user_id o product_id')
      }
      
      if (!subscription.user_payment_methods || subscription.user_payment_methods.length === 0) {
        errors.push('No se encontró método de pago asociado a la suscripción')
      }
      
      // 3. Verificar consistencia con MercadoPago si se proporciona paymentData
      if (paymentData) {
        const mpValidation = await this.validateMercadoPagoConsistency(subscription, paymentData)
        errors.push(...mpValidation.errors)
        warnings.push(...mpValidation.warnings)
      }
      
      // 4. Validar fechas y estados
      const dateValidation = this.validateSubscriptionDates(subscription)
      errors.push(...dateValidation.errors)
      warnings.push(...dateValidation.warnings)
      
      // 5. Validar montos y descuentos
      const amountValidation = await this.validateSubscriptionAmounts(subscription)
      errors.push(...amountValidation.errors)
      warnings.push(...amountValidation.warnings)
      
      const isValid = errors.length === 0
      
      console.log(`${isValid ? '✅' : '❌'} Validación de integridad completada:`, {
        subscriptionId,
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        errors: errors.slice(0, 3), // Solo primeros 3 errores en log
        warnings: warnings.slice(0, 3)
      })
      
      return { isValid, errors, warnings }
      
    } catch (error) {
      console.error(`❌ Error crítico en validación de integridad:`, {
        subscriptionId,
        error: error.message
      })
      return {
        isValid: false,
        errors: [`Error crítico en validación: ${error.message}`],
        warnings
      }
    }
  }
  
  private async validateMercadoPagoConsistency(subscription: SubscriptionData, paymentData: MercadoPagoPayment): Promise<{errors: string[], warnings: string[]}> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Verificar que el monto coincida
      if (paymentData.transaction_amount && Math.abs(paymentData.transaction_amount - subscription.amount) > 0.01) {
        errors.push(`Inconsistencia en monto: DB=${subscription.amount}, MP=${paymentData.transaction_amount}`)
      }
      
      // Verificar referencia externa
      if (paymentData.external_reference && paymentData.external_reference !== subscription.id) {
        errors.push(`Inconsistencia en referencia: esperado=${subscription.id}, recibido=${paymentData.external_reference}`)
      }
      
      // Verificar estado del pago con MercadoPago
      if (paymentData.id) {
        const mpPayment = await this.getMercadoPagoPayment(paymentData.id)
        if (mpPayment && mpPayment.status !== paymentData.status) {
          warnings.push(`Estado de pago inconsistente: local=${paymentData.status}, MP=${mpPayment.status}`)
        }
      }
      
    } catch (error) {
      warnings.push(`Error al validar consistencia con MercadoPago: ${error.message}`)
    }
    
    return { errors, warnings }
  }
  
  private validateSubscriptionDates(subscription: SubscriptionData): {errors: string[], warnings: string[]} {
    const errors: string[] = []
    const warnings: string[] = []
    
    const now = new Date()
    const createdAt = new Date(subscription.created_at)
    const nextBilling = new Date(subscription.next_billing_date)
    
    // Validar que la fecha de creación no sea futura
    if (createdAt > now) {
      errors.push('Fecha de creación de suscripción es futura')
    }
    
    // Validar que la próxima facturación sea coherente
    if (subscription.status === 'active' && nextBilling < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      warnings.push('Próxima fecha de facturación está muy atrasada')
    }
    
    return { errors, warnings }
  }
  
  private async validateSubscriptionAmounts(subscription: SubscriptionData): Promise<{errors: string[], warnings: string[]}> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Verificar que el monto sea positivo
      if (subscription.amount <= 0) {
        errors.push('Monto de suscripción debe ser positivo')
      }
      
      // Verificar consistencia con precio del producto
      if (subscription.products && subscription.products.length > 0) {
        const product = subscription.products[0]
        const expectedDiscount = await this.getDiscountForPeriod(product.id, subscription.frequency)
        const expectedAmount = product.price * (1 - expectedDiscount / 100)
        
        if (Math.abs(expectedAmount - subscription.amount) > 0.01) {
          warnings.push(`Monto posiblemente incorrecto: esperado=${expectedAmount.toFixed(2)}, actual=${subscription.amount}`)
        }
      }
      
    } catch (error) {
      warnings.push(`Error al validar montos: ${error.message}`)
    }
    
    return { errors, warnings }
  }
  
  private async getMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPayment | null> {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      })
      
      if (response.ok) {
        return await response.json()
      }
      
      return null
    } catch (error) {
      console.warn(`⚠️ Error al consultar pago en MercadoPago: ${error.message}`)
      return null
    }
  }

  async validateCard(cardNumber: string, expiryDate: string, cvv: string): Promise<boolean> {
    console.log(`🔍 Iniciando validación robusta de tarjeta`)
    
    try {
      // Validación de número de tarjeta usando algoritmo de Luhn mejorado
      const luhnCheck = (num: string) => {
        let sum = 0
        let isEven = false
        for (let i = num.length - 1; i >= 0; i--) {
          let digit = Number.parseInt(num.charAt(i), 10)
          if (isNaN(digit)) return false // Validación adicional
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

      const cleanCardNumber = cardNumber.replace(/[\s-]/g, "") // Remover espacios y guiones

      // Validaciones mejoradas de formato
      if (!cleanCardNumber || cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        console.warn(`⚠️ Número de tarjeta con longitud inválida: ${cleanCardNumber.length}`)
        return false
      }
      
      if (!/^\d+$/.test(cleanCardNumber)) {
        console.warn(`⚠️ Número de tarjeta contiene caracteres no numéricos`)
        return false
      }

      // Validar con algoritmo de Luhn
      if (!luhnCheck(cleanCardNumber)) {
        console.warn(`⚠️ Número de tarjeta falló validación de Luhn`)
        return false
      }
      
      // Validación mejorada de tipo de tarjeta
      const cardType = this.getCardType(cleanCardNumber)
      if (!cardType) {
        console.warn(`⚠️ Tipo de tarjeta no reconocido`)
        return false
      }

      // Validación mejorada de fecha de expiración
      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        console.warn(`⚠️ Formato de fecha de expiración inválido: ${expiryDate}`)
        return false
      }
      
      const [month, year] = expiryDate.split("/")
      const monthNum = Number.parseInt(month, 10)
      const yearNum = Number.parseInt(year, 10)
      
      if (monthNum < 1 || monthNum > 12) {
        console.warn(`⚠️ Mes de expiración inválido: ${monthNum}`)
        return false
      }
      
      const expDate = new Date(2000 + yearNum, monthNum - 1, 1)
      const now = new Date()
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      if (expDate <= currentMonth) {
        console.warn(`⚠️ Tarjeta expirada: ${expiryDate}`)
        return false
      }
      
      // Validar que no expire en más de 10 años (tarjetas sospechosas)
      const maxExpDate = new Date(now.getFullYear() + 10, now.getMonth(), 1)
      if (expDate > maxExpDate) {
        console.warn(`⚠️ Fecha de expiración demasiado lejana: ${expiryDate}`)
        return false
      }

      // Validación mejorada de CVV
      if (!cvv || !/^\d{3,4}$/.test(cvv)) {
        console.warn(`⚠️ CVV inválido`)
        return false
      }
      
      // Validar longitud de CVV según tipo de tarjeta
      const expectedCvvLength = cardType === 'amex' ? 4 : 3
      if (cvv.length !== expectedCvvLength) {
        console.warn(`⚠️ Longitud de CVV incorrecta para tipo de tarjeta ${cardType}: esperado ${expectedCvvLength}, recibido ${cvv.length}`)
        return false
      }

      console.log(`✅ Tarjeta validada exitosamente: tipo=${cardType}, expira=${expiryDate}`)
      return true
      
    } catch (error) {
      console.error(`❌ Error en validación de tarjeta: ${error.message}`)
      return false
    }
  }
  
  private getCardType(cardNumber: string): string | null {
    // Patrones mejorados para identificar tipos de tarjeta
    const patterns = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$|^2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9][0-9]|7(?:[01][0-9]|20))[0-9]{12}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
      diners: /^3[0689][0-9]{11}$/,
      jcb: /^(?:2131|1800|35[0-9]{3})[0-9]{11}$/
    }
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cardNumber)) {
        return type
      }
    }
    
    return null
  }

  async implement3DSecure(paymentData: MercadoPagoPayment) {
    // Implementar 3D Secure real con MercadoPago
    // Esta funcionalidad depende de la configuración específica de MercadoPago
    // y puede requerir integración adicional con el frontend

    return { success: true, secure: false }
  }
}

export const subscriptionService = new SubscriptionService()
