#!/usr/bin/env node

/**
 * Script para probar el endpoint de webhook con un payload real
 */

async function testWebhook() {
  console.log('🧪 PROBANDO ENDPOINT DE WEBHOOK')
  console.log('================================\n')

  // Payload real basado en el pago encontrado
  const webhookPayload = {
    id: 130099545356, // ID del webhook
    live_mode: false,
    type: 'payment',
    action: 'payment.created',
    date_created: '2025-10-15T21:34:33.000-04:00',
    user_id: '2718057813',
    api_version: 'v1',
    data: {
      id: '130099545356' // Payment ID
    }
  }

  console.log('📤 Enviando webhook con payload:')
  console.log(JSON.stringify(webhookPayload, null, 2))
  console.log('')

  try {
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature',
        'x-request-id': 'test-request-' + Date.now()
      },
      body: JSON.stringify(webhookPayload)
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

    console.log('\n================================')
    if (response.ok) {
      console.log('✅ Webhook procesado exitosamente')
    } else {
      console.log('❌ Webhook falló con error')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testWebhook()
