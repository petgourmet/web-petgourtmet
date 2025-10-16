#!/usr/bin/env node

/**
 * Script para probar el flujo completo de webhook con datos simulados de MercadoPago
 */

const BASE_URL = 'http://localhost:3000'

// Simular respuesta de MercadoPago para merchant order
function createMockMercadoPagoResponse(external_reference, approved = true) {
  return {
    id: "12345678",
    status: approved ? "paid" : "pending",
    external_reference: external_reference,
    total_amount: 1500,
    payments: approved ? [
      {
        id: "87654321",
        status: "approved",
        transaction_amount: 1500,
        payment_method_id: "visa",
        payment_type_id: "credit_card"
      }
    ] : []
  }
}

async function testCompleteWebhookFlow() {
  console.log('🚀 Iniciando prueba completa del flujo de webhook')
  console.log('=' .repeat(70))

  const external_reference = "PG-570561_1760645570561"

  // Paso 1: Verificar que la orden existe
  console.log('\n📋 Paso 1: Verificando orden existente...')
  try {
    const response = await fetch(`${BASE_URL}/api/test-order/create?external_reference=${external_reference}`)
    const result = await response.json()

    if (response.ok && result.order) {
      console.log('✅ Orden encontrada:')
      console.log(`   ID: ${result.order.id}`)
      console.log(`   Status: ${result.order.status}`)
      console.log(`   Payment Status: ${result.order.payment_status}`)
      console.log(`   Total: $${result.order.total}`)
    } else {
      console.log('❌ Orden no encontrada, creando una nueva...')
      
      // Crear orden si no existe
      const createResponse = await fetch(`${BASE_URL}/api/test-order/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_reference,
          total: 1500,
          customer_name: "Cliente Webhook Test",
          customer_email: "webhook-test@petgourmet.com"
        })
      })

      const createResult = await createResponse.json()
      if (createResponse.ok) {
        console.log('✅ Orden creada exitosamente')
      } else {
        console.log(`❌ Error creando orden: ${createResult.error}`)
        return
      }
    }
  } catch (error) {
    console.error(`❌ Error verificando orden: ${error.message}`)
    return
  }

  // Paso 2: Simular webhook de merchant_order
  console.log('\n🔔 Paso 2: Enviando webhook merchant_order...')
  try {
    const webhookData = {
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

    const response = await fetch(`${BASE_URL}/api/mercadopago/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // Paso 3: Verificar estado de la orden después del webhook
  console.log('\n🔍 Paso 3: Verificando estado de la orden después del webhook...')
  try {
    // Esperar un poco para que se procese el webhook
    await new Promise(resolve => setTimeout(resolve, 2000))

    const response = await fetch(`${BASE_URL}/api/test-order/create?external_reference=${external_reference}`)
    const result = await response.json()

    if (response.ok && result.order) {
      console.log('✅ Estado actual de la orden:')
      console.log(`   ID: ${result.order.id}`)
      console.log(`   Status: ${result.order.status}`)
      console.log(`   Payment Status: ${result.order.payment_status}`)
      console.log(`   Total: $${result.order.total}`)
      console.log(`   Última actualización: ${result.order.created_at}`)

      // Verificar si el estado cambió
      if (result.order.payment_status === 'paid') {
        console.log('🎉 ¡Éxito! La orden fue actualizada a "paid" por el webhook')
      } else {
        console.log('⚠️  La orden no fue actualizada. Esto puede ser porque:')
        console.log('   - MercadoPago no encontró la merchant order (404)')
        console.log('   - El pago no está aprobado en MercadoPago')
        console.log('   - Hay un error en el procesamiento del webhook')
      }
    } else {
      console.log('❌ No se pudo verificar el estado de la orden')
    }
  } catch (error) {
    console.error(`❌ Error verificando orden: ${error.message}`)
  }

  console.log('\n✅ Prueba completa finalizada')
  console.log('=' .repeat(70))
  console.log('\n💡 Notas importantes:')
  console.log('   - El webhook busca la merchant order en MercadoPago usando el ID "12345678"')
  console.log('   - Como es un ID de prueba, MercadoPago devuelve 404 (no encontrado)')
  console.log('   - Para probar con datos reales, necesitarías un merchant_order_id válido')
  console.log('   - El sistema maneja correctamente los errores 404 sin fallar')
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testCompleteWebhookFlow().catch(console.error)
}

module.exports = {
  testCompleteWebhookFlow,
  createMockMercadoPagoResponse
}