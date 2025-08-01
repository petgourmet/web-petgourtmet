require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserLink() {
  try {
    console.log('🔧 Corrigiendo vinculación de suscripción...');
    
    // 1. Obtener el usuario
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'fabyo66@hotmail.com')
      .single();
    
    if (userError || !user) {
      console.log('❌ Error obteniendo usuario:', userError?.message || 'Usuario no encontrado');
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${user.email}`);
    console.log('📋 Campos disponibles:', Object.keys(user));
    
    // Determinar el campo ID correcto
    const userId = user.id || user.auth_users_id || user.user_id;
    if (!userId) {
      console.log('❌ No se pudo determinar el ID del usuario');
      return;
    }
    
    console.log(`🔑 Usando ID: ${userId}`);
    
    // 2. Actualizar la suscripción con el user_id correcto
    const { data: updatedSub, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        user_id: userId
      })
      .eq('id', 2)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Error actualizando suscripción:', updateError.message);
      return;
    }
    
    console.log('✅ Suscripción actualizada exitosamente');
    console.log(`   - ID: ${updatedSub.id}`);
    console.log(`   - Usuario ID: ${updatedSub.user_id}`);
    console.log(`   - Producto: ${updatedSub.product_name}`);
    
    // 3. Verificar que la vinculación funcione
    console.log('\n🔍 Verificando vinculación...');
    const { data: verification, error: verifyError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (verifyError) {
      console.log('❌ Error verificando:', verifyError.message);
    } else {
      console.log(`✅ ${verification.length} suscripción(es) encontrada(s) para el usuario`);
      verification.forEach(sub => {
        console.log(`   - ${sub.product_name} (${sub.subscription_type})`);
      });
    }
    
    console.log('\n🎉 ¡Vinculación corregida exitosamente!');
    
  } catch (err) {
    console.error('💥 Error general:', err);
  }
}

fixUserLink();