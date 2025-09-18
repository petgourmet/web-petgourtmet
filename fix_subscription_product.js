const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

async function fixSubscriptionProduct() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const externalReference = '8ee90c1d78554c9faa3c0531fcbaaeb7';
  
  try {
    console.log('🔍 Buscando suscripción completa con external_reference:', externalReference);
    
    // Buscar la suscripción con todos los datos
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();
    
    if (subError) {
      console.error('❌ Error al buscar suscripción:', subError);
      return;
    }
    
    console.log('📋 Datos completos de la suscripción:');
    console.log(JSON.stringify(subscription, null, 2));
    
    // Verificar si tiene cart_items
    if (subscription.cart_items) {
      console.log('🛒 Cart items encontrados:', subscription.cart_items);
      
      if (Array.isArray(subscription.cart_items) && subscription.cart_items.length > 0) {
        const firstItem = subscription.cart_items[0];
        console.log('📦 Primer item del carrito:', firstItem);
        
        if (firstItem.product_id) {
          console.log('✅ Product ID encontrado en cart_items:', firstItem.product_id);
          
          // Actualizar la suscripción con el product_id
          const { error: updateError } = await supabase
            .from('unified_subscriptions')
            .update({ 
              product_id: firstItem.product_id,
              quantity: firstItem.quantity || 1,
              size: firstItem.size || null
            })
            .eq('id', subscription.id);
          
          if (updateError) {
            console.error('❌ Error al actualizar product_id:', updateError);
            return;
          }
          
          console.log('✅ Product_id actualizado en la suscripción');
          
          // Ahora buscar información del producto
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', firstItem.product_id)
            .single();
          
          if (productError) {
            console.error('❌ Error al buscar producto:', productError);
            return;
          }
          
          console.log('🍖 Producto encontrado:', {
            id: product.id,
            name: product.name,
            price: product.price,
            monthly_discount: product.monthly_discount,
            biweekly_discount: product.biweekly_discount
          });
          
          // Calcular precios
          const basePrice = parseFloat(product.price);
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
          
          const discountedPrice = basePrice * (1 - discountPercentage / 100);
          
          console.log('💰 Calculando precios:', {
            basePrice,
            discountPercentage,
            discountedPrice
          });
          
          // Actualizar suscripción con información completa
          const { error: finalUpdateError } = await supabase
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
            .eq('id', subscription.id);
          
          if (finalUpdateError) {
            console.error('❌ Error al actualizar suscripción final:', finalUpdateError);
            return;
          }
          
          console.log('✅ Suscripción actualizada completamente');
          
          // Actualizar perfil del usuario
          if (subscription.user_id) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ has_active_subscription: true })
              .eq('id', subscription.user_id);
            
            if (profileError) {
              console.error('❌ Error al actualizar perfil:', profileError);
            } else {
              console.log('✅ Perfil actualizado - has_active_subscription: true');
            }
          }
          
          console.log('🎉 ¡Proceso completado exitosamente!');
          
        } else {
          console.log('❌ No se encontró product_id en el primer item del carrito');
        }
      } else {
        console.log('❌ Cart_items está vacío o no es un array');
      }
    } else {
      console.log('❌ No se encontraron cart_items en la suscripción');
      
      // Como último recurso, buscar productos disponibles para suscripción
      console.log('🔍 Buscando productos disponibles para suscripción...');
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('subscription_available', true)
        .limit(5);
      
      if (productsError) {
        console.error('❌ Error al buscar productos:', productsError);
      } else {
        console.log('📦 Productos disponibles para suscripción:');
        products.forEach(p => {
          console.log(`- ID: ${p.id}, Nombre: ${p.name}, Precio: ${p.price}`);
        });
        
        if (products.length > 0) {
          console.log('💡 Sugerencia: Asignar manualmente un product_id a la suscripción');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la función
fixSubscriptionProduct();