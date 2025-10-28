/**
 * Script para migrar órdenes de Stripe antiguas
 * Crea order_items desde los line_items guardados en shipping_address
 */

// IMPORTANTE: Cargar variables de entorno PRIMERO
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Ahora sí importar los módulos
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stripeKey = process.env.STRIPE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey || !stripeKey) {
  console.error('❌ Faltan variables de entorno:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  console.error('STRIPE_SECRET_KEY:', !!stripeKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const stripe = new Stripe(stripeKey, { apiVersion: '2025-09-30.clover' })

async function fixStripeOrders() {
  console.log('🔧 Iniciando migración de órdenes de Stripe...\n')

  try {
    // Obtener todas las órdenes de Stripe sin order_items
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .not('stripe_session_id', 'is', null)
      .order('id', { ascending: true })

    if (error) {
      console.error('❌ Error al obtener órdenes:', error)
      return
    }

    console.log(`📦 Encontradas ${orders.length} órdenes de Stripe\n`)

    for (const order of orders) {
      console.log(`\n--- Procesando Orden #${order.id} ---`)
      console.log(`Session ID: ${order.stripe_session_id}`)

      // Verificar si ya tiene order_items
      const { data: existingItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (itemsError) {
        console.error(`❌ Error al verificar items de orden ${order.id}:`, itemsError)
        continue
      }

      if (existingItems && existingItems.length > 0) {
        console.log(`✅ Orden ${order.id} ya tiene ${existingItems.length} items, saltando...`)
        continue
      }

      // Obtener detalles de la sesión de Stripe
      try {
        const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, {
          expand: ['line_items.data.price.product']
        })

        console.log(`📋 Sesión recuperada con ${session.line_items?.data.length || 0} items`)

        if (!session.line_items || session.line_items.data.length === 0) {
          console.log(`⚠️  No hay line_items en la sesión`)
          continue
        }

        // Actualizar información del cliente si falta
        let needsUpdate = false
        const updates: any = {}

        if (!order.customer_email && session.customer_details?.email) {
          updates.customer_email = session.customer_details.email
          needsUpdate = true
        }

        if (!order.customer_name && session.customer_details?.name) {
          updates.customer_name = session.customer_details.name
          needsUpdate = true
        }

        if (!order.customer_phone && session.customer_details?.phone) {
          updates.customer_phone = session.customer_details.phone
          needsUpdate = true
        }

        // Construir shipping_address completo
        const shippingAddress = order.shipping_address 
          ? (typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address)
          : {}

        // Agregar customer info si no existe
        if (!shippingAddress.customer) {
          shippingAddress.customer = {
            name: session.customer_details?.name || order.customer_name,
            email: session.customer_details?.email || order.customer_email,
            phone: session.customer_details?.phone || order.customer_phone,
          }
          needsUpdate = true
        }

        // Agregar items si no existen
        if (!shippingAddress.items) {
          shippingAddress.items = session.line_items.data.map((item: any) => ({
            id: item.id,
            product_id: item.price?.product?.metadata?.product_id || null,
            name: item.description,
            quantity: item.quantity,
            price: (item.amount_total || 0) / 100 / (item.quantity || 1),
            unit_price: (item.amount_total || 0) / 100 / (item.quantity || 1),
            product_name: item.description,
            product_image: item.price?.product?.images?.[0] || null,
          }))
          updates.shipping_address = shippingAddress
          needsUpdate = true
        }

        // Actualizar orden si es necesario
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)

          if (updateError) {
            console.error(`❌ Error al actualizar orden ${order.id}:`, updateError)
          } else {
            console.log(`✅ Orden ${order.id} actualizada con información del cliente`)
          }
        }

        // Crear order_items
        const orderItems = []
        for (const item of session.line_items.data) {
          const product = item.price?.product as any
          const productMetadata = product?.metadata || {}
          const productId = productMetadata.product_id

          // Si es el item de envío, saltarlo
          if (item.description?.toLowerCase().includes('envío') || 
              item.description?.toLowerCase().includes('shipping')) {
            console.log(`📦 Saltando item de envío: ${item.description}`)
            continue
          }

          if (!productId) {
            console.warn(`⚠️  Item sin product_id: ${item.description}`)
            continue
          }

          // Obtener la imagen del producto
          let productImage = product?.images?.[0] || null
          
          // Si no hay imagen en Stripe, obtenerla de la base de datos
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
          const { error: insertError } = await supabase
            .from('order_items')
            .insert(orderItems)

          if (insertError) {
            console.error(`❌ Error al crear order_items para orden ${order.id}:`, insertError)
          } else {
            console.log(`✅ Creados ${orderItems.length} order_items para orden ${order.id}`)
            orderItems.forEach(item => {
              console.log(`   - ${item.product_name} x${item.quantity} = $${item.price * item.quantity}`)
            })
          }
        } else {
          console.log(`⚠️  No se crearon items para orden ${order.id}`)
        }

      } catch (stripeError) {
        console.error(`❌ Error al recuperar sesión de Stripe para orden ${order.id}:`, stripeError)
      }
    }

    console.log('\n✅ Migración completada!')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar
fixStripeOrders()
  .then(() => {
    console.log('\n🎉 Script finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error)
    process.exit(1)
  })
