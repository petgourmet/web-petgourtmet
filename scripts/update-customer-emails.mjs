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

async function updateCustomerEmails() {
  console.log('🔄 Iniciando actualización de emails de clientes...')
  
  try {
    // 1. Obtener órdenes con email genérico
    const { data: ordersWithGenericEmail, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', 'cliente@petgourmet.mx')
      .not('mercadopago_payment_id', 'is', null)
      .limit(100)

    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError)
      return
    }

    console.log(`📋 Encontradas ${ordersWithGenericEmail?.length || 0} órdenes con email genérico`)

    if (!ordersWithGenericEmail || ordersWithGenericEmail.length === 0) {
      console.log('✅ No hay órdenes con email genérico para actualizar')
      return
    }

    let updated = 0
    let errors = 0

    // 2. Procesar cada orden
    for (const order of ordersWithGenericEmail) {
      try {
        console.log(`🔍 Procesando orden ${order.id}...`)
        
        // Buscar pago en MercadoPago
        const searchResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${order.mercadopago_payment_id}`,
          {
            headers: {
              'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            }
          }
        )

        if (!searchResponse.ok) {
          console.log(`⚠️ No se pudo consultar MercadoPago para orden ${order.id}`)
          continue
        }

        const paymentData = await searchResponse.json()
        
        if (paymentData && paymentData.payer && paymentData.payer.email) {
          const realEmail = paymentData.payer.email
          
          console.log(`💰 Email real encontrado para orden ${order.id}:`, {
            order_id: order.id,
            old_email: order.customer_email,
            new_email: realEmail,
            payment_id: paymentData.id
          })

          // Actualizar orden con el email real
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              customer_email: realEmail,
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
          console.log(`⚠️ No se encontró email del pagador para orden ${order.id}`)
        }
      } catch (error) {
        console.error(`❌ Error procesando orden ${order.id}:`, error.message)
        errors++
      }

      // Pausa pequeña para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // 3. Actualizar también órdenes sin customer_email
    console.log('\n🔍 Buscando órdenes sin customer_email...')
    
    const { data: ordersWithoutEmail, error: noEmailError } = await supabase
      .from('orders')
      .select('*')
      .is('customer_email', null)
      .not('mercadopago_payment_id', 'is', null)
      .limit(50)

    if (noEmailError) {
      console.error('❌ Error obteniendo órdenes sin email:', noEmailError)
    } else if (ordersWithoutEmail && ordersWithoutEmail.length > 0) {
      console.log(`📋 Encontradas ${ordersWithoutEmail.length} órdenes sin customer_email`)
      
      for (const order of ordersWithoutEmail) {
        try {
          console.log(`🔍 Procesando orden sin email ${order.id}...`)
          
          // Buscar pago en MercadoPago
          const searchResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/${order.mercadopago_payment_id}`,
            {
              headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
              }
            }
          )

          if (searchResponse.ok) {
            const paymentData = await searchResponse.json()
            
            if (paymentData && paymentData.payer && paymentData.payer.email) {
              const realEmail = paymentData.payer.email
              
              console.log(`💰 Email encontrado para orden ${order.id}: ${realEmail}`)

              // Actualizar orden con el email real
              const { error: updateError } = await supabase
                .from('orders')
                .update({
                  customer_email: realEmail,
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
            }
          }
        } catch (error) {
          console.error(`❌ Error procesando orden ${order.id}:`, error.message)
          errors++
        }

        // Pausa pequeña para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log('\n📊 Resumen de actualización de emails:')
    console.log(`✅ Órdenes actualizadas: ${updated}`)
    console.log(`❌ Errores: ${errors}`)
    console.log(`📋 Total procesadas: ${(ordersWithGenericEmail?.length || 0) + (ordersWithoutEmail?.length || 0)}`)
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
updateCustomerEmails()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

export { updateCustomerEmails }