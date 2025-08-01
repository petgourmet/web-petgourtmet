require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyFix() {
  try {
    console.log('🔍 Verificando corrección de orden 90...');
    
    // 1. Verificar estado de la orden
    console.log('\n📋 1. Estado de la orden 90:');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', 90)
      .single();
    
    if (orderError) {
      console.log('❌ Error consultando orden:', orderError.message);
    } else if (order) {
      console.log(`✅ Orden encontrada:`);
      console.log(`   - ID: ${order.id}`);
      console.log(`   - Cliente: ${order.customer_name}`);
      console.log(`   - Estado: ${order.status}`);
      console.log(`   - Pago: ${order.payment_status}`);
      console.log(`   - Total: $${order.total}`);
    } else {
      console.log('❌ Orden 90 no encontrada');
    }
    
    // 2. Verificar suscripción creada
    console.log('\n🔄 2. Suscripción para orden 90:');
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (subError) {
      console.log('❌ Error consultando suscripciones:', subError.message);
    } else if (subscriptions && subscriptions.length > 0) {
      console.log(`✅ ${subscriptions.length} suscripción(es) encontrada(s):`);
      subscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID: ${sub.id}`);
        console.log(`      - Usuario ID: ${sub.user_id}`);
        console.log(`      - Producto: ${sub.product_name}`);
        console.log(`      - Tipo: ${sub.subscription_type}`);
        console.log(`      - Precio: $${sub.discounted_price}`);
        console.log(`      - Próximo cobro: ${sub.next_billing_date}`);
        console.log(`      - Creada: ${sub.created_at}`);
      });
    } else {
      console.log('❌ No se encontraron suscripciones');
    }
    
    // 3. Verificar usuario
    console.log('\n👤 3. Usuario Fabian Gutierrez:');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'fabyo66@hotmail.com')
      .single();
    
    if (userError) {
      console.log('❌ Error consultando usuario:', userError.message);
    } else if (user) {
      console.log(`✅ Usuario encontrado:`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Nombre: ${user.full_name}`);
      console.log(`   - ID: ${user.auth_users_id}`);
    }
    
    // 4. Verificar que la suscripción esté vinculada al usuario correcto
    console.log('\n🔗 4. Verificación de vinculación:');
    if (user && subscriptions && subscriptions.length > 0) {
      const userId = user.id || user.auth_users_id;
      const userSubscription = subscriptions.find(sub => 
        sub.user_id === userId
      );
      
      if (userSubscription) {
        console.log('✅ Suscripción correctamente vinculada al usuario');
        console.log(`   - Suscripción ID: ${userSubscription.id}`);
        console.log(`   - Usuario ID: ${userSubscription.user_id}`);
        console.log(`   - Usuario Email: ${user.email}`);
      } else {
        console.log('❌ Suscripción NO vinculada al usuario correcto');
        console.log(`   - Usuario ID esperado: ${userId}`);
        console.log(`   - Suscripción user_id: ${subscriptions[0]?.user_id}`);
      }
    }
    
    console.log('\n🎉 Verificación completada');
    
  } catch (err) {
    console.error('💥 Error general:', err);
  }
}

verifyFix();