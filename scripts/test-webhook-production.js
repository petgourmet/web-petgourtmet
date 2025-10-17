#!/usr/bin/env node

/**
 * Script para probar el webhook con los datos exactos proporcionados por el usuario
 * Simula las peticiones que están fallando en producción
 */

const BASE_URL = 'http://localhost:3000'

async function testMerchantOrderWebhook() {
  console.log('🧪 PROBANDO WEBHOOK DE MERCHANT ORDER')
  console.log('=====================================\n')

  // Datos exactos del webhook que está fallando
  const merchantOrderPayload = {
    "action": "create",
    "application_id": "",
    "data": {
      "currency_id": "",
      "marketplace": "NONE",
      "status": "opened"
    },
    "date_created": "2025-10-16T16:13:12.616-04:00",
    "id": "34798354725",
    "live_mode": true,
    "status": "opened",
    "type": "topic_merchant_order_wh",
    "user_id": 1227980651,
    "version": 0
  }

  console.log('📤 Enviando webhook de merchant order:')
  console.log(JSON.stringify(merchantOrderPayload, null, 2))
  console.log('')

  try {
    const response = await fetch(`${BASE_URL}/api/mercadopago/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature-production',
        'x-request-id': 'test-merchant-order-' + Date.now()
      },
      body: JSON.stringify(merchantOrderPayload)
    })

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`)

    const responseText = await response.text()
    console.log('📥 Response Body:')
    
    try {
      const jsonResponse = JSON.parse(responseText)
      console.log(JSON.stringify(jsonResponse, null, 2))
    } catch {
      console.log(responseText)
    }

    console.log('\n' + '='.repeat(50))
    if (response.ok) {
      console.log('✅ Webhook de merchant order procesado exitosamente')
    } else {
      console.log('❌ Webhook de merchant order falló')
    }

  } catch (error) {
    console.error('❌ Error con merchant order webhook:', error.message)
  }
}

async function testPaymentWebhook() {
  console.log('\n\n🧪 PROBANDO WEBHOOK DE PAYMENT')
  console.log('===============================\n')

  // Datos exactos del webhook de payment que está fallando
  const paymentPayload = {
    "action": "payment.updated",
    "api_version": "v1",
    "data": {"id":"123456"},
    "date_created": "2021-11-01T02:02:02Z",
    "id": "123456",
    "live_mode": false,
    "type": "payment",
    "user_id": 1227980651
  }

  console.log('📤 Enviando webhook de payment:')
  console.log(JSON.stringify(paymentPayload, null, 2))
  console.log('')

  try {
    const response = await fetch(`${BASE_URL}/api/mercadopago/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature-production',
        'x-request-id': 'test-payment-' + Date.now()
      },
      body: JSON.stringify(paymentPayload)
    })

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`)

    const responseText = await response.text()
    console.log('📥 Response Body:')
    
    try {
      const jsonResponse = JSON.parse(responseText)
      console.log(JSON.stringify(jsonResponse, null, 2))
    } catch {
      console.log(responseText)
    }

    console.log('\n' + '='.repeat(50))
    if (response.ok) {
      console.log('✅ Webhook de payment procesado exitosamente')
    } else {
      console.log('❌ Webhook de payment falló')
    }

  } catch (error) {
    console.error('❌ Error con payment webhook:', error.message)
  }
}

async function runTests() {
  console.log('🚀 INICIANDO PRUEBAS DE WEBHOOKS DE PRODUCCIÓN')
  console.log('='.repeat(60))
  console.log('Probando con los datos exactos que están fallando en producción\n')

  await testMerchantOrderWebhook()
  await testPaymentWebhook()

  console.log('\n\n🏁 PRUEBAS COMPLETADAS')
  console.log('='.repeat(60))
  console.log('Si algún webhook falló, revisa los logs del servidor para más detalles.')
}

runTests()