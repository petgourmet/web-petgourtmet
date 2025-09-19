const logger = require('./lib/logger.ts').default;

// Funciones auxiliares para obtener datos del logger
function getLogStats() {
  const logs = logger.getLogs();
  const stats = {
    total: logs.length,
    recentErrors: logs.filter(log => log.level === 'error' && 
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
    byLevel: {},
    byCategory: {}
  };
  
  logs.forEach(log => {
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
  });
  
  return stats;
}

function getRecentErrors(limit = 20) {
  return logger.getLogs()
    .filter(log => log.level === 'error')
    .slice(-limit)
    .reverse();
}

function getWebhookLogs(limit = 10) {
  return logger.getLogs()
    .filter(log => log.category === 'webhook')
    .slice(-limit)
    .reverse();
}

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