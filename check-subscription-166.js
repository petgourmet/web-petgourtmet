const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixqjqvqjqvqjqvqjqvqj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscription166() {
  console.log('🔍 VERIFICANDO ESTADO ACTUAL DE LA SUSCRIPCIÓN 166...');
  
  try {
    // Verificar el estado actual de la suscripción
    const { data: currentSub, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 166)
      .single();

    if (fetchError) {
      console.error('❌ Error al obtener suscripción:', fetchError);
      return;
    }

    console.log('📋 Estado actual de la suscripción 166:');
    console.log('- ID:', currentSub.id);
    console.log('- Status:', currentSub.status);
    console.log('- External Reference:', currentSub.external_reference);
    console.log('- User ID:', currentSub.user_id);
    console.log('- Created At:', currentSub.created_at);
    console.log('- Updated At:', currentSub.updated_at);
    console.log('- Last Billing Date:', currentSub.last_billing_date);
    console.log('- Next Billing Date:', currentSub.next_billing_date);
    console.log('- Charges Made:', currentSub.charges_made);
    
    let customerData = {};
    try {
      customerData = typeof currentSub.customer_data === 'string' 
        ? JSON.parse(currentSub.customer_data) 
        : currentSub.customer_data || {};
    } catch (e) {
      console.log('- Customer Data (raw):', currentSub.customer_data);
    }
    console.log('- Email:', customerData.email || 'No disponible');

    // Verificar metadata
    let metadata = {};
    try {
      metadata = typeof currentSub.metadata === 'string' 
        ? JSON.parse(currentSub.metadata) 
        : currentSub.metadata || {};
    } catch (e) {
      console.log('- Metadata (raw):', currentSub.metadata);
    }
    
    console.log('\n📊 METADATA:');
    console.log('- Manual Activation:', metadata.manual_activation || false);
    console.log('- Payment ID:', metadata.payment_id || 'No disponible');
    console.log('- Collection ID:', metadata.collection_id || 'No disponible');
    console.log('- Activated At:', metadata.activated_at || 'No disponible');

    // Verificar billing history
    const { data: billingHistory, error: billingError } = await supabase
      .from('billing_history')
      .select('*')
      .eq('subscription_id', 166)
      .order('created_at', { ascending: false });

    if (billingError) {
      console.error('⚠️ Error al obtener historial de facturación:', billingError);
    } else {
      console.log('\n💳 HISTORIAL DE FACTURACIÓN:');
      if (billingHistory.length === 0) {
        console.log('- No hay registros de facturación');
      } else {
        billingHistory.forEach((record, index) => {
          console.log(`- Registro ${index + 1}:`);
          console.log(`  - Payment ID: ${record.payment_id}`);
          console.log(`  - Amount: ${record.amount} ${record.currency}`);
          console.log(`  - Status: ${record.status}`);
          console.log(`  - Date: ${record.transaction_date}`);
          console.log(`  - MercadoPago Payment ID: ${record.mercadopago_payment_id}`);
        });
      }
    }

    // Verificar perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('has_active_subscription, updated_at')
      .eq('id', currentSub.user_id)
      .single();

    if (profileError) {
      console.error('⚠️ Error al obtener perfil:', profileError);
    } else {
      console.log('\n👤 PERFIL DEL USUARIO:');
      console.log('- Has Active Subscription:', profile.has_active_subscription);
      console.log('- Profile Updated At:', profile.updated_at);
    }

    // Verificar logs de webhook
    const { data: webhookLogs, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (webhookError) {
      console.error('⚠️ Error al obtener logs de webhook:', webhookError);
    } else {
      console.log('\n🔗 ÚLTIMOS LOGS DE WEBHOOK:');
      if (webhookLogs.length === 0) {
        console.log('- No hay logs de webhook');
      } else {
        webhookLogs.forEach((log, index) => {
          console.log(`- Log ${index + 1}:`);
          console.log(`  - Type: ${log.type}`);
          console.log(`  - Status: ${log.status}`);
          console.log(`  - Created At: ${log.created_at}`);
          if (log.payment_id) {
            console.log(`  - Payment ID: ${log.payment_id}`);
          }
        });
      }
    }

    // Resumen final
    console.log('\n🎯 RESUMEN:');
    if (currentSub.status === 'active') {
      console.log('✅ La suscripción está ACTIVA');
      console.log('✅ El sistema está funcionando correctamente');
    } else {
      console.log('❌ La suscripción sigue en estado:', currentSub.status);
      console.log('❌ El webhook automático NO está activando la suscripción');
      console.log('💡 Se requiere diagnóstico adicional del webhook');
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Ejecutar la verificación
checkSubscription166();