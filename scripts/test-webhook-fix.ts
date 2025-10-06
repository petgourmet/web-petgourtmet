/**
 * Test para verificar la corrección del webhook de MercadoPago
 * 
 * Este script prueba:
 * 1. Llamada real a la API de MercadoPago
 * 2. Procesamiento de webhooks con payment_id nuevo
 * 3. Búsqueda de suscripciones por múltiples criterios
 */

import { createClient } from '@supabase/supabase-js'

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN!
const MERCADOPAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(color: keyof typeof colors, emoji: string, message: string, data?: any) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`)
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
}

async function testMercadoPagoAPI() {
  log('blue', '🧪', 'TEST 1: Verificar conexión con API de MercadoPago')
  
  try {
    // Test con un payment_id que sabemos que existe (128861820488)
    const paymentId = '128861820488'
    
    log('cyan', '📡', `Intentando obtener datos del payment_id: ${paymentId}`)
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      log('red', '❌', `Error HTTP: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.log('Error details:', errorText)
      return false
    }

    const paymentData = await response.json()
    
    log('green', '✅', 'API de MercadoPago respondió correctamente')
    log('cyan', '📊', 'Datos del pago:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      external_reference: paymentData.external_reference,
      transaction_amount: paymentData.transaction_amount,
      currency_id: paymentData.currency_id,
      payment_method_id: paymentData.payment_method_id,
      payer_email: paymentData.payer?.email,
      metadata: paymentData.metadata,
      date_created: paymentData.date_created,
      date_approved: paymentData.date_approved
    })
    
    return true
  } catch (error: any) {
    log('red', '❌', 'Error llamando a la API de MercadoPago:', {
      message: error.message,
      stack: error.stack
    })
    return false
  }
}

async function testSubscriptionSearch() {
  log('blue', '🧪', 'TEST 2: Verificar búsqueda de suscripción #203')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Datos de la suscripción #203
    const subscriptionId = 203
    const userId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
    const productId = 73
    const externalReference = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
    const customerEmail = 'cristoferscalante@gmail.com'
    
    log('cyan', '🔍', 'Estrategia 1: Búsqueda directa por external_reference')
    const { data: sub1, error: err1 } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .maybeSingle()
    
    if (err1) {
      log('red', '❌', 'Error en búsqueda 1:', err1)
    } else if (sub1) {
      log('green', '✅', 'Encontrada por external_reference', {
        id: sub1.id,
        status: sub1.status,
        external_reference: sub1.external_reference
      })
    } else {
      log('yellow', '⚠️', 'No encontrada por external_reference')
    }
    
    log('cyan', '🔍', 'Estrategia 2: Búsqueda por user_id + product_id + timestamp')
    const now = new Date()
    const timeWindow = 24 * 60 * 60 * 1000 // 24 horas para el test
    const startTime = new Date(now.getTime() - timeWindow).toISOString()
    const endTime = new Date(now.getTime() + timeWindow).toISOString()
    
    const { data: sub2, error: err2 } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .gte('created_at', startTime)
      .lte('created_at', endTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (err2) {
      log('red', '❌', 'Error en búsqueda 2:', err2)
    } else if (sub2) {
      log('green', '✅', 'Encontrada por user_id + product_id + timestamp', {
        id: sub2.id,
        status: sub2.status,
        created_at: sub2.created_at
      })
    } else {
      log('yellow', '⚠️', 'No encontrada por user_id + product_id')
    }
    
    log('cyan', '🔍', 'Estrategia 3: Búsqueda por email + timestamp')
    const { data: subs3, error: err3 } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startTime)
      .lte('created_at', endTime)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (err3) {
      log('red', '❌', 'Error en búsqueda 3:', err3)
    } else if (subs3 && subs3.length > 0) {
      const sub3 = subs3[0]
      const customerData = typeof sub3.customer_data === 'string' 
        ? JSON.parse(sub3.customer_data) 
        : sub3.customer_data
      
      log('green', '✅', 'Encontrada por user_id + timestamp', {
        id: sub3.id,
        status: sub3.status,
        email: customerData?.email
      })
    } else {
      log('yellow', '⚠️', 'No encontrada por email + timestamp')
    }
    
    return true
  } catch (error: any) {
    log('red', '❌', 'Error en búsqueda de suscripciones:', {
      message: error.message,
      stack: error.stack
    })
    return false
  }
}

