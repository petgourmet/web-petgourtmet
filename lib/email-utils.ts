/**
 * Utilidades para manejo de emails de clientes
 */

/**
 * Extrae el email del cliente de múltiples fuentes de una orden
 * @param order - Objeto de orden de la base de datos
 * @param paymentData - Datos de pago de MercadoPago (opcional)
 * @returns Email del cliente o email por defecto
 */
export function extractCustomerEmail(order: any, paymentData?: any): string {
  // 1. Prioridad: Email del pagador en MercadoPago
  if (paymentData?.payer?.email) {
    return paymentData.payer.email
  }
  
  // 2. Email directo en la orden (si existe la columna)
  if (order.customer_email && order.customer_email !== 'cliente@petgourmet.mx') {
    return order.customer_email
  }
  
  // 3. Email del shipping_address
  if (order.shipping_address) {
    try {
      const shippingData = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address
      
      if (shippingData.customer_data && shippingData.customer_data.email) {
        const email = shippingData.customer_data.email
        // Evitar el email genérico si hay uno real
        if (email !== 'cliente@petgourmet.mx') {
          return email
        }
      }
    } catch (error) {
      console.warn('Error parsing shipping_address for email:', error.message)
    }
  }
  
  // 4. Fallback al email genérico
  return 'cliente@petgourmet.mx'
}

/**
 * Extrae el nombre del cliente de múltiples fuentes de una orden
 * @param order - Objeto de orden de la base de datos
 * @param paymentData - Datos de pago de MercadoPago (opcional)
 * @returns Nombre del cliente o nombre por defecto
 */
export function extractCustomerName(order: any, paymentData?: any): string {
  // 1. Prioridad: Nombre del pagador en MercadoPago
  if (paymentData?.payer?.first_name || paymentData?.payer?.last_name) {
    const firstName = paymentData.payer.first_name || ''
    const lastName = paymentData.payer.last_name || ''
    return `${firstName} ${lastName}`.trim()
  }
  
  // 2. Nombre directo en la orden
  if (order.customer_name) {
    return order.customer_name
  }
  
  // 3. Nombre del shipping_address
  if (order.shipping_address) {
    try {
      const shippingData = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address
      
      if (shippingData.customer_data) {
        const customerData = shippingData.customer_data
        if (customerData.firstName || customerData.lastName) {
          const firstName = customerData.firstName || ''
          const lastName = customerData.lastName || ''
          return `${firstName} ${lastName}`.trim()
        }
      }
    } catch (error) {
      console.warn('Error parsing shipping_address for name:', error.message)
    }
  }
  
  // 4. Fallback al nombre genérico
  return 'Cliente'
}

/**
 * Valida si un email es válido
 * @param email - Email a validar
 * @returns true si el email es válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Verifica si un email es el email genérico por defecto
 * @param email - Email a verificar
 * @returns true si es el email genérico
 */
export function isGenericEmail(email: string): boolean {
  return email === 'cliente@petgourmet.mx'
}