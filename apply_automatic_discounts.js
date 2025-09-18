const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de descuentos por producto y frecuencia
const DISCOUNT_RULES = {
  'Flan de Pollo': {
    weekly: 15,
    biweekly: 10,
    monthly: 8,
    quarterly: 5,
    annual: 20
  },
  // Agregar más productos aquí según sea necesario
  'default': {
    weekly: 10,
    biweekly: 8,
    monthly: 5,
    quarterly: 3,
    annual: 15
  }
};

async function applyAutomaticDiscounts() {
  try {
    console.log('🔄 Iniciando aplicación automática de descuentos...');
    
    // Buscar suscripciones activas sin descuento aplicado
    const { data: subscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'active')
      .or('discount_percentage.is.null,discount_percentage.eq.0');

    if (fetchError) {
      console.error('❌ Error al obtener suscripciones:', fetchError);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No hay suscripciones que requieran actualización de descuentos.');
      return;
    }

    console.log(`📋 Encontradas ${subscriptions.length} suscripciones para procesar:`);
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const sub of subscriptions) {
      try {
        console.log(`\n🔍 Procesando suscripción ID: ${sub.id}`);
        console.log(`   Producto: ${sub.product_name}`);
        console.log(`   Frecuencia: ${sub.subscription_type}`);
        console.log(`   Estado: ${sub.status}`);
        
        // Determinar el descuento aplicable
        const productName = sub.product_name;
        const frequency = sub.subscription_type;
        
        let discountPercentage = 0;
        
        // Buscar descuento específico para el producto
        if (DISCOUNT_RULES[productName] && DISCOUNT_RULES[productName][frequency]) {
          discountPercentage = DISCOUNT_RULES[productName][frequency];
        } else if (DISCOUNT_RULES['default'][frequency]) {
          // Usar descuento por defecto si no hay regla específica
          discountPercentage = DISCOUNT_RULES['default'][frequency];
        }
        
        if (discountPercentage === 0) {
          console.log(`   ⚠️  No hay descuento configurado para ${productName} con frecuencia ${frequency}`);
          continue;
        }
        
        // Calcular precios
        const basePrice = parseFloat(sub.base_price) || parseFloat(sub.price) || 0;
        const discountedPrice = basePrice * (1 - discountPercentage / 100);
        
        console.log(`   💰 Precio base: $${basePrice}`);
        console.log(`   🎯 Aplicando descuento: ${discountPercentage}%`);
        console.log(`   💵 Precio con descuento: $${discountedPrice.toFixed(2)}`);
        
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
          errorCount++;
        } else {
          console.log(`✅ Suscripción ${sub.id} actualizada correctamente`);
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error procesando suscripción ${sub.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Resumen de la operación:');
    console.log(`   ✅ Suscripciones actualizadas: ${updatedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📋 Total procesadas: ${subscriptions.length}`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 ¡Descuentos aplicados exitosamente!');
    }
    
  } catch (error) {
    console.error('❌ Error general en la aplicación de descuentos:', error);
  }
}

// Función para verificar el estado actual
async function verifyDiscountStatus() {
  try {
    console.log('\n🔍 Verificando estado actual de descuentos...');
    
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('id, product_name, subscription_type, status, discount_percentage, base_price, discounted_price')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al verificar estado:', error);
      return;
    }

    console.log(`\n📋 Estado actual de ${subscriptions.length} suscripciones activas:`);
    
    let withDiscount = 0;
    let withoutDiscount = 0;
    
    subscriptions.forEach(sub => {
      const hasDiscount = sub.discount_percentage && sub.discount_percentage > 0;
      if (hasDiscount) {
        withDiscount++;
        console.log(`✅ ID ${sub.id}: ${sub.product_name} (${sub.subscription_type}) - ${sub.discount_percentage}% descuento`);
      } else {
        withoutDiscount++;
        console.log(`❌ ID ${sub.id}: ${sub.product_name} (${sub.subscription_type}) - SIN descuento`);
      }
    });
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Con descuento: ${withDiscount}`);
    console.log(`   ❌ Sin descuento: ${withoutDiscount}`);
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  (async () => {
    await verifyDiscountStatus();
    await applyAutomaticDiscounts();
    await verifyDiscountStatus();
  })();
}

module.exports = {
  applyAutomaticDiscounts,
  verifyDiscountStatus,
  DISCOUNT_RULES
};