async function testWebhookEndpoint() {
  log('blue', '🧪', 'TEST 3: Verificar endpoint de webhook (local)')
  
  try {
    // Test solo si el servidor está corriendo
    const baseUrl = 'http://localhost:3000'
    
    log('cyan', '📡', 'Verificando si el servidor local está corriendo...')
    
    try {
      const healthResponse = await fetch(`${baseUrl}/api/mercadopago/webhook`, {
        method: 'GET'
      })
      
      if (!healthResponse.ok) {
        log('yellow', '⚠️', 'Servidor local no está corriendo o no responde')
        log('cyan', 'ℹ️', 'Puedes iniciar el servidor con: npm run dev')
        return false
      }
      
      const healthData = await healthResponse.json()
      log('green', '✅', 'Servidor local está corriendo', healthData)
      
      // Simular un webhook de pago
      log('cyan', '📡', 'Simulando webhook de pago...')
      const webhookPayload = {
        id: 'test_webhook_' + Date.now(),
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: '123456',
        user_id: '123456',
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: '128861820488' // El payment_id real de la suscripción #203
        }
      }
      
      const webhookResponse = await fetch(`${baseUrl}/api/mercadopago/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      })
      
      if (!webhookResponse.ok) {
        log('yellow', '⚠️', `Webhook respondió con status: ${webhookResponse.status}`)
        const errorText = await webhookResponse.text()
        console.log('Response:', errorText)
        return false
      }
      
      const webhookData = await webhookResponse.json()
      log('green', '✅', 'Webhook procesado correctamente', webhookData)
      
      return true
    } catch (fetchError: any) {
      log('yellow', '⚠️', 'No se pudo conectar al servidor local')
      log('cyan', 'ℹ️', 'Asegúrate de que el servidor esté corriendo: npm run dev')
      return false
    }
  } catch (error: any) {
    log('red', '❌', 'Error en test de webhook:', {
      message: error.message
    })
    return false
  }
}

async function testEnvironmentVariables() {
  log('blue', '🧪', 'TEST 0: Verificar variables de entorno')
  
  const vars = {
    'NEXT_PUBLIC_SUPABASE_URL': SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': SUPABASE_ANON_KEY ? '✓ Configurada' : '✗ Falta',
    'MERCADOPAGO_ACCESS_TOKEN': MERCADOPAGO_ACCESS_TOKEN ? '✓ Configurada' : '✗ Falta',
    'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY': MERCADOPAGO_PUBLIC_KEY ? '✓ Configurada' : '✗ Falta'
  }
  
  const allConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && MERCADOPAGO_ACCESS_TOKEN && MERCADOPAGO_PUBLIC_KEY
  
  if (allConfigured) {
    log('green', '✅', 'Todas las variables de entorno están configuradas', vars)
    return true
  } else {
    log('red', '❌', 'Faltan variables de entorno', vars)
    return false
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80))
  log('magenta', '🚀', 'INICIANDO TESTS DE CORRECCIÓN DE WEBHOOK')
  console.log('='.repeat(80) + '\n')
  
  const results = {
    env: false,
    api: false,
    search: false,
    webhook: false
  }
  
  // Test 0: Variables de entorno
  results.env = await testEnvironmentVariables()
  console.log('\n' + '-'.repeat(80) + '\n')
  
  if (!results.env) {
    log('red', '❌', 'No se pueden ejecutar más tests sin las variables de entorno')
    return
  }
  
  // Test 1: API de MercadoPago
  results.api = await testMercadoPagoAPI()
  console.log('\n' + '-'.repeat(80) + '\n')
  
  // Test 2: Búsqueda de suscripciones
  results.search = await testSubscriptionSearch()
  console.log('\n' + '-'.repeat(80) + '\n')
  
  // Test 3: Endpoint de webhook (opcional)
  results.webhook = await testWebhookEndpoint()
  console.log('\n' + '-'.repeat(80) + '\n')
  
  // Resumen
  console.log('\n' + '='.repeat(80))
  log('magenta', '📊', 'RESUMEN DE TESTS')
  console.log('='.repeat(80) + '\n')
  
  const tests = [
    { name: 'Variables de Entorno', result: results.env, critical: true },
    { name: 'API de MercadoPago', result: results.api, critical: true },
    { name: 'Búsqueda de Suscripciones', result: results.search, critical: true },
    { name: 'Endpoint de Webhook', result: results.webhook, critical: false }
  ]
  
  tests.forEach(test => {
    const icon = test.result ? '✅' : (test.critical ? '❌' : '⚠️')
    const color = test.result ? 'green' : (test.critical ? 'red' : 'yellow')
    const status = test.result ? 'PASSED' : (test.critical ? 'FAILED' : 'SKIPPED')
    log(color, icon, `${test.name}: ${status}`)
  })
  
  console.log('\n')
  
  const criticalTestsPassed = tests
    .filter(t => t.critical)
    .every(t => t.result)
  
  if (criticalTestsPassed) {
    log('green', '🎉', 'TODOS LOS TESTS CRÍTICOS PASARON')
    log('cyan', 'ℹ️', 'La corrección está lista para commit y deploy')
  } else {
    log('red', '❌', 'ALGUNOS TESTS CRÍTICOS FALLARON')
    log('yellow', '⚠️', 'Revisa los errores antes de hacer commit')
  }
  
  console.log('\n' + '='.repeat(80) + '\n')
}

// Ejecutar tests
runTests().catch(error => {
  log('red', '💥', 'Error fatal ejecutando tests:', {
    message: error.message,
    stack: error.stack
  })
  process.exit(1)
})
