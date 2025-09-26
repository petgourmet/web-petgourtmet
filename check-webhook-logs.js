require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables de entorno de Supabase no configuradas');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWebhookLogs() {
  try {
    console.log('🔍 Revisando logs de webhooks de suscripciones...');
    
    // Buscar logs de webhooks relacionados con suscripciones
    const { data: subscriptionLogs, error: subError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_type', 'subscription')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (subError) {
      console.error('Error consultando logs de suscripciones:', subError);
    } else {
      console.log('\n📊 Logs de webhooks de suscripciones encontrados:', subscriptionLogs?.length || 0);
      if (subscriptionLogs && subscriptionLogs.length > 0) {
        subscriptionLogs.forEach((log, index) => {
          console.log(`\n${index + 1}. Tipo: ${log.webhook_type}`);
          console.log(`   Fecha: ${log.created_at}`);
          console.log(`   Estado: ${log.status}`);
          console.log(`   Procesado: ${log.processed_at || 'No procesado'}`);
          console.log(`   MP ID: ${log.mercadopago_id || 'N/A'}`);
          if (log.error_message) {
            console.log(`   Error: ${log.error_message}`);
          }
          if (log.webhook_data) {
            console.log(`   Datos: ${JSON.stringify(log.webhook_data, null, 4)}`);
          }
        });
      } else {
        console.log('   ❌ No se encontraron logs de webhooks de suscripciones');
      }
    }
    
    // Buscar todos los logs recientes para ver qué tipos de eventos se están recibiendo
    console.log('\n🔍 Revisando todos los logs de webhooks recientes...');
    const { data: allLogs, error: allError } = await supabase
      .from('webhook_logs')
      .select('webhook_type, status, created_at, processed_at, error_message')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (allError) {
      console.error('Error consultando todos los logs:', allError);
    } else {
      console.log('\n📊 Últimos 20 webhooks recibidos:');
      if (allLogs && allLogs.length > 0) {
        allLogs.forEach((log, index) => {
          console.log(`${index + 1}. ${log.webhook_type} - ${log.status} - ${log.created_at} - Procesado: ${log.processed_at ? 'Sí' : 'No'}`);
          if (log.error_message) {
            console.log(`    Error: ${log.error_message}`);
          }
        });
      } else {
        console.log('   ❌ No se encontraron logs de webhooks');
      }
    }
    
    // Verificar estado de suscripciones en la base de datos
    console.log('\n🔍 Revisando estado de suscripciones en la base de datos...');
    const { data: subscriptions, error: subsError } = await supabase
      .from('unified_subscriptions')
      .select('id, status, created_at, updated_at, mercadopago_subscription_id')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (subsError) {
      console.error('Error consultando suscripciones:', subsError);
    } else {
      console.log('\n📊 Últimas 10 suscripciones:');
      if (subscriptions && subscriptions.length > 0) {
        subscriptions.forEach((sub, index) => {
          console.log(`${index + 1}. ID: ${sub.id} - Estado: ${sub.status} - MP ID: ${sub.mercadopago_subscription_id || 'N/A'}`);
          console.log(`   Creada: ${sub.created_at} - Actualizada: ${sub.updated_at}`);
        });
      } else {
        console.log('   ❌ No se encontraron suscripciones');
      }
    }
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

checkWebhookLogs();