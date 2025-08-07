/**
 * Script de diagnóstico para webhooks de MercadoPago
 * Verifica el estado del webhook y diagnostica problemas comunes
 * 
 * Uso:
 * node scripts/webhook-diagnostics.js
 */

const http = require('http')
const https = require('https')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuración
const config = {
  webhookUrl: 'http://localhost:3000/api/mercadopago/webhook',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  mercadoPagoToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET
}

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

// Verificar configuración de variables de entorno
function checkEnvironmentVariables() {
  log('\n🔧 Verificando variables de entorno...', colors.blue)
  
  const requiredVars = {
    'NEXT_PUBLIC_SUPABASE_URL': config.supabaseUrl,
    'SUPABASE_SERVICE_ROLE_KEY': config.supabaseKey,
    'MERCADOPAGO_ACCESS_TOKEN': config.mercadoPagoToken,
    'MERCADOPAGO_WEBHOOK_SECRET': config.webhookSecret
  }
  
  let allConfigured = true
  
  for (const [varName, value] of Object.entries(requiredVars)) {
    if (value) {
      log(`✅ ${varName}: Configurada`, colors.green)
    } else {
      log(`❌ ${varName}: NO CONFIGURADA`, colors.red)
      allConfigured = false
    }
  }
  
  return allConfigured
}

// Verificar estado del endpoint webhook
function checkWebhookEndpoint() {
  return new Promise((resolve, reject) => {
    log('\n🌐 Verificando endpoint del webhook...', colors.blue)
    
    const url = new URL(config.webhookUrl)
    const client = url.protocol === 'https:' ? https : http
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'user-agent': 'Webhook-Diagnostics/1.0'
      }
    }
    
    const req = client.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          log(`✅ Endpoint activo (${res.statusCode})`, colors.green)
          try {
            const jsonResponse = JSON.parse(responseData)
            log(`📋 Respuesta: ${JSON.stringify(jsonResponse, null, 2)}`, colors.blue)
          } catch (e) {
            log(`📄 Respuesta: ${responseData}`, colors.blue)
          }
          resolve(true)
        } else {
          log(`❌ Endpoint con problemas (${res.statusCode})`, colors.red)
          log(`📄 Respuesta: ${responseData}`, colors.yellow)
          resolve(false)
        }
      })
    })
    
    req.on('error', (error) => {
      log(`❌ Error conectando al webhook: ${error.message}`, colors.red)
      resolve(false)
    })
    
    req.setTimeout(5000, () => {
      log(`❌ Timeout conectando al webhook`, colors.red)
      req.destroy()
      resolve(false)
    })
    
    req.end()
  })
}

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
  log('\n🗄️ Verificando conexión a Supabase...', colors.blue)
  
  if (!config.supabaseUrl || !config.supabaseKey) {
    log('❌ Credenciales de Supabase no configuradas', colors.red)
    return false
  }
  
  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseKey)
    
    // Probar consulta simple
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1)
    
    if (error) {
      log(`❌ Error conectando a Supabase: ${error.message}`, colors.red)
      return false
    }
    
    log('✅ Conexión a Supabase exitosa', colors.green)
    return true
    
  } catch (error) {
    log(`❌ Error en Supabase: ${error.message}`, colors.red)
    return false
  }
}

// Verificar API de MercadoPago
async function checkMercadoPagoAPI() {
  log('\n💳 Verificando API de MercadoPago...', colors.blue)
  
  if (!config.mercadoPagoToken) {
    log('❌ Token de MercadoPago no configurado', colors.red)
    return false
  }
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: '/v1/payments/search?limit=1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.mercadoPagoToken}`,
        'Content-Type': 'application/json'
      }
    }
    
    const req = https.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          log('✅ API de MercadoPago accesible', colors.green)
          resolve(true)
        } else {
          log(`❌ Error en API de MercadoPago (${res.statusCode})`, colors.red)
          try {
            const errorData = JSON.parse(responseData)
            log(`📄 Error: ${JSON.stringify(errorData, null, 2)}`, colors.yellow)
          } catch (e) {
            log(`📄 Respuesta: ${responseData}`, colors.yellow)
          }
          resolve(false)
        }
      })
    })
    
    req.on('error', (error) => {
      log(`❌ Error conectando a MercadoPago: ${error.message}`, colors.red)
      resolve(false)
    })
    
    req.end()
  })
}

// Buscar órdenes pendientes recientes
async function checkPendingOrders() {
  log('\n📋 Verificando órdenes pendientes...', colors.blue)
  
  if (!config.supabaseUrl || !config.supabaseKey) {
    log('❌ No se puede verificar órdenes - Supabase no configurado', colors.red)
    return
  }
  
  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseKey)
    
    // Buscar órdenes pendientes de los últimos 7 días
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, created_at, collection_id, external_reference, payment_intent_id')
      .in('status', ['pending', 'pending_payment'])
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
    
    if (error) {
      log(`❌ Error consultando órdenes: ${error.message}`, colors.red)
      return
    }
    
    if (pendingOrders.length === 0) {
      log('✅ No hay órdenes pendientes recientes', colors.green)
    } else {
      log(`⚠️ ${pendingOrders.length} órdenes pendientes encontradas:`, colors.yellow)
      
      pendingOrders.forEach(order => {
        const hasPaymentId = order.collection_id || order.external_reference ? '✅' : '❌'
        log(`  ${hasPaymentId} Orden ${order.id}: $${order.total} - ${order.status} (${new Date(order.created_at).toLocaleDateString()})`, colors.yellow)
      })
      
      const ordersWithoutPaymentId = pendingOrders.filter(o => !o.collection_id && !o.external_reference)
      if (ordersWithoutPaymentId.length > 0) {
        log(`\n⚠️ ${ordersWithoutPaymentId.length} órdenes sin MercadoPago ID - posible problema con webhooks`, colors.yellow)
      }
    }
    
  } catch (error) {
    log(`❌ Error verificando órdenes: ${error.message}`, colors.red)
  }
}

