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
import { createOrderFromSession } from '@/lib/stripe/create-order'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Aumentar timeout para webhook (Netlify Pro: hasta 26s)

// Configuración de Supabase con Service Role Key para operaciones admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Maneja el evento checkout.session.completed
 * Usa la utilidad compartida createOrderFromSession para idempotencia
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('[WEBHOOK] Checkout session completed:', session.id)

  if (session.mode === 'payment') {
    // Pago único - Usar utilidad compartida idempotente
    try {
      const result = await createOrderFromSession(session.id, 'webhook')
      console.log(`[WEBHOOK] ✅ Orden ${result.isNew ? 'creada' : 'ya existía'}: ${result.order.id}`)
    } catch (error: any) {
      console.error('[WEBHOOK] ❌ Error creando orden:', error.message)
      throw error
    }
  } else if (session.mode === 'subscription') {
    // Suscripción - Crear/actualizar suscripción
    const metadata = session.metadata || {}
    const userId = metadata.user_id
    const customerName = metadata.customer_name
    
    // Dirección de envío: primero desde metadata del checkout modal, luego desde Stripe shipping_details
    let shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null

    // Extraer shipping_details del evento webhook
    const sessionAny = session as any
    if (!shippingAddress && sessionAny.shipping_details) {
      const sd = sessionAny.shipping_details
      shippingAddress = {
        address: sd.address?.line1 || '',
        address2: sd.address?.line2 || '',
        city: sd.address?.city || '',
        state: sd.address?.state || '',
        postalCode: sd.address?.postal_code || '',
        country: sd.address?.country || 'MX',
        name: sd.name || customerName || '',
      }
      console.log('📦 [WEBHOOK] Dirección obtenida de Stripe shipping_details (evento):', shippingAddress)
    }

    // Si aún no hay dirección, recuperar sesión completa de la API de Stripe para garantizar la dirección
    if (!shippingAddress) {
      try {
        const fullSession = await stripe.checkout.sessions.retrieve(session.id) as any
        if (fullSession.shipping_details) {
          const sd = fullSession.shipping_details
          shippingAddress = {
            address: sd.address?.line1 || '',
            address2: sd.address?.line2 || '',
            city: sd.address?.city || '',
            state: sd.address?.state || '',
            postalCode: sd.address?.postal_code || '',
            country: sd.address?.country || 'MX',
            name: sd.name || customerName || '',
          }
          console.log('📦 [WEBHOOK] Dirección obtenida de Stripe retrieve session:', shippingAddress)
        } else if (fullSession.customer_details?.address) {
          // Fallback a billing address del customer
          const ba = fullSession.customer_details.address
          shippingAddress = {
            address: ba.line1 || '',
            address2: ba.line2 || '',
            city: ba.city || '',
            state: ba.state || '',
            postalCode: ba.postal_code || '',
            country: ba.country || 'MX',
            name: fullSession.customer_details.name || customerName || '',
          }
          console.log('📦 [WEBHOOK] Dirección obtenida de customer_details (billing):', shippingAddress)
        }
      } catch (retrieveError) {
        console.error('⚠️ [WEBHOOK] Error al recuperar sesión para dirección:', retrieveError)
      }
    }

    if (!shippingAddress) {
      console.warn('⚠️ [WEBHOOK] No se pudo obtener dirección de envío para sesión:', session.id)
    }

    // Obtener line items para suscripción
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
    })

    const subscriptionId = session.subscription as string
    
    // Verificar si la suscripción ya existe
    const { data: existingSubscription } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('id, status, base_price, discounted_price, transaction_amount')
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    
    if (existingSubscription) {
      // Si la suscripción existe PERO tiene precios en 0 o null, reparar datos
      const needsRepair = !existingSubscription.base_price || 
                          !existingSubscription.discounted_price || 
                          !existingSubscription.transaction_amount
      
      if (!needsRepair) {
        console.log('⚠️ Suscripción ya existe con datos completos:', subscriptionId, '- Saltando')
        return // Ya fue procesada correctamente
      }
      
      console.log('🔧 Suscripción existe pero tiene datos incompletos, reparando:', subscriptionId)
      // Continuar para obtener datos de Stripe y actualizar
    }
    
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
    // product_id desde metadata del producto Stripe O desde metadata de la sesión
    const productId = productMetadata.product_id || metadata.product_id

    console.log('📦 [WEBHOOK] Line items recibidos:', lineItems.data.length, lineItems.data.map(li => ({
      description: li.description,
      unit_amount: li.price?.unit_amount,
      quantity: li.quantity,
    })))

    // Calcular precio TOTAL de la suscripción (incluye todos los line items: producto + envío)
    const totalAmount = lineItems.data.reduce((sum, item) => {
      return sum + ((item.price?.unit_amount || 0) / 100) * (item.quantity || 1)
    }, 0)

    // Precio base del producto (sin envío)
    const unitAmount = subscriptionLineItem.price?.unit_amount || 0
    const priceInMXN = unitAmount / 100

    console.log('💰 [WEBHOOK] Precios calculados:', {
      unitAmount,
      priceInMXN,
      totalAmount,
      productId,
      productMetadata,
    })

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

    const subscriptionRecord = {
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
      discounted_price: priceInMXN || basePrice,
      discount_percentage: discountPercentage,
      transaction_amount: totalAmount, // Total incluyendo producto + envío
      quantity: subscriptionLineItem.quantity || 1,
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
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    }

    let subs: any
    let error: any

    if (existingSubscription) {
      // Reparar suscripción existente con datos incompletos
      const { data, error: updateError } = await supabaseAdmin
        .from('unified_subscriptions')
        .update(subscriptionRecord)
        .eq('id', existingSubscription.id)
        .select()
        .single()
      
      if (updateError && updateError.code === 'P0001') {
        // Trigger de deduplicación: ya existe suscripción activa para este user+product
        // Reintentar sin product_id
        console.warn('⚠️ [WEBHOOK] Trigger de deduplicación, reintentando sin product_id:', updateError.message)
        const { product_id, ...recordSinProductId } = subscriptionRecord
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from('unified_subscriptions')
          .update(recordSinProductId)
          .eq('id', existingSubscription.id)
          .select()
          .single()
        subs = retryData
        error = retryError
      } else {
        subs = data
        error = updateError
      }
    } else {
      // Crear nueva suscripción
      const { data, error: insertError } = await supabaseAdmin
        .from('unified_subscriptions')
        .insert({
          ...subscriptionRecord,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (insertError && insertError.code === 'P0001') {
        // Ya existe suscripción activa para este user+product (race condition con sync)
        console.warn('⚠️ [WEBHOOK] Suscripción duplicada detectada, buscando existente:', insertError.message)
        const { data: existing } = await supabaseAdmin
          .from('unified_subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscriptionRecord.stripe_subscription_id)
          .single()
        subs = existing
        error = null
      } else {
        subs = data
        error = insertError
      }
    }

    if (error) {
      console.error('Error al crear/actualizar suscripción:', error)
      throw error
    }

    console.log(`✅ Suscripción ${existingSubscription ? 'reparada' : 'creada'}:`, subs.id, {
      base_price: basePrice,
      discounted_price: priceInMXN,
      transaction_amount: totalAmount,
    })
    
    // Enviar email de confirmación solo si es nueva (no al reparar)
    if (!existingSubscription) {
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
        external_reference: subscriptionId,
        subscription_id: subs.id
      }

      const adminSubscriptionData = {
        user_email: 'contacto@petgourmet.mx',
        user_name: 'Admin Pet Gourmet',
        subscription_type: subscriptionType,
        amount: totalAmount,
        next_payment_date: new Date(currentPeriodEnd * 1000).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        plan_description: `${customerName} - ${subscriptionLineItem.description || productFromDB?.name || 'Suscripción Pet Gourmet'} - $${totalAmount.toFixed(2)} MXN`,
        external_reference: subscriptionId
      }

      // Enviar emails al cliente y admin en paralelo
      const emailResults = await Promise.allSettled([
        sendSubscriptionEmail('created', subscriptionEmailData),
        sendSubscriptionEmail('created', adminSubscriptionData)
      ])

      emailResults.forEach((result, i) => {
        const dest = i === 0 ? subscriptionEmailData.user_email : 'contacto@petgourmet.mx'
        if (result.status === 'fulfilled') {
          console.log(`✅ Email de confirmación de suscripción enviado a: ${dest}`)
        } else {
          console.error(`❌ Error enviando email de suscripción a ${dest}:`, result.reason)
        }
      })
    } catch (emailError) {
      console.error('❌ Error enviando email de confirmación de suscripción:', emailError)
      // No lanzar error, solo registrar
    }
    } // fin de !existingSubscription
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

  // Obtener la suscripción de Stripe para actualizar fechas
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as any
  
  const nextBillingDate = stripeSubscription.current_period_end 
    ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
    : null

  // Obtener la suscripción de la BD
  const { data: subscription } = await supabaseAdmin
    .from('unified_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.warn('⚠️ Suscripción no encontrada en BD:', subscriptionId)
    return
  }

  // Actualizar el estado de la suscripción con fechas actualizadas
  const { error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: 'active',
      last_payment_date: new Date(invoice.created * 1000).toISOString(),
      last_billing_date: new Date(invoice.created * 1000).toISOString(),
      next_billing_date: nextBillingDate,
      current_period_start: stripeSubscription.current_period_start
        ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: nextBillingDate,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('❌ Error al actualizar suscripción:', error)
  } else {
    console.log('✅ Suscripción actualizada con nuevas fechas:', {
      subscriptionId,
      lastPayment: new Date(invoice.created * 1000).toISOString(),
      nextBilling: nextBillingDate
    })
  }

  // Registrar el pago en subscription_payments
  try {
    const { error: paymentError } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'MXN',
        status: 'succeeded',
        payment_date: new Date(invoice.created * 1000).toISOString(),
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: (invoiceData.payment_intent as string) || null,
        stripe_charge_id: (invoiceData.charge as string) || null,
        period_start: stripeSubscription.current_period_start
          ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
          : null,
        period_end: nextBillingDate,
        metadata: {
          invoice_number: invoice.number,
          customer_email: invoice.customer_email,
        }
      })

    if (paymentError) {
      console.error('❌ Error registrando pago:', paymentError)
    } else {
      console.log('✅ Pago registrado en subscription_payments')
    }
  } catch (paymentError) {
    console.error('❌ Error al registrar pago:', paymentError)
  }

  // Enviar notificaciones por email
  try {
    const { sendSubscriptionEmail } = await import('@/lib/email-service')
    
    const paymentNextDate = nextBillingDate
      ? new Date(nextBillingDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Próximamente'

    // Enviar emails al cliente y admin en paralelo
    const paymentEmailResults = await Promise.allSettled([
      sendSubscriptionEmail('payment', {
        user_email: subscription.customer_email,
        user_name: subscription.customer_name,
        subscription_type: subscription.subscription_type,
        amount: (invoice.amount_paid || 0) / 100,
        next_payment_date: paymentNextDate,
        plan_description: subscription.product_name,
        external_reference: subscriptionId,
        subscription_id: subscription.id
      }),
      sendSubscriptionEmail('payment', {
        user_email: 'contacto@petgourmet.mx',
        user_name: 'Admin Pet Gourmet',
        subscription_type: subscription.subscription_type,
        amount: (invoice.amount_paid || 0) / 100,
        next_payment_date: paymentNextDate,
        plan_description: `${subscription.customer_name} - ${subscription.product_name} - $${((invoice.amount_paid || 0) / 100).toFixed(2)} MXN`,
        external_reference: subscriptionId
      })
    ])

    paymentEmailResults.forEach((result, i) => {
      const dest = i === 0 ? subscription.customer_email : 'contacto@petgourmet.mx'
      if (result.status === 'fulfilled') {
        console.log(`✅ Email de pago enviado a: ${dest}`)
      } else {
        console.error(`❌ Error enviando email de pago a ${dest}:`, result.reason)
      }
    })
  } catch (emailError) {
    console.error('❌ Error enviando emails de pago:', emailError)
    // No fallar el webhook por error de email
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

  // Obtener la suscripción de la BD
  const { data: subscription } = await supabaseAdmin
    .from('unified_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.warn('⚠️ Suscripción no encontrada en BD:', subscriptionId)
    return
  }

  // Marcar la suscripción como con problema de pago
  const { error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('❌ Error al actualizar suscripción:', error)
  } else {
    console.log('✅ Suscripción marcada como past_due:', subscriptionId)
  }

  // Registrar el intento de pago fallido
  try {
    const { error: paymentError } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency?.toUpperCase() || 'MXN',
        status: 'failed',
        payment_date: new Date(invoice.created * 1000).toISOString(),
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: (invoiceData.payment_intent as string) || null,
        failure_message: 'Payment failed',
        failure_code: invoiceData.last_payment_error?.code || 'unknown',
        metadata: {
          invoice_number: invoice.number,
          customer_email: invoice.customer_email,
          attempt_count: invoiceData.attempt_count || 1
        }
      })

    if (paymentError) {
      console.error('❌ Error registrando pago fallido:', paymentError)
    } else {
      console.log('✅ Pago fallido registrado en subscription_payments')
    }
  } catch (paymentError) {
    console.error('❌ Error al registrar pago fallido:', paymentError)
  }

  // Enviar notificaciones de error de pago
  try {
    const { sendSubscriptionEmail } = await import('@/lib/email-service')
    
    // Enviar emails al cliente y admin en paralelo
    const failedEmailResults = await Promise.allSettled([
      sendSubscriptionEmail('payment_failed', {
        user_email: subscription.customer_email,
        user_name: subscription.customer_name,
        subscription_type: subscription.subscription_type,
        amount: (invoice.amount_due || 0) / 100,
        plan_description: subscription.product_name,
        external_reference: subscriptionId
      }),
      sendSubscriptionEmail('payment_failed', {
        user_email: 'contacto@petgourmet.mx',
        user_name: 'Admin Pet Gourmet',
        subscription_type: subscription.subscription_type,
        amount: (invoice.amount_due || 0) / 100,
        plan_description: `${subscription.customer_name} - ${subscription.product_name} - PAGO FALLIDO`,
        external_reference: subscriptionId
      })
    ])

    failedEmailResults.forEach((result, i) => {
      const dest = i === 0 ? subscription.customer_email : 'contacto@petgourmet.mx'
      if (result.status === 'fulfilled') {
        console.log(`✅ Email de pago fallido enviado a: ${dest}`)
      } else {
        console.error(`❌ Error enviando email de pago fallido a ${dest}:`, result.reason)
      }
    })
  } catch (emailError) {
    console.error('❌ Error enviando emails de pago fallido:', emailError)
    // No fallar el webhook por error de email
  }
}

