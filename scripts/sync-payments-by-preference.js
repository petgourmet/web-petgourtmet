require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables de entorno de Supabase requeridas no encontradas')
  process.exit(1)
}

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.error('❌ MERCADOPAGO_ACCESS_TOKEN no configurado')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function syncPaymentsByPreference() {
  console.log('🔍 ==================== SINCRONIZACIÓN DE PAGOS POR PAYMENT_INTENT_ID ====================')
  console.log('📋 Buscando órdenes con payment_intent_id pero sin payment_id')
  console.log('🌍 Ambiente:', process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT)
  console.log('===================================================================================\n')

  try {
    // 1. Buscar órdenes que tienen payment_intent_id pero no payment_id
    const { data: ordersWithPreference, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .not('payment_intent_id', 'is', null)
      .is('mercadopago_payment_id', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (orderError) {
      console.error('❌ Error obteniendo órdenes:', orderError.message)
      return
    }

    if (!ordersWithPreference || ordersWithPreference.length === 0) {
      console.log('✅ No hay órdenes pendientes con preference_id sin payment_id')
      return
    }

    console.log(`📋 Encontradas ${ordersWithPreference.length} órdenes con preference_id:`)
    ordersWithPreference.forEach(order => {
      console.log(`  - Orden ${order.id}: ${order.total} MXN`)
      console.log(`    Preference ID: ${order.mercadopago_preference_id}`)
      console.log(`    Creada: ${new Date(order.created_at).toLocaleString()}`)
    })
    console.log('')

    // 2. Procesar cada orden
    const results = {
      processed: 0,
      found: 0,
      updated: 0,
      errors: 0,
      details: []
    }

    for (const order of ordersWithPreference) {
      try {
        results.processed++
        console.log(`🔄 Procesando orden ${order.id}...`)
        console.log(`   Payment Intent ID: ${order.payment_intent_id}`)

        // Buscar la preference en MercadoPago
        const preferenceResponse = await fetch(
          `https://api.mercadopago.com/checkout/preferences/${order.payment_intent_id}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!preferenceResponse.ok) {
          console.log(`⚠️ Error consultando preference ${order.payment_intent_id}: ${preferenceResponse.status}`)
          results.errors++
          continue
        }

        const preferenceData = await preferenceResponse.json()
        console.log(`✅ Preference encontrada. External reference: ${preferenceData.external_reference}`)

        // Buscar pagos asociados a esta preference usando external_reference
        const paymentsResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${preferenceData.external_reference}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!paymentsResponse.ok) {
          console.log(`⚠️ Error buscando pagos para external_reference ${preferenceData.external_reference}: ${paymentsResponse.status}`)
          results.errors++
          continue
        }

        const paymentsData = await paymentsResponse.json()
        
        if (paymentsData.results && paymentsData.results.length > 0) {
          results.found++
          console.log(`✅ Encontrados ${paymentsData.results.length} pago(s) para orden ${order.id}`)
          
          // Buscar el mejor pago para actualizar
          const approvedPayments = paymentsData.results.filter(p => p.status === 'approved')
          const pendingPayments = paymentsData.results.filter(p => p.status === 'pending')
          
          let paymentToUse = null
          let newOrderStatus = 'pending'
          let newPaymentStatus = 'pending'

          if (approvedPayments.length > 0) {
            // Usar el pago aprobado más reciente
            paymentToUse = approvedPayments[approvedPayments.length - 1]
            newOrderStatus = 'confirmed'
            newPaymentStatus = 'paid'
            console.log(`🎉 ¡Pago aprobado encontrado! ID: ${paymentToUse.id}`)
          } else if (pendingPayments.length > 0) {
            // Usar el pago pendiente más reciente
            paymentToUse = pendingPayments[pendingPayments.length - 1]
            newOrderStatus = 'pending'
            newPaymentStatus = 'pending'
            console.log(`⏳ Pago pendiente encontrado. ID: ${paymentToUse.id}`)
          } else {
            // Usar el pago más reciente independientemente del estado
            paymentToUse = paymentsData.results[paymentsData.results.length - 1]
            console.log(`📝 Usando pago más reciente. ID: ${paymentToUse.id}, Estado: ${paymentToUse.status}`)
          }

          if (paymentToUse) {
            // Actualizar la orden en la base de datos
            const updateData = {
              mercadopago_payment_id: paymentToUse.id,
              status: newOrderStatus,
              payment_status: newPaymentStatus,
              updated_at: new Date().toISOString()
            }

            // Agregar información adicional del pago si está disponible
            if (paymentToUse.payment_method_id) {
              updateData.payment_method = paymentToUse.payment_method_id
            }

            const { error: updateError } = await supabase
              .from('orders')
              .update(updateData)
              .eq('id', order.id)

            if (updateError) {
              console.error(`❌ Error actualizando orden ${order.id}:`, updateError.message)
              results.errors++
            } else {
              console.log(`✅ Orden ${order.id} actualizada exitosamente`)
              results.updated++
              
              results.details.push({
                orderId: order.id,
                paymentId: paymentToUse.id,
                paymentStatus: paymentToUse.status,
                amount: paymentToUse.transaction_amount,
                currency: paymentToUse.currency_id,
                paymentMethod: paymentToUse.payment_method_id,
                orderStatus: newOrderStatus,
                paymentStatusInDB: newPaymentStatus
              })
            }
          }
        } else {
          console.log(`🔍 No se encontraron pagos para external_reference ${preferenceData.external_reference}`)
        }
      } catch (error) {
        console.error(`❌ Error procesando orden ${order.id}:`, error.message)
        results.errors++
      }
    }

    // 3. Resumen final
    console.log('===================================================================================')
    console.log('📊 RESUMEN DE SINCRONIZACIÓN:')
    console.log(`   • Órdenes procesadas: ${results.processed}`)
    console.log(`   • Órdenes con pagos encontrados: ${results.found}`)
    console.log(`   • Órdenes actualizadas: ${results.updated}`)
    console.log(`   • Errores: ${results.errors}`)
    console.log('===================================================================================')

    if (results.details.length > 0) {
      console.log('\n📋 DETALLES DE ÓRDENES ACTUALIZADAS:')
      results.details.forEach(detail => {
        console.log(`   Orden ${detail.orderId}: ${detail.paymentStatus} - ${detail.amount} ${detail.currency}`)
      })
    }

    console.log('\n===================================================================================')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

syncPaymentsByPreference()