#!/usr/bin/env node

// Script manual para ejecutar auto-asignación de órdenes
// Uso: node scripts/manual-auto-assign.js [--all] [--order-id=123] [--help]

require('dotenv').config({ path: '.env.local' })

// Configuración
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// Colores para logs
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Función para mostrar ayuda
function showHelp() {
  log('\n🔧 === SCRIPT DE AUTO-ASIGNACIÓN MANUAL ===', 'cyan')
  log('\nUso:', 'yellow')
  log('  node scripts/manual-auto-assign.js [opciones]', 'blue')
  log('\nOpciones:', 'yellow')
  log('  --all              Procesar todas las órdenes sin user_id', 'blue')
  log('  --order-id=123     Procesar una orden específica', 'blue')
  log('  --stats            Mostrar solo estadísticas', 'blue')
  log('  --help             Mostrar esta ayuda', 'blue')
  log('\nEjemplos:', 'yellow')
  log('  node scripts/manual-auto-assign.js --all', 'green')
  log('  node scripts/manual-auto-assign.js --order-id=123', 'green')
  log('  node scripts/manual-auto-assign.js --stats', 'green')
  log('')
}

// Función para obtener estadísticas
async function getStats() {
  try {
    log('📊 Obteniendo estadísticas...', 'yellow')
    
    const response = await fetch(`${BASE_URL}/api/orders/auto-assign`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    log(`\n✅ Órdenes sin user_id: ${data.data.ordersWithoutUserId || 0}`, 'green')
    
    if (data.data.sampleOrders && data.data.sampleOrders.length > 0) {
      log('\n📋 Ejemplos de órdenes sin asignar:', 'blue')
      data.data.sampleOrders.forEach(order => {
        try {
          const shippingData = JSON.parse(order.shipping_address)
          const email = shippingData.customer_data?.email || 'Sin email'
          log(`  • Orden ${order.id}: ${order.customer_name || 'Sin nombre'} (${email})`, 'blue')
        } catch (e) {
          log(`  • Orden ${order.id}: ${order.customer_name || 'Sin nombre'} (Error al leer email)`, 'blue')
        }
      })
    }
    
    return data.data.ordersWithoutUserId || 0
    
  } catch (error) {
    log(`❌ Error obteniendo estadísticas: ${error.message}`, 'red')
    return -1
  }
}

// Función para procesar órdenes
async function processOrders(orderId = null, processAll = false) {
  try {
    const payload = {}
    
    if (orderId) {
      payload.orderId = parseInt(orderId)
      log(`🔄 Procesando orden específica: ${orderId}`, 'yellow')
    } else if (processAll) {
      payload.processAll = true
      log('🔄 Procesando todas las órdenes sin user_id...', 'yellow')
    } else {
      log('❌ Debe especificar --all o --order-id', 'red')
      return false
    }
    
    const response = await fetch(`${BASE_URL}/api/orders/auto-assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    log('\n✅ Procesamiento completado:', 'green')
    log(`  • Órdenes procesadas: ${result.data.processed}`, 'green')
    log(`  • Órdenes asignadas exitosamente: ${result.data.successful}`, 'green')
    log(`  • Órdenes que no se pudieron asignar: ${result.data.failed}`, result.data.failed > 0 ? 'yellow' : 'green')
    
    if (result.data.details && result.data.details.length > 0) {
      log('\n📝 Detalles del procesamiento:', 'blue')
      result.data.details.forEach(detail => {
        const status = detail.success ? '✅' : '❌'
        const color = detail.success ? 'green' : 'yellow'
        log(`  ${status} Orden ${detail.orderId}: ${detail.message}`, color)
      })
    }
    
    return true
    
  } catch (error) {
    log(`❌ Error procesando órdenes: ${error.message}`, 'red')
    return false
  }
}

// Función para verificar conectividad
async function checkConnectivity() {
  try {
    log('🌐 Verificando conectividad...', 'yellow')
    
    const response = await fetch(`${BASE_URL}/api/orders/auto-assign`)
    
    if (response.ok) {
      log('✅ Servidor respondiendo correctamente', 'green')
      return true
    } else {
      log(`❌ Servidor respondió con error: ${response.status}`, 'red')
      return false
    }
    
  } catch (error) {
    log(`❌ Error de conectividad: ${error.message}`, 'red')
    log('\n💡 Asegúrate de que el servidor esté ejecutándose:', 'blue')
    log('   npm run dev', 'blue')
    return false
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2)
  
  // Parsear argumentos
  const showHelpFlag = args.includes('--help') || args.includes('-h')
  const processAllFlag = args.includes('--all')
  const statsOnlyFlag = args.includes('--stats')
  const orderIdArg = args.find(arg => arg.startsWith('--order-id='))
  const orderId = orderIdArg ? orderIdArg.split('=')[1] : null
  
  // Mostrar ayuda si se solicita
  if (showHelpFlag) {
    showHelp()
    return
  }
  
  log('\n🚀 === SCRIPT DE AUTO-ASIGNACIÓN MANUAL ===', 'cyan')
  log(`Conectando a: ${BASE_URL}`, 'blue')
  
  // Verificar conectividad
  const isConnected = await checkConnectivity()
  if (!isConnected) {
    process.exit(1)
  }
  
  // Mostrar estadísticas iniciales
  const initialCount = await getStats()
  if (initialCount === -1) {
    process.exit(1)
  }
  
  // Si solo se solicitan estadísticas, terminar aquí
  if (statsOnlyFlag) {
    log('\n✨ Estadísticas obtenidas exitosamente', 'cyan')
    return
  }
  
  // Si no hay órdenes para procesar
  if (initialCount === 0) {
    log('\n🎉 No hay órdenes sin asignar. ¡Todo está al día!', 'green')
    return
  }
  
  // Procesar órdenes
  const success = await processOrders(orderId, processAllFlag)
  
  if (success) {
    // Mostrar estadísticas finales
    log('\n📊 Estadísticas finales:', 'yellow')
    await getStats()
    log('\n✨ Procesamiento completado exitosamente', 'cyan')
  } else {
    log('\n❌ El procesamiento falló', 'red')
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  })
}

module.exports = {
  getStats,
  processOrders,
  checkConnectivity
}