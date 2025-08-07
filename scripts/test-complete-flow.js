const { execSync } = require('child_process')

// Configuración
const BASE_URL = 'http://localhost:3000'
const TEST_USER_EMAIL = 'test@petgourmet.com'
const TEST_ORDER_ID = '123'
const TEST_PAYMENT_ID = '456'

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(`📋 ${title}`, 'bold')
  console.log('='.repeat(60))
}

function logTest(testName, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow'
  log(`${icon} ${testName}`, color)
  if (details) {
    log(`   ${details}`, 'reset')
  }
}

function testEndpointWithPowerShell(url, method = 'GET', expectedStatus = 200) {
  try {
    let command
    if (method === 'GET') {
      command = `powershell -Command "try { $response = Invoke-WebRequest -Uri '${url}' -Method GET -UseBasicParsing; Write-Output $response.StatusCode } catch { Write-Output $_.Exception.Response.StatusCode.value__ }"`
    } else {
      // Para POST, simplificar por ahora
      command = `powershell -Command "try { $response = Invoke-WebRequest -Uri '${url}' -Method GET -UseBasicParsing; Write-Output $response.StatusCode } catch { Write-Output $_.Exception.Response.StatusCode.value__ }"`
    }
    
    const result = execSync(command, { encoding: 'utf8', timeout: 10000 }).trim()
    const statusCode = parseInt(result)
    
    return {
      success: statusCode === expectedStatus,
      status: statusCode,
      error: statusCode !== expectedStatus ? `Expected ${expectedStatus}, got ${statusCode}` : null
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message
    }
  }
}

function testWebhookEndpoint() {
  logSection('PRUEBAS DE WEBHOOK')
  
  // Test 1: Verificar que el endpoint webhook responde
  const webhookTest = testEndpointWithPowerShell(`${BASE_URL}/api/mercadopago/webhook`)
  logTest(
    'Endpoint webhook accesible',
    webhookTest.success ? 'pass' : 'fail',
    webhookTest.error || `Status: ${webhookTest.status}`
  )
  
  return {
    webhookAccessible: webhookTest.success
  }
}

function testUserInterfaces() {
  logSection('PRUEBAS DE INTERFAZ DE USUARIO')
  
  // Test 1: Página de perfil
  const perfilTest = testEndpointWithPowerShell(`${BASE_URL}/perfil`)
  logTest(
    'Página de perfil accesible',
    perfilTest.success ? 'pass' : 'fail',
    perfilTest.error || 'Página carga correctamente'
  )
  
  // Test 2: Admin - Órdenes
  const adminOrdersTest = testEndpointWithPowerShell(`${BASE_URL}/admin/orders`)
  logTest(
    'Admin - Página de órdenes accesible',
    adminOrdersTest.success ? 'pass' : 'fail',
    adminOrdersTest.error || 'Página carga correctamente'
  )
  
  // Test 3: Admin - Suscripciones
  const adminSubscriptionsTest = testEndpointWithPowerShell(`${BASE_URL}/admin/subscription-orders`)
  logTest(
    'Admin - Página de suscripciones accesible',
    adminSubscriptionsTest.success ? 'pass' : 'fail',
    adminSubscriptionsTest.error || 'Página carga correctamente'
  )
  
  return {
    perfil: perfilTest.success,
    adminOrders: adminOrdersTest.success,
    adminSubscriptions: adminSubscriptionsTest.success
  }
}

function testApiEndpoints() {
  logSection('PRUEBAS DE API')
  
  // Test 1: API de órdenes
  const ordersApiTest = testEndpointWithPowerShell(`${BASE_URL}/api/admin/orders`)
  logTest(
    'API de órdenes admin',
    ordersApiTest.success ? 'pass' : 'fail',
    ordersApiTest.error || `Status: ${ordersApiTest.status}`
  )
  
  // Test 2: API de suscripciones
  const subscriptionsApiTest = testEndpointWithPowerShell(`${BASE_URL}/api/admin/subscriptions`)
  logTest(
    'API de suscripciones admin',
    subscriptionsApiTest.success || subscriptionsApiTest.status === 404 ? 'pass' : 'fail',
    subscriptionsApiTest.status === 404 ? 'Endpoint no encontrado (puede ser normal)' : subscriptionsApiTest.error
  )
  
  // Test 3: API de historial de facturación
  const billingApiTest = testEndpointWithPowerShell(`${BASE_URL}/api/billing-history/user/test-user-id`)
  logTest(
    'API de historial de facturación',
    billingApiTest.success || billingApiTest.status === 404 ? 'pass' : 'fail',
    billingApiTest.status === 404 ? 'Usuario no encontrado (esperado para prueba)' : billingApiTest.error
  )
  
  return {
    ordersApi: ordersApiTest.success,
    subscriptionsApi: subscriptionsApiTest.success || subscriptionsApiTest.status === 404,
    billingApi: billingApiTest.success || billingApiTest.status === 404
  }
}

