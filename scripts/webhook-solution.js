/**
 * Solución completa para problemas de webhooks de MercadoPago
 * 
 * Este script:
 * 1. Sincroniza pagos pendientes con MercadoPago
 * 2. Proporciona instrucciones para configurar webhooks
 * 3. Crea un sistema de verificación manual
 * 
 * Uso:
 * node scripts/webhook-solution.js
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
require('dotenv').config({ path: '.env.local' })

// Configuración
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  mercadoPagoToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  webhookUrl: process.env.NEXT_PUBLIC_SITE_URL ? 
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook` : 
    'http://localhost:3000/api/mercadopago/webhook'
}

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

// Función para buscar pagos en MercadoPago
function searchMercadoPagoPayments(criteria) {
  return new Promise((resolve, reject) => {
    let queryParams = []
    
    if (criteria.external_reference) {
      queryParams.push(`external_reference=${encodeURIComponent(criteria.external_reference)}`)
    }
    if (criteria.status) {
      queryParams.push(`status=${criteria.status}`)
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

// Actualizar orden con datos de pago
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
  if (paymentData.status === 'approved') {
    updateData.status = 'confirmed'
  } else if (paymentData.status === 'cancelled' || paymentData.status === 'rejected') {
    updateData.status = 'cancelled'
  } else if (paymentData.status === 'in_process') {
    updateData.status = 'processing'
  } else if (paymentData.status === 'refunded') {
    updateData.status = 'refunded'
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

// Sincronizar todas las órdenes pendientes
async function syncPendingOrders() {
  log('🔄 SINCRONIZANDO ÓRDENES PENDIENTES', colors.bold)
  log('=' .repeat(40), colors.blue)
  
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  
  // Obtener órdenes pendientes
  const { data: pendingOrders, error } = await supabase
    .from('orders')
    .select('id, total, status, payment_status, created_at')
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
  
  let syncedCount = 0
  let notFoundCount = 0
  
  for (const order of pendingOrders) {
    try {
      log(`\n🔍 Verificando orden ${order.id} ($${order.total})...`)
      
      // Buscar pagos por external_reference
      const payments = await searchMercadoPagoPayments({
        external_reference: order.id.toString()
      })
      
      if (payments.length > 0) {
        const payment = payments[0] // Tomar el más reciente
        
        log(`✅ Pago encontrado: ${payment.id} (${payment.status})`, colors.green)
        
        // Actualizar orden
        await updateOrderWithPayment(order.id, payment)
        
        log(`✅ Orden ${order.id} sincronizada`, colors.green)
        syncedCount++
      } else {
        log(`⚠️ No se encontró pago para orden ${order.id}`, colors.yellow)
        notFoundCount++
      }
      
      // Pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      log(`❌ Error procesando orden ${order.id}: ${error.message}`, colors.red)
    }
  }
  
  log(`\n📊 RESUMEN DE SINCRONIZACIÓN`, colors.bold)
  log(`✅ Órdenes sincronizadas: ${syncedCount}`, colors.green)
  log(`⚠️ Órdenes sin pago: ${notFoundCount}`, colors.yellow)
  
  return { syncedCount, notFoundCount }
}

// Mostrar instrucciones para configurar webhooks
function showWebhookInstructions() {
  log('\n🔧 CONFIGURACIÓN DE WEBHOOKS', colors.bold)
  log('=' .repeat(30), colors.blue)
  
  log('\n📋 Para configurar webhooks en MercadoPago:', colors.cyan)
  log('\n1. Ve al panel de MercadoPago:', colors.blue)
  log('   https://www.mercadopago.com.ar/developers/panel', colors.cyan)
  
  log('\n2. Selecciona tu aplicación', colors.blue)
  
  log('\n3. Ve a la sección "Webhooks"', colors.blue)
  
  log('\n4. Configura la URL del webhook:', colors.blue)
  log(`   ${config.webhookUrl}`, colors.cyan)
  
  log('\n5. Selecciona los eventos:', colors.blue)
  log('   ✓ Pagos (payments)', colors.green)
  log('   ✓ Suscripciones (subscriptions)', colors.green)
  log('   ✓ Facturas (invoices)', colors.green)
  
  log('\n6. Guarda la configuración', colors.blue)
  
  if (config.webhookUrl.includes('localhost')) {
    log('\n⚠️ IMPORTANTE:', colors.yellow)
    log('   Tu URL actual es localhost, que no es accesible desde internet', colors.yellow)
    log('   Para testing, usa ngrok:', colors.cyan)
    log('   1. Instala ngrok: npm install -g ngrok', colors.blue)
    log('   2. Ejecuta: ngrok http 3000', colors.blue)
    log('   3. Usa la URL https que te proporciona ngrok', colors.blue)
  }
}

// Crear script de monitoreo
async function createMonitoringScript() {
  log('\n📝 CREANDO SCRIPT DE MONITOREO', colors.bold)
  log('=' .repeat(35), colors.blue)
  
  const monitoringScript = `/**
 * Script de monitoreo para webhooks de MercadoPago
 * Ejecutar cada 15 minutos para sincronizar pagos pendientes
 * 
 * Uso: node scripts/monitor-payments.js
 */

