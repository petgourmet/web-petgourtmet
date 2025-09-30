const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWebhookLogs() {
  console.log('🔍 Revisando logs recientes de webhooks...');
  
  // Obtener los últimos 10 webhooks
  const { data: recentLogs, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('❌ Error al consultar logs:', error);
    return;
  }
  
  console.log(`📊 Total de logs encontrados: ${recentLogs.length}`);
  
  if (recentLogs.length === 0) {
    console.log('ℹ️ No se encontraron logs de webhooks recientes');
    return;
  }
  
  // Estadísticas por estado
  const statusStats = recentLogs.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('📈 Estadísticas por estado:');
  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`   - ${status}: ${count}`);
  });
  
  // Mostrar logs con errores
  const errorLogs = recentLogs.filter(log => log.status === 'failed' || log.error_message);
  if (errorLogs.length > 0) {
    console.log(`\n❌ Logs con errores (${errorLogs.length}):`);
    errorLogs.forEach(log => {
      console.log(`   - ID: ${log.id}`);
      console.log(`     Tipo: ${log.webhook_type}`);
      console.log(`     Error: ${log.error_message}`);
      console.log(`     Fecha: ${log.created_at}`);
      console.log('');
    });
  } else {
    console.log('\n✅ No se encontraron logs con errores');
  }
  
  // Mostrar últimos 3 logs para contexto
  console.log('\n📋 Últimos 3 webhooks recibidos:');
  recentLogs.slice(0, 3).forEach((log, index) => {
    console.log(`   ${index + 1}. Tipo: ${log.webhook_type} | Estado: ${log.status} | Fecha: ${log.created_at}`);
    if (log.webhook_data?.type) {
      console.log(`      MercadoPago Type: ${log.webhook_data.type} | Action: ${log.webhook_data.action || 'N/A'}`);
    }
  });
}

checkWebhookLogs();