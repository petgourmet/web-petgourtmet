const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';

async function assignProductToSubscription() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const externalReference = '8ee90c1d78554c9faa3c0531fcbaaeb7';
  const productId = 73; // Flan de Pollo
  
  try {
    console.log('🔍 Asignando producto ID:', productId, 'a la suscripción:', externalReference);
    
    // Obtener información del producto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
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
      image: product.image
    });
    
    // Calcular precios para suscripción mensual
    const basePrice = parseFloat(product.price);
    const discountPercentage = product.monthly_discount || 10;
    const discountedPrice = basePrice * (1 - discountPercentage / 100);
    
    console.log('💰 Calculando precios:', {
      basePrice,
      discountPercentage,
      discountedPrice
    });
    
    // Actualizar la suscripción con toda la información del producto
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        product_id: productId,
        product_name: product.name,
        product_image: product.image,
        base_price: basePrice,
        discounted_price: discountedPrice,
        discount_percentage: discountPercentage,
        transaction_amount: discountedPrice,
        quantity: 1,
        updated_at: new Date().toISOString()
      })
      .eq('external_reference', externalReference);
    
    if (updateError) {
      console.error('❌ Error al actualizar suscripción:', updateError);
      return;
    }
    
    console.log('✅ Suscripción actualizada con información del producto');
    
    // Verificar la actualización
    const { data: updatedSubscription, error: verifyError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();
    
    if (verifyError) {
      console.error('❌ Error al verificar actualización:', verifyError);
      return;
    }
    
    console.log('📋 Suscripción actualizada:');
    console.log({
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      product_id: updatedSubscription.product_id,
      product_name: updatedSubscription.product_name,
      base_price: updatedSubscription.base_price,
      discounted_price: updatedSubscription.discounted_price,
      discount_percentage: updatedSubscription.discount_percentage,
      transaction_amount: updatedSubscription.transaction_amount
    });
    
    // Actualizar perfil del usuario
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ has_active_subscription: true })
      .eq('id', updatedSubscription.user_id);
    
    if (profileError) {
      console.error('❌ Error al actualizar perfil:', profileError);
    } else {
      console.log('✅ Perfil actualizado - has_active_subscription: true');
    }
    
    console.log('🎉 ¡Suscripción completamente configurada!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la función
assignProductToSubscription();