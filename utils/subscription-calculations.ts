// Funciones compartidas para cálculos de suscripciones
// Extraídas de subscription-orders para mantener consistencia

export interface SubscriptionData {
  id?: string
  transaction_amount?: number
  base_price?: number
  price?: number
  original_price?: number
  discounted_price?: number
  discount_percentage?: number
  quantity?: number
  status?: string
  subscription_type?: string
  frequency?: number
  frequency_type?: string
  next_billing_date?: string
  last_payment?: { created_at: string }
  created_at?: string
  product?: {
    price?: number
  }
}

/**
 * Función para obtener el precio base de una suscripción
 */
export const getBasePrice = (subscription: SubscriptionData): number => {
  // Priorizar en este orden: transaction_amount, base_price, price, product.price
  let price = 0
  
  if (subscription.transaction_amount && subscription.transaction_amount > 0) {
    price = subscription.transaction_amount
  } else if (subscription.base_price && subscription.base_price > 0) {
    price = subscription.base_price
  } else if (subscription.price && subscription.price > 0) {
    price = subscription.price
  } else if (subscription.product?.price && subscription.product.price > 0) {
    price = subscription.product.price
  }
  
  console.debug('getBasePrice para suscripción', subscription.id, ':', {
    transaction_amount: subscription.transaction_amount,
    base_price: subscription.base_price,
    price: subscription.price,
    product_price: subscription.product?.price,
    resultado: price
  })
  
  return Math.max(0, price) // Asegurar que nunca sea negativo
}

/**
 * Función para calcular el precio original (sin descuento)
 */
export const getOriginalPrice = (subscription: SubscriptionData): number => {
  // Si ya tenemos el precio original almacenado, usarlo
  if (subscription.original_price && subscription.original_price > 0) {
    return subscription.original_price
  }
  
  // El precio original siempre debe ser el precio del producto sin descuentos
  // Priorizar: product.price > base_price > price
  let originalPrice = 0
  
  if (subscription.product?.price && subscription.product.price > 0) {
    originalPrice = subscription.product.price
  } else if (subscription.base_price && subscription.base_price > 0) {
    originalPrice = subscription.base_price
  } else if (subscription.price && subscription.price > 0) {
    originalPrice = subscription.price
  }
  
  // Si tenemos discounted_price y discount_percentage, verificar consistencia
  if (subscription.discounted_price && subscription.discounted_price > 0 && subscription.discount_percentage && subscription.discount_percentage > 0) {
    const calculatedOriginal = subscription.discounted_price / (1 - subscription.discount_percentage / 100)
    
    // Si no tenemos precio original directo, usar el calculado
    if (originalPrice === 0) {
      originalPrice = calculatedOriginal
    }
    
    console.debug('Verificando consistencia de precio original:', {
      subscription_id: subscription.id,
      original_directo: originalPrice,
      original_calculado: calculatedOriginal,
      discounted_price: subscription.discounted_price,
      discount_percentage: subscription.discount_percentage
    })
  }
  
  return Math.round(Math.max(0, originalPrice) * 100) / 100 // Redondear a 2 decimales
}

/**
 * Función para calcular el precio con descuento
 */
export const getDiscountedPrice = (subscription: SubscriptionData): number => {
  // Si ya tenemos el precio con descuento almacenado, usarlo
  if (subscription.discounted_price && subscription.discounted_price > 0) {
    return subscription.discounted_price
  }
  
  // Si hay descuento, calcularlo desde el precio original
  if (subscription.discount_percentage && subscription.discount_percentage > 0) {
    const originalPrice = getOriginalPrice(subscription)
    if (originalPrice > 0) {
      const discounted = originalPrice * (1 - subscription.discount_percentage / 100)
      console.debug('Calculando precio con descuento:', {
        subscription_id: subscription.id,
        original: originalPrice,
        discount_percentage: subscription.discount_percentage,
        discounted: discounted
      })
      return Math.round(discounted * 100) / 100 // Redondear a 2 decimales
    }
  }
  
  // Si no hay descuento, devolver el precio original
  return getOriginalPrice(subscription)
}

/**
 * Función para calcular el monto del descuento
 */
export const getDiscountAmount = (subscription: SubscriptionData): number => {
  if (subscription.discount_percentage && subscription.discount_percentage > 0) {
    const originalPrice = getOriginalPrice(subscription)
    const discountAmount = originalPrice * (subscription.discount_percentage / 100)
    return Math.round(discountAmount * 100) / 100 // Redondear a 2 decimales
  }
  return 0
}

/**
 * Función para obtener el porcentaje de descuento
 */
