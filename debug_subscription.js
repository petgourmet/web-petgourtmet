const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscriptionData() {
  console.log('🔍 Revisando datos de suscripciones activas...');
  
  // Consultar suscripciones activas
  const { data: subscriptions, error: subError } = await supabase
    .from('unified_subscriptions')
    .select(`
      id,
      user_id,
      product_name,
      subscription_type,
      status,
      base_price,
      discounted_price,
      discount_percentage,
      transaction_amount,
      created_at,
      updated_at
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5);

  if (subError) {
    console.error('❌ Error consultando suscripciones:', subError);
    return;
  }

  console.log('📊 Suscripciones activas encontradas:', subscriptions?.length || 0);
  
  if (subscriptions && subscriptions.length > 0) {
    subscriptions.forEach((sub, index) => {
      console.log(`\n--- Suscripción ${index + 1} ---`);
      console.log(`ID: ${sub.id}`);
      console.log(`Producto: ${sub.product_name || 'N/A'}`);
      console.log(`Tipo: ${sub.subscription_type}`);
      console.log(`Estado: ${sub.status}`);
      console.log(`Precio base: $${sub.base_price || '0.00'}`);
      console.log(`Precio con descuento: $${sub.discounted_price || '0.00'}`);
      console.log(`Porcentaje descuento: ${sub.discount_percentage || '0'}%`);
      console.log(`Monto transacción: $${sub.transaction_amount || '0.00'}`);
      console.log(`Creado: ${sub.created_at}`);
      console.log(`Actualizado: ${sub.updated_at}`);
    });
  } else {
    console.log('⚠️ No se encontraron suscripciones activas');
  }

  // Consultar productos para comparar
  console.log('\n🛍️ Revisando productos disponibles...');
  
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      monthly_discount,
      quarterly_discount,
      annual_discount
    `)
    .or('name.ilike.%pet gourmet%,name.ilike.%premium%')
    .limit(5);

  if (prodError) {
    console.error('❌ Error consultando productos:', prodError);
    return;
  }

  console.log('🛍️ Productos encontrados:', products?.length || 0);
  
  if (products && products.length > 0) {
    products.forEach((prod, index) => {
      console.log(`\n--- Producto ${index + 1} ---`);
      console.log(`ID: ${prod.id}`);
      console.log(`Nombre: ${prod.name}`);
      console.log(`Precio: $${prod.price}`);
      console.log(`Descuento mensual: ${prod.monthly_discount}%`);
      console.log(`Descuento trimestral: ${prod.quarterly_discount}%`);
      console.log(`Descuento anual: ${prod.annual_discount}%`);
    });
  }
}

checkSubscriptionData().catch(console.error);