import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithRealData() {
  console.log('🔍 Obteniendo productos reales...');
  
  // Obtener productos con suscripción disponible
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, subscription_available')
    .eq('subscription_available', true)
    .limit(2);
    
  if (productsError) {
    console.error('❌ Error obteniendo productos:', productsError);
    return;
  }
  
  console.log('✅ Productos encontrados:', products);
  
  if (products && products.length > 0) {
    const product = products[0];
    console.log(`\n🧪 Probando con producto real: ${product.name} (ID: ${product.id})`);
    
    // Probar creación de suscripción con producto real
    const testSubscription = {
      reason: `Suscripción mensual - ${product.name}`,
      external_reference: `test-${Date.now()}`,
      payer_email: 'test@petgourmet.mx',
      back_url: 'https://petgourmet.mx/perfil/suscripciones',
      user_id: '550e8400-e29b-41d4-a716-446655440000', // UUID válido de prueba
      product_id: product.id,
      quantity: 1,
      subscription_type: 'monthly',
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: product.price
      }
    };
    
    try {
      const response = await fetch('http://localhost:3000/api/subscriptions/create-without-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testSubscription)
      });
      
      const result = await response.json();
      console.log('📝 Resultado creación suscripción:', result);
      
      if (response.ok) {
        console.log('✅ Suscripción creada exitosamente');
      } else {
        console.log('❌ Error creando suscripción:', result);
      }
    } catch (error) {
      console.error('❌ Error en la prueba:', error.message);
    }
  }
  
  // Probar obtener suscripciones con UUID válido
  console.log('\n🔍 Probando obtener suscripciones...');
  try {
    const response = await fetch('http://localhost:3000/api/subscriptions/user/550e8400-e29b-41d4-a716-446655440000');
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Suscripciones obtenidas:', result);
    } else {
      console.log('❌ Error obteniendo suscripciones:', result);
    }
  } catch (error) {
    console.error('❌ Error obteniendo suscripciones:', error.message);
  }
}

testWithRealData().catch(console.error);