const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSubscriptions() {
  console.log('🔍 Consultando suscripciones activas...');
  
  const { data, error } = await supabase
    .from('unified_subscriptions')
    .select(`
      id,
      user_id,
      product_name,
      product_image,
      size,
      transaction_amount,
      base_price,
      discounted_price,
      discount_percentage,
      status,
      frequency,
      quantity,
      external_reference,
      customer_data,
      cart_items
    `)
    .eq('status', 'active')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Datos encontrados:', data?.length || 0, 'suscripciones');
  
  if (data && data.length > 0) {
    data.forEach((sub, index) => {
      console.log(`\n--- Suscripción ${index + 1} ---`);
      console.log('ID:', sub.id);
      console.log('Usuario:', sub.user_id);
      console.log('Producto:', sub.product_name || '❌ FALTA');
      console.log('Imagen:', sub.product_image || '❌ FALTA');
      console.log('Tamaño:', sub.size || '❌ FALTA');
      console.log('Monto transacción:', sub.transaction_amount || '❌ FALTA');
      console.log('Precio base:', sub.base_price || '❌ FALTA');
      console.log('Precio con descuento:', sub.discounted_price || '❌ FALTA');
      console.log('% Descuento:', sub.discount_percentage || '❌ FALTA');
      console.log('Costo envío:', sub.shipping_cost || '❌ FALTA');
      console.log('Total:', sub.total_amount || '❌ FALTA');
      console.log('Estado:', sub.status);
      console.log('Frecuencia:', sub.frequency || '❌ FALTA');
      console.log('Cantidad:', sub.quantity || '❌ FALTA');
    });
  } else {
    console.log('❌ No se encontraron suscripciones activas');
  }
}

debugSubscriptions().catch(console.error);