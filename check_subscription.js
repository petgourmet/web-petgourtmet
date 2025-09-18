// Script para verificar suscripción usando credenciales directas
const { createClient } = require('@supabase/supabase-js');

async function checkSubscription() {
  try {
    // Crear cliente de Supabase con service role
    const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('🔍 Buscando suscripción con external_reference: 8ee90c1d78554c9faa3c0531fcbaaeb7');
    
    const { data, error } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        products (
          id,
          name,
          image,
          price,
          monthly_discount,
          quarterly_discount,
          annual_discount,
          biweekly_discount
        )
      `)
      .eq('external_reference', '8ee90c1d78554c9faa3c0531fcbaaeb7');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Suscripción encontrada:');
      const subscription = data[0];
      console.log(`- ID: ${subscription.id}`);
      console.log(`- Status: ${subscription.status}`);
      console.log(`- Frequency: ${subscription.frequency}`);
      console.log(`- Price: ${subscription.price}`);
      console.log(`- External Reference: ${subscription.external_reference}`);
      console.log(`- Next Billing Date: ${subscription.next_billing_date}`);
      console.log(`- Product ID: ${subscription.product_id}`);
      console.log(`- Created At: ${subscription.created_at}`);
      console.log(`- Updated At: ${subscription.updated_at}`);
      
      if (subscription.products) {
        console.log('\n📦 Información del producto:');
        console.log(`- Nombre: ${subscription.products.name}`);
        console.log(`- Precio base: ${subscription.products.price}`);
        console.log(`- Imagen: ${subscription.products.image}`);
        console.log(`- Descuento mensual: ${subscription.products.monthly_discount}`);
        console.log(`- Descuento trimestral: ${subscription.products.quarterly_discount}`);
        console.log('✅ LA INFORMACIÓN DEL PRODUCTO ESTÁ DISPONIBLE');
      } else {
        console.log('❌ NO HAY INFORMACIÓN DEL PRODUCTO - ESTO ES EL PROBLEMA');
        console.log('🔧 Intentando obtener producto por separado...');
        
        if (subscription.product_id) {
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', subscription.product_id)
            .single();
          
          if (productError) {
            console.error('❌ Error obteniendo producto:', productError);
          } else {
            console.log('📦 Producto encontrado por separado:');
            console.log(`- Nombre: ${productData.name}`);
            console.log(`- Precio: ${productData.price}`);
            console.log(`- Imagen: ${productData.image}`);
            
            // ACTUALIZAR LA SUSCRIPCIÓN PARA CORREGIR EL PROBLEMA
            console.log('\n🔧 CORRIGIENDO LA SUSCRIPCIÓN...');
            const { data: updateResult, error: updateError } = await supabase
              .from('unified_subscriptions')
              .update({
                price: productData.price,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id)
              .select();
            
            if (updateError) {
              console.error('❌ Error actualizando suscripción:', updateError);
            } else {
              console.log('✅ Suscripción actualizada correctamente');
            }
          }
        }
      }
      
      // Verificar también el perfil del usuario
      const userId = subscription.user_id;
      if (userId) {
        console.log('\n🔍 Verificando perfil del usuario:', userId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          console.error('❌ Error obteniendo perfil:', profileError);
        } else {
          console.log('👤 Perfil del usuario:');
          console.log(`- Email: ${profile.email}`);
          console.log(`- Nombre: ${profile.full_name}`);
          console.log(`- Tiene suscripción activa: ${profile.has_active_subscription}`);
          
          // Actualizar perfil si es necesario
          if (!profile.has_active_subscription && subscription.status === 'active') {
            console.log('\n🔧 ACTUALIZANDO PERFIL DEL USUARIO...');
            const { error: profileUpdateError } = await supabase
              .from('profiles')
              .update({ has_active_subscription: true })
              .eq('id', userId);
            
            if (profileUpdateError) {
              console.error('❌ Error actualizando perfil:', profileUpdateError);
            } else {
              console.log('✅ Perfil actualizado correctamente');
            }
          }
        }
      }
    } else {
      console.log('❌ No se encontró la suscripción');
      
      // Buscar en todas las tablas relacionadas
      console.log('\n🔍 Buscando en otras tablas...');
      
      const { data: allSubs } = await supabase
        .from('unified_subscriptions')
        .select('external_reference, status, id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('📋 Últimas suscripciones:');
      allSubs?.forEach(sub => {
        console.log(`- ID: ${sub.id}, External Ref: ${sub.external_reference}, Status: ${sub.status}, Created: ${sub.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkSubscription();