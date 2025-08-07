// Script para probar el flujo completo de auto-asignación de órdenes
// Este script simula la creación de una orden y verifica que se asigne automáticamente al usuario

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

// Datos de prueba
const testOrderData = {
  items: [
    {
      id: 'test-product-1',
      title: 'Alimento Premium para Perros',
      description: 'Alimento de alta calidad',
      picture_url: 'https://example.com/image.jpg',
      quantity: 2,
      unit_price: 299.99
    }
  ],
  customerData: {
    firstName: 'Fabian',
    lastName: 'Gutierrez',
    email: 'fabyo66@hotmail.com', // Usuario que sabemos que existe
    phone: '5551234567',
    address: {
      street_name: 'Calle Test',
      street_number: '123',
      zip_code: '12345',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'México'
    }
  },
  externalReference: `test-${Date.now()}`,
  backUrls: {
    success: `${BASE_URL}/processing-payment`,
    failure: `${BASE_URL}/error-pago`,
    pending: `${BASE_URL}/pago-pendiente`
  }
}

// Función para probar la creación de orden con auto-asignación
async function testOrderCreationWithAutoAssign() {
  try {
    log('\n🧪 === PRUEBA DE AUTO-ASIGNACIÓN DE ÓRDENES ===', 'cyan')
    log('📧 Email de prueba: fabyo66@hotmail.com', 'blue')
    
    // Paso 1: Verificar que el usuario existe
    log('\n1️⃣ Verificando que el usuario existe...', 'yellow')
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'fabyo66@hotmail.com')
      .single()
    
    if (userError || !existingUser) {
      log('❌ Usuario no encontrado en profiles, buscando en auth.users...', 'red')
      
      // Buscar en auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        log(`❌ Error buscando en auth.users: ${authError.message}`, 'red')
        return
      }
      
      const authUser = authUsers.users.find(u => u.email === 'fabyo66@hotmail.com')
      if (!authUser) {
        log('❌ Usuario no encontrado en auth.users tampoco', 'red')
        return
      }
      
      log(`✅ Usuario encontrado en auth.users: ${authUser.id}`, 'green')
    } else {
      log(`✅ Usuario encontrado en profiles: ${existingUser.id} (${existingUser.email})`, 'green')
    }
    
    // Paso 2: Crear orden usando el endpoint de create-preference
    log('\n2️⃣ Creando orden usando create-preference...', 'yellow')
    log('Datos de la orden:', JSON.stringify(testOrderData, null, 2))
    
    const response = await fetch(`${BASE_URL}/api/mercadopago/create-preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      log('❌ Error creando orden:', 'red')
      log('Status:', response.status)
      log('Error:', JSON.stringify(result, null, 2))
      return
    }
    
    log('✅ Orden creada exitosamente:', 'green')
    log(`  - ID de orden: ${result.orderId}`, 'green')
    log(`  - Número de orden: ${result.orderNumber}`, 'green')
    log(`  - ID de preferencia: ${result.preferenceId}`, 'green')
    
    const orderId = result.orderId
    
    // Paso 3: Verificar que la orden fue auto-asignada
    log('\n3️⃣ Verificando auto-asignación...', 'yellow')
    
    // Esperar un poco para que se complete la auto-asignación
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, customer_name, shipping_address')
      .eq('id', orderId)
      .single()
    
    if (orderError) {
      log(`❌ Error obteniendo orden: ${orderError.message}`, 'red')
      return
    }
    
    log('📋 Datos de la orden:', 'blue')
    log(`  - ID: ${orderData.id}`, 'blue')
    log(`  - user_id: ${orderData.user_id}`, 'blue')
    log(`  - customer_name: ${orderData.customer_name}`, 'blue')
    
    if (orderData.user_id) {
      log('✅ ¡AUTO-ASIGNACIÓN EXITOSA!', 'green')
      log(`  - La orden ${orderId} fue asignada al user_id: ${orderData.user_id}`, 'green')
      
      // Verificar que el user_id corresponde al email correcto
      const { data: assignedUser, error: assignedUserError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', orderData.user_id)
        .single()
      
      if (!assignedUserError && assignedUser) {
        log(`  - Email del usuario asignado: ${assignedUser.email}`, 'green')
        if (assignedUser.email === 'fabyo66@hotmail.com') {
          log('✅ ¡EMAIL COINCIDE PERFECTAMENTE!', 'green')
        } else {
          log('⚠️ El email no coincide con el esperado', 'yellow')
        }
      }
    } else {
      log('❌ AUTO-ASIGNACIÓN FALLÓ', 'red')
      log('  - La orden no tiene user_id asignado', 'red')
      
      // Intentar auto-asignación manual para debug
      log('\n🔧 Intentando auto-asignación manual...', 'yellow')
      const manualResponse = await fetch(`${BASE_URL}/api/orders/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: orderId })
      })
      
      const manualResult = await manualResponse.json()
      log('Resultado de auto-asignación manual:', JSON.stringify(manualResult, null, 2))
    }
    
    // Paso 4: Limpiar - eliminar la orden de prueba
    log('\n4️⃣ Limpiando orden de prueba...', 'yellow')
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
    
    if (deleteError) {
      log(`⚠️ Error eliminando orden de prueba: ${deleteError.message}`, 'yellow')
    } else {
      log('✅ Orden de prueba eliminada exitosamente', 'green')
    }
    
    log('\n🎉 === PRUEBA COMPLETADA ===', 'cyan')
    
  } catch (error) {
    log(`❌ Error en la prueba: ${error.message}`, 'red')
    console.error(error)
  }
}

