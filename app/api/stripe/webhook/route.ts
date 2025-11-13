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
      console.log('[WEBHOOK] 📧 Intentando enviar email de confirmación...')
      console.log('[WEBHOOK] SMTP Config Check:', {
        hasHost: !!process.env.SMTP_HOST,
        hasUser: !!process.env.SMTP_USER,
        hasPass: !!process.env.SMTP_PASS,
        hasFrom: !!process.env.EMAIL_FROM
      })
      
      const { sendOrderStatusEmail } = await import('@/lib/email-service')
      
      if (customerEmail) {
        console.log('[WEBHOOK] Email destinatario:', customerEmail)
        
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

        console.log('[WEBHOOK] Datos de orden para email:', {
          orderId: orderDataForEmail.id,
          total: orderDataForEmail.total,
          productsCount: orderDataForEmail.products.length
        })

        const emailResult = await sendOrderStatusEmail('pending', customerEmail, orderDataForEmail)
        
        if (emailResult && emailResult.success) {
          console.log('[WEBHOOK] ✅ Email de confirmación enviado exitosamente:', {
            to: customerEmail,
            messageId: emailResult.messageId,
            attempts: emailResult.attempts
          })
        } else {
          console.error('[WEBHOOK] ❌ Email no se pudo enviar:', {
            to: customerEmail,
            error: emailResult?.error || 'Unknown error'
          })
        }
      } else {
        console.warn('[WEBHOOK] ⚠️ No hay email del cliente para enviar confirmación')
      }
    } catch (emailError) {
      console.error('[WEBHOOK] ❌ Error crítico enviando email de confirmación:', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
        orderId: order.id,
        customerEmail: customerEmail
      })
      // No lanzar error, solo registrar
    }

  } else if (session.mode === 'subscription') {
    // Suscripción - Crear/actualizar suscripción
    const subscriptionId = session.subscription as string
    
    // Expandir la suscripción para obtener todos los datos
    const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'default_payment_method']
    }) as any

    console.log('✅ Subscription data retrieved:', {
      id: subscriptionData.id,
      status: subscriptionData.status,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      billing_cycle_anchor: subscriptionData.billing_cycle_anchor
    })

    // Obtener timestamps de período actual (con múltiples fallbacks)
    let currentPeriodStart = subscriptionData.current_period_start || subscriptionData.billing_cycle_anchor
    let currentPeriodEnd = subscriptionData.current_period_end
    
    // Si no hay current_period_end, calcularlo basado en el tipo de suscripción
    if (!currentPeriodStart || !currentPeriodEnd) {
      const now = Math.floor(Date.now() / 1000)
      currentPeriodStart = currentPeriodStart || now
      
      // Calcular período basado en el tipo de suscripción
      const subscriptionType = metadata.subscription_type || 'monthly'
      let daysToAdd = 30 // Por defecto mensual
      
      switch (subscriptionType) {
        case 'weekly':
          daysToAdd = 7
          break
        case 'biweekly':
          daysToAdd = 14
          break
        case 'monthly':
          daysToAdd = 30
          break
        case 'quarterly':
          daysToAdd = 90
          break
        case 'annual':
          daysToAdd = 365
          break
      }
      
      currentPeriodEnd = currentPeriodEnd || (currentPeriodStart + (daysToAdd * 24 * 60 * 60))
    }
    
    console.log('📅 Calculated periods:', {
      start: new Date(currentPeriodStart * 1000).toISOString(),
      end: new Date(currentPeriodEnd * 1000).toISOString()
    })

    // Obtener información del producto desde line items
    const subscriptionLineItem = lineItems.data[0]
    const product = subscriptionLineItem.price?.product as any
    const productMetadata = product?.metadata || {}
    const productId = productMetadata.product_id

    // Calcular precio TOTAL de la suscripción (incluye todos los line items: producto + envío)
    const totalAmount = lineItems.data.reduce((sum, item) => {
      return sum + ((item.price?.unit_amount || 0) / 100) * (item.quantity || 1)
    }, 0)

    // Precio base del producto (sin envío)
    const unitAmount = subscriptionLineItem.price?.unit_amount || 0
    const priceInMXN = unitAmount / 100

    // Obtener información adicional del producto desde la BD
    let productFromDB = null
    let basePrice = priceInMXN
    let discountPercentage = 0
    
    if (productId) {
      const { data: productData } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', parseInt(productId))
        .single()
      
      if (productData) {
        productFromDB = productData
        basePrice = productData.price
        
        // Calcular descuento según el tipo de suscripción
        const subscriptionType = metadata.subscription_type || 'monthly'
        switch (subscriptionType) {
          case 'weekly':
            discountPercentage = productData.weekly_discount || 0
            break
          case 'biweekly':
            discountPercentage = productData.biweekly_discount || 0
            break
          case 'monthly':
            discountPercentage = productData.monthly_discount || 0
            break
          case 'quarterly':
            discountPercentage = productData.quarterly_discount || 0
            break
          case 'annual':
            discountPercentage = productData.annual_discount || 0
            break
          default:
            discountPercentage = productData.monthly_discount || 0
        }
      }
    }

    // Determinar frequency y frequency_type según subscription_type
    const subscriptionType = metadata.subscription_type || 'monthly'
    let frequency = 1
    let frequencyType = 'months'
    
    switch (subscriptionType) {
      case 'weekly':
        frequency = 1
        frequencyType = 'weeks'
        break
      case 'biweekly':
        frequency = 2
        frequencyType = 'weeks'
        break
      case 'monthly':
        frequency = 1
        frequencyType = 'months'
        break
      case 'quarterly':
        frequency = 3
        frequencyType = 'months'
        break
      case 'annual':
        frequency = 12
        frequencyType = 'months'
        break
    }

    const { data: subs, error } = await supabaseAdmin
      .from('unified_subscriptions')
      .insert({
        user_id: userId || null,
        customer_email: session.customer_email || session.customer_details?.email,
        customer_name: customerName,
        customer_phone: session.customer_details?.phone || null,
        product_id: productId ? parseInt(productId) : null,
        product_name: subscriptionLineItem.description || productFromDB?.name || 'Suscripción Pet Gourmet',
        product_image: product?.images?.[0] || productFromDB?.image || null,
        subscription_type: subscriptionType,
        status: 'active',
        base_price: basePrice,
        discounted_price: priceInMXN,
        discount_percentage: discountPercentage,
        transaction_amount: totalAmount, // Total incluyendo producto + envío
        size: productMetadata.size || null,
        frequency: frequency,
        frequency_type: frequencyType,
        next_billing_date: new Date(currentPeriodEnd * 1000).toISOString(),
        last_billing_date: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        stripe_price_id: subscriptionData.items.data[0].price.id,
        shipping_address: shippingAddress,
        customer_data: {
          email: session.customer_email || session.customer_details?.email,
          firstName: customerName?.split(' ')[0] || '',
          lastName: customerName?.split(' ').slice(1).join(' ') || '',
          phone: session.customer_details?.phone || null,
          address: shippingAddress
        },
        cart_items: [{
          product_id: productId ? parseInt(productId) : null,
          product_name: subscriptionLineItem.description || productFromDB?.name,
          name: subscriptionLineItem.description || productFromDB?.name,
          image: product?.images?.[0] || productFromDB?.image,
          price: priceInMXN,
          quantity: subscriptionLineItem.quantity || 1,
          size: productMetadata.size || null,
          isSubscription: true,
          subscriptionType: subscriptionType
        }],
        metadata: metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear suscripción:', error)
      throw error
    }

    console.log('✅ Suscripción creada con todos los campos:', subs.id)
    
    // Enviar email de confirmación de suscripción
    try {
      const { sendSubscriptionEmail } = await import('@/lib/email-service')
      
      const subscriptionEmailData = {
        user_email: session.customer_email || session.customer_details?.email || '',
        user_name: customerName,
        subscription_type: subscriptionType,
        amount: totalAmount,
        next_payment_date: new Date(currentPeriodEnd * 1000).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        plan_description: `${subscriptionLineItem.description || productFromDB?.name || 'Suscripción Pet Gourmet'} - Cada ${frequency} ${frequencyType === 'weeks' ? 'semana(s)' : 'mes(es)'}`,
        external_reference: subscriptionId
      }

      await sendSubscriptionEmail('created', subscriptionEmailData)
      console.log('✅ Email de confirmación de suscripción enviado a:', subscriptionEmailData.user_email)
    } catch (emailError) {
      console.error('❌ Error enviando email de confirmación de suscripción:', emailError)
      // No lanzar error, solo registrar
    }
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
