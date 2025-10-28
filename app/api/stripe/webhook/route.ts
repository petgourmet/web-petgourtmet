/**
 * API Route: Webhook de Stripe
 * 
 * POST /api/stripe/webhook
 * 
 * Maneja eventos de Stripe (pagos completados, suscripciones creadas, etc.)
 * Documentación: https://docs.stripe.com/webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Configuración de Supabase con Service Role Key para operaciones admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Maneja el evento checkout.session.completed
 * Se dispara cuando un pago o suscripción se completa
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id)

  const metadata = session.metadata || {}
  const userId = metadata.user_id
  const customerName = metadata.customer_name
  const shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null

  // Obtener line items
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  })

  if (session.mode === 'payment') {
    // Pago único - Crear orden
    
    // Preparar datos del cliente desde session
    let customerEmail = session.customer_email || session.customer_details?.email || null
    let customerPhone = session.customer_details?.phone || null
    
    // Intentar extraer del metadata si está disponible
    let shippingData = null
    try {
      if (metadata.shipping_address) {
        shippingData = typeof metadata.shipping_address === 'string' 
          ? JSON.parse(metadata.shipping_address) 
          : metadata.shipping_address
      }
    } catch (e) {
      console.error('Error parsing shipping_address:', e)
    }

    // Construir objeto completo de shipping_address con todos los datos
    const fullShippingAddress = {
      customer: {
        name: customerName || session.customer_details?.name,
        email: customerEmail,
        phone: customerPhone,
      },
      shipping: shippingData || shippingAddress,
      items: lineItems.data.map((item: any) => ({
        id: item.id,
        product_id: item.price?.product?.metadata?.product_id || null,
        name: item.description,
        quantity: item.quantity,
        price: (item.amount_total || 0) / 100 / (item.quantity || 1),
        unit_price: (item.amount_total || 0) / 100 / (item.quantity || 1),
        product_name: item.description,
        product_image: item.price?.product?.images?.[0] || null,
      }))
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId || null,
        customer_email: customerEmail,
        customer_name: customerName || session.customer_details?.name,
        customer_phone: customerPhone,
        total: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'MXN',
        payment_status: 'paid',
        status: 'pending',
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_customer_id: session.customer as string,
        shipping_address: fullShippingAddress,
        metadata: metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear orden:', error)
      throw error
    }

    console.log('Orden creada:', order.id)

    // Crear order_items individuales
    const orderItems = []
    for (const item of lineItems.data) {
      // Extraer product_id del metadata del producto de Stripe
      const productMetadata = (item.price?.product as any)?.metadata || {}
      const productId = productMetadata.product_id

      if (!productId) {
        console.warn('Line item sin product_id:', item.id, item.description)
        continue
      }

      // Obtener la imagen del producto desde Stripe
      const product = item.price?.product as any
      let productImage = product?.images?.[0] || null
      
      // Si no hay imagen en Stripe, obtenerla de la base de datos
      if (!productImage) {
        const { data: productData } = await supabaseAdmin
          .from('products')
          .select('image')
          .eq('id', parseInt(productId))
          .single()
        
        productImage = productData?.image || ''
      }

      orderItems.push({
        order_id: order.id,
        product_id: parseInt(productId),
        product_name: item.description,
        product_image: productImage,
        quantity: item.quantity || 1,
        price: (item.amount_total || 0) / 100 / (item.quantity || 1),
        size: productMetadata.size || null,
      })
    }

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error al crear order_items:', itemsError)
      } else {
        console.log(`${orderItems.length} order_items creados para orden ${order.id}`)
      }
    }

    // Enviar email de confirmación al cliente
    try {
      const { sendOrderStatusEmail } = await import('@/lib/email-service')
      
      if (customerEmail) {
        // Preparar datos para el email
        const orderDataForEmail = {
          id: order.id,
          total: order.total,
          products: orderItems.map(item => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.price
          })),
          shipping_address: fullShippingAddress?.shipping || null
        }

        await sendOrderStatusEmail('pending', customerEmail, orderDataForEmail)
        console.log('✅ Email de confirmación enviado a:', customerEmail)
      }
    } catch (emailError) {
      console.error('❌ Error enviando email de confirmación:', emailError)
      // No lanzar error, solo registrar
    }

  } else if (session.mode === 'subscription') {
    // Suscripción - Crear/actualizar suscripción
    const subscriptionId = session.subscription as string
    const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId)

    const { data: subs, error } = await supabaseAdmin
      .from('unified_subscriptions')
      .insert({
        user_id: userId || null,
        customer_email: session.customer_email || session.customer_details?.email,
        customer_name: customerName,
        subscription_type: metadata.subscription_type || 'monthly',
        status: 'active',
        current_period_start: new Date((subscriptionData as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((subscriptionData as any).current_period_end * 1000).toISOString(),
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        stripe_price_id: subscriptionData.items.data[0].price.id,
        amount: (subscriptionData.items.data[0].price.unit_amount || 0) / 100,
        currency: (subscriptionData as any).currency.toUpperCase(),
        shipping_address: shippingAddress,
        metadata: metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear suscripción:', error)
      throw error
    }

    console.log('Suscripción creada:', subs.id)
  }
}

/**
 * Maneja el evento invoice.payment_succeeded
 * Se dispara cuando se paga una factura de suscripción
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id)

  const invoiceData = invoice as any
  
  if (!invoiceData.subscription) {
    return // No es una factura de suscripción
  }

  const subscriptionId = invoiceData.subscription as string

  // Actualizar el estado de la suscripción
  const { error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: 'active',
      last_payment_date: new Date(invoice.created * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error al actualizar suscripción:', error)
  }
}

/**
 * Maneja el evento invoice.payment_failed
 * Se dispara cuando falla el pago de una factura de suscripción
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id)

  const invoiceData = invoice as any

  if (!invoiceData.subscription) {
    return
  }

  const subscriptionId = invoiceData.subscription as string

  // Marcar la suscripción como con problema de pago
  const { error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error al actualizar suscripción:', error)
  }
}

/**
 * Maneja el evento customer.subscription.updated
 * Se dispara cuando se actualiza una suscripción
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)

  const subscriptionData = subscription as any

  const { error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: subscriptionData.status,
      current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error al actualizar suscripción:', error)
  }
}

/**
 * Maneja el evento customer.subscription.deleted
 * Se dispara cuando se cancela una suscripción
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  const { error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error al actualizar suscripción:', error)
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado')
    return NextResponse.json(
      { error: 'Webhook secret no configurado' },
      { status: 500 }
    )
  }

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Falta la firma de Stripe' },
        { status: 400 }
      )
    }

    // Verificar el webhook
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Error al verificar webhook:', err)
      return NextResponse.json(
        { error: 'Firma de webhook inválida' },
        { status: 400 }
      )
    }

    // Manejar diferentes tipos de eventos
    console.log('Webhook recibido:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error al procesar webhook:', error)
    return NextResponse.json(
      { error: 'Error al procesar webhook' },
      { status: 500 }
    )
  }
}
