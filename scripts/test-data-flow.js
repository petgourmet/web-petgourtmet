// Script para probar el flujo completo de datos desde webhooks hasta interfaces
const { execSync } = require('child_process')

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'test@petgourmet.com'

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  console.log(`📋 ${title}`)
  console.log('='.repeat(60))
}

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : '❌'
  console.log(`${icon} ${name}`)
  if (details) {
    console.log(`   ${details}`)
  }
}

function testEndpointWithCurl(url) {
  try {
    const command = `curl -s -o nul -w "%{http_code}" "${url}"`
    const result = execSync(command, { encoding: 'utf8', timeout: 10000 })
    
    const status = parseInt(result.trim())
    
    return {
      success: status === 200,
      status: status,
      content: result
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message
    }
  }
}

function testApiWithData(url) {
  try {
    // Primero obtener el código de estado
    const statusCommand = `curl -s -o nul -w "%{http_code}" "${url}"`
    const statusResult = execSync(statusCommand, { encoding: 'utf8', timeout: 15000 })
    const status = parseInt(statusResult.trim())
    
    let hasData = false
    let dataCount = 0
    
    if (status === 200) {
      try {
        // Obtener el contenido
        const contentCommand = `curl -s "${url}"`
        const content = execSync(contentCommand, { encoding: 'utf8', timeout: 15000 })
        
        // Buscar indicadores de datos
        if (content.includes('"orders"') || content.includes('"subscriptions"') || content.includes('"data"')) {
          hasData = true
          
          // Intentar contar elementos
          const arrayMatches = content.match(/\[.*?\]/g)
          if (arrayMatches) {
            dataCount = arrayMatches.length
          }
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }
    
    return {
      success: status === 200,
      status: status,
      hasData: hasData,
      dataCount: dataCount
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message,
      hasData: false,
      dataCount: 0
    }
  }
}

function testWebhookSimulation() {
  logSection('SIMULACIÓN DE WEBHOOK')
  
  // Simular webhook de MercadoPago
  try {
    const webhookData = {
      action: 'payment.updated',
      api_version: 'v1',
      data: {
        id: '123456789'
      },
      date_created: new Date().toISOString(),
      id: Date.now(),
      live_mode: false,
      type: 'payment',
      user_id: '123456'
    }
    
    const command = `curl -s -o nul -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "${JSON.stringify(webhookData).replace(/"/g, '\"')}" "${BASE_URL}/api/mercadopago/webhook"`
    const result = execSync(command, { encoding: 'utf8', timeout: 10000 })
    
    const status = parseInt(result.trim())
    
    logTest(
      'Webhook de prueba procesado',
      status === 200 ? 'pass' : 'fail',
      `Status: ${status}`
    )
    
    return status === 200
  } catch (error) {
    logTest(
      'Webhook de prueba procesado',
      'fail',
      `Error: ${error.message}`
    )
    return false
  }
}

function testDataAPIs() {
  logSection('PRUEBAS DE APIS CON DATOS')
  
  const tests = [
    {
      name: 'API de órdenes admin (con datos)',
      url: `${BASE_URL}/api/admin/orders`,
      expectData: true
    },
    {
      name: 'API de historial de facturación (usuario test)',
      url: `${BASE_URL}/api/billing-history/user/test-user-id?email=${TEST_EMAIL}`,
      expectData: false // Es normal que no haya datos para usuario test
    }
  ]
  
  let passedTests = 0
  
  tests.forEach(test => {
    const result = testApiWithData(test.url)
    const passed = result.success && (test.expectData ? result.hasData : true)
    
    logTest(
      test.name,
      passed ? 'pass' : 'fail',
      result.success ? 
        (result.hasData ? `Datos encontrados (${result.dataCount} elementos)` : 'Sin datos (normal para pruebas)') :
        `Error: Status ${result.status}`
    )
    
    if (passed) passedTests++
  })
  
  return { passed: passedTests, total: tests.length }
}

function testUserInterfaces() {
  logSection('PRUEBAS DE INTERFACES DE USUARIO')
  
  const interfaces = [
    {
      name: 'Página de perfil (/perfil)',
      url: `${BASE_URL}/perfil`
    },
    {
      name: 'Admin - Órdenes (/admin/orders)',
      url: `${BASE_URL}/admin/orders`
    },
    {
      name: 'Admin - Suscripciones (/admin/subscription-orders)',
      url: `${BASE_URL}/admin/subscription-orders`
    }
  ]
  
  let passedTests = 0
  
  interfaces.forEach(test => {
    const result = testEndpointWithCurl(test.url)
    const passed = result.success
    
    logTest(
      test.name,
      passed ? 'pass' : 'fail',
      passed ? 'Página carga correctamente' : `Error: Status ${result.status}`
    )
    
    if (passed) passedTests++
  })
  
  return { passed: passedTests, total: interfaces.length }
}

function main() {
  console.log('🚀 PRUEBAS DE FLUJO DE DATOS PETGOURMET')
  console.log(`🌐 URL Base: ${BASE_URL}`)
  console.log(`📧 Email de prueba: ${TEST_EMAIL}`)
  
  const startTime = Date.now()
  
  // Verificar servidor
  logSection('VERIFICACIÓN DEL SERVIDOR')
  const serverTest = testEndpointWithCurl(BASE_URL)
  logTest(
    'Servidor Next.js corriendo',
    serverTest.success ? 'pass' : 'fail',
    serverTest.success ? 'Servidor respondiendo' : 'Servidor no responde'
  )
  
  if (!serverTest.success) {
    console.log('\n❌ El servidor no está corriendo. Ejecuta: npm run dev')
    return
  }
  
  // Ejecutar pruebas
  const webhookResult = testWebhookSimulation()
  const apiResults = testDataAPIs()
  const uiResults = testUserInterfaces()
  
  // Resumen final
  logSection('RESUMEN DE PRUEBAS DE FLUJO DE DATOS')
  
  const totalTests = 1 + apiResults.total + uiResults.total // 1 para webhook
  const passedTests = (webhookResult ? 1 : 0) + apiResults.passed + uiResults.passed
  const successRate = Math.round((passedTests / totalTests) * 100)
  
  console.log('\n📊 RESULTADOS FINALES:')
  console.log(`✅ Pruebas exitosas: ${passedTests}/${totalTests}`)
  console.log(`📈 Tasa de éxito: ${successRate}%`)
  
  if (successRate >= 80) {
    console.log('\n🎉 ¡EXCELENTE! El flujo de datos está funcionando correctamente.')
  } else if (successRate >= 60) {
    console.log('\n⚠️ BUENO. Algunas funcionalidades necesitan atención.')
  } else {
    console.log('\n❌ CRÍTICO. Múltiples problemas detectados.')
  }
  
  console.log('\n💡 RECOMENDACIONES:')
  console.log('   • Verificar que existan órdenes en la base de datos')
  console.log('   • Verificar que existan suscripciones en la base de datos')
  console.log('   • Probar crear una orden real y verificar que aparezca')
  console.log('   • Probar webhook real de MercadoPago')
  console.log('   • Verificar logs del servidor para errores')
  
  const endTime = Date.now()
  const duration = Math.round((endTime - startTime) / 1000)
  
  console.log(`\n⏱️ Tiempo total de ejecución: ${duration} segundos`)
  console.log('\n🏁 PRUEBAS DE FLUJO COMPLETADAS')
}

// Ejecutar pruebas
main()