export const getDiscountPercentage = (subscription: SubscriptionData): number => {
  // Si ya tenemos el porcentaje almacenado, usarlo
  if (subscription.discount_percentage && subscription.discount_percentage > 0) {
    // Verificar si el porcentaje está en formato decimal (0.15) o porcentaje (15)
    let percentage = subscription.discount_percentage
    
    // Si el valor es menor a 1, probablemente está en formato decimal
    if (percentage < 1) {
      percentage = percentage * 100
    }
    
    return Math.round(percentage * 100) / 100
  }
  
  // Calcular porcentaje basado en precios si no está almacenado
  const originalPrice = getOriginalPrice(subscription)
  const discountedPrice = getDiscountedPrice(subscription)
  
  if (originalPrice > 0 && discountedPrice > 0 && discountedPrice < originalPrice) {
    const percentage = ((originalPrice - discountedPrice) / originalPrice) * 100
    console.debug('Calculando porcentaje de descuento desde precios:', {
      subscription_id: subscription.id,
      original: originalPrice,
      discounted: discountedPrice,
      percentage: percentage
    })
    return Math.round(percentage * 100) / 100 // Redondear a 2 decimales
  }
  
  return 0
}

/**
 * Función para calcular la fecha del próximo pago
 */
export const getNextPaymentDate = (subscription: SubscriptionData): Date | null => {
  // Si la suscripción está cancelada, no hay próximo pago
  if (subscription.status === 'cancelled') {
    return null
  }
  
  if (!subscription.next_billing_date) {
    // Si no hay fecha de próximo cobro, calcular basado en la última fecha de pago y frecuencia
    const lastPaymentDate = subscription.last_payment?.created_at || subscription.created_at
    if (!lastPaymentDate) return null
    
    const baseDate = new Date(lastPaymentDate)
    const now = new Date()
    
    // Usar frequency y frequency_type si están disponibles (datos del webhook)
    if (subscription.frequency && subscription.frequency_type) {
      const frequency = subscription.frequency
      const type = subscription.frequency_type
      
      // Calcular la próxima fecha válida
      while (baseDate <= now) {
        if (type === 'days') {
          baseDate.setDate(baseDate.getDate() + frequency)
        } else if (type === 'weeks') {
          baseDate.setDate(baseDate.getDate() + (frequency * 7))
        } else if (type === 'months') {
          baseDate.setMonth(baseDate.getMonth() + frequency)
        }
      }
      
      console.debug('Calculando próximo pago con frequency:', {
        subscription_id: subscription.id,
        frequency,
        type,
        nextDate: baseDate
      })
      
      return baseDate
    }
    
    // Fallback usando subscription_type
    while (baseDate <= now) {
      switch (subscription.subscription_type) {
        case 'weekly':
          baseDate.setDate(baseDate.getDate() + 7)
          break
        case 'biweekly':
          baseDate.setDate(baseDate.getDate() + 14)
          break
        case 'monthly':
          baseDate.setMonth(baseDate.getMonth() + 1)
          break
        case 'quarterly':
          baseDate.setMonth(baseDate.getMonth() + 3)
          break
        case 'annual':
          baseDate.setFullYear(baseDate.getFullYear() + 1)
          break
        default:
          return null
      }
    }
    
    console.debug('Calculando próximo pago con subscription_type:', {
      subscription_id: subscription.id,
      type: subscription.subscription_type,
      nextDate: baseDate
    })
    
    return baseDate
  }
  
  const nextBillingDate = new Date(subscription.next_billing_date)
  const now = new Date()
  
  // Si la fecha de próximo cobro ya pasó, calcular la siguiente
  if (nextBillingDate <= now && subscription.status === 'active') {
    return getNextPaymentDate({ ...subscription, next_billing_date: undefined })
  }
  
  return nextBillingDate
}

/**
 * Función para calcular el costo de envío
 */
export const getShippingCost = (subscription: SubscriptionData): number => {
  // El envío se calcula sobre el precio final del producto (con descuento si aplica)
  const finalPrice = getDiscountedPrice(subscription)
  const quantity = subscription.quantity || 1
  const totalProductPrice = finalPrice * quantity
  
  // Envío gratis si el total del producto es >= $1000
  return totalProductPrice >= 1000 ? 0 : 100
}

/**
 * Función para calcular el total final
 */
export const getTotalPrice = (subscription: SubscriptionData): number => {
  const productPrice = getDiscountedPrice(subscription)
  const quantity = subscription.quantity || 1
  const shippingCost = getShippingCost(subscription)
  const total = (productPrice * quantity) + shippingCost
  
  console.debug('Calculando precio total:', {
    subscription_id: subscription.id,
    productPrice,
    quantity,
    shippingCost,
    total,
    originalPrice: getOriginalPrice(subscription),
    discountPercentage: getDiscountPercentage(subscription)
  })
  
  return Math.round(total * 100) / 100 // Redondear a 2 decimales
}

/**
 * Función para formatear precios de manera consistente
 */
export const formatPrice = (price: number | null | undefined): string => {
  // Manejar valores undefined, null o NaN
  if (price === null || price === undefined || isNaN(price)) {
    return '$0.00'
  }
  
  // Asegurar que el precio sea un número válido
  const validPrice = typeof price === 'number' ? price : parseFloat(String(price))
  if (isNaN(validPrice)) {
    return '$0.00'
  }
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(validPrice)
}

/**
 * Función para formatear fechas de manera consistente
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}