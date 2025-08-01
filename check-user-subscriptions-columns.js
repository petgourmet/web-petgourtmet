require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  try {
    console.log('🔍 Verificando estructura de user_subscriptions...');
    
    // Intentar hacer una consulta simple para ver qué columnas existen
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error consultando user_subscriptions:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Columnas encontradas en user_subscriptions:');
      console.log(Object.keys(data[0]).join(', '));
    } else {
      console.log('⚠️ La tabla user_subscriptions está vacía');
      
      // Intentar insertar un registro de prueba para ver qué columnas acepta
      console.log('🧪 Probando inserción de prueba...');
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          product_id: 1,
          subscription_type: 'test'
        })
        .select();
      
      if (insertError) {
        console.log('📋 Columnas requeridas según error:', insertError.message);
      }
    }
    
  } catch (err) {
    console.error('💥 Error general:', err);
  }
}

checkColumns();