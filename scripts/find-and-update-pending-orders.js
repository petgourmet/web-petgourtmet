#!/usr/bin/env node

/**
 * Script para encontrar y actualizar órdenes pendientes
 * Útil cuando un pago se realizó pero el webhook no actualizó el estado
 */

const BASE_URL = 'http://localhost:3000'

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function logResult(test, status, details) {
  const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌'
  const color = status === 'success' ? 'green' : status === 'warning' ? 'yellow' : 'red'
  log(`${icon} ${test}: ${details}`, color)
}

// Función para buscar órdenes pendientes
async function findPendingOrders() {
  try {
    logSection('BUSCANDO ÓRDENES PENDIENTES')
    
    const response = await fetch(`${BASE_URL}/api/admin/orders`)
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const orders = data.orders || []
    
    // Filtrar órdenes pendientes
    const pendingOrders = orders.filter(order => 
      order.payment_status === 'pending' || 
      order.status === 'pending_payment' ||
      order.payment_status === 'in_process'
    )
    
    log(`📊 Total de órdenes: ${orders.length}`, 'blue')
    log(`⏳ Órdenes pendientes: ${pendingOrders.length}`, 'yellow')
    
    if (pendingOrders.length === 0) {
      log('✅ No hay órdenes pendientes', 'green')
      return []
    }
    
    // Mostrar detalles de órdenes pendientes
    console.log('\n📋 ÓRDENES PENDIENTES ENCONTRADAS:')
    console.log('-'.repeat(80))
    
    pendingOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. Orden ID: ${order.id}`)
      console.log(`   Cliente: ${order.customer_name || 'No especificado'}`)
      console.log(`   Email: ${order.customer_email || 'No especificado'}`)
      console.log(`   Total: $${order.total || 0}`)
      console.log(`   Estado: ${order.status || 'No especificado'}`)
      console.log(`   Estado de pago: ${order.payment_status || 'No especificado'}`)
      console.log(`   MercadoPago ID: ${order.mercadopago_payment_id || 'No asignado'}`)
      console.log(`   Fecha: ${new Date(order.created_at).toLocaleString('es-MX')}`)
    })
    
    return pendingOrders
    
  } catch (error) {
    logResult('Búsqueda de órdenes', 'error', error.message)
    return []
  }
}

// Función para buscar una orden específica
async function findOrderBySearch(searchTerm) {
  try {
    logSection(`BUSCANDO ORDEN: "${searchTerm}"`)
    
    const response = await fetch(`${BASE_URL}/api/admin/orders`)
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const orders = data.orders || []
    
    // Buscar por ID, email o nombre
    const foundOrders = orders.filter(order => 
      order.id.toString().includes(searchTerm) ||
      (order.customer_email && order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    
    if (foundOrders.length === 0) {
      log('❌ No se encontraron órdenes con ese criterio', 'red')
      return []
    }
    
    log(`✅ Encontradas ${foundOrders.length} orden(es)`, 'green')
    
    foundOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. Orden ID: ${order.id}`)
      console.log(`   Cliente: ${order.customer_name || 'No especificado'}`)
      console.log(`   Email: ${order.customer_email || 'No especificado'}`)
      console.log(`   Total: $${order.total || 0}`)
      console.log(`   Estado: ${order.status || 'No especificado'}`)
      console.log(`   Estado de pago: ${order.payment_status || 'No especificado'}`)
      console.log(`   MercadoPago ID: ${order.mercadopago_payment_id || 'No asignado'}`)
      console.log(`   Fecha: ${new Date(order.created_at).toLocaleString('es-MX')}`)
    })
    
    return foundOrders
    
  } catch (error) {
    logResult('Búsqueda específica', 'error', error.message)
    return []
  }
}

// Función para verificar el estado de un pago en MercadoPago
async function checkPaymentStatus(orderId, mercadopagoPaymentId) {
  try {
    if (!mercadopagoPaymentId) {
      log('⚠️ Esta orden no tiene ID de pago de MercadoPago', 'yellow')
      return null
    }
    
    log(`🔍 Verificando pago ${mercadopagoPaymentId} en MercadoPago...`, 'blue')
    
    const response = await fetch(`${BASE_URL}/api/mercadopago/payment/${mercadopagoPaymentId}`)
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    
    const paymentData = await response.json()
    
    console.log(`\n💳 ESTADO DEL PAGO EN MERCADOPAGO:`)
    console.log(`   ID: ${paymentData.id}`)
    console.log(`   Estado: ${paymentData.status}`)
    console.log(`   Monto: $${paymentData.transaction_amount}`)
    console.log(`   Método: ${paymentData.payment_method_id}`)
    console.log(`   Fecha de aprobación: ${paymentData.date_approved || 'No aprobado'}`)
    
    return paymentData
    
  } catch (error) {
    logResult('Verificación de pago', 'error', error.message)
    return null
  }
}

