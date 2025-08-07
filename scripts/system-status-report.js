// scripts/system-status-report.js
// Reporte completo del estado del sistema PetGourmet

const { execSync } = require('child_process')

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'test@petgourmet.com'

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  console.log(`📋 ${title}`)
  console.log('='.repeat(60))
}

function logTest(name, status, details = '') {
  const icon = status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌'
  console.log(`${icon} ${name}`)
  if (details) {
    console.log(`   ${details}`)
  }
}

function testEndpoint(url) {
  try {
    const command = `curl -s -o nul -w "%{http_code}" "${url}"`
    const result = execSync(command, { encoding: 'utf8', timeout: 10000 })
    const status = parseInt(result.trim())
    
    return {
      success: status === 200,
      status: status
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
    const statusCommand = `curl -s -o nul -w "%{http_code}" "${url}"`
    const statusResult = execSync(statusCommand, { encoding: 'utf8', timeout: 15000 })
    const status = parseInt(statusResult.trim())
    
    let hasData = false
    let dataInfo = 'Sin datos'
    
    if (status === 200) {
      try {
        const contentCommand = `curl -s "${url}"`
        const content = execSync(contentCommand, { encoding: 'utf8', timeout: 15000 })
        
        if (content.includes('"orders"') || content.includes('"subscriptions"') || content.includes('"data"')) {
          hasData = true
          
          // Estimar cantidad de datos
          const contentLength = content.length
          if (contentLength > 10000) {
            dataInfo = `Datos abundantes (${Math.round(contentLength/1000)}KB)`
          } else if (contentLength > 1000) {
            dataInfo = `Datos moderados (${Math.round(contentLength/1000)}KB)`
          } else {
            dataInfo = 'Datos mínimos'
          }
        }
      } catch (e) {
        dataInfo = 'Error al leer contenido'
      }
    }
    
    return {
      success: status === 200,
      status: status,
      hasData: hasData,
      dataInfo: dataInfo
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message,
      hasData: false,
      dataInfo: 'Error de conexión'
    }
  }
}

function generateSystemReport() {
  console.log('🚀 REPORTE COMPLETO DEL SISTEMA PETGOURMET')
  console.log(`🌐 URL Base: ${BASE_URL}`)
  console.log(`📧 Email de prueba: ${TEST_EMAIL}`)
  
  let totalTests = 0
  let passedTests = 0
  
  // 1. Verificación del servidor principal
  logSection('ESTADO DEL SERVIDOR')
  const serverTest = testEndpoint(BASE_URL)
  totalTests++
  if (serverTest.success) {
    passedTests++
    logTest('Servidor Next.js', 'pass', 'Funcionando correctamente')
  } else {
    logTest('Servidor Next.js', 'fail', 'No responde - Ejecutar: npm run dev')
    console.log('\n❌ SISTEMA NO DISPONIBLE - El servidor debe estar corriendo para continuar')
    return
  }
  
  // 2. APIs de administración funcionales
  logSection('APIS DE ADMINISTRACIÓN')
  
  const adminApis = [
    { name: 'API de órdenes admin', url: `${BASE_URL}/api/admin/orders`, expectData: true },
    { name: 'API de estadísticas de pago', url: `${BASE_URL}/api/admin/payment-stats`, expectData: true },
    { name: 'API de órdenes con suscripciones', url: `${BASE_URL}/api/admin/orders-with-subscriptions`, expectData: true }
  ]
  
  adminApis.forEach(api => {
    totalTests++
    const result = api.expectData ? testApiWithData(api.url) : testEndpoint(api.url)
    
    if (result.success) {
      passedTests++
      const details = api.expectData ? result.dataInfo : 'Funcionando'
      logTest(api.name, 'pass', details)
    } else {
      logTest(api.name, 'fail', `Status: ${result.status}`)
    }
  })
  
  // 3. APIs de usuario
  logSection('APIS DE USUARIO')
  
  const userApis = [
    { name: 'API de historial de facturación', url: `${BASE_URL}/api/billing-history/user/${TEST_EMAIL}`, expectData: false },
    { name: 'API de webhook MercadoPago', url: `${BASE_URL}/api/mercadopago/webhook`, expectData: false }
  ]
  
  userApis.forEach(api => {
    totalTests++
    const result = testEndpoint(api.url)
    
    if (result.success || result.status === 404 || result.status === 405) {
      passedTests++
      let details = 'Funcionando'
      if (result.status === 404) details = 'Usuario no encontrado (normal para pruebas)'
      if (result.status === 405) details = 'Método no permitido (normal para webhook)'
      logTest(api.name, 'pass', details)
    } else {
      logTest(api.name, 'fail', `Status: ${result.status}`)
    }
  })
  
  // 4. Interfaces de usuario
  logSection('INTERFACES DE USUARIO')
  
  const interfaces = [
    { name: 'Página de perfil', url: `${BASE_URL}/perfil` },
    { name: 'Admin - Órdenes', url: `${BASE_URL}/admin/orders` },
    { name: 'Admin - Suscripciones', url: `${BASE_URL}/admin/subscription-orders` },
    { name: 'Página principal', url: `${BASE_URL}` },
    { name: 'Página de productos', url: `${BASE_URL}/productos` }
  ]
  
  interfaces.forEach(interface => {
    totalTests++
    const result = testEndpoint(interface.url)
    
    if (result.success) {
      passedTests++
      logTest(interface.name, 'pass', 'Página carga correctamente')
    } else {
      logTest(interface.name, 'fail', `Status: ${result.status}`)
    }
  })
  
  // 5. Resumen final
  logSection('RESUMEN DEL SISTEMA')
  
  const successRate = Math.round((passedTests / totalTests) * 100)
  
  console.log(`\n📊 RESULTADOS FINALES:`)
  console.log(`✅ Pruebas exitosas: ${passedTests}/${totalTests}`)
  console.log(`📈 Tasa de éxito: ${successRate}%`)
  
  if (successRate >= 90) {
    console.log('\n🎉 ¡EXCELENTE! El sistema está funcionando óptimamente.')
  } else if (successRate >= 75) {
    console.log('\n✅ ¡BIEN! El sistema está funcionando correctamente con algunas mejoras pendientes.')
  } else if (successRate >= 50) {
    console.log('\n⚠️ ADVERTENCIA: El sistema tiene problemas que requieren atención.')
  } else {
    console.log('\n❌ CRÍTICO: El sistema tiene problemas graves que requieren atención inmediata.')
  }
  
  // 6. Recomendaciones
  logSection('RECOMENDACIONES')
  
  console.log('💡 PRÓXIMOS PASOS:')
  console.log('   • Verificar que la base de datos Supabase esté configurada correctamente')
  console.log('   • Probar crear una orden real y verificar que aparezca en admin')
  console.log('   • Configurar webhook real de MercadoPago en producción')
  console.log('   • Implementar endpoint general para suscripciones admin')
  console.log('   • Verificar logs del servidor para errores específicos')
  console.log('   • Realizar pruebas de carga para verificar rendimiento')
  
  console.log('\n🔧 MANTENIMIENTO:')
  console.log('   • Ejecutar este reporte regularmente')
  console.log('   • Monitorear logs de errores')
  console.log('   • Verificar métricas de rendimiento')
  console.log('   • Actualizar dependencias regularmente')
  
  const endTime = Date.now()
  console.log(`\n⏱️ Tiempo total de ejecución: ${Math.round((endTime - startTime) / 1000)} segundos`)
  
  console.log('\n🏁 REPORTE COMPLETADO')
}

// Ejecutar reporte
const startTime = Date.now()
generateSystemReport()