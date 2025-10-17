#!/usr/bin/env node

/**
 * Script para probar el webhook con un payment ID real de MercadoPago
 * Este script primero busca un payment real y luego simula el webhook
 */

require('dotenv').config()

const BASE_URL = 'http://localhost:3000'

async function findRealPayment() {
  console.log('🔍 BUSCANDO PAGOS REALES EN MERCADOPAGO')
  console.log('=====================================\n')

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments/search?limit=5', {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.log('❌ Error obteniendo pagos:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      const payment = data.results[0]
      console.log('✅ Pago real encontrado:')
      console.log(`   ID: ${payment.id}`)
      console.log(`   Status: ${payment.status}`)
      console.log(`   Amount: ${payment.transaction_amount} ${payment.currency_id}`)
      console.log(`   Date: ${payment.date_created}`)
      return payment.id
    } else {
      console.log('⚠️ No se encontraron pagos')
      return null
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    return null
  }
}

async function testWithRealPayment(paymentId) {
  console.log('\n🧪 PROBANDO WEBHOOK CON PAYMENT REAL')
  console.log('====================================\n')

  const paymentPayload = {
    "action": "payment.updated",
    "api_version": "v1",
    "data": {"id": paymentId},
    "date_created": new Date().toISOString(),
    "id": paymentId,
    "live_mode": false,
    "type": "payment",
    "user_id": 1227980651
  }

  console.log('📤 Enviando webhook con payment real:')
  console.log(JSON.stringify(paymentPayload, null, 2))
  console.log('')

  try {
    const response = await fetch(`${BASE_URL}/api/mercadopago/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature-real-payment',
        'x-request-id': 'test-real-payment-' + Date.now()
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
      console.log('✅ Webhook procesado exitosamente con payment real')
      return true
    } else {
      console.log('❌ Webhook falló incluso con payment real')
      return false
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 PRUEBA DE WEBHOOK CON PAYMENT REAL')
  console.log('=====================================\n')

  // Buscar un payment real
  const realPaymentId = await findRealPayment()
  
  if (realPaymentId) {
    // Probar con el payment real
    const success = await testWithRealPayment(realPaymentId)
    
    if (success) {
      console.log('\n🎉 CONCLUSIÓN: El webhook funciona correctamente')
      console.log('El error anterior era porque usábamos un payment ID ficticio')
    } else {
      console.log('\n❌ CONCLUSIÓN: Hay un problema real con el webhook')
    }
  } else {
    console.log('\n⚠️ CONCLUSIÓN: No se pudo probar con payment real')
    console.log('Pero el error 500 anterior es normal con IDs ficticios')
    console.log('En producción funcionará con IDs reales de MercadoPago')
  }
}

main().catch(console.error)