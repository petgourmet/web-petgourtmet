// Script de demostración del sistema de auto-asignación de órdenes
// Este script muestra cómo funciona la auto-asignación automática

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Configuración
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

// Función para demostrar el sistema completo
async function demonstrateAutoAssign() {
  try {
    log('\n🎯 === DEMOSTRACIÓN DEL SISTEMA DE AUTO-ASIGNACIÓN ===', 'cyan')
    log('Este sistema asocia automáticamente las órdenes con usuarios basándose en el email', 'blue')
    
    // Paso 1: Mostrar estadísticas actuales
    log('\n📊 ESTADÍSTICAS ACTUALES', 'yellow')
    const statsResponse = await fetch(`${BASE_URL}/api/orders/auto-assign`)
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json()
      log(`✅ Órdenes sin user_id: ${stats.data.ordersWithoutUserId || 0}`, 'green')
      
      if (stats.data.sampleOrders && stats.data.sampleOrders.length > 0) {
        log('\n📋 Ejemplos de órdenes sin user_id:', 'blue')
        stats.data.sampleOrders.slice(0, 3).forEach(order => {
          const shippingData = JSON.parse(order.shipping_address)
          const email = shippingData.customer_data?.email || 'Sin email'
          log(`  • Orden ${order.id}: ${order.customer_name} (${email})`, 'blue')
        })
      }
    }
    
    // Paso 2: Ejecutar auto-asignación en todas las órdenes
    log('\n🔄 EJECUTANDO AUTO-ASIGNACIÓN EN TODAS LAS ÓRDENES', 'yellow')
    const processResponse = await fetch(`${BASE_URL}/api/orders/auto-assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ processAll: true })
    })
    
    if (processResponse.ok) {
      const result = await processResponse.json()
      log(`✅ Procesamiento completado:`, 'green')
      log(`  • Órdenes procesadas: ${result.data.processed}`, 'green')
      log(`  • Órdenes asignadas exitosamente: ${result.data.successful}`, 'green')
      log(`  • Órdenes que no se pudieron asignar: ${result.data.failed}`, 'blue')
      
      if (result.data.details && result.data.details.length > 0) {
        log('\n📝 DETALLES DEL PROCESAMIENTO:', 'blue')
        result.data.details.forEach(detail => {
          const status = detail.success ? '✅' : '❌'
          const color = detail.success ? 'green' : 'yellow'
          log(`  ${status} Orden ${detail.orderId}: ${detail.message}`, color)
        })
      }
    }
    
    // Paso 3: Mostrar estadísticas finales
    log('\n📊 ESTADÍSTICAS FINALES', 'yellow')
    const finalStatsResponse = await fetch(`${BASE_URL}/api/orders/auto-assign`)
    
    if (finalStatsResponse.ok) {
      const finalStats = await finalStatsResponse.json()
      log(`✅ Órdenes sin user_id restantes: ${finalStats.data.ordersWithoutUserId || 0}`, 'green')
    }
    
    // Paso 4: Explicar cómo funciona la integración automática
    log('\n🔧 CÓMO FUNCIONA LA INTEGRACIÓN AUTOMÁTICA:', 'cyan')
    log('1. Cuando se crea una nueva orden en /api/mercadopago/create-preference', 'blue')
    log('2. El sistema automáticamente llama al endpoint /api/orders/auto-assign', 'blue')
    log('3. Se extrae el email del shipping_address de la orden', 'blue')
    log('4. Se busca un usuario con ese email en la base de datos', 'blue')
    log('5. Si se encuentra, se asigna el user_id a la orden', 'blue')
    log('6. El usuario puede ver su compra en su perfil inmediatamente', 'blue')
    
    log('\n✨ BENEFICIOS:', 'cyan')
    log('• Los usuarios ven sus compras automáticamente en su perfil', 'green')
    log('• No se requiere intervención manual', 'green')
    log('• Funciona tanto para usuarios registrados como invitados', 'green')
    log('• El proceso es transparente y no afecta la experiencia de compra', 'green')
    
    log('\n🎉 === DEMOSTRACIÓN COMPLETADA ===', 'cyan')
    
  } catch (error) {
    log(`❌ Error en la demostración: ${error.message}`, 'red')
    console.error(error)
  }
}

// Función para mostrar el estado del sistema
async function showSystemStatus() {
  try {
    log('\n🔍 === ESTADO DEL SISTEMA ===', 'cyan')
    
    // Verificar conectividad
    log('\n🌐 Verificando conectividad...', 'yellow')
    const healthCheck = await fetch(`${BASE_URL}/api/orders/auto-assign`)
    
    if (healthCheck.ok) {
      log('✅ Servidor respondiendo correctamente', 'green')
      log('✅ Endpoint de auto-asignación funcionando', 'green')
    } else {
      log('❌ Problema con el servidor', 'red')
      return
    }
    
    // Verificar base de datos
    log('\n🗄️ Verificando base de datos...', 'yellow')
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, user_id, customer_name')
      .limit(1)
    
    if (error) {
      log(`❌ Error conectando a la base de datos: ${error.message}`, 'red')
    } else {
      log('✅ Conexión a base de datos exitosa', 'green')
    }
    
    // Mostrar configuración
    log('\n⚙️ Configuración:', 'yellow')
    log(`• URL base: ${BASE_URL}`, 'blue')
    log(`• Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ No configurado'}`, 'blue')
    log(`• Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ No configurado'}`, 'blue')
    
  } catch (error) {
    log(`❌ Error verificando el sistema: ${error.message}`, 'red')
    console.error(error)
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--status')) {
    await showSystemStatus()
  } else {
    await showSystemStatus()
    await demonstrateAutoAssign()
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  demonstrateAutoAssign,
  showSystemStatus
}