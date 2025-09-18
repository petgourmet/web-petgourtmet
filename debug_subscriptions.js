const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSubscriptions() {
  try {
    console.log('Consultando suscripciones activas de Flan de Pollo...');
    
    const { data, error } = await supabase
      .from('unified_subscriptions')
      .select(`
        id,
        product_name,
        status,
        subscription_type,
        discount_percentage,
        base_price,
        discounted_price,
        created_at,
        customer_data
      `)
      .ilike('product_name', '%Flan de Pollo%')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al consultar:', error);
      return;
    }

    console.log(`\nEncontradas ${data.length} suscripciones activas de Flan de Pollo:\n`);
    
    data.forEach((sub, index) => {
      console.log(`--- Suscripción ${index + 1} ---`);
      console.log(`ID: ${sub.id}`);
      console.log(`Producto: ${sub.product_name}`);
      console.log(`Estado: ${sub.status}`);
      console.log(`Tipo: ${sub.subscription_type}`);
      console.log(`Descuento: ${sub.discount_percentage}%`);
      console.log(`Precio base: $${sub.base_price}`);
      console.log(`Precio con descuento: $${sub.discounted_price}`);
      console.log(`Cliente: ${sub.customer_data?.name || 'N/A'} (${sub.customer_data?.email || 'N/A'})`);
      console.log(`Creada: ${new Date(sub.created_at).toLocaleString()}`);
      console.log('');
    });

    // Identificar suscripciones sin descuento
    const sinDescuento = data.filter(sub => !sub.discount_percentage || sub.discount_percentage === 0);
    
    if (sinDescuento.length > 0) {
      console.log(`\n🚨 PROBLEMA IDENTIFICADO: ${sinDescuento.length} suscripciones SIN descuento aplicado:`);
      sinDescuento.forEach(sub => {
        console.log(`- ID ${sub.id}: ${sub.customer_data?.name || 'Usuario'} (${sub.customer_data?.email || 'N/A'})`);
      });
    }

    // Identificar suscripciones con descuento
    const conDescuento = data.filter(sub => sub.discount_percentage && sub.discount_percentage > 0);
    
    if (conDescuento.length > 0) {
      console.log(`\n✅ Suscripciones CON descuento aplicado: ${conDescuento.length}`);
      conDescuento.forEach(sub => {
        console.log(`- ID ${sub.id}: ${sub.discount_percentage}% descuento`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

debugSubscriptions();