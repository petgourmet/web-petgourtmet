const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

async function updateSubscriptionWithProduct() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const externalReference = '8ee90c1d78554c9faa3c0531fcbaaeb7';
  
  try {
    console.log('🔍 Buscando suscripción con external_reference:', externalReference);
    
    // Buscar la suscripción
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();
    
    if (subError) {
      console.error('❌ Error al buscar suscripción:', subError);
      return;
    }
    
    if (!subscription) {
      console.log('❌ No se encontró suscripción con external_reference:', externalReference);
      return;
    }
    
    console.log('✅ Suscripción encontrada:', {
      id: subscription.id,
      status: subscription.status,
      subscription_type: subscription.subscription_type,
      product_id: subscription.product_id,
      base_price: subscription.base_price
    });
    
    // Si ya tiene product_id, buscar información del producto
    if (subscription.product_id) {
      console.log('🔍 Buscando información del producto ID:', subscription.product_id);
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', subscription.product_id)
        .single();
      
      if (productError) {
        console.error('❌ Error al buscar producto:', productError);
        return;
      }
      
      if (product) {
        console.log('✅ Producto encontrado:', {
          id: product.id,
          name: product.name,
          price: product.price,
          weekly_discount: product.weekly_discount,
          biweekly_discount: product.biweekly_discount,
          monthly_discount: product.monthly_discount
        });
        
        // Calcular descuento según el tipo de suscripción
        let discountPercentage = 0;
        switch (subscription.subscription_type) {
          case 'weekly':
            discountPercentage = product.weekly_discount || 0;
            break;
          case 'biweekly':
            discountPercentage = product.biweekly_discount || 20;
            break;
          case 'monthly':
            discountPercentage = product.monthly_discount || 10;
            break;
          case 'quarterly':
            discountPercentage = product.quarterly_discount || 15;
            break;
          case 'annual':
            discountPercentage = product.annual_discount || 20;
            break;
        }
        
        const basePrice = parseFloat(product.price);
        const discountedPrice = basePrice * (1 - discountPercentage / 100);
        
        console.log('💰 Calculando precios:', {
          basePrice,
          discountPercentage,
          discountedPrice
        });
        
        // Actualizar la suscripción con información completa del producto
        const { data: updatedSub, error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({
            product_name: product.name,
            product_image: product.image,
            base_price: basePrice,
            discounted_price: discountedPrice,
            discount_percentage: discountPercentage,
            transaction_amount: discountedPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Error al actualizar suscripción:', updateError);
          return;
        }
        
        console.log('✅ Suscripción actualizada con información del producto');
        
        // Actualizar el perfil del usuario
        if (subscription.user_id) {
          console.log('👤 Actualizando perfil del usuario:', subscription.user_id);
          
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ has_active_subscription: true })
            .eq('id', subscription.user_id);
          
          if (profileError) {
            console.error('❌ Error al actualizar perfil:', profileError);
          } else {
            console.log('✅ Perfil actualizado correctamente');
          }
        }
        
        console.log('🎉 Proceso completado exitosamente!');
      }
    } else {
      console.log('⚠️ La suscripción no tiene product_id asignado');
      
      // Intentar encontrar el producto basado en cart_items si existe
      if (subscription.cart_items && subscription.cart_items.length > 0) {
        const firstItem = subscription.cart_items[0];
        console.log('🔍 Intentando usar product_id del cart_items:', firstItem.product_id);
        
        if (firstItem.product_id) {
          const { error: updateProductError } = await supabase
            .from('unified_subscriptions')
            .update({ product_id: firstItem.product_id })
            .eq('id', subscription.id);
          
          if (updateProductError) {
            console.error('❌ Error al actualizar product_id:', updateProductError);
          } else {
            console.log('✅ Product_id actualizado, ejecutando proceso nuevamente...');
            // Ejecutar el proceso nuevamente
            await updateSubscriptionWithProduct();
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la función
updateSubscriptionWithProduct();