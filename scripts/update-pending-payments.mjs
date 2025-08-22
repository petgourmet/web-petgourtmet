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

async function updatePendingPayments() {
  console.log('🔄 Iniciando actualización de pagos pendientes...')
  
  try {
    // 1. Obtener órdenes pendientes
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'pending')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 7 días
      .limit(100)

    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError)
      return
    }

    console.log(`📋 Encontradas ${pendingOrders?.length || 0} órdenes pendientes`)

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('✅ No hay órdenes pendientes para procesar')
      return
    }

    let updated = 0
    let errors = 0

    // 2. Procesar cada orden
    for (const order of pendingOrders) {
      try {
        console.log(`🔍 Procesando orden ${order.id}...`)
        
        // Buscar pago en MercadoPago por external_reference
        const searchResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`,
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

        const searchData = await searchResponse.json()
        
        if (searchData.results && searchData.results.length > 0) {
          const payment = searchData.results[0]
          
          console.log(`💰 Pago encontrado para orden ${order.id}:`, {
            payment_id: payment.id,
            status: payment.status,
            amount: payment.transaction_amount
          })

          // Actualizar orden con información del pago
          const updateData = {
            mercadopago_payment_id: payment.id.toString(),
            payment_status: payment.status,
            payment_type: payment.payment_type_id,
            payment_method: payment.payment_method_id,
            external_reference: payment.external_reference || order.id.toString(),
            collection_id: payment.id.toString(),
            site_id: payment.currency_id === 'MXN' ? 'MLM' : 'MLA',
            processing_mode: 'aggregator',
            updated_at: new Date().toISOString()
          }

          // Actualizar estado si el pago fue aprobado
          if (payment.status === 'approved' || payment.status === 'paid') {
            updateData.status = 'confirmed'
          } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            updateData.status = 'cancelled'
          }

          const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', order.id)

          if (updateError) {
            console.error(`❌ Error actualizando orden ${order.id}:`, updateError.message)
            errors++
          } else {
            console.log(`✅ Orden ${order.id} actualizada exitosamente (${payment.status})`)
            updated++
          }
        } else {
          console.log(`⚠️ No se encontró pago para orden ${order.id}`)
        }
      } catch (error) {
        console.error(`❌ Error procesando orden ${order.id}:`, error.message)
        errors++
      }

      // Pausa pequeña para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // 2. Procesar suscripciones pendientes
    const { data: pendingSubscriptions, error: subscriptionsError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .not('mercadopago_subscription_id', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50)

    if (subscriptionsError) {
      console.error('❌ Error obteniendo suscripciones:', subscriptionsError)
    } else if (pendingSubscriptions && pendingSubscriptions.length > 0) {
      console.log(`\n📋 Encontradas ${pendingSubscriptions.length} suscripciones pendientes`)
      
      let subscriptionsUpdated = 0
      let subscriptionErrors = 0

      for (const subscription of pendingSubscriptions) {
        try {
          console.log(`🔍 Procesando suscripción ${subscription.id}...`)
          
          // Verificar estado de la suscripción en MercadoPago
          const subscriptionResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${subscription.mercadopago_subscription_id}`,
            {
              headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
              }
            }
          )

          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json()
            
            console.log(`💰 Suscripción encontrada ${subscription.id}:`, {
              mp_subscription_id: subscription.mercadopago_subscription_id,
              status: subscriptionData.status
            })

            // Si la suscripción está autorizada, moverla a user_subscriptions
            if (subscriptionData.status === 'authorized') {
              // Calcular próxima fecha de pago
              const nextBillingDate = new Date()
              switch (subscription.subscription_type) {
                case 'weekly':
                  nextBillingDate.setDate(nextBillingDate.getDate() + 7)
                  break
                case 'biweekly':
                  nextBillingDate.setDate(nextBillingDate.getDate() + 14)
                  break
                case 'monthly':
                  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
                  break
                case 'quarterly':
                  nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
                  break
                case 'annual':
                  nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
                  break
                default:
                  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
              }

              // Crear suscripción activa
              const { error: createError } = await supabase
                .from('user_subscriptions')
                .insert({
                  user_id: subscription.user_id,
                  product_id: subscription.product_id,
                  status: 'active',
                  frequency: subscription.subscription_type,
                  price: subscription.amount,
                  next_billing_date: nextBillingDate.toISOString(),
                  mercadopago_subscription_id: subscription.mercadopago_subscription_id,
                  external_reference: subscription.external_reference,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })

              if (createError) {
                console.error(`❌ Error creando suscripción activa ${subscription.id}:`, createError.message)
                subscriptionErrors++
              } else {
                // Marcar suscripción pendiente como procesada
                await supabase
                  .from('pending_subscriptions')
                  .update({ status: 'processed' })
                  .eq('id', subscription.id)

                subscriptionsUpdated++
                console.log(`✅ Suscripción ${subscription.id} activada exitosamente`)
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error procesando suscripción ${subscription.id}:`, error.message)
          subscriptionErrors++
        }

        // Pausa pequeña para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log(`\n📊 Resumen de suscripciones:`)
      console.log(`✅ Suscripciones activadas: ${subscriptionsUpdated}`)
      console.log(`❌ Errores: ${subscriptionErrors}`)
      console.log(`📋 Total procesadas: ${pendingSubscriptions.length}`)
    }

    console.log('\n📊 Resumen general:')
    console.log(`✅ Órdenes actualizadas: ${updated}`)
    console.log(`❌ Errores en órdenes: ${errors}`)
    console.log(`📋 Total órdenes procesadas: ${pendingOrders.length}`)
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
updatePendingPayments()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

export { updatePendingPayments }