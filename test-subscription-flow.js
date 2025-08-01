require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSubscriptionFlow() {
  try {
    console.log('🧪 Iniciando prueba completa del flujo de suscripción...');
    
    // 1. Usar un usuario existente o crear uno simple
    console.log('\n👤 1. Obteniendo usuario de prueba...');
    const testEmail = 'fabyo66@hotmail.com'; // Usar el usuario que ya sabemos que existe
    
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (userError || !existingUser) {
      console.log('❌ Error obteniendo usuario:', userError?.message || 'Usuario no encontrado');
      console.log('💡 Usando datos simulados para la prueba...');
      
      // Simular usuario para la prueba
      const newUser = {
         id: 'f68400d1-43df-4813-8fa2-d101e65d59ff',
         email: testEmail,
         full_name: 'Fabian Gutierrez',
         first_name: 'Fabian',
         last_name: 'Gutierrez',
         phone: '5616683424'
       };
      
      console.log(`✅ Usuario simulado: ${newUser.email} (ID: ${newUser.id})`);
    } else {
      var newUser = existingUser;
      console.log(`✅ Usuario existente: ${newUser.email} (ID: ${newUser.id})`);
    }
    
    // 2. Obtener un producto con suscripción disponible
    console.log('\n🛍️ 2. Obteniendo producto con suscripción...');
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('subscription_available', true)
      .limit(1);
    
    if (productError || !products || products.length === 0) {
      console.log('❌ No se encontraron productos con suscripción disponible');
      return;
    }
    
    const testProduct = products[0];
    console.log(`✅ Producto seleccionado: ${testProduct.name} (ID: ${testProduct.id})`);
    console.log(`   - Precio: $${testProduct.price}`);
    console.log(`   - Descuento mensual: ${testProduct.monthly_discount || 15}%`);
    
    // 3. Crear orden primero (la tabla orders sí existe)
       console.log('\n📦 3. Creando orden de prueba...');
       const discountPercentage = testProduct.monthly_discount || 15;
       const discountedPrice = testProduct.price * (1 - discountPercentage / 100);
       
       const orderData = {
         user_id: newUser.id,
         status: 'processing',
         total: discountedPrice,
         payment_status: 'paid'
       };
       
       const { data: newOrder, error: orderError } = await supabase
         .from('orders')
         .insert(orderData)
         .select()
         .single();
       
       if (orderError) {
         console.log('❌ Error creando orden:', orderError.message);
         return;
       }
       
       console.log(`✅ Orden creada: #${newOrder.id}`);
       console.log(`   - Total: $${newOrder.total}`);
       console.log(`   - Estado: ${newOrder.status}`);
       
       // 4. Crear order item
       console.log('\n📋 4. Creando order item...');
       const orderItem = {
            order_id: newOrder.id,
            product_name: `${testProduct.name} (Suscripción)`,
            product_image: testProduct.image || '',
            quantity: 1,
            price: discountedPrice,
            size: 'Estándar'
          };
       
       const { data: newItem, error: itemError } = await supabase
         .from('order_items')
         .insert(orderItem)
         .select()
         .single();
       
       if (itemError) {
         console.log('❌ Error creando order item:', itemError.message);
         return;
       }
       
       console.log(`✅ Order item creado: ${newItem.product_name}`);
         console.log(`   - Order ID: ${newItem.order_id}`);
         console.log(`   - Total: $${newItem.price}`);
         console.log(`   - Tamaño: ${newItem.size}`);
    
    // 5. Crear suscripción
     console.log('\n🔄 5. Creando suscripción...');
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    const subscription = {
      user_id: newUser.id,
      product_id: testProduct.id,
      product_name: testProduct.name,
      product_image: testProduct.image || '',
      subscription_type: 'monthly',
      quantity: 1,
      base_price: testProduct.price,
      discounted_price: discountedPrice,
      discount_percentage: discountPercentage,
      next_billing_date: nextBillingDate.toISOString(),
      last_billing_date: new Date().toISOString(),
      mercadopago_subscription_id: `test_sub_${Date.now()}`
    };
    
    const { data: newSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert(subscription)
      .select()
      .single();
    
    if (subscriptionError) {
      console.log('❌ Error creando suscripción:', subscriptionError.message);
      return;
    }
    
    console.log(`✅ Suscripción creada: ID ${newSubscription.id}`);
    console.log(`   - Tipo: ${newSubscription.subscription_type}`);
    console.log(`   - Precio: $${newSubscription.discounted_price}`);
    console.log(`   - Próximo cobro: ${new Date(newSubscription.next_billing_date).toLocaleDateString('es-MX')}`);
    
    // 6. Crear historial de facturación
     console.log('\n📊 6. Creando historial de facturación...');
    const billingHistory = {
      subscription_id: newSubscription.id,
      user_id: newUser.id,
      amount: discountedPrice,
      currency: 'MXN',
      status: 'completed',
      payment_provider: 'mercadopago_test',
      billing_date: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      metadata: {
        order_id: newOrder.id,
        test_transaction: true,
        payment_method: 'test'
      }
    };
    
    const { data: newBilling, error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert(billingHistory)
      .select()
      .single();
    
    if (billingError) {
      console.log('⚠️ Error creando historial (opcional):', billingError.message);
    } else {
      console.log(`✅ Historial de facturación creado: ID ${newBilling.id}`);
    }
    
    // 7. Verificación final
     console.log('\n🔍 7. Verificación final del flujo...');
    
    // Verificar order item
     const { data: finalOrderItem } = await supabase
       .from('order_items')
       .select('*')
       .eq('id', newItem.id)
       .single();
    
    // Verificar suscripción
    const { data: finalSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', newSubscription.id)
      .single();
    
    // Verificar usuario
    const { data: finalUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', newUser.id)
      .single();
    
    console.log('\n📋 RESUMEN DE LA PRUEBA:');
    console.log('========================');
    console.log(`👤 Usuario: ${finalUser.email}`);
    console.log(`📦 Order Item: #${finalOrderItem.id} - ${finalOrderItem.product_name} - $${finalOrderItem.price}`);
    console.log(`🔄 Suscripción: #${finalSubscription.id} - ${finalSubscription.subscription_type}`);
    console.log(`💰 Precio: $${finalSubscription.discounted_price} (${finalSubscription.discount_percentage}% descuento)`);
    console.log(`📅 Próximo cobro: ${new Date(finalSubscription.next_billing_date).toLocaleDateString('es-MX')}`);
    
    console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
    console.log('\n📝 DATOS PARA VERIFICAR EN LA INTERFAZ:');
    console.log(`   - Email del usuario: ${testEmail}`);
    console.log(`   - ID del order item: ${newItem.id}`);
    console.log(`   - ID de la suscripción: ${newSubscription.id}`);
    console.log('\n🔗 URLs para verificar:');
    console.log(`   - Perfil: http://localhost:3000/perfil`);
    console.log(`   - Admin Órdenes: http://localhost:3000/admin/orders`);
    console.log(`   - Admin Suscripciones: http://localhost:3000/admin/subscription-orders`);
    
    return {
      success: true,
      user: finalUser,
      orderItem: finalOrderItem,
      subscription: finalSubscription
    };
    
  } catch (err) {
    console.error('💥 Error general en la prueba:', err);
    return { success: false, error: err.message };
  }
}

testSubscriptionFlow();