const { syncPendingOrders } = require('./webhook-solution')

async function monitorPayments() {
  console.log('🔄 Iniciando monitoreo de pagos...')
  
  try {
    const result = await syncPendingOrders()
    
    if (result.syncedCount > 0) {
      console.log(\`✅ Se sincronizaron \${result.syncedCount} órdenes\`)
    }
    
    if (result.notFoundCount > 0) {
      console.log(\`⚠️ \${result.notFoundCount} órdenes sin pago encontrado\`)
    }
    
  } catch (error) {
    console.error('❌ Error en monitoreo:', error.message)
  }
}

// Ejecutar cada 15 minutos
setInterval(monitorPayments, 15 * 60 * 1000)

// Ejecutar inmediatamente
monitorPayments()

console.log('🔄 Monitoreo iniciado - ejecutándose cada 15 minutos')
`
  
  const fs = require('fs')
  fs.writeFileSync('scripts/monitor-payments.js', monitoringScript)
  
  log('✅ Script de monitoreo creado: scripts/monitor-payments.js', colors.green)
  log('   Ejecuta: node scripts/monitor-payments.js', colors.cyan)
}

// Función principal
async function solutionMain() {
  log('🚀 SOLUCIÓN COMPLETA PARA WEBHOOKS', colors.bold)
  log('=' .repeat(40), colors.magenta)
  
  try {
    // 1. Sincronizar órdenes pendientes
    await syncPendingOrders()
    
    // 2. Mostrar instrucciones de configuración
    showWebhookInstructions()
    
    // 3. Crear script de monitoreo
    await createMonitoringScript()
    
    // 4. Recomendaciones finales
    log('\n🎯 PRÓXIMOS PASOS', colors.bold)
    log('=' .repeat(15), colors.blue)
    log('1. Configurar webhooks en el panel de MercadoPago', colors.blue)
    log('2. Si usas localhost, configurar ngrok', colors.blue)
    log('3. Ejecutar el script de monitoreo:', colors.blue)
    log('   node scripts/monitor-payments.js', colors.cyan)
    log('4. Probar con un pago real', colors.blue)
    
    log('\n✅ Solución implementada exitosamente', colors.green)
    
  } catch (error) {
    log(`❌ Error crítico: ${error.message}`, colors.red)
    process.exit(1)
  }
}

// Ejecutar script
if (require.main === module) {
  solutionMain().catch(error => {
    log(`❌ Error crítico: ${error.message}`, colors.red)
    process.exit(1)
  })
}

module.exports = {
  syncPendingOrders,
  updateOrderWithPayment,
  searchMercadoPagoPayments
}