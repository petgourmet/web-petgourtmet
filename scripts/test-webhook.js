#!/usr/bin/env node

/**
 * Script para probar el webhook de MercadoPago con datos simulados
 * Crea una orden de prueba y simula un webhook válido
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables de entorno de Supabase requeridas no encontradas')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestOrder() {
  console.log('🔧 Creando orden de prueba...')
  
  const testOrder = {
    user_id: '00000000-0000-0000-0000-000000000000', // UUID de prueba
    status: 'pending',
    payment_status: 'pending',
    total_amount: 1500.00,
    external_reference: `TEST-${Date.now()}`,
    order_number: `ORD-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { data: order, error } = await supabase
    .from('orders')
    .insert(testOrder)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Error creando orden de prueba:', error)
    return null
  }
  
  console.log('✅ Orden de prueba creada:', {
    id: order.id,
    external_reference: order.external_reference,
    order_number: order.order_number
  })
  
  return order
}

async function simulateWebhook(orderId, externalReference) {
  console.log('\n🚀 Simulando webhook de MercadoPago...')
  
  // Simular webhook de merchant_order
  const webhookPayload = {
    id: orderId.toString(),
    topic: 'merchant_order',
    resource: `https://api.mercadopago.com/merchant_orders/${orderId}`
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const responseText = await response.text()
    
    console.log(`📡 Respuesta del webhook: ${response.status} ${response.statusText}`)
    console.log('📄 Contenido:', responseText)
    
    if (response.ok) {
      console.log('✅ Webhook procesado exitosamente')
    } else {
      console.log('⚠️ Webhook falló, pero esto es esperado para datos de prueba')
    }
    
  } catch (error) {
    console.error('❌ Error enviando webhook:', error.message)
  }
}

async function simulatePaymentWebhook(paymentId = '12345678') {
  console.log('\n🚀 Simulando webhook de payment...')
  
  const webhookPayload = {
    id: paymentId,
    topic: 'payment',
    type: 'payment',
    data: {
      id: paymentId
    },
    action: 'payment.updated',
    api_version: 'v1',
    date_created: new Date().toISOString(),
    live_mode: false,
    user_id: '123456789'
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const responseText = await response.text()
    
    console.log(`📡 Respuesta del webhook: ${response.status} ${response.statusText}`)
    console.log('📄 Contenido:', responseText)
    
    if (response.ok) {
      console.log('✅ Webhook de payment procesado exitosamente')
    } else {
      console.log('⚠️ Webhook de payment falló, pero esto es esperado para datos de prueba')
    }
    
  } catch (error) {
    console.error('❌ Error enviando webhook de payment:', error.message)
  }
}

async function testWebhookStructures() {
  console.log('\n🧪 Probando diferentes estructuras de webhook...')
  
  // Estructura 1: Legacy merchant_order
  console.log('\n📋 Probando estructura legacy de merchant_order...')
  await simulateWebhook('TEST123', 'TEST-REF-123')
  
  // Estructura 2: Payment webhook
  console.log('\n📋 Probando estructura de payment...')
  await simulatePaymentWebhook()
  
  // Estructura 3: Webhook inválido
  console.log('\n📋 Probando webhook con estructura inválida...')
  try {
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ invalid: 'structure' })
    })
    
    const responseText = await response.text()
    console.log(`📡 Respuesta webhook inválido: ${response.status} ${response.statusText}`)
    console.log('📄 Contenido:', responseText)
    
  } catch (error) {
    console.error('❌ Error enviando webhook inválido:', error.message)
  }
}

async function main() {
  console.log('🚀 INICIANDO PRUEBAS DE WEBHOOK')
  console.log('=' .repeat(50))
  
  try {
    // Crear orden de prueba
    const testOrder = await createTestOrder()
    
    if (testOrder) {
      // Simular webhook con la orden creada
      await simulateWebhook(testOrder.id, testOrder.external_reference)
    }
    
    // Probar diferentes estructuras
    await testWebhookStructures()
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ PRUEBAS COMPLETADAS')
    console.log('💡 Revisa los logs del servidor para ver el comportamiento detallado')
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
}

module.exports = { createTestOrder, simulateWebhook, simulatePaymentWebhook }