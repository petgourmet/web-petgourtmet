/**
 * Servicio de Stripe Checkout
 * 
 * Maneja la creación de sesiones de checkout para pagos únicos y suscripciones
 * Documentación: https://docs.stripe.com/checkout/quickstart
 */

import Stripe from 'stripe'
import { stripe, stripeConfig } from './config'

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image?: string
  size?: string
  isSubscription?: boolean
  subscriptionType?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'
}

export interface CustomerInfo {
  email: string
  firstName: string
  lastName: string
  phone?: string
  userId?: string
}

export interface ShippingInfo {
  address: string
  city: string
  state: string
  postalCode: string
  country?: string
}

export interface CreateCheckoutSessionParams {
  items: CartItem[]
  customer: CustomerInfo
  shipping: ShippingInfo
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
}

/**
 * Determina la frecuencia de facturación según el tipo de suscripción
 */
function getSubscriptionInterval(subscriptionType: string): {
  interval: Stripe.Price.Recurring.Interval
  interval_count: number
} {
  switch (subscriptionType) {
    case 'weekly':
      return { interval: 'week', interval_count: 1 }
    case 'biweekly':
      return { interval: 'week', interval_count: 2 }
    case 'monthly':
      return { interval: 'month', interval_count: 1 }
    case 'quarterly':
      return { interval: 'month', interval_count: 3 }
    case 'annual':
      return { interval: 'year', interval_count: 1 }
    default:
      return { interval: 'month', interval_count: 1 }
  }
}

/**
 * Crea una sesión de Checkout para pagos únicos
 */