// Simular webhook de prueba
async function testWebhookSimulation() {
  log('\n🧪 Probando webhook con datos simulados...', colors.blue)
  
  const testWebhookData = {
    id: 'test-webhook-diagnostic',
    live_mode: false,
    type: 'payment',
    date_created: new Date().toISOString(),
    application_id: '123456789',
    user_id: '987654321',
    version: 1,
    api_version: 'v1',
    action: 'payment.updated',
    data: {
      id: 'test-payment-id'
    }
  }
  
  return new Promise((resolve) => {
    const url = new URL(config.webhookUrl)
    const client = url.protocol === 'https:' ? https : http
    const postData = JSON.stringify(testWebhookData)
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-signature': 'test-signature',
        'x-request-id': 'test-request-id',
        'user-agent': 'MercadoPago/Test'
      }
    }
    
    const req = client.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          log('✅ Webhook responde correctamente a simulación', colors.green)
        } else {
          log(`⚠️ Webhook responde con código ${res.statusCode}`, colors.yellow)
        }
        
        try {
          const jsonResponse = JSON.parse(responseData)
          log(`📋 Respuesta: ${JSON.stringify(jsonResponse, null, 2)}`, colors.blue)
        } catch (e) {
          log(`📄 Respuesta: ${responseData}`, colors.blue)
        }
        
        resolve(res.statusCode === 200)
      })
    })
    
    req.on('error', (error) => {
      log(`❌ Error en simulación de webhook: ${error.message}`, colors.red)
      resolve(false)
    })
    
    req.write(postData)
    req.end()
  })
}

// Función principal de diagnóstico
async function runDiagnostics() {
  log('🔍 DIAGNÓSTICO DE WEBHOOKS DE MERCADOPAGO', colors.bold)
  log('=' .repeat(50), colors.blue)
  
  const results = {
    environment: checkEnvironmentVariables(),
    webhook: await checkWebhookEndpoint(),
    supabase: await checkSupabaseConnection(),
    mercadopago: await checkMercadoPagoAPI(),
    simulation: await testWebhookSimulation()
  }
  
  await checkPendingOrders()
  
  // Resumen final
  log('\n📊 RESUMEN DEL DIAGNÓSTICO', colors.bold)
  log('=' .repeat(30), colors.blue)
  
  const checks = [
    { name: 'Variables de entorno', status: results.environment },
    { name: 'Endpoint webhook', status: results.webhook },
    { name: 'Conexión Supabase', status: results.supabase },
    { name: 'API MercadoPago', status: results.mercadopago },
    { name: 'Simulación webhook', status: results.simulation }
  ]
  
  let allPassed = true
  checks.forEach(check => {
    const status = check.status ? '✅' : '❌'
    const color = check.status ? colors.green : colors.red
    log(`${status} ${check.name}`, color)
    if (!check.status) allPassed = false
  })
  
  log('\n🎯 RECOMENDACIONES', colors.bold)
  log('=' .repeat(20), colors.blue)
  
  if (allPassed) {
    log('✅ Todos los componentes funcionan correctamente', colors.green)
    log('\nSi los webhooks no están actualizando órdenes, verifica:', colors.blue)
    log('1. Configuración del webhook en el panel de MercadoPago')
    log('2. URL del webhook apunta a tu servidor')
    log('3. Logs del servidor para errores específicos')
    log('4. Que los pagos tengan external_reference válido')
  } else {
    log('❌ Se encontraron problemas que deben resolverse:', colors.red)
    
    if (!results.environment) {
      log('• Configurar todas las variables de entorno requeridas')
    }
    if (!results.webhook) {
      log('• Verificar que el servidor esté corriendo (npm run dev)')
      log('• Verificar la URL del webhook')
    }
    if (!results.supabase) {
      log('• Verificar credenciales de Supabase')
      log('• Verificar permisos de la service role key')
    }
    if (!results.mercadopago) {
      log('• Verificar token de MercadoPago')
      log('• Verificar que el token tenga permisos necesarios')
    }
  }
  
  log('\n🚀 PRÓXIMOS PASOS', colors.bold)
  log('1. Resolver los problemas identificados')
  log('2. Ejecutar: node scripts/find-and-update-pending-orders.js')
  log('3. Configurar webhook en panel de MercadoPago si no está configurado')
  log('4. Monitorear logs del servidor para webhooks entrantes')
  
  process.exit(allPassed ? 0 : 1)
}

// Ejecutar diagnóstico
if (require.main === module) {
  runDiagnostics().catch(error => {
    log(`❌ Error crítico en diagnóstico: ${error.message}`, colors.red)
    process.exit(1)
  })
}

module.exports = {
  runDiagnostics,
  checkEnvironmentVariables,
  checkWebhookEndpoint,
  checkSupabaseConnection,
  checkMercadoPagoAPI
}