/**
 * Servicio para procesar pagos de suscripciones
 * Maneja la lógica de actualización de next_billing_date desde webhooks
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SubscriptionPaymentData {
  mercadopago_payment_id: string
  subscription_id: string
  amount: number
  currency?: string
  status: string
  payment_date?: Date
  transaction_details?: any
}

export class SubscriptionPaymentService {
  /**
   * Procesa un pago de suscripción desde el webhook de MercadoPago
   */
  async processPayment(paymentData: SubscriptionPaymentData) {
    try {
      console.log('🔄 Processing subscription payment:', paymentData.mercadopago_payment_id)

      // 1. Buscar la suscripción
      const { data: subscription, error: fetchError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', paymentData.subscription_id)
        .single()

      if (fetchError || !subscription) {
        console.warn('❌ Subscription not found:', paymentData.subscription_id)
        return {
          success: false,
          error: 'Subscription not found'
        }
      }

      // 2. Calcular la próxima fecha de cobro
      const nextBillingDate = this.calculateNextBillingDate(subscription)

      if (!nextBillingDate) {
        console.error('❌ Could not calculate next billing date for subscription:', subscription.id)
        return {
          success: false,
          error: 'Could not calculate next billing date'
        }
      }

      console.log('📅 Next billing date calculated:', nextBillingDate.toISOString())

      // 3. Registrar el pago en la tabla subscription_payments
      const { data: payment, error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          subscription_id: subscription.id,
          mercadopago_payment_id: paymentData.mercadopago_payment_id,
          amount: paymentData.amount,
          currency: paymentData.currency || 'MXN',
          status: paymentData.status,
          payment_date: paymentData.payment_date || new Date(),
          next_billing_date: nextBillingDate,
          transaction_details: paymentData.transaction_details || {}
        })
        .select()
        .single()

      if (paymentError) {
        console.error('❌ Error registering payment:', paymentError)
        // Continuar de todos modos para actualizar la suscripción
      } else {
        console.log('✅ Payment registered:', payment.id)
      }

      // 4. Actualizar la suscripción
      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          last_payment_date: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          status: 'active', // Asegurar que está activa
          total_payments_count: (subscription.total_payments_count || 0) + 1,
          total_amount_paid: (subscription.total_amount_paid || 0) + paymentData.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) {
        console.error('❌ Error updating subscription:', updateError)
        return {
          success: false,
          error: `Failed to update subscription: ${updateError.message}`
        }
      }

      console.log('✅ Subscription updated successfully:', {
        id: subscription.id,
        next_billing_date: nextBillingDate.toISOString(),
        total_payments: (subscription.total_payments_count || 0) + 1
      })

      return {
        success: true,
        subscription_id: subscription.id,
        next_billing_date: nextBillingDate,
        payment_id: payment?.id
      }

    } catch (error) {
      console.error('❌ Error processing subscription payment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Calcula la próxima fecha de cobro basada en la frecuencia de la suscripción
   */
  private calculateNextBillingDate(subscription: any): Date | null {
    try {
      const now = new Date()
      const nextDate = new Date(now)

      // Usar frequency y frequency_type si están disponibles
      if (subscription.frequency && subscription.frequency_type) {
        const frequency = parseInt(subscription.frequency)
        const type = subscription.frequency_type

        switch (type) {
          case 'days':
            nextDate.setDate(nextDate.getDate() + frequency)
            break
          case 'weeks':
            nextDate.setDate(nextDate.getDate() + (frequency * 7))
            break
          case 'months':
            nextDate.setMonth(nextDate.getMonth() + frequency)
            break
          case 'years':
            nextDate.setFullYear(nextDate.getFullYear() + frequency)
            break
          default:
            console.warn('Unknown frequency type:', type)
            return null
        }

        return nextDate
      }

      // Fallback: usar subscription_type
      switch (subscription.subscription_type) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7)
          break
        case 'biweekly':
          nextDate.setDate(nextDate.getDate() + 14)
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3)
          break
        case 'annual':
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
        default:
          // Default a mensual si no se especifica
          console.warn('Unknown subscription type, defaulting to monthly:', subscription.subscription_type)
          nextDate.setMonth(nextDate.getMonth() + 1)
      }

      return nextDate

    } catch (error) {
      console.error('Error calculating next billing date:', error)
      return null
    }
  }

  /**
   * Obtiene el historial de pagos de una suscripción
   */
  async getPaymentHistory(subscriptionId: string) {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('payment_date', { ascending: false })

      if (error) {
        console.error('Error fetching payment history:', error)
        return { success: false, error: error.message }
      }

      return {
        success: true,
        payments: data
      }

    } catch (error) {
      console.error('Error in getPaymentHistory:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verifica si un pago ya fue procesado (evita duplicados)
   */
  async isPaymentProcessed(mercadopagoPaymentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('id')
        .eq('mercadopago_payment_id', mercadopagoPaymentId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking if payment is processed:', error)
        return false
      }

      return !!data

    } catch (error) {
      console.error('Error in isPaymentProcessed:', error)
      return false
    }
  }
}
