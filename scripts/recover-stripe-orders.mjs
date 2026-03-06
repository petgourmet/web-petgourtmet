/**
 * Script de recuperación de órdenes desde Stripe
 * 
 * Busca todas las sesiones de checkout completadas en Stripe (producción)
 * y crea las órdenes faltantes en la base de datos.
 * 
 * Uso: node scripts/recover-stripe-orders.mjs
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno desde .env
config()

// ===== CONFIGURACIÓN (desde variables de entorno) =====
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
})

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Estadísticas
const stats = {
  totalStripe: 0,
  alreadyInDB: 0,
  recovered: 0,
  failed: 0,
  skippedSubscription: 0,
  skippedUnpaid: 0,
}

async function recoverOrders() {
  console.log('🔄 Iniciando recuperación de órdenes desde Stripe (producción)...\n')

  // 1. Obtener todas las sesiones existentes en DB
  const { data: existingOrders, error: dbError } = await supabase
    .from('orders')
    .select('stripe_session_id')
    .not('stripe_session_id', 'is', null)

  if (dbError) {
    console.error('❌ Error consultando órdenes existentes:', dbError)
    return
  }

  const existingSessionIds = new Set(
    (existingOrders || []).map(o => o.stripe_session_id)
  )
  console.log(`📦 Órdenes existentes en DB: ${existingSessionIds.size}\n`)

  // 2. Paginar por TODAS las sesiones de checkout completadas en Stripe
  let hasMore = true
  let startingAfter = undefined
  let pageNum = 0

  while (hasMore) {
    pageNum++
    console.log(`📄 Obteniendo página ${pageNum} de Stripe...`)

    const params = {
      limit: 100,
      status: 'complete',
    }
    if (startingAfter) {
      params.starting_after = startingAfter
    }

    const sessions = await stripe.checkout.sessions.list(params)
    stats.totalStripe += sessions.data.length

    for (const session of sessions.data) {
      // Saltar si ya existe en DB
      if (existingSessionIds.has(session.id)) {
        stats.alreadyInDB++
        continue
      }

      // Saltar suscripciones (se manejan diferente)
      if (session.mode === 'subscription') {
        stats.skippedSubscription++
        console.log(`  ⏭️  Suscripción (skip): ${session.id}`)
        continue
      }

      // Solo procesar pagos completados
      if (session.payment_status !== 'paid') {
        stats.skippedUnpaid++
        console.log(`  ⏭️  No pagado (${session.payment_status}): ${session.id}`)
        continue
      }

      // RECUPERAR: Crear la orden
      try {
        await createOrderFromStripeSession(session)
        stats.recovered++
        console.log(`  ✅ Orden recuperada: ${session.id} | ${session.customer_email || 'sin email'} | $${(session.amount_total || 0) / 100}`)
      } catch (err) {
        stats.failed++
        console.error(`  ❌ Error recuperando ${session.id}:`, err.message)
      }
    }

    hasMore = sessions.has_more
    if (hasMore && sessions.data.length > 0) {
      startingAfter = sessions.data[sessions.data.length - 1].id
    }
  }

  // 3. Resumen final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE RECUPERACIÓN')
  console.log('='.repeat(60))
  console.log(`  Total sesiones en Stripe:    ${stats.totalStripe}`)
  console.log(`  Ya existían en DB:           ${stats.alreadyInDB}`)
  console.log(`  Suscripciones (skip):        ${stats.skippedSubscription}`)
  console.log(`  No pagadas (skip):           ${stats.skippedUnpaid}`)
  console.log(`  ✅ Órdenes recuperadas:      ${stats.recovered}`)
  console.log(`  ❌ Errores:                  ${stats.failed}`)
  console.log('='.repeat(60))
}

async function createOrderFromStripeSession(session) {
  const metadata = session.metadata || {}
  const userId = metadata.user_id || null
  const customerName = metadata.customer_name || session.customer_details?.name || null
  const customerEmail = session.customer_email || session.customer_details?.email || null
  const customerPhone = session.customer_details?.phone || null

  // Parsear dirección de envío
  let shippingData = null
  try {
    if (metadata.shipping_address) {
      shippingData = typeof metadata.shipping_address === 'string'
        ? JSON.parse(metadata.shipping_address)
        : metadata.shipping_address
    }
  } catch (e) {
    // ignorar error de parsing
  }

  // Obtener line items (pueden venir expandidos o hay que pedirlos)
  let lineItems = session.line_items?.data || []
  if (lineItems.length === 0) {
    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
    })
    lineItems = lineItemsResponse.data
  }

  const fullShippingAddress = {
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    shipping: shippingData,
    items: lineItems.map(item => ({
      id: item.id,
      product_id: item.price?.product?.metadata?.product_id || null,
      name: item.description,
      quantity: item.quantity,
      price: (item.amount_total || 0) / 100 / (item.quantity || 1),
      unit_price: (item.amount_total || 0) / 100 / (item.quantity || 1),
      product_name: item.description,
      product_image: item.price?.product?.images?.[0] || null,
    })),
  }

  // Insertar orden
  const { data: order, error: insertError } = await supabase
    .from('orders')
    .insert({
      user_id: userId || null,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: customerPhone,
      total: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || 'MXN',
      payment_status: 'paid',
      status: 'pending',
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      stripe_customer_id: session.customer,
      shipping_address: fullShippingAddress,
      metadata: metadata,
      created_at: new Date(session.created * 1000).toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    // Duplicado = ya existe, no es error real
    if (insertError.code === '23505') {
      stats.alreadyInDB++
      stats.recovered-- // compensar el incremento que se hará
      return
    }
    throw insertError
  }

  // Crear order_items
  const orderItems = []
  for (const item of lineItems) {
    const productMetadata = item.price?.product?.metadata || {}
    const productId = productMetadata.product_id

    if (!productId) continue // Saltar envío y otros items sin product_id

    const product = item.price?.product
    let productImage = product?.images?.[0] || null

    if (!productImage) {
      const { data: productData } = await supabase
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
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.warn(`    ⚠️  Error creando items para orden ${order.id}:`, itemsError.message)
    }
  }
}

// Ejecutar
recoverOrders().catch(err => {
  console.error('💥 Error fatal:', err)
  process.exit(1)
})
