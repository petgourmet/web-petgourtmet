const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDiscountPercentages() {
  console.log('🔧 Iniciando corrección de porcentajes de descuento...');
  
  try {
    // 1. Obtener todas las suscripciones con sus productos
    const { data: subscriptions, error: subsError } = await supabase
      .from('unified_subscriptions')
      .select(`
        id,
        subscription_type,
        discount_percentage,
        product_id,
        products (
          id,
          name,
          weekly_discount,
          biweekly_discount,
          monthly_discount,
          quarterly_discount,
          annual_discount
        )
      `);
    
    if (subsError) {
      console.error('❌ Error al obtener suscripciones:', subsError);
      return;
    }
    
    console.log(`📊 Encontradas ${subscriptions.length} suscripciones`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 2. Procesar cada suscripción
    for (const subscription of subscriptions) {
      const product = subscription.products;
      
      if (!product) {
        console.log(`⚠️ Suscripción ${subscription.id}: Producto no encontrado`);
        skippedCount++;
        continue;
      }
      
      // 3. Determinar el descuento esperado según el tipo de suscripción
      let expectedDiscount = 0;
      
      switch (subscription.subscription_type) {
        case 'weekly':
          expectedDiscount = product.weekly_discount || 0;
          break;
        case 'biweekly':
          expectedDiscount = product.biweekly_discount || 0;
          break;
        case 'monthly':
          expectedDiscount = product.monthly_discount || 0;
          break;
        case 'quarterly':
          expectedDiscount = product.quarterly_discount || 0;
          break;
        case 'annual':
          expectedDiscount = product.annual_discount || 0;
          break;
        default:
          console.log(`⚠️ Suscripción ${subscription.id}: Tipo de suscripción desconocido: ${subscription.subscription_type}`);
          skippedCount++;
          continue;
      }
      
      // 4. Verificar si necesita actualización
      const currentDiscount = subscription.discount_percentage || 0;
      
      if (currentDiscount !== expectedDiscount) {
        console.log(`🔄 Actualizando suscripción ${subscription.id}:`);
        console.log(`   Producto: ${product.name}`);
        console.log(`   Tipo: ${subscription.subscription_type}`);
        console.log(`   Descuento actual: ${currentDiscount}%`);
        console.log(`   Descuento esperado: ${expectedDiscount}%`);
        
        // 5. Actualizar la suscripción
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({ 
            discount_percentage: expectedDiscount,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        
        if (updateError) {
          console.error(`❌ Error al actualizar suscripción ${subscription.id}:`, updateError);
        } else {
          console.log(`✅ Suscripción ${subscription.id} actualizada correctamente`);
          updatedCount++;
        }
      } else {
        console.log(`✓ Suscripción ${subscription.id}: Descuento ya es correcto (${currentDiscount}%)`);
        skippedCount++;
      }
    }
    
    console.log('\n📈 Resumen de la corrección:');
    console.log(`   Total procesadas: ${subscriptions.length}`);
    console.log(`   Actualizadas: ${updatedCount}`);
    console.log(`   Sin cambios: ${skippedCount}`);
    console.log('\n✅ Corrección de porcentajes de descuento completada');
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar el script
fixDiscountPercentages();