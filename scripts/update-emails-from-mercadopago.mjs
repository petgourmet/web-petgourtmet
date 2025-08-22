import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MP_ACCESS_TOKEN) {
  console.error('❌ Faltan variables de entorno necesarias')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Función para extraer email del shipping_address
function extractEmailFromShippingAddress(shippingAddress) {
  if (!shippingAddress) return null
  
  try {
    const parsed = typeof shippingAddress === 'string' 
      ? JSON.parse(shippingAddress) 
      : shippingAddress
    
    if (parsed.customer_data && parsed.customer_data.email) {
      return parsed.customer_data.email
    }
  } catch (error) {
    console.warn('Error parsing shipping_address:', error.message)
  }
  
  return null
}

// Función para actualizar el shipping_address con el email real
function updateShippingAddressWithEmail(shippingAddress, realEmail) {
  if (!shippingAddress) return null
  
  try {
    const parsed = typeof shippingAddress === 'string' 
      ? JSON.parse(shippingAddress) 
      : shippingAddress
    
    if (parsed.customer_data) {
      parsed.customer_data.email = realEmail
      return JSON.stringify(parsed)
    }
  } catch (error) {
    console.warn('Error updating shipping_address:', error.message)
  }
  
  return shippingAddress
}

async function updateEmailsFromMercadoPago() {
  console.log('🔄 Actualizando emails desde MercadoPago...')
  
  try {
    // Obtener órdenes con emails genéricos que tienen payment_id
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, shipping_address, mercadopago_payment_id')
      .not('mercadopago_payment_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError)
      return
    }

    console.log(`📋 Procesando ${orders?.length || 0} órdenes con payment_id...\n`)

    if (!orders || orders.length === 0) {
      console.log('✅ No hay órdenes con payment_id para procesar')
      return
    }

    let updated = 0
    let errors = 0
    let alreadyCorrect = 0

    // Procesar cada orden
    for (const order of orders) {
      try {
        const currentEmail = extractEmailFromShippingAddress(order.shipping_address)
        
        // Solo procesar si tiene email genérico
        if (currentEmail !== 'cliente@petgourmet.mx') {
          console.log(`⏭️ Orden ${order.id}: Ya tiene email real (${currentEmail})`)
          alreadyCorrect++
          continue
        }
        
        console.log(`🔍 Procesando orden ${order.id} con payment_id ${order.mercadopago_payment_id}...`)
        
        // Buscar pago en MercadoPago
        const paymentResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${order.mercadopago_payment_id}`,
          {
            headers: {
              'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            }
          }
        )

        if (!paymentResponse.ok) {
          console.log(`⚠️ No se pudo consultar MercadoPago para orden ${order.id} (${paymentResponse.status})`)
          errors++
          continue
        }

        const paymentData = await paymentResponse.json()
        
        if (paymentData && paymentData.payer && paymentData.payer.email) {
          const realEmail = paymentData.payer.email
          
          console.log(`💰 Email real encontrado para orden ${order.id}: ${realEmail}`)

          // Actualizar shipping_address con el email real
          const updatedShippingAddress = updateShippingAddressWithEmail(order.shipping_address, realEmail)
          
          if (updatedShippingAddress) {
            const { error: updateError } = await supabase
              .from('orders')
              .update({
                shipping_address: updatedShippingAddress,
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id)

            if (updateError) {
              console.error(`❌ Error actualizando orden ${order.id}:`, updateError.message)
              errors++
            } else {
              console.log(`✅ Orden ${order.id} actualizada con email: ${realEmail}`)
              updated++
            }
          } else {
            console.log(`⚠️ No se pudo actualizar shipping_address para orden ${order.id}`)
            errors++
          }
        } else {
          console.log(`⚠️ No se encontró email del pagador para orden ${order.id}`)
          errors++
        }
      } catch (error) {
        console.error(`❌ Error procesando orden ${order.id}:`, error.message)
        errors++
      }

      // Pausa pequeña para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log('\n📊 Resumen de actualización:')
    console.log(`✅ Órdenes actualizadas: ${updated}`)
    console.log(`⏭️ Ya tenían email correcto: ${alreadyCorrect}`)
    console.log(`❌ Errores: ${errors}`)
    console.log(`📋 Total procesadas: ${orders.length}`)
    
    if (updated > 0) {
      console.log('\n🎉 ¡Emails actualizados! El dashboard ahora debería mostrar los emails reales.')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
updateEmailsFromMercadoPago()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

export { updateEmailsFromMercadoPago }