export async function createOneTimeCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const { items, customer, shipping, successUrl, cancelUrl, metadata = {} } = params

  // Convertir items del carrito a line items de Stripe
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
    price_data: {
      currency: stripeConfig.currency,
      product_data: {
        name: item.name,
        description: item.size ? `Tamaño: ${item.size}` : undefined,
        images: item.image ? [item.image] : undefined,
        metadata: {
          product_id: item.id.toString(),
          size: item.size || 'Standard',
        },
      },
      unit_amount: Math.round(item.price * 100), // Convertir a centavos
    },
    quantity: item.quantity,
  }))

  // Calcular subtotal para determinar costo de envío
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shippingCost = subtotal >= 1000 ? 0 : 100

  // Agregar envío como line item si no es gratis
  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: stripeConfig.currency,
        product_data: {
          name: 'Envío',
          description: 'Costo de envío a domicilio',
        },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    })
  }

  // Crear o encontrar cliente en Stripe
  let stripeCustomerId: string | undefined

  try {
    // Buscar si ya existe un cliente con este email
    const existingCustomers = await stripe.customers.list({
      email: customer.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      stripeCustomerId = existingCustomers.data[0].id
    } else {
      // Crear nuevo cliente
      const newCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        metadata: {
          user_id: customer.userId || '',
        },
      })
      stripeCustomerId = newCustomer.id
    }
  } catch (error) {
    console.error('Error al crear/buscar cliente:', error)
    // Continuar sin customer_id, Stripe lo creará automáticamente
  }

  // Crear sesión de Checkout
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer: stripeCustomerId,
    customer_email: stripeCustomerId ? undefined : customer.email,
    success_url: successUrl || `${stripeConfig.successUrl.oneTime}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || stripeConfig.cancelUrl,
    shipping_address_collection: {
      allowed_countries: ['MX'], // México
    },
    phone_number_collection: {
      enabled: true,
    },
    billing_address_collection: 'auto', // Cambiar de 'required' a 'auto' para OXXO
    metadata: {
      ...metadata,
      user_id: customer.userId || '',
      customer_name: `${customer.firstName} ${customer.lastName}`,
      shipping_address: JSON.stringify(shipping),
    },
    payment_method_types: ['card', 'oxxo'], // Habilitar tarjetas y OXXO
    locale: 'es',
    // Configuración adicional para OXXO
    payment_method_options: {
      oxxo: {
        expires_after_days: 3, // Voucher válido por 3 días
      },
    },
  })

  return session
}

/**
 * Crea una sesión de Checkout para suscripciones
 */
export async function createSubscriptionCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const { items, customer, shipping, successUrl, cancelUrl, metadata = {} } = params

  // Filtrar items de suscripción
  const subscriptionItems = items.filter(item => item.isSubscription)
  
  if (subscriptionItems.length === 0) {
    throw new Error('No se encontraron items de suscripción')
  }

  // Nota: Stripe solo permite crear una suscripción a la vez en Checkout
  // Si hay múltiples items, se procesará solo el primero
  const subscriptionItem = subscriptionItems[0]
  
  if (subscriptionItems.length > 1) {
    console.warn('⚠️ Múltiples suscripciones detectadas. Stripe Checkout solo permite una suscripción por sesión. Procesando solo la primera.')
  }

  // Obtener intervalo de facturación
  const { interval, interval_count } = getSubscriptionInterval(
    subscriptionItem.subscriptionType || 'monthly'
  )

  // Calcular subtotal para determinar costo de envío
  const subtotal = subscriptionItem.price * subscriptionItem.quantity
  const shippingCost = subtotal >= 1000 ? 0 : 100

  // Crear o encontrar cliente en Stripe
  let stripeCustomerId: string

  try {
    // Buscar si ya existe un cliente con este email
    const existingCustomers = await stripe.customers.list({
      email: customer.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      stripeCustomerId = existingCustomers.data[0].id
    } else {
      // Crear nuevo cliente
      const newCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        metadata: {
          user_id: customer.userId || '',
        },
      })
      stripeCustomerId = newCustomer.id
    }
  } catch (error) {
    console.error('Error al crear/buscar cliente:', error)
    throw new Error('No se pudo crear el cliente para la suscripción')
  }

  // Crear line item para suscripción
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: stripeConfig.currency,
        product_data: {
          name: subscriptionItem.name,
          description: `Suscripción ${subscriptionItem.subscriptionType} - ${subscriptionItem.size || 'Standard'}`,
          images: subscriptionItem.image ? [subscriptionItem.image] : undefined,
          metadata: {
            product_id: subscriptionItem.id.toString(),
            size: subscriptionItem.size || 'Standard',
            subscription_type: subscriptionItem.subscriptionType || 'monthly',
          },
        },
        unit_amount: Math.round(subscriptionItem.price * 100),
        recurring: {
          interval,
          interval_count,
        },
      },
      quantity: subscriptionItem.quantity,
    },
  ]

  // Agregar envío como line item recurrente si no es gratis
  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: stripeConfig.currency,
        product_data: {
          name: 'Envío',
          description: 'Costo de envío a domicilio (recurrente)',
        },
        unit_amount: Math.round(shippingCost * 100),
        recurring: {
          interval,
          interval_count,
        },
      },
      quantity: 1,
    })
  }

  // Crear sesión de Checkout para suscripción
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: lineItems,
    customer: stripeCustomerId,
    success_url: `${successUrl || stripeConfig.successUrl.subscription}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || stripeConfig.cancelUrl,
    shipping_address_collection: {
      allowed_countries: ['MX'],
    },
    phone_number_collection: {
      enabled: true,
    },
    billing_address_collection: 'required',
    metadata: {
      ...metadata,
      user_id: customer.userId || '',
      customer_name: `${customer.firstName} ${customer.lastName}`,
      shipping_address: JSON.stringify(shipping),
      subscription_type: subscriptionItem.subscriptionType || 'monthly',
      product_id: subscriptionItem.id.toString(),
    },
    payment_method_types: ['card'], // OXXO no está disponible para suscripciones recurrentes
    locale: 'es',
    subscription_data: {
      metadata: {
        user_id: customer.userId || '',
        product_id: subscriptionItem.id.toString(),
        subscription_type: subscriptionItem.subscriptionType || 'monthly',
      },
    },
  })

  return session
}

/**
 * Crea una sesión de Checkout (detecta automáticamente si es suscripción o pago único)
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ url: string; sessionId: string }> {
  const hasSubscription = params.items.some(item => item.isSubscription)

  let session: Stripe.Checkout.Session

  if (hasSubscription) {
    session = await createSubscriptionCheckoutSession(params)
  } else {
    session = await createOneTimeCheckoutSession(params)
  }

  if (!session.url) {
    throw new Error('No se pudo generar la URL de checkout')
  }

  return {
    url: session.url,
    sessionId: session.id,
  }
}

/**
 * Recupera una sesión de Checkout por ID
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'line_items', 'subscription'],
  })
}

/**
 * Crea un portal de cliente para gestionar suscripciones
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl?: string
): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || stripeConfig.successUrl.subscription,
  })

  return {
    url: session.url,
  }
}
