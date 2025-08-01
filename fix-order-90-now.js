// Script para corregir la orden 90 usando Supabase directamente
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOrder90() {
  console.log('🔧 Corrigiendo orden 90...');
  
  try {
    // 1. Obtener datos de la orden 90
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', 90)
      .single();
    
    if (orderError || !order) {
      console.error('❌ Error obteniendo orden 90:', orderError);
      return;
    }
    
    console.log('📋 Orden 90 encontrada:', order.customer_name);
    
    // 2. Actualizar estado de la orden (solo campos que existen)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', 90);
    
    if (updateError) {
      console.error('❌ Error actualizando orden:', updateError);
      return;
    }
    
    console.log('✅ Estado de orden actualizado');
    
    // 3. Obtener datos del usuario
    const orderData = JSON.parse(order.shipping_address);
    const userEmail = orderData.customer_data?.email;
    
    if (!userEmail) {
      console.error('❌ No se pudo obtener email del cliente');
      return;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('auth_users_id')
      .eq('email', userEmail)
      .single();
    
    const userId = profile?.auth_users_id;
    console.log('👤 Usuario encontrado:', userEmail, userId ? '✅' : '❌');
    
    // 4. Verificar si ya existe la suscripción
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('external_reference', '90')
      .single();
    
    if (existingSubscription) {
      console.log('⚠️ La suscripción ya existe con ID:', existingSubscription.id);
      return;
    }
    
    // 5. Crear suscripción
    const subscriptionItem = orderData.items.find(item => 
      item.description?.includes('Suscripción') || 
      item.description?.includes('suscripción')
    );
    
    if (!subscriptionItem) {
      console.error('❌ No se encontró item de suscripción');
      return;
    }
    
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    const subscriptionData = {
      user_id: userId,
      product_id: subscriptionItem.id,
      product_name: subscriptionItem.name,
      product_image: '',
      subscription_type: 'monthly',
      quantity: subscriptionItem.quantity,
      base_price: subscriptionItem.unit_price,
      discounted_price: subscriptionItem.price,
      status: 'authorized',
      next_billing_date: nextBillingDate.toISOString(),
      last_billing_date: new Date().toISOString(),
      external_reference: '90',
      is_active: true,
      created_at: order.created_at,
      updated_at: new Date().toISOString()
    };
    
    const { data: newSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        product_id: subscriptionItem.id,
        product_name: subscriptionItem.name,
        subscription_type: 'monthly',
        quantity: subscriptionItem.quantity,
        base_price: subscriptionItem.unit_price,
        discounted_price: subscriptionItem.price,
        next_billing_date: nextBillingDate.toISOString(),
        last_billing_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (subError) {
      console.error('❌ Error creando suscripción:', subError);
      return;
    }
    
    console.log('✅ Suscripción creada con ID:', newSubscription.id);
    
    // 6. Crear historial de facturación
    const billingData = {
      subscription_id: newSubscription.id,
      user_id: userId,
      amount: subscriptionItem.price,
      status: 'completed',
      billing_date: new Date().toISOString(),
      payment_method: 'mercadopago',
      created_at: new Date().toISOString()
    };
    
    const { error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert(billingData);
    
    if (billingError) {
      console.warn('⚠️ Error creando historial de facturación:', billingError);
    } else {
      console.log('✅ Historial de facturación creado');
    }
    
    console.log('🎉 ¡Orden 90 corregida exitosamente!');
    console.log('📋 Resumen:');
    console.log(`  - Orden actualizada: Estado = processing, Pago = paid`);
    console.log(`  - Suscripción creada: ID = ${newSubscription.id}`);
    console.log(`  - Usuario: ${userEmail}`);
    console.log(`  - Próximo cobro: ${nextBillingDate.toLocaleDateString()}`);
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

fixOrder90().then(() => {
  console.log('🏁 Script completado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});