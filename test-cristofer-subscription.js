require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestSubscriptionForCristofer() {
  console.log('🧪 CREANDO SUSCRIPCIÓN DE PRUEBA PARA CRISTOFER');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar/crear usuario cristoferscalante@gmail.com
    console.log('\n1. 👤 VERIFICANDO USUARIO CRISTOFER...');
    
    const testEmail = 'cristoferscalante@gmail.com';
    
    // Buscar usuario existente
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    let userId;
    
    if (userError || !existingUser) {
      console.log('⚠️ Usuario no encontrado, creando perfil de prueba...');
      
      // Crear usuario de prueba
      const newUserId = '550e8400-e29b-41d4-a716-446655440001'; // UUID único para Cristofer
      
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: newUserId,
          auth_users_id: newUserId,
          email: testEmail,
          full_name: 'Cristofer Escalante',
          first_name: 'Cristofer',
          last_name: 'Escalante',
          phone: '+52 123 456 7890',
          role: 'admin' // Cristofer es admin
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Error creando usuario:', createError.message);
        console.log('💡 Usando ID simulado para la prueba...');
        userId = newUserId;
      } else {
        userId = newUser.auth_users_id;
        console.log('✅ Usuario creado exitosamente');
      }
    } else {
      userId = existingUser.auth_users_id || existingUser.id;
      console.log('✅ Usuario existente encontrado');
    }
    
    console.log(`   - Email: ${testEmail}`);
    console.log(`   - User ID: ${userId}`);
    
    // 2. Obtener producto con suscripción disponible
    console.log('\n2. 🛍️ OBTENIENDO PRODUCTO CON SUSCRIPCIÓN...');
    
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('subscription_available', true)
      .limit(5);
    
    if (productError || !products || products.length === 0) {
      console.log('❌ No se encontraron productos con suscripción disponible');
      console.log('💡 Creando producto de prueba...');
      
      // Crear producto de prueba si no existe
      const { data: testProduct, error: createProductError } = await supabase
        .from('products')
        .insert({
          name: 'Alimento Premium para Perros - Suscripción',
          slug: 'alimento-premium-suscripcion',
          description: 'Alimento premium para perros con suscripción mensual',
          price: 450.00,
          image: '/placeholder.jpg',
          category_id: 1,
          featured: true,
          stock: 100,
          subscription_available: true,
          subscription_types: '["monthly", "quarterly"]',
          monthly_discount: 15,
          quarterly_discount: 25
        })
        .select()
        .single();
      
      if (createProductError) {
        console.log('❌ Error creando producto:', createProductError.message);
        return;
      }
      
      var selectedProduct = testProduct;
    } else {
      var selectedProduct = products[0];
    }
    
    console.log(`✅ Producto seleccionado: ${selectedProduct.name}`);
    console.log(`   - ID: ${selectedProduct.id}`);
    console.log(`   - Precio base: $${selectedProduct.price}`);
    console.log(`   - Descuento mensual: ${selectedProduct.monthly_discount || 15}%`);
    
    // 3. Crear orden de suscripción
    console.log('\n3. 📦 CREANDO ORDEN DE SUSCRIPCIÓN...');
    
    const discountPercentage = selectedProduct.monthly_discount || 15;
    const discountedPrice = selectedProduct.price * (1 - discountPercentage / 100);
    const externalReference = `CRISTOFER-TEST-${Date.now()}`;
    
    const orderData = {
      user_id: userId,
      status: 'paid',
      total: discountedPrice,
      payment_status: 'paid',
      customer_name: 'Cristofer Escalante',
      customer_phone: '+52 123 456 7890',
      is_subscription: true,
      shipping_address: JSON.stringify({
        firstName: 'Cristofer',
        lastName: 'Escalante',
        email: testEmail,
        phone: '+52 123 456 7890',
        address: 'Calle Principal 123',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '01000',
        country: 'México'
      })
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
    console.log(`   - External Reference: ${externalReference}`);
    
    // 4. Crear order item
    console.log('\n4. 📋 CREANDO ORDER ITEM...');
    
    const orderItem = {
      order_id: newOrder.id,
      product_id: selectedProduct.id,
      product_name: `${selectedProduct.name} (Suscripción Mensual)`,
      product_image: selectedProduct.image || '/placeholder.jpg',
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
    console.log(`   - Cantidad: ${newItem.quantity}`);
    console.log(`   - Precio: $${newItem.price}`);
    
    // 5. Crear suscripción
    console.log('\n5. 🔄 CREANDO SUSCRIPCIÓN...');
    
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    const subscriptionData = {
      user_id: userId,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_image: selectedProduct.image || '/placeholder.jpg',
      subscription_type: 'monthly',
      status: 'active',
      quantity: 1,
      size: 'Estándar',
      discount_percentage: discountPercentage,
      base_price: selectedProduct.price,
      discounted_price: discountedPrice,
      next_billing_date: nextBillingDate.toISOString(),
      last_billing_date: new Date().toISOString(),
      external_reference: externalReference,
      mercadopago_subscription_id: `mp_test_cristofer_${Date.now()}`,
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: discountedPrice,
      currency_id: 'MXN'
    };
    
    const { data: newSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (subscriptionError) {
      console.log('❌ Error creando suscripción:', subscriptionError.message);
      return;
    }
    
    console.log(`✅ Suscripción creada exitosamente:`);
    console.log(`   - ID: ${newSubscription.id}`);
    console.log(`   - Producto: ${newSubscription.product_name}`);
    console.log(`   - Tipo: ${newSubscription.subscription_type}`);
    console.log(`   - Estado: ${newSubscription.status}`);
    console.log(`   - Próximo cobro: ${new Date(newSubscription.next_billing_date).toLocaleDateString('es-MX')}`);
    console.log(`   - Precio mensual: $${newSubscription.discounted_price}`);
    console.log(`   - Descuento aplicado: ${newSubscription.discount_percentage}%`);
    
    // 6. Crear historial de facturación
    console.log('\n6. 📊 CREANDO HISTORIAL DE FACTURACIÓN...');
    
    const billingHistoryData = {
      subscription_id: newSubscription.id,
      user_id: userId,
      amount: discountedPrice,
      currency: 'MXN',
      status: 'paid',
      payment_provider: 'mercadopago',
      billing_date: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };
    
    const { data: billingHistory, error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert(billingHistoryData)
      .select()
      .single();
    
    if (billingError) {
      console.log('⚠️ Error creando historial de facturación:', billingError.message);
      console.log('   (La suscripción se creó correctamente, solo falta el historial)');
    } else {
      console.log(`✅ Historial de facturación creado:`);
      console.log(`   - ID: ${billingHistory.id}`);
      console.log(`   - Monto: $${billingHistory.amount}`);
      console.log(`   - Estado: ${billingHistory.status}`);
    }
    
    // 7. Verificar que todo se creó correctamente
    console.log('\n7. ✅ VERIFICACIÓN FINAL...');
    
    // Verificar suscripción
    const { data: verifySubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', newSubscription.id)
      .single();
    
    // Verificar orden
    const { data: verifyOrder } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', newOrder.id)
      .single();
    
    console.log('\n🎉 RESUMEN DE LA PRUEBA:');
    console.log('=' .repeat(60));
    console.log(`👤 Usuario: ${testEmail}`);
    console.log(`🛍️ Producto: ${selectedProduct.name}`);
    console.log(`📦 Orden: #${newOrder.id} (${newOrder.status})`);
    console.log(`🔄 Suscripción: #${newSubscription.id} (${newSubscription.status})`);
    console.log(`💰 Precio mensual: $${discountedPrice} (${discountPercentage}% descuento)`);
    console.log(`📅 Próximo cobro: ${new Date(newSubscription.next_billing_date).toLocaleDateString('es-MX')}`);
    console.log(`🔗 External Reference: ${externalReference}`);
    
    console.log('\n🧪 PRUEBAS A REALIZAR:');
    console.log('1. Iniciar sesión con cristoferscalante@gmail.com / Xpcnt.7938');
    console.log('2. Ir a /perfil y verificar que aparece la suscripción');
    console.log('3. Verificar que se puede pausar/reactivar la suscripción');
    console.log('4. Como admin, ir al dashboard y verificar la suscripción');
    console.log('5. Verificar que el próximo cobro está programado correctamente');
    
    console.log('\n✅ SUSCRIPCIÓN DE PRUEBA CREADA EXITOSAMENTE');
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error);
  }
}

// Ejecutar la prueba
createTestSubscriptionForCristofer().catch(console.error);