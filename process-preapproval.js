const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan las credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function processPreapproval() {
  const preapprovalId = '6e27447e6c484da19f7742c18bfee469';
  const userEmail = 'cristoferscalante@gmail.com';
  
  console.log('🔍 Procesando preapproval_id:', preapprovalId);
  console.log('👤 Usuario:', userEmail);
  console.log('=' .repeat(60));
  
  try {
    // 1. Buscar el usuario
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (userError || !user) {
      console.error('❌ Usuario no encontrado:', userError?.message);
      return;
    }
    
    console.log('✅ Usuario encontrado:', user.id);
    
    // 2. Buscar suscripciones pendientes del usuario
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (pendingError) {
      console.error('❌ Error buscando suscripciones pendientes:', pendingError.message);
      return;
    }
    
    console.log(`📋 Suscripciones pendientes encontradas: ${pendingSubscriptions.length}`);
    
    if (pendingSubscriptions.length === 0) {
      console.log('⚠️ No hay suscripciones pendientes para procesar');
      return;
    }
    
    // 3. Mostrar las suscripciones pendientes
    console.log('\n📝 Suscripciones pendientes:');
    pendingSubscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. ID: ${sub.id}`);
      console.log(`   Creada: ${sub.created_at}`);
      console.log(`   Items: ${JSON.stringify(sub.cart_items, null, 2)}`);
      console.log(`   MercadoPago ID: ${sub.mercadopago_subscription_id || 'null'}`);
    });
    
    // 4. Seleccionar la suscripción más reciente para procesar
    const subscriptionToProcess = pendingSubscriptions[0];
    console.log(`\n🎯 Procesando suscripción más reciente: ${subscriptionToProcess.id}`);
    
    // 5. Crear la suscripción activa
    const firstItem = subscriptionToProcess.cart_items[0];
    const subscriptionData = {
      user_id: user.id,
      product_id: firstItem.product_id,
      subscription_type: 'monthly', // Convertir weekly a monthly (valor permitido)
      status: 'active',
      quantity: firstItem.quantity,
      size: firstItem.size,
      base_price: firstItem.price,
      discounted_price: firstItem.price,
      product_name: firstItem.product_name,
      next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 días
      mercadopago_subscription_id: preapprovalId,
      external_reference: preapprovalId,
      currency_id: 'MXN',
      transaction_amount: firstItem.price * firstItem.quantity,
      frequency: 1,
      frequency_type: 'weeks', // Para suscripción semanal
      start_date: new Date().toISOString(),
      metadata: {
        original_cart_items: subscriptionToProcess.cart_items,
        processed_manually: true,
        preapproval_id: preapprovalId
      }
    };
    
    console.log('\n📦 Datos de la nueva suscripción:');
    console.log(JSON.stringify(subscriptionData, null, 2));
    
    // 6. Insertar la suscripción activa
    const { data: newSubscription, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error creando suscripción activa:', insertError.message);
      return;
    }
    
    console.log('\n✅ Suscripción activa creada exitosamente!');
    console.log('🆔 ID de nueva suscripción:', newSubscription.id);
    
    // 7. Marcar la suscripción pendiente como procesada
    const { error: updateError } = await supabase
      .from('pending_subscriptions')
      .update({ 
        processed_at: new Date().toISOString(),
        mercadopago_subscription_id: preapprovalId,
        notes: `Procesada manualmente - preapproval_id: ${preapprovalId}`
      })
      .eq('id', subscriptionToProcess.id);
    
    if (updateError) {
      console.error('⚠️ Error actualizando suscripción pendiente:', updateError.message);
    } else {
      console.log('✅ Suscripción pendiente marcada como procesada');
    }
    
    // 8. Crear registro de webhook simulado
    const webhookData = {
      webhook_id: `manual_${Date.now()}`,
      topic: 'preapproval',
      resource_id: preapprovalId,
      action: 'payment.created',
      data_id: preapprovalId,
      processed: true,
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      response_data: {
        manual_processing: true,
        preapproval_id: preapprovalId,
        user_email: userEmail,
        subscription_id: newSubscription.id
      }
    };
    
    const { error: webhookError } = await supabase
      .from('mercadopago_webhooks')
      .insert(webhookData);
    
    if (webhookError) {
      console.error('⚠️ Error creando registro de webhook:', webhookError.message);
    } else {
      console.log('✅ Registro de webhook creado');
    }
    
    console.log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE!');
    console.log('=' .repeat(60));
    console.log(`✅ Preapproval ID ${preapprovalId} procesado correctamente`);
    console.log(`✅ Usuario ${userEmail} ahora tiene una suscripción activa`);
    console.log(`✅ ID de suscripción: ${newSubscription.id}`);
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar el procesamiento
processPreapproval().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});