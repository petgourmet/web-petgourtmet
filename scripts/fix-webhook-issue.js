/**
 * Script para diagnosticar y arreglar problemas con webhooks de MercadoPago
 * 
 * Uso:
 * node scripts/fix-webhook-issue.js
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
require('dotenv').config({ path: '.env.local' })

// Configuración
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  mercadoPagoToken: process.env.MERCADOPAGO_ACCESS_TOKEN
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

// Función para obtener datos de pago de MercadoPago
function getMercadoPagoPayment(paymentId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: `/v1/payments/${paymentId}`,
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
          try {
            const paymentData = JSON.parse(responseData)
            resolve(paymentData)
          } catch (e) {
            reject(new Error(`Error parsing payment data: ${e.message}`))
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.end()
  })
}

// Buscar pagos en MercadoPago para órdenes pendientes
async function findPaymentsForPendingOrders() {
  log('\n🔍 Buscando pagos en MercadoPago para órdenes pendientes...', colors.blue)
  
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  
  // Obtener órdenes pendientes
  const { data: pendingOrders, error } = await supabase
    .from('orders')
    .select('id, total, status, payment_status, created_at, payment_intent_id')
    .in('status', ['pending', 'pending_payment'])
    .order('created_at', { ascending: false })
  
  if (error) {
    log(`❌ Error obteniendo órdenes: ${error.message}`, colors.red)
    return
  }
  
  if (pendingOrders.length === 0) {
    log('✅ No hay órdenes pendientes', colors.green)
    return
  }
  
  log(`📋 Encontradas ${pendingOrders.length} órdenes pendientes`, colors.yellow)
  
  // Buscar pagos en MercadoPago usando diferentes criterios
  const searchResults = []
  
  for (const order of pendingOrders) {
    log(`\n🔍 Buscando pagos para orden ${order.id} ($${order.total})...`)
    
    try {
      // Buscar por external_reference
      const payments = await searchMercadoPagoPayments({
        external_reference: order.id.toString()
      })
      
      if (payments.length > 0) {
        log(`✅ Encontrados ${payments.length} pagos para orden ${order.id}`, colors.green)
        
        for (const payment of payments) {
          searchResults.push({
            orderId: order.id,
            paymentId: payment.id,
            status: payment.status,
            amount: payment.transaction_amount,
            date: payment.date_created,
            external_reference: payment.external_reference
          })
          
          log(`  💳 Pago ${payment.id}: ${payment.status} - $${payment.transaction_amount}`, colors.blue)
        }
      } else {
        log(`⚠️ No se encontraron pagos para orden ${order.id}`, colors.yellow)
        searchResults.push({
          orderId: order.id,
          paymentId: null,
          status: 'not_found',
          amount: order.total,
          date: order.created_at
        })
      }
      
    } catch (error) {
      log(`❌ Error buscando pagos para orden ${order.id}: ${error.message}`, colors.red)
    }
    
    // Pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return searchResults
}

// Buscar pagos en MercadoPago
function searchMercadoPagoPayments(criteria) {
  return new Promise((resolve, reject) => {
    let queryParams = []
    
    if (criteria.external_reference) {
      queryParams.push(`external_reference=${encodeURIComponent(criteria.external_reference)}`)
    }
    
    queryParams.push('limit=50')
    queryParams.push('sort=date_created')
    queryParams.push('criteria=desc')
    
    const queryString = queryParams.join('&')
    
    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: `/v1/payments/search?${queryString}`,
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
          try {
            const searchData = JSON.parse(responseData)
            resolve(searchData.results || [])
          } catch (e) {
            reject(new Error(`Error parsing search data: ${e.message}`))
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.end()
  })
}

// Actualizar orden con datos de pago encontrados
async function updateOrderWithPayment(orderId, paymentData) {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  
  const updateData = {
    collection_id: paymentData.id.toString(),
    external_reference: paymentData.external_reference,
    payment_status: paymentData.status,
    payment_method: paymentData.payment_method_id,
    payment_type: paymentData.payment_type_id,
    updated_at: new Date().toISOString()
  }
  
  // Mapear estado de pago a estado de orden
  if (paymentData.status === 'approved' || paymentData.status === 'paid') {
    updateData.status = 'confirmed'
    updateData.confirmed_at = new Date().toISOString()
  } else if (paymentData.status === 'cancelled' || paymentData.status === 'rejected') {
    updateData.status = 'cancelled'
  } else if (paymentData.status === 'in_process') {
    updateData.status = 'processing'
  }
  
  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
  
  if (error) {
    throw new Error(`Error actualizando orden: ${error.message}`)
  }
  
  return updateData
}

// Función principal para arreglar webhooks
async function fixWebhookIssues() {
  log('🔧 ARREGLANDO PROBLEMAS DE WEBHOOKS', colors.bold)
  log('=' .repeat(40), colors.blue)
  
  try {
    // 1. Buscar pagos para órdenes pendientes
    const searchResults = await findPaymentsForPendingOrders()
    
    if (!searchResults || searchResults.length === 0) {
      log('\n✅ No hay órdenes pendientes para procesar', colors.green)
      return
    }
    
    // 2. Procesar resultados
    log('\n📊 RESUMEN DE BÚSQUEDA', colors.bold)
    log('=' .repeat(25), colors.blue)
    
    const foundPayments = searchResults.filter(r => r.paymentId)
    const notFoundPayments = searchResults.filter(r => !r.paymentId)
    
    log(`✅ Órdenes con pagos encontrados: ${foundPayments.length}`, colors.green)
    log(`⚠️ Órdenes sin pagos: ${notFoundPayments.length}`, colors.yellow)
    
    // 3. Actualizar órdenes con pagos encontrados
    if (foundPayments.length > 0) {
      log('\n🔄 ACTUALIZANDO ÓRDENES...', colors.bold)
      
      for (const result of foundPayments) {
        try {
          log(`\n🔄 Actualizando orden ${result.orderId}...`)
          
          // Obtener datos completos del pago
          const paymentData = await getMercadoPagoPayment(result.paymentId)
          
          // Actualizar orden
          const updateData = await updateOrderWithPayment(result.orderId, paymentData)
          
          log(`✅ Orden ${result.orderId} actualizada:`, colors.green)
          log(`   Estado: ${updateData.status}`, colors.blue)
          log(`   Pago: ${updateData.payment_status}`, colors.blue)
          log(`   Método: ${updateData.payment_method}`, colors.blue)
          
        } catch (error) {
          log(`❌ Error actualizando orden ${result.orderId}: ${error.message}`, colors.red)
        }
        
        // Pausa entre actualizaciones
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // 4. Reporte final
    log('\n📋 REPORTE FINAL', colors.bold)
    log('=' .repeat(15), colors.blue)
    
    if (foundPayments.length > 0) {
      log(`✅ ${foundPayments.length} órdenes actualizadas exitosamente`, colors.green)
    }
    
    if (notFoundPayments.length > 0) {
      log(`⚠️ ${notFoundPayments.length} órdenes sin pagos en MercadoPago:`, colors.yellow)
      notFoundPayments.forEach(result => {
        log(`   - Orden ${result.orderId}: $${result.amount}`, colors.yellow)
      })
      
      log('\n💡 Para estas órdenes:', colors.blue)
      log('1. Verificar si el pago se realizó realmente')
      log('2. Buscar manualmente en el panel de MercadoPago')
      log('3. Si el pago existe, actualizar manualmente la orden')
      log('4. Si no existe, considerar cancelar la orden')
    }
    
    log('\n🎯 PRÓXIMOS PASOS', colors.bold)
    log('1. Verificar que el webhook esté configurado en MercadoPago')
    log('2. Monitorear logs del servidor para webhooks entrantes')
    log('3. Probar con un pago real para verificar que funciona')
    
  } catch (error) {
    log(`❌ Error crítico: ${error.message}`, colors.red)
    process.exit(1)
  }
}

// Ejecutar script
if (require.main === module) {
  fixWebhookIssues().catch(error => {
    log(`❌ Error crítico: ${error.message}`, colors.red)
    process.exit(1)
  })
}

module.exports = {
  fixWebhookIssues,
  findPaymentsForPendingOrders,
  updateOrderWithPayment
}