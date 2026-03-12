/**
 * Utilidad compartida para creación idempotente de órdenes
 * 
 * Puede ser llamada tanto desde el webhook como desde el API de order-details.
 * Usa stripe_session_id como clave de idempotencia para evitar duplicados.
 */

import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CreatedOrder {
  order: any
  orderItems: any[]
  isNew: boolean // true si se creó, false si ya existía
}

/**
 * Crea una orden de forma idempotente a partir de un Stripe Checkout Session.
 * Si la orden ya existe (por stripe_session_id), retorna la existente.
 * 
 * @param sessionId - ID de la sesión de Stripe Checkout
 * @param source - Quién llama: 'webhook' | 'api-fallback' (para logs)
 * @returns La orden creada o existente con sus items
 */
export async function createOrderFromSession(
  sessionId: string,
  source: 'webhook' | 'api-fallback' = 'webhook'
): Promise<CreatedOrder> {
  const logPrefix = `[CREATE-ORDER][${source}]`

  // 1. CHECK IDEMPOTENCIA: ¿Ya existe una orden con este session_id?
  const { data: existingOrder, error: checkError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        product_name,
        product_image,
        quantity,
        price,
        size,
        products (
          id,
          name,
          category_id,
          categories (
            name
          )
        )
      )
    `)
    .eq('stripe_session_id', sessionId)
    .single()

  if (existingOrder) {
    console.log(`${logPrefix} ✅ Orden ya existe: ${existingOrder.id} - Retornando existente`)
    return {
      order: existingOrder,
      orderItems: existingOrder.order_items || [],
      isNew: false,
    }
  }

  // Ignorar error PGRST116 (not found) - es esperado
  if (checkError && checkError.code !== 'PGRST116') {
    console.error(`${logPrefix} Error verificando orden existente:`, checkError)
  }

  // 2. OBTENER SESIÓN DE STRIPE con todos los datos necesarios
  console.log(`${logPrefix} 🔄 Creando orden nueva para session: ${sessionId}`)

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product', 'customer'],
    })
  } catch (stripeError: any) {
    console.error(`${logPrefix} ❌ No se pudo obtener sesión de Stripe:`, stripeError.message)
    throw new Error(`No se pudo obtener la sesión de Stripe: ${stripeError.message}`)
  }

  // 3. VALIDAR QUE EL PAGO ESTÉ COMPLETADO
  if (session.payment_status !== 'paid') {
    console.log(`${logPrefix} ⏳ Sesión no pagada aún (status: ${session.payment_status})`)
    throw new Error(`Sesión no pagada: ${session.payment_status}`)
  }

  // Solo procesar pagos únicos (no suscripciones)
  if (session.mode !== 'payment') {
    console.log(`${logPrefix} ℹ️ Sesión no es pago único (mode: ${session.mode}), saltando`)
    throw new Error(`Modo no soportado: ${session.mode}`)
  }

  const metadata = session.metadata || {}
  const userId = metadata.user_id || null
  const customerName = metadata.customer_name || session.customer_details?.name || null
  const customerEmail = session.customer_email || session.customer_details?.email || null
  const customerPhone = session.customer_details?.phone || null

  // Parsear dirección de envío con múltiples fallbacks
  let shippingData = null
  try {
    if (metadata.shipping_address) {
      shippingData = typeof metadata.shipping_address === 'string'
        ? JSON.parse(metadata.shipping_address)
        : metadata.shipping_address
    }
  } catch (e) {
    console.error(`${logPrefix} Error parsing shipping_address:`, e)
  }

  // Fallback: Stripe shipping_details (dirección nativa recopilada por Stripe)
  if (!shippingData && (session as any).shipping_details) {
    const sd = (session as any).shipping_details
    shippingData = {
      address: sd.address?.line1 || '',
      address2: sd.address?.line2 || '',
      city: sd.address?.city || '',
      state: sd.address?.state || '',
      postalCode: sd.address?.postal_code || '',
      country: sd.address?.country || 'MX',
      name: sd.name || customerName || '',
    }
    console.log(`${logPrefix} 📦 Dirección obtenida de Stripe shipping_details`)
  }

  // Fallback: billing address del customer_details
  if (!shippingData && session.customer_details?.address) {
    const ba = session.customer_details.address as any
    shippingData = {
      address: ba.line1 || '',
      address2: ba.line2 || '',
      city: ba.city || '',
      state: ba.state || '',
      postalCode: ba.postal_code || '',
      country: ba.country || 'MX',
      name: session.customer_details.name || customerName || '',
    }
    console.log(`${logPrefix} 📦 Dirección obtenida de customer_details (billing)`)
  }

  // Line items de Stripe
  const lineItems = session.line_items?.data || []

  // Construir shipping_address completo
  const fullShippingAddress = {
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    shipping: shippingData,
    items: lineItems.map((item: any) => ({
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

  // 4. INSERTAR ORDEN (con re-check de idempotencia)
  // Extraer shipping_cost desde metadata de la sesión (enviado por checkout page)
  const shippingCostFromMeta = metadata.shipping_cost ? parseFloat(metadata.shipping_cost) : 0

  const { data: order, error: insertError } = await supabaseAdmin
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
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_customer_id: session.customer as string,
      shipping_address: fullShippingAddress,
      shipping_cost: shippingCostFromMeta,
      metadata: metadata,
    })
    .select()
    .single()

  if (insertError) {
    // Si es error de duplicado (unique constraint en stripe_session_id),
    // reintentamos obtener la orden existente
    if (insertError.code === '23505') {
      console.log(`${logPrefix} ⚠️ Orden duplicada detectada, obteniendo existente...`)
      const { data: duplicateOrder } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (
            id, product_id, product_name, product_image, quantity, price, size,
            products ( id, name, category_id, categories ( name ) )
          )
        `)
        .eq('stripe_session_id', sessionId)
        .single()

      if (duplicateOrder) {
        return {
          order: duplicateOrder,
          orderItems: duplicateOrder.order_items || [],
          isNew: false,
        }
      }
    }
    console.error(`${logPrefix} ❌ Error al crear orden:`, insertError)
    throw insertError
  }

  console.log(`${logPrefix} ✅ Orden creada: ${order.id}`)

  // 5. CREAR ORDER ITEMS
  const orderItems: any[] = []
  for (const item of lineItems) {
    const productMetadata = (item.price?.product as any)?.metadata || {}
    const productId = productMetadata.product_id

    if (!productId) {
      console.warn(`${logPrefix} Line item sin product_id:`, item.id, item.description)
      continue
    }

    const product = item.price?.product as any
    let productImage = product?.images?.[0] || null

    // Obtener imagen de la BD si no está en Stripe
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
      console.error(`${logPrefix} ❌ Error al crear order_items:`, itemsError)
    } else {
      console.log(`${logPrefix} ✅ ${orderItems.length} order_items creados para orden ${order.id}`)
    }
  }

  // 6. ENVIAR EMAILS (solo si es invocación desde webhook o primera creación)
  if (source === 'webhook' || source === 'api-fallback') {
    const orderDataForEmail = {
      id: order.id,
      total: order.total,
      customer_name: customerName || 'Cliente',
      customer_email: customerEmail,
      products: orderItems.map(item => ({
        name: item.product_name,
        image: item.product_image,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
      })),
      shipping_address: fullShippingAddress?.shipping || null,
      shipping_cost: ((session.amount_total || 0) / 100) - orderItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
    }

    // Esperar emails para que se envíen antes de que Netlify termine la función
    try {
      await sendPurchaseEmails(customerEmail, orderDataForEmail)
    } catch (err) {
      console.error(`${logPrefix} ❌ Error en envío de emails:`, err)
      // No relanzar: la orden ya fue creada exitosamente
    }
  }

  // 7. Retornar orden completa con items
  // Re-fetch to get the full order with relations
  const { data: fullOrder } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        product_name,
        product_image,
        quantity,
        price,
        size,
        products (
          id,
          name,
          category_id,
          categories (
            name
          )
        )
      )
    `)
    .eq('id', order.id)
    .single()

  return {
    order: fullOrder || order,
    orderItems: fullOrder?.order_items || orderItems,
    isNew: true,
  }
}

/**
 * Envía emails de compra al cliente y admin sin bloquear.
 */
async function sendPurchaseEmails(customerEmail: string | null, orderData: any) {
  const { sendOrderStatusEmail, sendAdminNewOrderEmail } = await import('@/lib/email-service')

  console.log('[EMAIL] 📧 Iniciando envío de emails para orden', orderData.id)

  // Enviar ambos emails en paralelo para minimizar el tiempo en serverless
  const emailPromises: Promise<void>[] = []

  // 1) Email al cliente
  if (customerEmail) {
    emailPromises.push(
      sendOrderStatusEmail('processing', customerEmail, orderData)
        .then((result: any) => {
          if (result?.success) {
            console.log('[EMAIL] ✅ Email de confirmación enviado al cliente:', customerEmail)
          } else {
            console.error('[EMAIL] ❌ Fallo email al cliente:', result?.error)
          }
        })
        .catch((e: any) => {
          console.error('[EMAIL] ❌ Error email cliente:', e instanceof Error ? e.message : e)
        })
    )
  }

  // 2) Email al admin
  emailPromises.push(
    sendAdminNewOrderEmail(orderData)
      .then((result: any) => {
        if (result?.success) {
          console.log('[EMAIL] ✅ Email de nuevo pedido enviado al admin')
        } else {
          console.error('[EMAIL] ❌ Fallo email admin:', result?.error)
        }
      })
      .catch((e: any) => {
        console.error('[EMAIL] ❌ Error email admin:', e instanceof Error ? e.message : e)
      })
  )

  await Promise.allSettled(emailPromises)
  console.log('[EMAIL] 📧 Envío de emails completado para orden', orderData.id)
}
