require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrderItemsSchema() {
  console.log('🔍 Verificando esquema de order_items...');
  
  // Intentar insertar con diferentes tipos de order_id
  const testCases = [
    {
      name: 'String order_id',
      data: {
        order_id: 'TEST-123',
        product_name: 'Test Product',
        product_image: 'test.jpg',
        quantity: 1,
        price: 100,
        size: 'M'
      }
    },
    {
      name: 'Integer order_id',
      data: {
        order_id: 123,
        product_name: 'Test Product',
        product_image: 'test.jpg',
        quantity: 1,
        price: 100,
        size: 'M'
      }
    },
    {
      name: 'UUID order_id',
      data: {
        order_id: '550e8400-e29b-41d4-a716-446655440000',
        product_name: 'Test Product',
        product_image: 'test.jpg',
        quantity: 1,
        price: 100,
        size: 'M'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Probando: ${testCase.name}`);
    
    const { data, error } = await supabase
      .from('order_items')
      .insert(testCase.data)
      .select()
      .single();
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Éxito: ${JSON.stringify(data, null, 2)}`);
      
      // Limpiar el registro de prueba
      await supabase
        .from('order_items')
        .delete()
        .eq('id', data.id);
      
      console.log('🧹 Registro de prueba eliminado');
      break; // Si uno funciona, no necesitamos probar más
    }
  }
}

checkOrderItemsSchema().catch(console.error);