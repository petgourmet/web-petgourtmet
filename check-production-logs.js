const { getRecentErrors, getLogStats, getWebhookLogs } = require('./lib/logger');

console.log('=== VERIFICACIÓN DE LOGS DE PRODUCCIÓN ===\n');

// Obtener estadísticas generales
const stats = getLogStats();
console.log('📊 ESTADÍSTICAS DE LOGS:');
console.log(`Total de logs: ${stats.total}`);
console.log(`Errores recientes: ${stats.recentErrors}`);
console.log('Por nivel:', stats.byLevel);
console.log('Por categoría:', stats.byCategory);
console.log('\n');

// Obtener errores recientes
const recentErrors = getRecentErrors(20);
console.log('🚨 ERRORES RECIENTES (últimos 20):');
if (recentErrors.length === 0) {
  console.log('✅ No hay errores recientes registrados');
} else {
  recentErrors.forEach((error, index) => {
    console.log(`${index + 1}. [${error.timestamp}] ${error.category}: ${error.message}`);
    if (error.error) {
      console.log(`   Error: ${error.error}`);
    }
    if (error.data) {
      console.log(`   Data:`, JSON.stringify(error.data, null, 2));
    }
    console.log('---');
  });
}
console.log('\n');

// Obtener logs de webhooks recientes
const webhookLogs = getWebhookLogs(10);
console.log('🔗 LOGS DE WEBHOOKS RECIENTES (últimos 10):');
if (webhookLogs.length === 0) {
  console.log('ℹ️ No hay logs de webhooks recientes');
} else {
  webhookLogs.forEach((log, index) => {
    console.log(`${index + 1}. [${log.timestamp}] ${log.level}: ${log.message}`);
    if (log.paymentId) {
      console.log(`   Payment ID: ${log.paymentId}`);
    }
    if (log.data) {
      console.log(`   Data:`, JSON.stringify(log.data, null, 2));
    }
    console.log('---');
  });
}

console.log('\n=== FIN DE VERIFICACIÓN ===');