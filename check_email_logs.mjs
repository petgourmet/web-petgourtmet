import { config } from 'dotenv';
import { createServiceClient } from './lib/supabase/service.ts';

// Cargar variables de entorno
config({ path: '.env.local' });

const supabase = createServiceClient();

async function checkEmailLogs() {
  console.log('🔍 Verificando logs de email para la suscripción subscription_PG-717522_1757974717522...');

  try {
  // Primero obtener el ID de la suscripción
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('id, external_reference, status, user_id')
    .eq('external_reference', 'subscription_PG-717522_1757974717522')
    .single();

  if (subError) {
    console.error('❌ Error obteniendo suscripción:', subError);
    return;
  }

  console.log(`📋 Suscripción encontrada:`);
  console.log(`   - ID: ${subscription.id}`);
  console.log(`   - Referencia externa: ${subscription.external_reference}`);
  console.log(`   - Estado: ${subscription.status}`);
  console.log(`   - User ID: ${subscription.user_id}`);

  // Buscar logs de email relacionados con esta suscripción
  const { data: emailLogs, error: emailError } = await supabase
    .from('email_logs')
    .select('*')
    .eq('subscription_id', subscription.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (emailError) {
    console.error('❌ Error obteniendo logs de email:', emailError);
  } else {
    console.log(`📧 Encontrados ${emailLogs.length} logs de email:`);
    emailLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. Email Log:`);
      console.log(`   - ID: ${log.id}`);
      console.log(`   - Para: ${log.recipient_email}`);
      console.log(`   - Asunto: ${log.subject}`);
      console.log(`   - Estado: ${log.status}`);
      console.log(`   - Tipo: ${log.email_type}`);
      console.log(`   - Referencia externa: ${log.external_reference}`);
      console.log(`   - Fecha: ${log.created_at}`);
      if (log.error_message) {
        console.log(`   - Error: ${log.error_message}`);
      }
    });
  }

  // Buscar información del usuario
  if (subscription.user_id) {
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('email, raw_user_meta_data')
      .eq('id', subscription.user_id)
      .single();

    if (!userError && user) {
      console.log('\n👤 Información del usuario de la suscripción:');
      console.log(`   - Email: ${user.email || 'No disponible'}`);
      console.log(`   - Metadata: ${JSON.stringify(user.raw_user_meta_data || {})}`);
      
      // Buscar logs específicos para este email
      if (user.email) {
        const { data: userEmailLogs, error: userEmailError } = await supabase
          .from('email_logs')
          .select('*')
          .eq('recipient_email', user.email)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!userEmailError && userEmailLogs.length > 0) {
          console.log(`\n📧 Últimos 5 emails enviados a ${user.email}:`);
          userEmailLogs.forEach((log, index) => {
            console.log(`   ${index + 1}. ${log.subject} - ${log.status} (${log.created_at})`);
          });
        }
      }
    } else {
      console.log('\n❌ No se pudo obtener información del usuario:', userError);
    }
  }

  } catch (error) {
    console.error('❌ Error general:', error);
  }

  console.log('\n✅ Verificación de logs de email completada.');
}

// Ejecutar la función
checkEmailLogs().catch(console.error);