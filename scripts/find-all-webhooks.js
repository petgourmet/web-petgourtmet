#!/usr/bin/env node

/**
 * Script para consultar TODOS los webhooks y buscar relaciones con el pedido
 */

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

async function findAllWebhooks() {
  const orderId = process.argv[2] || '208'
  
  console.log('🔍 ===================== BUSCANDO TODOS LOS WEBHOOKS =====================')
  console.log(`Buscando pedido #${orderId}`)
  console.log('==========================================================================\n')

  try {
    // 1. Obtener la orden completa
    console.log(`📋 1. CONSULTANDO ORDEN #${orderId}...`)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('❌ Error obteniendo orden:', orderError.message)
      return
    }

    console.log('✅ Orden encontrada:')
    console.log({
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
      mercadopago_preference_id: order.mercadopago_preference_id,
      mercadopago_payment_id: order.mercadopago_payment_id
    })
    console.log('\n')

    // 2. Obtener TODOS los webhooks
    console.log('📋 2. CONSULTANDO TODOS LOS WEBHOOKS...')
    const { data: allWebhooks, error: webhookError } = await supabase
      .from('webhook_log')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(100)

    if (webhookError) {
      console.error('❌ Error:', webhookError.message)
      return
    }

    console.log(`✅ Total de webhooks encontrados: ${allWebhooks?.length || 0}\n`)

    if (!allWebhooks || allWebhooks.length === 0) {
      console.log('⚠️ NO HAY WEBHOOKS EN LA BASE DE DATOS')
      console.log('Esto significa que los webhooks NO están llegando al servidor\n')
    } else {
      console.log('📊 LISTADO DE WEBHOOKS RECIENTES:')
      console.log('=' .repeat(100))
      
      allWebhooks.slice(0, 10).forEach((wh, index) => {
        console.log(`\n${index + 1}. Webhook:`)
        console.log(`   ID: ${wh.id}`)
        console.log(`   Webhook ID: ${wh.webhook_id}`)
        console.log(`   Request ID: ${wh.request_id || 'N/A'}`)
        console.log(`   Status: ${wh.status}`)
        console.log(`   Recibido: ${wh.received_at}`)
        console.log(`   Procesado: ${wh.processed_at || 'NO PROCESADO'}`)
        if (wh.error_message) {
          console.log(`   ❌ Error: ${wh.error_message}`)
        }
      })
    }

    // 3. Buscar pagos en MercadoPago
    if (order.mercadopago_preference_id) {
      console.log('\n\n📋 3. CONSULTANDO MERCADOPAGO...')
      console.log(`🔎 Buscando pagos relacionados con preference: ${order.mercadopago_preference_id}`)

      try {
        // Primero obtener la preference
        const prefResponse = await fetch(`https://api.mercadopago.com/checkout/preferences/${order.mercadopago_preference_id}`, {
          headers: { 'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
        })

        if (prefResponse.ok) {
          const preference = await prefResponse.json()
          console.log('\n✅ PREFERENCE ENCONTRADA:')
          console.log({
            id: preference.id,
            external_reference: preference.external_reference,
            init_point: preference.init_point,
            status: preference.status || 'N/A'
          })

          const extRef = preference.external_reference || orderId
          console.log(`\n🔎 Buscando pagos con external_reference: ${extRef}`)

          // Buscar pagos por external_reference
          const paymentsResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${extRef}&sort=date_created&criteria=desc`,
            { headers: { 'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }
          )

          if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json()
            console.log(`\n✅ PAGOS ENCONTRADOS: ${paymentsData.results?.length || 0}`)

            if (paymentsData.results && paymentsData.results.length > 0) {
              console.log('\n💳 DETALLES DE LOS PAGOS:')
              console.log('=' .repeat(100))

            paymentsData.results.forEach((payment, index) => {
              console.log(`\n${index + 1}. PAYMENT ID: ${payment.id}`)
              console.log(`   Status: ${payment.status}`)
              console.log(`   Status Detail: ${payment.status_detail}`)
              console.log(`   External Reference: ${payment.external_reference}`)
              console.log(`   Transaction Amount: ${payment.transaction_amount} ${payment.currency_id}`)
              console.log(`   Date Created: ${payment.date_created}`)
              console.log(`   Date Approved: ${payment.date_approved || 'N/A'}`)
              console.log(`   Payment Method: ${payment.payment_method_id}`)

              // Si el pago está aprobado, esta es la info que necesitas
              if (payment.status === 'approved') {
                console.log('\n   🎯 ¡ESTE PAGO ESTÁ APROBADO!')
                console.log(`   💡 Payment ID: ${payment.id}`)
              }
            })

            // Resumen de acciones
            const approvedPayments = paymentsData.results.filter(p => p.status === 'approved')
            if (approvedPayments.length > 0) {
              console.log('\n\n' + '=' .repeat(100))
              console.log('🎯 ACCIÓN NECESARIA')
              console.log('=' .repeat(100))
              console.log(`\n✅ Se encontraron ${approvedPayments.length} pago(s) aprobado(s)`)
              console.log('\n💡 PROBLEMA IDENTIFICADO:')
              console.log('   - El pago está aprobado en MercadoPago')
              console.log('   - Pero NO hay webhooks en la base de datos')
              console.log('   - Esto significa que los webhooks NO están llegando al servidor\n')
              
              console.log('🔧 POSIBLES CAUSAS:')
              console.log('   1. La URL del webhook en MercadoPago no está configurada correctamente')
              console.log('   2. El servidor no está accesible desde internet')
              console.log('   3. La tabla webhook_log no existe o tiene problemas')
              console.log('   4. Los webhooks están llegando pero no se están guardando\n')

              console.log('🛠️ SOLUCIONES:')
              console.log('   1. Verifica webhook URL en MercadoPago dashboard')
              console.log('   2. Verifica configuración del servidor')
              console.log('   3. Actualiza manualmente con el endpoint de force-activate')
              console.log(`   4. Payment ID a usar: ${approvedPayments[0].id}\n`)

              console.log('📝 COMANDO PARA ACTUALIZAR MANUALMENTE:')
              console.log(`curl -X POST http://localhost:3000/api/admin/confirm-payment \\`)
              console.log(`  -H "Content-Type: application/json" \\`)
              console.log(`  -d '{"orderId": 208, "paymentId": "${approvedPayments[0].id}"}'`)
            } else {
              console.log('\n⚠️ No hay pagos aprobados todavía')
              console.log('El usuario necesita completar el pago en MercadoPago')
            }
          } else {
            console.log('\n⚠️ No se encontraron pagos con este external_reference')
          }
        } else {
          console.log(`\n❌ Error buscando pagos: ${paymentsResponse.status}`)
          const errorText = await paymentsResponse.text()
          console.log(errorText)
        }
      } else {
        console.log(`\n❌ Preference no encontrada: ${prefResponse.status}`)
        const errorText = await prefResponse.text()
        console.log(errorText)
      }
    } catch (error) {
      console.error('\n❌ Error consultando MercadoPago:', error.message)
    }

    console.log('\n\n' + '=' .repeat(100))
    console.log('✅ ANÁLISIS COMPLETADO')
    console.log('=' .repeat(100))

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

findAllWebhooks()