/**
 * Maneja el evento customer.subscription.updated
 * Se dispara cuando se actualiza una suscripción
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id)

  const subscriptionData = subscription as any
  const currentPeriodStart = new Date(subscriptionData.current_period_start * 1000).toISOString()
  const currentPeriodEnd = new Date(subscriptionData.current_period_end * 1000).toISOString()

  // Obtener datos actuales de la suscripción
  const { data: existingSubscription, error: fetchError } = await supabaseAdmin
    .from('unified_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (fetchError) {
    console.error('❌ Error al obtener suscripción existente:', fetchError)
    return
  }

  // Detectar cambios significativos
  const hasDateChanges = 
    existingSubscription?.current_period_start !== currentPeriodStart ||
    existingSubscription?.current_period_end !== currentPeriodEnd

  const hasStatusChange = existingSubscription?.status !== subscriptionData.status

  // Actualizar suscripción en base de datos
  const { data: updatedSubscription, error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: subscriptionData.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .select()
    .single()

  if (error) {
    console.error('❌ Error al actualizar suscripción:', error)
    return
  }

  console.log('✅ Suscripción actualizada en BD:', {
    id: subscription.id,
    status: subscriptionData.status,
    period: `${currentPeriodStart} - ${currentPeriodEnd}`,
    hasDateChanges,
    hasStatusChange
  })

  // Enviar notificaciones solo si hay cambios significativos
  if (hasDateChanges || hasStatusChange) {
    try {
      const { sendSubscriptionEmail } = await import('@/lib/email-service')
      
      // Preparar datos para el email
      const emailData = {
        user_email: updatedSubscription.customer_email,
        user_name: updatedSubscription.customer_name || 'Cliente',
        subscription_type: updatedSubscription.subscription_type,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        status: subscriptionData.status,
        plan_description: updatedSubscription.product_name || 'Suscripción Pet Gourmet',
        external_reference: updatedSubscription.external_reference,
        amount: updatedSubscription.amount || 0,
        next_payment_date: currentPeriodEnd
      }

      const updateEmailPromises = [
        sendSubscriptionEmail('subscription_updated', {
          ...emailData,
          user_email: 'contacto@petgourmet.mx',
          user_name: 'Admin Pet Gourmet',
          plan_description: `[ACTUALIZACIÓN] ${updatedSubscription.customer_name} - ${updatedSubscription.product_name}`,
          admin_details: {
            user_id: updatedSubscription.user_id,
            subscription_id: subscription.id,
            previous_period_start: existingSubscription?.current_period_start,
            previous_period_end: existingSubscription?.current_period_end,
            previous_status: existingSubscription?.status,
            changes: { dates: hasDateChanges, status: hasStatusChange }
          }
        })
      ]

      if (updatedSubscription.customer_email) {
        updateEmailPromises.unshift(sendSubscriptionEmail('subscription_updated', emailData))
      }

      const updateResults = await Promise.allSettled(updateEmailPromises)
      updateResults.forEach((result, i) => {
        const dest = updatedSubscription.customer_email && i === 0 ? updatedSubscription.customer_email : 'contacto@petgourmet.mx'
        if (result.status === 'fulfilled') {
          console.log(`✅ Email de actualización enviado a: ${dest}`)
        } else {
          console.error(`❌ Error enviando email de actualización a ${dest}:`, result.reason)
        }
      })

    } catch (emailError) {
      console.error('❌ Error enviando emails de actualización:', emailError)
      // No fallar el webhook por error de email
    }
  } else {
    console.log('ℹ️ Sin cambios significativos, no se envían notificaciones')
  }
}

/**
 * Maneja el evento customer.subscription.deleted
 * Se dispara cuando se cancela una suscripción
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🚫 Subscription deleted:', subscription.id)

  // Obtener la suscripción actual para enviar notificaciones
  const { data: existingSubscription } = await supabaseAdmin
    .from('unified_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  const { error } = await supabaseAdmin
    .from('unified_subscriptions')
    .update({
      status: 'canceled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('❌ Error al cancelar suscripción:', error)
  } else {
    console.log('✅ Suscripción cancelada en BD:', subscription.id)
  }

  // Enviar notificaciones de cancelación
  if (existingSubscription) {
    try {
      const { sendSubscriptionEmail } = await import('@/lib/email-service')
      
      // Enviar emails al cliente y admin en paralelo
      const cancelEmailResults = await Promise.allSettled([
        sendSubscriptionEmail('cancelled', {
          user_email: existingSubscription.customer_email,
          user_name: existingSubscription.customer_name,
          subscription_type: existingSubscription.subscription_type,
          amount: existingSubscription.amount || 0,
          plan_description: existingSubscription.product_name,
          external_reference: subscription.id
        }),
        sendSubscriptionEmail('cancelled', {
          user_email: 'contacto@petgourmet.mx',
          user_name: 'Admin Pet Gourmet',
          subscription_type: existingSubscription.subscription_type,
          amount: existingSubscription.amount || 0,
          plan_description: `${existingSubscription.customer_name} - ${existingSubscription.product_name} - CANCELADA`,
          external_reference: subscription.id,
          admin_details: {
            user_id: existingSubscription.user_id,
            subscription_id: existingSubscription.id,
            cancelled_at: new Date().toISOString(),
            last_payment_date: existingSubscription.last_payment_date
          }
        })
      ])

      cancelEmailResults.forEach((result, i) => {
        const dest = i === 0 ? existingSubscription.customer_email : 'contacto@petgourmet.mx'
        if (result.status === 'fulfilled') {
          console.log(`✅ Email de cancelación enviado a: ${dest}`)
        } else {
          console.error(`❌ Error enviando email de cancelación a ${dest}:`, result.reason)
        }
      })
    } catch (emailError) {
      console.error('❌ Error enviando emails de cancelación:', emailError)
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('🔔 [WEBHOOK] Webhook recibido - Inicio del procesamiento')
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET no está configurado')
    return NextResponse.json(
      { error: 'Webhook secret no configurado' },
      { status: 500 }
    )
  }

  console.log('✅ [WEBHOOK] STRIPE_WEBHOOK_SECRET configurado (longitud:', webhookSecret.length, ')')

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    console.log('🔔 [WEBHOOK] Body recibido, longitud:', body.length)
    console.log('🔔 [WEBHOOK] Signature presente:', !!signature)

    if (!signature) {
      console.error('❌ [WEBHOOK] No se recibió stripe-signature header')
      return NextResponse.json(
        { error: 'Falta la firma de Stripe' },
        { status: 400 }
      )
    }

    // Verificar el webhook
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log('✅ [WEBHOOK] Firma verificada correctamente')
    } catch (err) {
      console.error('❌ [WEBHOOK] Error al verificar firma:', err instanceof Error ? err.message : err)
      console.error('❌ [WEBHOOK] Webhook secret empieza con:', webhookSecret.substring(0, 8) + '...')
      return NextResponse.json(
        { error: 'Firma de webhook inválida' },
        { status: 400 }
      )
    }

    // Manejar diferentes tipos de eventos
    console.log('Webhook recibido:', event.type, 'ID:', event.id)

    try {
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

        // Eventos de OXXO
        case 'payment_intent.processing':
          // El cliente está en OXXO y aún no ha pagado
          console.log(`⏳ Pago OXXO en proceso: ${event.data.object.id}`)
          break

        case 'payment_intent.payment_failed':
          // El pago OXXO expiró o fue rechazado
          console.log(`❌ Pago OXXO fallido: ${event.data.object.id}`)
          break

        // Eventos que podemos ignorar silenciosamente
        case 'invoice.created':
        case 'invoice.finalized':
        case 'invoice.paid':
        case 'payment_intent.succeeded':
        case 'payment_intent.created':
        case 'charge.succeeded':
          console.log(`✅ Evento ${event.type} recibido (no requiere acción)`)
          break

        default:
          console.log(`ℹ️ Evento no manejado: ${event.type}`)
      }
    } catch (handlerError) {
      console.error(`❌ Error manejando evento ${event.type}:`, handlerError)
      // Retornar 500 para eventos críticos de creación de datos (checkout / suscripción)
      // para que Stripe pueda reintentar. Para eventos secundarios devolvemos 200.
      const criticalEvents = [
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'customer.subscription.deleted'
      ]
      if (criticalEvents.includes(event.type)) {
        return NextResponse.json(
          { error: 'Error crítico procesando evento', eventType: event.type },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Error crítico al procesar webhook:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      eventType: 'unknown'
    })
    
    return NextResponse.json(
      { 
        error: 'Error al procesar webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
