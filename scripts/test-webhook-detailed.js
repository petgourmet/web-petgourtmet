#!/usr/bin/env node

/**
 * Script para simular webhook y esperar a ver respuesta detallada
 */

async function testWebhookWithRetry() {
  console.log('🧪 PROBANDO ENDPOINT DE WEBHOOK CON MÚLTIPLES INTENTOS')
  console.log('========================================================\n')

  const webhookPayloads = [
    {
      name: 'Payment Created',
      payload: {
        id: 130099545356,
        live_mode: false,
        type: 'payment',
        action: 'payment.created',
        date_created: '2025-10-15T21:34:33.000-04:00',
        user_id: '2718057813',
        api_version: 'v1',
        data: {
          id: '130099545356'
        }
      }
    },
    {
      name: 'Payment Updated',
      payload: {
        id: 130099545356,
        live_mode: false,
        type: 'payment',
        action: 'payment.updated',
        date_created: '2025-10-15T21:34:33.000-04:00',
        user_id: '2718057813',
        api_version: 'v1',
        data: {
          id: '130099545356'
        }
      }
    }
  ]

  for (const test of webhookPayloads) {
    console.log(`\n📤 TEST: ${test.name}`)
    console.log('Payload:', JSON.stringify(test.payload, null, 2))
    console.log('')

    try {
      const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': 'test-' + Date.now()
        },
        body: JSON.stringify(test.payload)
      })

      console.log(`📥 Status: ${response.status} ${response.statusText}`)

      const responseText = await response.text()
      try {
        const jsonResponse = JSON.parse(responseText)
        console.log('📥 Response:', JSON.stringify(jsonResponse, null, 2))
      } catch {
        console.log('📥 Response (raw):', responseText)
      }

      if (!response.ok) {
        console.log('❌ ERROR DETECTADO')
      } else {
        console.log('✅ SUCCESS')
      }

      // Esperar un poco entre requests
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error('❌ Fetch Error:', error.message)
    }

    console.log('\n' + '='.repeat(80))
  }

  // Ahora verificar si se guardó en la base de datos
  console.log('\n\n📊 VERIFICANDO BASE DE DATOS...')
  
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    'https://kwhubfkvpvrlawpylopc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'
  )

  const { data: webhooks } = await supabase
    .from('webhook_log')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(5)

  if (webhooks && webhooks.length > 0) {
    console.log(`\n✅ Webhooks en BD: ${webhooks.length}`)
    webhooks.forEach((wh, i) => {
      console.log(`\n${i + 1}. Webhook ID: ${wh.webhook_id}`)
      console.log(`   Status: ${wh.status}`)
      console.log(`   Received: ${wh.received_at}`)
      if (wh.error_message) {
        console.log(`   Error: ${wh.error_message}`)
      }
    })
  } else {
    console.log('\n❌ No hay webhooks en la base de datos')
  }
}

testWebhookWithRetry()
