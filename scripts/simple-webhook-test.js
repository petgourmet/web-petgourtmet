#!/usr/bin/env node

/**
 * Script simple para test de webhook
 */

async function testWebhook() {
  console.log('🧪 TEST SIMPLE DE WEBHOOK')
  console.log('==========================\n')

  const payload = {
    id: 130099545356,
    live_mode: false,
    type: 'payment',
    action: 'payment.created',
    date_created: '2025-10-15T21:34:33.000-04:00',
    user_id: '2718057813',
    api_version: 'v1',
    data: { id: '130099545356' }
  }

  console.log('📤 Payload:', JSON.stringify(payload, null, 2))
  console.log('')

  try {
    console.log('🔄 Enviando request...')
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    console.log(`📥 Status: ${response.status} ${response.statusText}`)
    
    const text = await response.text()
    console.log('📥 Response:', text)
    
    if (response.ok) {
      console.log('\n✅ WEBHOOK EXITOSO')
    } else {
      console.log('\n❌ WEBHOOK FALLÓ')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('\n⚠️ Asegúrate de que el servidor esté corriendo en localhost:3000')
    console.error('   Ejecuta: pnpm dev')
  }
}

testWebhook()
