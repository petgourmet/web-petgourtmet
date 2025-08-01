require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStatusValues() {
  console.log('🧪 PROBANDO VALORES DE STATUS VÁLIDOS');
  console.log('=' .repeat(50));
  
  const statusValues = [
    'pending',
    'authorized', 
    'paused',
    'cancelled',
    'active',
    'inactive',
    'processing',
    'completed'
  ];
  
  for (const status of statusValues) {
    console.log(`\n📝 Probando status: "${status}"`);
    
    const testData = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      product_id: 1,
      product_name: 'Test Product',
      subscription_type: 'monthly',
      status: status,
      quantity: 1,
      base_price: 100,
      discounted_price: 90,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_billing_date: new Date().toISOString(),
      external_reference: `TEST-${status}-${Date.now()}`,
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 90,
      currency_id: 'MXN'
    };
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Éxito: Status "${status}" es válido`);
      
      // Limpiar el registro de prueba
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('id', data.id);
      
      console.log(`   🧹 Registro limpiado`);
    }
  }
  
  console.log('\n🎉 Prueba de valores de status completada');
}

testStatusValues().catch(console.error);