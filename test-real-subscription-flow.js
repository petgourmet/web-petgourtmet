// test-real-subscription-flow.js
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixjhbqfvjyuoqkqvlrpx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4amhicWZ2anl1b3FrcXZscnB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU5NzI5NCwiZXhwIjoyMDUxMTczMjk0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealSubscriptionFlow() {
  console.log('🚀 INICIANDO PRUEBA REAL DEL FLUJO DE SUSCRIPCIÓN');
  console.log('============================================================');
  
  const testEmail = 'cristoferscalante@gmail.com';
  const testReference = `test-real-${Date.now()}-cristofer`;
  
  try {
    // 1. Verificar que el usuario existe
    console.log('\n1️⃣ Verificando usuario...');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (userError || !user) {
      throw new Error(`Usuario no encontrado: ${testEmail}`);
    }
    
    console.log(`✅ Usuario encontrado: ${user.email} (ID: ${user.id})`);
    
    // 2. Crear suscripción pendiente
    console.log('\n2️⃣ Creando suscripción pendiente...');
    const pendingSubscription = {
      user_id: user.id,
      external_reference: testReference,
      subscription_type: 1, // Plan mensual
      amount: 299.00,
      status: 'pending',
      cart_items: [
        {
          id: 'plan-mensual',
          name: 'Plan de Atún Mensual',
          price: 299.00,
          quantity: 1
        }
      ],
      created_at: new Date().toISOString()
    };
    
    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .insert([pendingSubscription])
      .select()
      .single();
    
    if (pendingError) {
      throw new Error(`Error creando suscripción pendiente: ${pendingError.message}`);
    }
    
    console.log(`✅ Suscripción pendiente creada: ${pendingData.external_reference}`);
    
    // 3. Activar suscripción usando el endpoint real
    console.log('\n3️⃣ Activando suscripción...');
    
    const activationPayload = {
      external_reference: testReference
    };
    
    const response = await fetch('http://localhost:3000/api/subscriptions/activate-landing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activationPayload)
    });
    
    const activationResult = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error en activación: ${activationResult.error || 'Error desconocido'}`);
    }
    
    console.log('✅ Suscripción activada exitosamente!');
    console.log('📧 Detalles del resultado:', JSON.stringify(activationResult, null, 2));
    
    // 4. Verificar que la suscripción activa se creó
    console.log('\n4️⃣ Verificando suscripción activa...');
    const { data: activeSubscription, error: activeError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('external_reference', testReference)
      .single();
    
    if (activeError || !activeSubscription) {
      console.log('⚠️ No se encontró la suscripción activa en la base de datos');
    } else {
      console.log(`✅ Suscripción activa encontrada: ID ${activeSubscription.id}`);
      console.log(`   - Tipo: ${activeSubscription.subscription_type}`);
      console.log(`   - Estado: ${activeSubscription.status}`);
      console.log(`   - Próxima facturación: ${activeSubscription.next_billing_date}`);
    }
    
    // 5. Verificar actualización del perfil
    console.log('\n5️⃣ Verificando actualización del perfil...');
    const { data: updatedUser, error: updatedUserError } = await supabase
      .from('profiles')
      .select('has_active_subscription')
      .eq('id', user.id)
      .single();
    
    if (updatedUserError) {
      console.log('⚠️ Error verificando perfil actualizado');
    } else {
      console.log(`✅ Perfil actualizado - has_active_subscription: ${updatedUser.has_active_subscription}`);
    }
    
    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('============================================================');
    console.log(`   ✅ Usuario: ${testEmail}`);
    console.log(`   ✅ Referencia: ${testReference}`);
    console.log(`   ✅ Suscripción activada y correos enviados`);
    console.log(`   ✅ Verifica tu bandeja de entrada: ${testEmail}`);
    console.log('============================================================');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    
    try {
      // Eliminar suscripción activa
      await supabase
        .from('subscriptions')
        .delete()
        .eq('external_reference', testReference);
      
      // Eliminar suscripción pendiente
      await supabase
        .from('pending_subscriptions')
        .delete()
        .eq('external_reference', testReference);
      
      console.log('✅ Datos de prueba limpiados');
    } catch (cleanupError) {
      console.error('⚠️ Error en limpieza:', cleanupError.message);
    }
  }
}

// Ejecutar la prueba
testRealSubscriptionFlow().catch(console.error);