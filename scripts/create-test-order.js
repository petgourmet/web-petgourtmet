#!/usr/bin/env node

/**
 * Script para crear órdenes de prueba que coincidan con webhooks de MercadoPago
 */

const BASE_URL = 'http://localhost:3000'

async function createTestOrder(external_reference, options = {}) {
  const {
    total = 1000,
    customer_name = "Cliente de Prueba",
    customer_email = "test@petgourmet.com",
    customer_phone = "5555555555"
  } = options

  console.log(`\n🔨 Creando orden de prueba con external_reference: ${external_reference}`)

  try {
    const response = await fetch(`${BASE_URL}/api/test-order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_reference,
        total,
        customer_name,
        customer_email,
        customer_phone
      })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Orden creada exitosamente:')
      console.log(`   ID: ${result.order.id}`)
      console.log(`   External Reference: ${result.order.external_reference}`)
      console.log(`   Status: ${result.order.status}`)
      console.log(`   Payment Status: ${result.order.payment_status}`)
      console.log(`   Total: $${result.order.total}`)
      console.log(`   Cliente: ${result.order.customer_name}`)
      return result.order
    } else {
      console.log(`❌ Error creando orden: ${result.error}`)
      if (result.existing_order_id) {
        console.log(`   Orden existente ID: ${result.existing_order_id}`)
      }
      return null
    }
  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`)
    return null
  }
}

async function testWebhook(external_reference, webhook_type = 'merchant_order') {
  console.log(`\n🔔 Enviando webhook ${webhook_type} para external_reference: ${external_reference}`)

  try {
    let webhookData
    
    if (webhook_type === 'merchant_order') {
      webhookData = {
        action: "payment.updated",
        api_version: "v1",
        data: {
          id: "12345678"
        },
        date_created: new Date().toISOString(),
        id: Date.now(),
        live_mode: false,
        type: "merchant_order",
        user_id: "570561"
      }
    } else if (webhook_type === 'payment') {
      webhookData = {
        action: "payment.updated",
        api_version: "v1",
        data: {
          id: "87654321"
        },
        date_created: new Date().toISOString(),
        id: Date.now(),
        live_mode: false,
        type: "payment",
        user_id: "570561"
      }
    }

    const response = await fetch(`${BASE_URL}/api/mercadopago/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    })

    const result = await response.text()

    if (response.ok) {
      console.log('✅ Webhook enviado exitosamente')
      console.log(`   Respuesta: ${result}`)
    } else {
      console.log(`❌ Error en webhook: ${response.status} ${response.statusText}`)
      console.log(`   Respuesta: ${result}`)
    }
  } catch (error) {
    console.error(`❌ Error enviando webhook: ${error.message}`)
  }
}

async function checkOrder(external_reference) {
  console.log(`\n🔍 Verificando orden con external_reference: ${external_reference}`)

  try {
    const response = await fetch(`${BASE_URL}/api/test-order/create?external_reference=${external_reference}`)
    const result = await response.json()

    if (response.ok && result.order) {
      console.log('✅ Orden encontrada:')
      console.log(`   ID: ${result.order.id}`)
      console.log(`   Status: ${result.order.status}`)
      console.log(`   Payment Status: ${result.order.payment_status}`)
      console.log(`   Total: $${result.order.total}`)
      console.log(`   Creada: ${result.order.created_at}`)
      return result.order
    } else {
      console.log(`❌ Orden no encontrada: ${result.error}`)
      return null
    }
  } catch (error) {
    console.error(`❌ Error verificando orden: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('🚀 Iniciando pruebas de órdenes de prueba para webhooks de MercadoPago')
  console.log('=' .repeat(70))

  // Caso 1: Crear orden que coincida con el webhook que falló anteriormente
  const external_reference_1 = "PG-570561_1760645570561"
  await createTestOrder(external_reference_1, {
    total: 1500,
    customer_name: "Cliente Webhook Test",
    customer_email: "webhook-test@petgourmet.com"
  })

  // Caso 2: Crear otra orden de prueba
  const external_reference_2 = `TEST-${Date.now()}`
  await createTestOrder(external_reference_2, {
    total: 2000,
    customer_name: "Cliente Test 2",
    customer_email: "test2@petgourmet.com"
  })

  // Caso 3: Intentar crear orden duplicada
  console.log('\n📋 Probando validación de duplicados...')
  await createTestOrder(external_reference_1) // Debería fallar

  // Caso 4: Verificar órdenes creadas
  console.log('\n🔍 Verificando órdenes creadas...')
  await checkOrder(external_reference_1)
  await checkOrder(external_reference_2)

  // Caso 5: Probar webhook con la orden creada
  console.log('\n🔔 Probando webhook con orden existente...')
  await testWebhook(external_reference_1, 'merchant_order')

  console.log('\n✅ Pruebas completadas')
  console.log('=' .repeat(70))
  console.log('💡 Ahora puedes probar manualmente enviando webhooks a las órdenes creadas')
  console.log(`   Ejemplo: curl -X POST ${BASE_URL}/api/mercadopago/webhook -H "Content-Type: application/json" -d '{"type":"merchant_order","data":{"id":"12345678"}}'`)
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  createTestOrder,
  testWebhook,
  checkOrder
}