// Función para actualizar el estado de una orden
async function updateOrderStatus(orderId, mercadopagoPaymentId, newStatus) {
  try {
    log(`🔄 Actualizando estado de orden ${orderId}...`, 'blue')
    
    const response = await fetch(`${BASE_URL}/api/mercadopago/payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_id: mercadopagoPaymentId,
        external_reference: orderId.toString(),
        status: newStatus
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Error ${response.status}`)
    }
    
    const result = await response.json()
    logResult('Actualización de orden', 'success', `Estado actualizado a: ${newStatus}`)
    
    return result
    
  } catch (error) {
    logResult('Actualización de orden', 'error', error.message)
    return null
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2)
  
  logSection('🔍 HERRAMIENTA DE BÚSQUEDA Y ACTUALIZACIÓN DE ÓRDENES')
  
  if (args.length === 0) {
    // Sin argumentos: mostrar todas las órdenes pendientes
    const pendingOrders = await findPendingOrders()
    
    if (pendingOrders.length > 0) {
      console.log('\n💡 INSTRUCCIONES:')
      console.log('1. Para buscar una orden específica:')
      console.log('   node find-and-update-pending-orders.js buscar "término"')
      console.log('2. Para verificar el estado de pago:')
      console.log('   node find-and-update-pending-orders.js verificar [order_id]')
      console.log('3. Para actualizar una orden:')
      console.log('   node find-and-update-pending-orders.js actualizar [order_id] [nuevo_estado]')
    }
    
  } else if (args[0] === 'buscar' && args[1]) {
    // Buscar orden específica
    await findOrderBySearch(args[1])
    
  } else if (args[0] === 'verificar' && args[1]) {
    // Verificar estado de pago
    const orderId = args[1]
    
    // Primero buscar la orden para obtener el MercadoPago ID
    const orders = await findOrderBySearch(orderId)
    if (orders.length > 0) {
      const order = orders[0]
      await checkPaymentStatus(order.id, order.mercadopago_payment_id)
    }
    
  } else if (args[0] === 'actualizar' && args[1] && args[2]) {
    // Actualizar estado de orden
    const orderId = args[1]
    const newStatus = args[2]
    
    // Primero buscar la orden para obtener el MercadoPago ID
    const orders = await findOrderBySearch(orderId)
    if (orders.length > 0) {
      const order = orders[0]
      
      if (!order.mercadopago_payment_id) {
        log('❌ Esta orden no tiene ID de pago de MercadoPago', 'red')
        return
      }
      
      // Verificar estado actual en MercadoPago
      const paymentData = await checkPaymentStatus(order.id, order.mercadopago_payment_id)
      
      if (paymentData) {
        // Actualizar con el estado real de MercadoPago
        await updateOrderStatus(order.id, order.mercadopago_payment_id, paymentData.status)
      }
    }
    
  } else {
    // Mostrar ayuda
    console.log('\n📖 USO:')
    console.log('  node find-and-update-pending-orders.js                    # Mostrar órdenes pendientes')
    console.log('  node find-and-update-pending-orders.js buscar "término"   # Buscar por ID, email o nombre')
    console.log('  node find-and-update-pending-orders.js verificar [id]     # Verificar estado en MercadoPago')
    console.log('  node find-and-update-pending-orders.js actualizar [id] [estado] # Actualizar estado')
    console.log('\n📝 EJEMPLOS:')
    console.log('  node find-and-update-pending-orders.js buscar "cristofer"')
    console.log('  node find-and-update-pending-orders.js buscar "cristoferscalante@gmail.com"')
    console.log('  node find-and-update-pending-orders.js buscar "123"')
    console.log('  node find-and-update-pending-orders.js verificar 123')
    console.log('  node find-and-update-pending-orders.js actualizar 123 approved')
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  findPendingOrders,
  findOrderBySearch,
  checkPaymentStatus,
  updateOrderStatus
}