#!/usr/bin/env node

/**
 * Script para verificar webhooks recibidos para un pedido específico
 * Uso: node scripts/check-order-webhooks.js <order_id>
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables de entorno requeridas no encontradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkOrderWebhooks(orderId) {
  console.log('🔍 ==================== VERIFICANDO WEBHOOKS ====================')
  console.log(`📋 Order ID: ${orderId}`)
  console.log('================================================================\n')

  try {
    // 1. Buscar la orden
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Orden no encontrada:', orderError?.message)
      return
    }

    console.log('✅ Orden encontrada:')
    console.log({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
      mercadopago_preference_id: order.mercadopago_preference_id,
      mercadopago_payment_id: order.mercadopago_payment_id,
      external_reference: order.external_reference,
      created_at: order.created_at
    })
    console.log('')

    // 2. Buscar webhooks relacionados
    
    // Buscar por external_reference (que es el order_id)
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhook_log')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50)

    if (webhookError) {
      console.error('❌ Error buscando webhooks:', webhookError.message)
    } else if (!webhooks || webhooks.length === 0) {
      console.log('⚠️ No se encontraron webhooks en la tabla webhook_log')
    } else {
      console.log(`✅ Encontrados ${webhooks.length} webhooks recientes\n`)
      
      // Filtrar webhooks que podrían estar relacionados con esta orden
      const relatedWebhooks = webhooks.filter(wh => {
        const webhookId = wh.webhook_id || ''
        return webhookId.includes(orderId.toString()) || 
               webhookId.includes(order.mercadopago_preference_id || '') ||
               webhookId.includes(order.external_reference || '')
      })

      if (relatedWebhooks.length > 0) {
        console.log(`🎯 Webhooks relacionados con la orden #${orderId}:`)
        relatedWebhooks.forEach((wh, index) => {
          console.log(`\n${index + 1}. Webhook ID: ${wh.webhook_id}`)
          console.log(`   Status: ${wh.status}`)
          console.log(`   Recibido: ${wh.received_at}`)
          console.log(`   Procesado: ${wh.processed_at || 'No procesado'}`)
          if (wh.error_message) {
            console.log(`   Error: ${wh.error_message}`)
          }
        })
      } else {
        console.log('⚠️ No se encontraron webhooks específicamente relacionados con esta orden')
      }

      // Mostrar todos los webhooks recientes para análisis
      console.log(`\n📋 Últimos ${Math.min(10, webhooks.length)} webhooks recibidos (para análisis):`)
      webhooks.slice(0, 10).forEach((wh, index) => {
        console.log(`\n${index + 1}. Webhook ID: ${wh.webhook_id}`)
        console.log(`   Status: ${wh.status}`)
        console.log(`   Request ID: ${wh.request_id || 'N/A'}`)
        console.log(`   Recibido: ${wh.received_at}`)
        console.log(`   Procesado: ${wh.processed_at || 'Pendiente'}`)
        if (wh.error_message) {
          console.log(`   Error: ${wh.error_message}`)
        }
      })
    }

    // 3. Verificar si existe preference en MercadoPago
    if (order.mercadopago_preference_id) {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
      
      if (!accessToken) {
        console.error('❌ MERCADOPAGO_ACCESS_TOKEN no configurado')
        return
      }
      
      try {
        const response = await fetch(`https://api.mercadopago.com/checkout/preferences/${order.mercadopago_preference_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (response.ok) {
          const preference = await response.json()
          console.log('✅ Preference encontrada en MercadoPago:')
          console.log({
            id: preference.id,
            external_reference: preference.external_reference,
            init_point: preference.init_point,
            status: preference.status || 'N/A',
            items: preference.items?.map(i => ({ title: i.title, quantity: i.quantity, unit_price: i.unit_price }))
          })

          // 4. Buscar pagos asociados a esta preference
          const searchResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })

          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            console.log(`✅ Búsqueda de pagos completada: ${searchData.results?.length || 0} pagos encontrados\n`)
            
            if (searchData.results && searchData.results.length > 0) {
              searchData.results.forEach((payment, index) => {
                console.log(`${index + 1}. Payment ID: ${payment.id}`)
                console.log(`   Status: ${payment.status}`)
                console.log(`   Status Detail: ${payment.status_detail}`)
                console.log(`   External Reference: ${payment.external_reference}`)
                console.log(`   Transaction Amount: ${payment.transaction_amount}`)
                console.log(`   Date Created: ${payment.date_created}`)
                console.log(`   Date Approved: ${payment.date_approved || 'N/A'}`)
                console.log(`   Payer Email: ${payment.payer?.email || 'N/A'}`)
                console.log('')
              })

              // Si hay pagos aprobados, actualizar la orden
              const approvedPayments = searchData.results.filter(p => p.status === 'approved')
              if (approvedPayments.length > 0) {
                console.log('💡 ACCIÓN RECOMENDADA:')
                console.log(`Se encontraron ${approvedPayments.length} pago(s) aprobado(s) pero la orden aún está pendiente.`)
                console.log(`Payment ID para actualizar: ${approvedPayments[0].id}`)
                console.log('\nPuedes actualizar la orden con:')
                console.log(`curl -X POST http://localhost:3000/api/admin/confirm-payment -H "Content-Type: application/json" -d '{"orderId": ${orderId}, "paymentId": "${approvedPayments[0].id}"}'`)
              }
            } else {
              console.log('⚠️ No se encontraron pagos asociados a este external_reference')
              console.log('💡 Verifica que el usuario haya completado el pago en MercadoPago')
            }
          } else {
            console.log('❌ Error buscando pagos:', searchResponse.status)
          }
        } else {
          console.log('❌ Preference no encontrada en MercadoPago:', response.status)
        }
      } catch (error) {
        console.error('❌ Error consultando MercadoPago:', error.message)
      }
    } else {
      console.log('\n⚠️ La orden no tiene preference_id de MercadoPago')
    }

    console.log('\n================================================================')
    console.log('✅ Verificación completada')
    console.log('================================================================')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar
const orderId = process.argv[2] || '208'
checkOrderWebhooks(orderId)
