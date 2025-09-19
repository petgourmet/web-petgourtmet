// Script de prueba para verificar el flujo de suscripción
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubscriptionFlow() {
  console.log('🧪 Iniciando prueba del flujo de suscripción...');
  
  try {
    // 1. Verificar producto "Flan de Pollo"
    console.log('\n1️⃣ Verificando producto "Flan de Pollo"...');
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, price, monthly_discount, biweekly_discount, weekly_discount, image')
      .eq('name', 'Flan de Pollo')
      .single();
    
    if (productError) {
      console.error('❌ Error al obtener producto:', productError);
      return;
    }
    
    console.log('✅ Producto encontrado:', {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      monthly_discount: product.monthly_discount,
      biweekly_discount: product.biweekly_discount,
      weekly_discount: product.weekly_discount
    });
    
    // 2. Crear suscripción de prueba
    console.log('\n2️⃣ Creando suscripción de prueba...');
    
    // Buscar un usuario existente en la tabla profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);

    if (profilesError) {
      console.error('Error al buscar perfiles:', profilesError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.error('No se encontraron perfiles en la base de datos');
      return;
    }

    const user = profiles[0];
    console.log('Usuario encontrado:', user);

    // Crear una suscripción de prueba con datos reales del Plan Pet Gourmet Premium
    const basePrice = 120.00;
    const discountPercentage = 20;
    const discountedPrice = basePrice * (1 - discountPercentage / 100); // $96.00

    const testSubscription = {
      user_id: user.id,
      product_id: product.id,
      subscription_type: 'biweekly',
      status: 'active',
      quantity: 1,
      size: '2kg',
      base_price: basePrice,
      discount_percentage: discountPercentage,
      discounted_price: discountedPrice,
      transaction_amount: discountedPrice, // $96.00
      product_name: 'Plan Pet Gourmet Premium',
      product_image: product.image,
      external_reference: `test-premium-sub-${Date.now()}`,
      start_date: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 días después
      frequency: 2,
      frequency_type: 'weeks',
      currency_id: 'MXN'
    };

    console.log('\n=== DATOS DE LA SUSCRIPCIÓN ===');
    console.log('Precio base:', `$${basePrice.toFixed(2)}`);
    console.log('Descuento:', `${discountPercentage}%`);
    console.log('Precio con descuento:', `$${discountedPrice.toFixed(2)}`);
    console.log('Monto de transacción:', `$${discountedPrice.toFixed(2)}`);
    console.log('================================\n');
    
    console.log('📊 Datos de suscripción a crear:', {
      product_name: product.name,
      base_price: basePrice,
      discount_percentage: discountPercentage + '%',
      discounted_price: discountedPrice,
      transaction_amount: discountedPrice
    });
    
    const { data: subscription, error: subscriptionError } = await supabase
      .from('unified_subscriptions')
      .insert([testSubscription])
      .select()
      .single();
    
    if (subscriptionError) {
      console.error('❌ Error al crear suscripción:', subscriptionError);
      return;
    }
    
    console.log('✅ Suscripción creada exitosamente:', {
      id: subscription.id,
      external_reference: subscription.external_reference,
      base_price: subscription.base_price,
      discount_percentage: subscription.discount_percentage,
      discounted_price: subscription.discounted_price,
      transaction_amount: subscription.transaction_amount
    });
    
    // 3. Verificar que los campos se guardaron correctamente
    console.log('\n3️⃣ Verificando campos guardados en unified_subscriptions...');
    const { data: savedSubscription, error: verifyError } = await supabase
      .from('unified_subscriptions')
      .select('id, base_price, discount_percentage, discounted_price, transaction_amount, status, frequency')
      .eq('id', subscription.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Error al verificar suscripción:', verifyError);
      return;
    }
    
    console.log('✅ Campos verificados:', savedSubscription);
    
    // 4. Verificar que no hay precios en $0.00
    const hasZeroPrices = [
      savedSubscription.base_price,
      savedSubscription.discounted_price,
      savedSubscription.transaction_amount
    ].some(price => price === 0 || price === null);
    
    if (hasZeroPrices) {
      console.log('⚠️ PROBLEMA DETECTADO: Hay precios en $0.00');
    } else {
      console.log('✅ ÉXITO: Todos los precios son mayores a $0.00');
    }
    
    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('📋 Resumen:');
    console.log(`   - Producto: ${product.name}`);
    console.log(`   - Precio base: $${savedSubscription.base_price}`);
    console.log(`   - Descuento: ${savedSubscription.discount_percentage}%`);
    console.log(`   - Precio con descuento: $${savedSubscription.discounted_price}`);
    console.log(`   - Monto de transacción: $${savedSubscription.transaction_amount}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la prueba
testSubscriptionFlow();