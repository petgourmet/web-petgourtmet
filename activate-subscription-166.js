const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixqjqvqjqvqjqvqjqvqj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateSubscription166() {
  console.log('🚀 ACTIVANDO SUSCRIPCIÓN 166 INMEDIATAMENTE...');
  
  try {
    // 1. Verificar el estado actual de la suscripción
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
    console.log('- Status:', currentSub.status);
    console.log('- External Reference:', currentSub.external_reference);
    console.log('- User ID:', currentSub.user_id);
    
    let customerData = {};
    try {
      customerData = typeof currentSub.customer_data === 'string' 
        ? JSON.parse(currentSub.customer_data) 
        : currentSub.customer_data || {};
    } catch (e) {
      console.log('- Customer Data (raw):', currentSub.customer_data);
    }
    console.log('- Email:', customerData.email || 'No disponible');

    // 2. Activar la suscripción
    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
        last_billing_date: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 días
        charges_made: 1,
        metadata: JSON.stringify({
           ...(typeof currentSub.metadata === 'string' ? JSON.parse(currentSub.metadata) : currentSub.metadata || {}),
           manual_activation: true,
           activated_at: new Date().toISOString(),
           payment_id: '128488428512',
           collection_id: '128488428512',
           activation_reason: 'Manual activation due to successful MercadoPago payment'
         })
      })
      .eq('id', 166)
      .select();

    if (updateError) {
      console.error('❌ Error al activar suscripción:', updateError);
      return;
    }

    console.log('✅ SUSCRIPCIÓN 166 ACTIVADA EXITOSAMENTE!');
    console.log('- Nuevo status:', updatedSub[0].status);
    console.log('- Fecha de activación:', updatedSub[0].updated_at);
    console.log('- Próxima facturación:', updatedSub[0].next_billing_date);

    // 3. Registrar en billing_history
    const { data: billingRecord, error: billingError } = await supabase
      .from('billing_history')
      .insert({
        subscription_id: 166,
        payment_id: '128488428512',
        amount: parseFloat(currentSub.discounted_price || currentSub.base_price || 36.45),
        currency: 'MXN',
        status: 'approved',
        payment_method: 'credit_card',
        transaction_date: new Date().toISOString(),
        mercadopago_payment_id: '128488428512',
        mercadopago_status: 'approved',
        metadata: JSON.stringify({
          external_reference: '45321cfb460f4267ab42f48b25065022',
          collection_id: '128488428512',
          manual_activation: true,
          activation_source: 'webhook_fix_script'
        })
      });

    if (billingError) {
      console.error('⚠️ Error al registrar en billing_history:', billingError);
    } else {
      console.log('✅ Registro de facturación creado exitosamente');
    }

    // 4. Actualizar perfil del usuario
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSub.user_id);

    if (profileError) {
      console.error('⚠️ Error al actualizar perfil:', profileError);
    } else {
      console.log('✅ Perfil de usuario actualizado con suscripción activa');
    }

    console.log('\n🎉 ACTIVACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('La suscripción 166 ahora está ACTIVA y funcionando correctamente.');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// Ejecutar la activación
activateSubscription166();