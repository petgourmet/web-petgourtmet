// lib/dynamic-discount-service.ts
// Servicio para manejar descuentos dinámicos basados en productos

import { createClient } from '@/lib/supabase/server'
import { Product } from '@/lib/supabase/types'

export type SubscriptionType = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'

export interface DynamicDiscountResult {
  originalPrice: number
  discountPercentage: number
  discountedPrice: number
  subscriptionType: SubscriptionType
}

export class DynamicDiscountService {
  /**
   * Obtiene el descuento dinámico para un producto específico según el tipo de suscripción
   */
  static async getProductSubscriptionDiscount(
    productId: number,
    subscriptionType: SubscriptionType
  ): Promise<DynamicDiscountResult | null> {
    try {
      const supabase = await createClient()
      
      // Obtener el producto con sus descuentos configurados
      const { data: product, error } = await supabase
        .from('products')
        .select('id, price, weekly_discount, biweekly_discount, monthly_discount, quarterly_discount, annual_discount')
        .eq('id', productId)
        .single()

      if (error || !product) {
        console.error('Error obteniendo producto:', error)
        return null
      }

      // Mapear tipo de suscripción a campo de descuento
      const discountField = this.getDiscountFieldByType(subscriptionType)
      const discountPercentage = product[discountField] || 0
      
      const originalPrice = product.price
      const discountedPrice = originalPrice * (1 - discountPercentage / 100)

      return {
        originalPrice,
        discountPercentage,
        discountedPrice,
        subscriptionType
      }
    } catch (error) {
      console.error('Error calculando descuento dinámico:', error)
      return null
    }
  }

  /**
   * Mapea el tipo de suscripción al campo correspondiente en la tabla products
   */
  private static getDiscountFieldByType(subscriptionType: SubscriptionType): keyof Product {
    const fieldMap: Record<SubscriptionType, keyof Product> = {
      weekly: 'weekly_discount',
      biweekly: 'biweekly_discount', 
      monthly: 'monthly_discount',
      quarterly: 'quarterly_discount',
      annual: 'annual_discount'
    }
    
    return fieldMap[subscriptionType]
  }

  /**
   * Convierte la frecuencia de plan a tipo de suscripción
   */
  static planFrequencyToSubscriptionType(frequency: number, frequencyType: string): SubscriptionType {
    if (frequencyType === 'weeks') {
      if (frequency === 1) return 'weekly'
      if (frequency === 2) return 'biweekly'
    } else if (frequencyType === 'months') {
      if (frequency === 1) return 'monthly'
      if (frequency === 3) return 'quarterly'
      if (frequency === 12) return 'annual'
    }
    
    // Fallback a mensual si no se puede determinar
    return 'monthly'
  }

  /**
   * Crea una suscripción pendiente con descuentos dinámicos
   */
  static async createPendingSubscription(data: {
    userId: string
    productId: number
    subscriptionType: SubscriptionType
    externalReference: string
    mercadopagoSubscriptionId?: string
    quantity?: number
    planId?: string
  }) {
    try {
      const supabase = await createClient()
      
      // Obtener descuento dinámico del producto
      const discountResult = await this.getProductSubscriptionDiscount(
        data.productId,
        data.subscriptionType
      )

      if (!discountResult) {
        throw new Error('No se pudo calcular el descuento dinámico para el producto')
      }

      // Crear registro en pending_subscriptions
      const { data: pendingSubscription, error } = await supabase
        .from('pending_subscriptions')
        .insert({
          user_id: data.userId,
          product_id: data.productId,
          subscription_type: data.subscriptionType,
          external_reference: data.externalReference,
          mercadopago_subscription_id: data.mercadopagoSubscriptionId,
          price: discountResult.discountedPrice,
          original_price: discountResult.originalPrice,
          discount_percentage: discountResult.discountPercentage,
          quantity: data.quantity || 1,
          plan_id: data.planId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creando suscripción pendiente:', error)
        throw error
      }

      return {
        pendingSubscription,
        discountResult
      }
    } catch (error) {
      console.error('Error en createPendingSubscription:', error)
      throw error
    }
  }
}

export default DynamicDiscountService