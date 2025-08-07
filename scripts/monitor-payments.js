/**
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
      console.log(`✅ Se sincronizaron ${result.syncedCount} órdenes`)
    }
    
    if (result.notFoundCount > 0) {
      console.log(`⚠️ ${result.notFoundCount} órdenes sin pago encontrado`)
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
