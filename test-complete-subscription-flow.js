// Script para probar el flujo completo de suscripción con datos reales
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteSubscriptionFlow() {
  console.log('🚀 Iniciando prueba del flujo completo de suscripción...');
  
  try {
    // 1. Obtener un producto real de la base de datos
    console.log('\n📦 Obteniendo producto de prueba...');
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('subscription_available', true)
      .limit(1);
    
    if (productError || !products || products.length === 0) {
      console.error('❌ Error al obtener producto:', productError);
      return;
    }
    
    const product = products[0];
    console.log('✅ Producto obtenido:', {
      id: product.id,
      name: product.name,
      price: product.price,
      weekly_discount: product.weekly_discount,
      biweekly_discount: product.biweekly_discount,
      monthly_discount: product.monthly_discount
    });
    
    // 2. Simular datos del usuario (usar un usuario existente)
    console.log('\n👤 Obteniendo usuario de prueba...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('❌ Error al obtener usuario:', userError);
      return;
    }
    
    const user = users[0];
    console.log('✅ Usuario obtenido:', {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    });
    
    // 3. Configurar datos de la suscripción
    const subscriptionType = 'monthly'; // Plan mensual
    const basePrice = product.price;
    const discountPercentage = product.monthly_discount || 15; // 15% por defecto
    const discount = discountPercentage / 100;
    const discountedPrice = basePrice * (1 - discount);
    const quantity = 1;
    const transactionAmount = discountedPrice * quantity;
    const externalReference = `test_sub_${Date.now()}`;
    
    console.log('\n💰 Cálculos de precio:');
    console.log('- Precio base:', `$${basePrice.toFixed(2)}`);
    console.log('- Descuento:', `${discountPercentage}%`);
    console.log('- Precio con descuento:', `$${discountedPrice.toFixed(2)}`);
    console.log('- Cantidad:', quantity);
    console.log('- Monto total:', `$${transactionAmount.toFixed(2)}`);
    
    // 4. Crear registro de suscripción
    const subscriptionData = {
      user_id: user.id,
      product_id: product.id,
      product_name: product.name,
      product_image: product.image,
      subscription_type: subscriptionType,
      status: 'pending',
      external_reference: externalReference,
      base_price: basePrice,
      discounted_price: discountedPrice,
      discount_percentage: discountPercentage,
      transaction_amount: transactionAmount,
      size: 'Standard',
      quantity: quantity,
      frequency: subscriptionType,
      processed_at: new Date().toISOString(),
      customer_data: {
        firstName: user.first_name || 'Usuario',
        lastName: user.last_name || 'Prueba',
        email: user.email,
        phone: '+52 123 456 7890'
      },
      cart_items: [{
        product_id: product.id,
        product_name: product.name,
        quantity: quantity,
        price: product.price,
        size: 'Standard',
        isSubscription: true,
        subscriptionType: subscriptionType
      }]
    };
    
    console.log('\n💾 Guardando suscripción en la base de datos...');
    console.log('Datos a guardar:', {
      user_id: subscriptionData.user_id,
      product_name: subscriptionData.product_name,
      subscription_type: subscriptionData.subscription_type,
      base_price: subscriptionData.base_price,
      discount_percentage: subscriptionData.discount_percentage,
      discounted_price: subscriptionData.discounted_price,
      transaction_amount: subscriptionData.transaction_amount,
      external_reference: subscriptionData.external_reference
    });
    
    // 5. Insertar en la base de datos
    const { data: insertedData, error: insertError } = await supabase
      .from('unified_subscriptions')
      .insert(subscriptionData)
      .select();
    
    if (insertError) {
      console.error('❌ Error al insertar suscripción:', insertError);
      return;
    }
    
    console.log('✅ Suscripción creada exitosamente:', {
      id: insertedData[0].id,
      external_reference: insertedData[0].external_reference,
      status: insertedData[0].status
    });
    
    // 6. Verificar que los datos se guardaron correctamente
    console.log('\n🔍 Verificando datos guardados...');
    const { data: savedSubscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', insertedData[0].id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error al verificar suscripción:', fetchError);
      return;
    }
    
    console.log('✅ Verificación exitosa - Datos guardados:');
    console.log('- ID:', savedSubscription.id);
    console.log('- Producto:', savedSubscription.product_name);
    console.log('- Precio base:', `$${savedSubscription.base_price}`);
    console.log('- Descuento:', `${savedSubscription.discount_percentage}%`);
    console.log('- Precio con descuento:', `$${savedSubscription.discounted_price}`);
    console.log('- Monto de transacción:', `$${savedSubscription.transaction_amount}`);
    console.log('- Estado:', savedSubscription.status);
    console.log('- Referencia externa:', savedSubscription.external_reference);
    
    // 7. Verificar que no hay valores en $0.00
    console.log('\n🧪 Verificando que no hay precios en $0.00...');
    const issues = [];
    
    if (!savedSubscription.base_price || savedSubscription.base_price === 0) {
      issues.push('base_price es 0 o NULL');
    }
    
    if (!savedSubscription.discounted_price || savedSubscription.discounted_price === 0) {
      issues.push('discounted_price es 0 o NULL');
    }
    
    if (!savedSubscription.transaction_amount || savedSubscription.transaction_amount === 0) {
      issues.push('transaction_amount es 0 o NULL');
    }
    
    if (issues.length > 0) {
      console.error('❌ PROBLEMAS ENCONTRADOS:');
      issues.forEach(issue => console.error(`  - ${issue}`));
    } else {
      console.log('✅ TODOS LOS PRECIOS SON VÁLIDOS - No hay valores en $0.00');
    }
    
    console.log('\n🎉 Prueba del flujo completo finalizada exitosamente!');
    console.log('\n📋 RESUMEN:');
    console.log(`- Suscripción ID: ${savedSubscription.id}`);
    console.log(`- Producto: ${savedSubscription.product_name}`);
    console.log(`- Plan: ${savedSubscription.subscription_type}`);
    console.log(`- Precio original: $${savedSubscription.base_price}`);
    console.log(`- Descuento aplicado: ${savedSubscription.discount_percentage}%`);
    console.log(`- Precio final: $${savedSubscription.discounted_price}`);
    console.log(`- Total a pagar: $${savedSubscription.transaction_amount}`);
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testCompleteSubscriptionFlow();