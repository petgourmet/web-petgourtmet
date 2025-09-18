const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (usando service_role_key para permisos de escritura)
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixFlanPolloDiscounts() {
  try {
    console.log('🔍 Buscando suscripciones de Flan de Pollo sin descuento...');
    
    // Obtener suscripciones activas de Flan de Pollo sin descuento
    const { data: subscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .ilike('product_name', '%Flan de Pollo%')
      .eq('status', 'active')
      .eq('subscription_type', 'weekly')
      .or('discount_percentage.is.null,discount_percentage.eq.0');

    if (fetchError) {
      console.error('❌ Error al obtener suscripciones:', fetchError);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No se encontraron suscripciones de Flan de Pollo sin descuento.');
      return;
    }

    console.log(`📋 Encontradas ${subscriptions.length} suscripciones para actualizar:`);
    
    for (const sub of subscriptions) {
      console.log(`\n🔧 Actualizando suscripción ID: ${sub.id}`);
      console.log(`   Producto: ${sub.product_name}`);
      console.log(`   Precio base actual: $${sub.base_price}`);
      
      // Calcular el descuento del 15% para suscripciones semanales
      const discountPercentage = 15;
      const basePrice = parseFloat(sub.base_price) || 45; // Precio base por defecto
      const discountAmount = (basePrice * discountPercentage) / 100;
      const discountedPrice = basePrice - discountAmount;
      
      console.log(`   Aplicando descuento: ${discountPercentage}%`);
      console.log(`   Precio con descuento: $${discountedPrice.toFixed(2)}`);
      
      // Actualizar la suscripción
      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          discount_percentage: discountPercentage,
          base_price: basePrice,
          discounted_price: discountedPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      if (updateError) {
        console.error(`❌ Error al actualizar suscripción ${sub.id}:`, updateError);
      } else {
        console.log(`✅ Suscripción ${sub.id} actualizada correctamente`);
      }
    }

    console.log('\n🎉 Proceso completado. Verificando resultados...');
    
    // Verificar que las actualizaciones se aplicaron correctamente
    const { data: updatedSubs, error: verifyError } = await supabase
      .from('unified_subscriptions')
      .select('id, product_name, discount_percentage, base_price, discounted_price')
      .ilike('product_name', '%Flan de Pollo%')
      .eq('status', 'active')
      .eq('subscription_type', 'weekly');

    if (verifyError) {
      console.error('❌ Error al verificar actualizaciones:', verifyError);
      return;
    }

    console.log('\n📊 Estado final de las suscripciones:');
    updatedSubs.forEach(sub => {
      console.log(`   ID ${sub.id}: ${sub.discount_percentage}% descuento - $${sub.base_price} → $${sub.discounted_price}`);
    });

  } catch (err) {
    console.error('💥 Error general:', err);
  }
}

fixFlanPolloDiscounts();