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
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId || null,
        customer_email: session.customer_email || session.customer_details?.email,
        customer_name: customerName,
        total: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'MXN',
        payment_status: 'paid',
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_customer_id: session.customer as string,
        shipping_address: shippingAddress,
        line_items: JSON.stringify(lineItems.data),
        metadata: metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear orden:', error)
      throw error
    }

    console.log('Orden creada:', order.id)

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