// Función para probar el endpoint de auto-asignación directamente
async function testAutoAssignEndpoint() {
  try {
    log('\n🔧 === PRUEBA DEL ENDPOINT AUTO-ASSIGN ===', 'cyan')
    
    // Obtener estadísticas
    log('\n📊 Obteniendo estadísticas...', 'yellow')
    const statsResponse = await fetch(`${BASE_URL}/api/orders/auto-assign`, {
      method: 'GET'
    })
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json()
      log('✅ Estadísticas obtenidas:', 'green')
      log(`  - Órdenes sin user_id: ${stats.ordersWithoutUserId}`, 'blue')
      log(`  - Total de órdenes: ${stats.totalOrders}`, 'blue')
      
      if (stats.exampleOrders && stats.exampleOrders.length > 0) {
        log('  - Ejemplos de órdenes sin user_id:', 'blue')
        stats.exampleOrders.forEach(order => {
          log(`    * Orden ${order.id}: ${order.customer_name}`, 'blue')
        })
      }
    } else {
      log('❌ Error obteniendo estadísticas', 'red')
    }
    
    // Probar procesamiento de todas las órdenes
    log('\n🔄 Probando procesamiento de todas las órdenes...', 'yellow')
    const processResponse = await fetch(`${BASE_URL}/api/orders/auto-assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ processAll: true })
    })
    
    if (processResponse.ok) {
      const processResult = await processResponse.json()
      log('✅ Procesamiento completado:', 'green')
      log(`  - Órdenes procesadas: ${processResult.processedCount}`, 'green')
      log(`  - Órdenes asignadas: ${processResult.assignedCount}`, 'green')
      log(`  - Órdenes sin usuario: ${processResult.noUserCount}`, 'blue')
      
      if (processResult.details && processResult.details.length > 0) {
        log('  - Detalles:', 'blue')
        processResult.details.forEach(detail => {
          const status = detail.success ? '✅' : '❌'
          log(`    ${status} Orden ${detail.orderId}: ${detail.message}`, 'blue')
        })
      }
    } else {
      const errorResult = await processResponse.json()
      log('❌ Error en procesamiento:', 'red')
      log(JSON.stringify(errorResult, null, 2))
    }
    
  } catch (error) {
    log(`❌ Error en prueba del endpoint: ${error.message}`, 'red')
    console.error(error)
  }
}

// Función principal
async function main() {
  log('🚀 Iniciando pruebas de auto-asignación...', 'cyan')
  
  // Verificar que el servidor esté corriendo
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/orders/auto-assign`)
    if (!healthCheck.ok) {
      log('❌ El servidor no está respondiendo. Asegúrate de que esté corriendo.', 'red')
      return
    }
    log('✅ Servidor respondiendo correctamente', 'green')
  } catch (error) {
    log('❌ No se puede conectar al servidor. Asegúrate de que esté corriendo.', 'red')
    return
  }
  
  // Ejecutar pruebas
  await testAutoAssignEndpoint()
  await testOrderCreationWithAutoAssign()
  
  log('\n🎯 === TODAS LAS PRUEBAS COMPLETADAS ===', 'cyan')
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testOrderCreationWithAutoAssign,
  testAutoAssignEndpoint
}