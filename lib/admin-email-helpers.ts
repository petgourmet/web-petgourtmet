/**
 * Helpers compartidos para construir datos de email en las rutas admin.
 * Centraliza la lógica de resolución de shipping_cost e imagen/productos
 * para evitar divergencias entre las rutas:
 *   - /api/admin/resend-subscription-email
 *   - /api/admin/update-subscription-order-status
 *   - /api/admin/update-order-status
 */

export interface EmailProduct {
  name: string
  image?: string | null
  quantity: number
  price: number
  size?: string | null
}

/**
 * Resuelve el costo de envío de una suscripción.
 * Prioridad:
 *   1. Valor en BD (shipping_cost positivo)
 *   2. Diferencia entre transaction_amount y discounted_price/base_price
 */
export function resolveSubscriptionShipping(sub: Record<string, any>): number {
  if (sub.shipping_cost && Number(sub.shipping_cost) > 0) {
    return Number(sub.shipping_cost)
  }
  const productPrice = Number(sub.discounted_price || sub.base_price || 0)
  const total = Number(sub.transaction_amount || productPrice)
  return Math.max(0, total - productPrice)
}

/**
 * Resuelve la lista de productos de una suscripción para el email.
 * Prioridad:
 *   1. cart_items (array con items del carrito)
 *   2. Campos product_name / product_image directos de la suscripción
 */
export function resolveSubscriptionProducts(sub: Record<string, any>): EmailProduct[] {
  const productPrice = Number(sub.discounted_price || sub.base_price || 0)

  if (Array.isArray(sub.cart_items) && sub.cart_items.length > 0) {
    return sub.cart_items.map((item: any) => ({
      name: item.product_name || item.name || sub.product_name || 'Producto',
      image: item.image || sub.product_image || null,
      quantity: item.quantity || 1,
      price: item.price ?? productPrice,
      size: item.size || sub.size || null,
    }))
  }

  if (sub.product_name) {
    return [{
      name: sub.product_name,
      image: sub.product_image || null,
      quantity: sub.quantity || 1,
      price: productPrice,
      size: sub.size || null,
    }]
  }

  return []
}

/**
 * Resuelve el costo de envío de una orden regular.
 * Prioridad:
 *   1. Valor en BD (shipping_cost positivo)
 *   2. Total de la orden menos la suma de los items
 */
export function resolveOrderShipping(order: Record<string, any>, orderItems: EmailProduct[]): number {
  if (order.shipping_cost && Number(order.shipping_cost) > 0) {
    return Number(order.shipping_cost)
  }
  const itemsTotal = orderItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  )
  return Math.max(0, (order.total || 0) - itemsTotal)
}

/**
 * Extrae el nombre completo del cliente de una suscripción.
 * Prioridad: customer_name → customer_data JSON → 'Cliente'
 */
export function resolveCustomerName(record: Record<string, any>): string {
  if (record.customer_name) return record.customer_name

  try {
    const data = typeof record.customer_data === 'string'
      ? JSON.parse(record.customer_data)
      : record.customer_data
    if (data?.firstName || data?.lastName) {
      return `${data.firstName || ''} ${data.lastName || ''}`.trim()
    }
    if (data?.name) return data.name
  } catch {
    // customer_data no es JSON válido
  }

  return record.user_profile?.full_name || 'Cliente'
}

/**
 * Extrae el email del cliente de una suscripción.
 * Prioridad: customer_email → customer_data JSON → user_profile.email
 */
export function resolveCustomerEmail(record: Record<string, any>): string {
  if (record.customer_email) return record.customer_email

  try {
    const data = typeof record.customer_data === 'string'
      ? JSON.parse(record.customer_data)
      : record.customer_data
    if (data?.email) return data.email
  } catch {
    // ignorar
  }

  return record.user_profile?.email || ''
}