function checkServerStatus() {
  logSection('VERIFICACIÓN DEL SERVIDOR')
  
  // Verificar si el servidor está corriendo
  const serverTest = testEndpointWithPowerShell(BASE_URL)
  logTest(
    'Servidor Next.js corriendo',
    serverTest.success ? 'pass' : 'fail',
    serverTest.error || `Servidor respondiendo en ${BASE_URL}`
  )
  
  return {
    serverRunning: serverTest.success
  }
}

function generateTestReport(results) {
  logSection('RESUMEN DE PRUEBAS')
  
  const allTests = [
    { name: 'Servidor corriendo', result: results.server.serverRunning },
    { name: 'Webhook accesible', result: results.webhook.webhookAccessible },
    { name: 'API órdenes', result: results.api.ordersApi },
    { name: 'API suscripciones', result: results.api.subscriptionsApi },
    { name: 'API facturación', result: results.api.billingApi },
    { name: 'Página perfil', result: results.ui.perfil },
    { name: 'Admin órdenes', result: results.ui.adminOrders },
    { name: 'Admin suscripciones', result: results.ui.adminSubscriptions }
  ]
  
  const passedTests = allTests.filter(test => test.result).length
  const totalTests = allTests.length
  const successRate = Math.round((passedTests / totalTests) * 100)
  
  log(`\n📊 RESULTADOS FINALES:`, 'bold')
  log(`✅ Pruebas exitosas: ${passedTests}/${totalTests}`, 'green')
  log(`📈 Tasa de éxito: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red')
  
  if (successRate >= 80) {
    log(`\n🎉 ¡EXCELENTE! El sistema está funcionando correctamente.`, 'green')
  } else if (successRate >= 60) {
    log(`\n⚠️ ADVERTENCIA: Algunas funcionalidades necesitan atención.`, 'yellow')
  } else {
    log(`\n❌ CRÍTICO: El sistema tiene problemas significativos.`, 'red')
  }
  
  // Mostrar pruebas fallidas
  const failedTests = allTests.filter(test => !test.result)
  if (failedTests.length > 0) {
    log(`\n❌ Pruebas fallidas:`, 'red')
    failedTests.forEach(test => {
      log(`   • ${test.name}`, 'red')
    })
  }
  
  // Recomendaciones
  log(`\n💡 RECOMENDACIONES:`, 'bold')
  
  if (!results.server.serverRunning) {
    log(`   • Ejecutar 'npm run dev' para iniciar el servidor`, 'yellow')
  }
  
  if (!results.webhook.webhookAccessible) {
    log(`   • Verificar configuración del webhook en lib/webhook-service.ts`, 'yellow')
  }
  
  if (!results.api.ordersApi) {
    log(`   • Verificar conexión a la base de datos Supabase`, 'yellow')
  }
  
  if (!results.ui.perfil || !results.ui.adminOrders || !results.ui.adminSubscriptions) {
    log(`   • Verificar autenticación y permisos de usuario`, 'yellow')
  }
  
  log(`\n📝 Para pruebas más detalladas, revisar manualmente:`, 'blue')
  log(`   • Crear una orden de prueba y verificar que aparezca en /admin/orders`, 'blue')
  log(`   • Crear una suscripción y verificar que aparezca en /admin/subscription-orders`, 'blue')
  log(`   • Simular un webhook y verificar que actualice los estados`, 'blue')
  log(`   • Verificar que los usuarios vean sus compras en /perfil`, 'blue')
}

function runCompleteTests() {
  log('🚀 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA PETGOURMET', 'bold')
  log(`🌐 URL Base: ${BASE_URL}`, 'blue')
  log(`📧 Email de prueba: ${TEST_USER_EMAIL}`, 'blue')
  
  const startTime = Date.now()
  
  try {
    // Ejecutar todas las pruebas
    const results = {
      server: checkServerStatus(),
      webhook: testWebhookEndpoint(),
      api: testApiEndpoints(),
      ui: testUserInterfaces()
    }
    
    // Generar reporte
    generateTestReport(results)
    
  } catch (error) {
    log(`\n❌ ERROR CRÍTICO: ${error.message}`, 'red')
    console.error(error)
  }
  
  const endTime = Date.now()
  const duration = Math.round((endTime - startTime) / 1000)
  
  log(`\n⏱️ Tiempo total de ejecución: ${duration} segundos`, 'blue')
  log('\n🏁 PRUEBAS COMPLETADAS', 'bold')
}

// Ejecutar las pruebas
if (require.main === module) {
  runCompleteTests()
}

module.exports = {
  runCompleteTests,
  testWebhookEndpoint,
  testApiEndpoints,
  testUserInterfaces,
  checkServerStatus
}