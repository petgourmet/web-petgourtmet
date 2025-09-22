const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Datos del usuario de prueba
const testUser = {
  id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  email: 'cristoferscalante@gmail.com'
};

// External reference del usuario real (de la URL de MercadoPago)
const realExternalReference = '7aff2471329b4b66a6ba6ca91af7858b';

// Función para verificar registros existentes
async function verifyExistingRecords() {
  console.log('🔍 Verificando registros existentes en unified_subscriptions...');
  
  try {
    // Buscar todos los registros del usuario
    const { data: userRecords, error: userError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false });
    
    if (userError) {
      console.error('❌ Error al buscar registros del usuario:', userError);
      return { success: false, error: userError };
    }
    
    console.log(`📊 Registros encontrados para el usuario: ${userRecords.length}`);
    
    userRecords.forEach((record, index) => {
      console.log(`\n📝 Registro ${index + 1}:`);
      console.log('  - ID:', record.id);
      console.log('  - External Reference:', record.external_reference);
      console.log('  - Status:', record.status);
      console.log('  - Product:', record.product_name);
      console.log('  - Subscription Type:', record.subscription_type);
      console.log('  - Created At:', record.created_at);
      console.log('  - MercadoPago Subscription ID:', record.mercadopago_subscription_id);
    });
    
    // Buscar específicamente por el external_reference real
    const { data: realRefRecord, error: realRefError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', realExternalReference)
      .single();
    
    if (realRefError && realRefError.code !== 'PGRST116') {
      console.error('❌ Error al buscar por external_reference real:', realRefError);
    } else if (realRefRecord) {
      console.log('\n🎯 Registro encontrado con external_reference real:');
      console.log('  - ID:', realRefRecord.id);
      console.log('  - User ID:', realRefRecord.user_id);
      console.log('  - Status:', realRefRecord.status);
      console.log('  - Product:', realRefRecord.product_name);
    } else {
      console.log('\n⚠️  No se encontró registro con external_reference real:', realExternalReference);
    }
    
    return {
      success: true,
      userRecords,
      realRefRecord,
      totalRecords: userRecords.length
    };
    
  } catch (error) {
    console.error('💥 Error verificando registros:', error);
    return { success: false, error };
  }
}

// Función para simular la activación desde /suscripcion
async function simulateActivationFlow(externalRef) {
  console.log('\n🚀 Simulando flujo de activación desde /suscripcion...');
  console.log('External Reference a procesar:', externalRef);
  
  try {
    // Paso 1: Buscar suscripciones activas del usuario (como en el código real)
    console.log('\n🔍 Paso 1: Buscando suscripciones activas...');
    const { data: activeSubscriptions, error: activeError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('status', 'active');
    
    if (activeError) {
      console.error('❌ Error buscando suscripciones activas:', activeError);
      throw activeError;
    }
    
    console.log(`📊 Suscripciones activas encontradas: ${activeSubscriptions.length}`);
    
    // Paso 2: Buscar suscripciones pendientes (como en el código real)
    console.log('\n🔍 Paso 2: Buscando suscripciones pendientes...');
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', testUser.id)
      .in('status', ['pending', 'authorized'])
      .or(`external_reference.eq.${externalRef},mercadopago_subscription_id.eq.${externalRef}`);
    
    if (pendingError) {
      console.error('❌ Error buscando suscripciones pendientes:', pendingError);
      throw pendingError;
    }
    
    console.log(`📊 Suscripciones pendientes encontradas: ${pendingSubscriptions.length}`);
    
    if (pendingSubscriptions.length === 0) {
      console.log('⚠️  No se encontraron suscripciones pendientes para activar');
      return { success: false, message: 'No pending subscriptions found' };
    }
    
    // Paso 3: Eliminar duplicados (como en el código real)
    console.log('\n🧹 Paso 3: Eliminando duplicados...');
    const uniqueSubscriptions = [];
    const seenExternalRefs = new Set();
    
    for (const sub of pendingSubscriptions) {
      if (!seenExternalRefs.has(sub.external_reference)) {
        seenExternalRefs.add(sub.external_reference);
        uniqueSubscriptions.push(sub);
      } else {
        console.log(`🗑️  Eliminando duplicado: ${sub.id} (external_reference: ${sub.external_reference})`);
        const { error: deleteError } = await supabase
          .from('unified_subscriptions')
          .delete()
          .eq('id', sub.id);
        
        if (deleteError) {
          console.error('❌ Error eliminando duplicado:', deleteError);
        }
      }
    }
    
    console.log(`✅ Suscripciones únicas después de limpieza: ${uniqueSubscriptions.length}`);
    
    // Paso 4: Activar la suscripción (como en el código real)
    const subscriptionToActivate = uniqueSubscriptions[0];
    console.log('\n⚡ Paso 4: Activando suscripción...');
    console.log('Suscripción a activar:', subscriptionToActivate.id);
    
    const activationData = {
      status: 'active',
      mercadopago_subscription_id: `MP-SUB-${Date.now()}`, // Simular ID de MercadoPago
      last_sync_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      charges_made: 1,
      last_billing_date: new Date().toISOString(),
      metadata: {
        ...subscriptionToActivate.metadata,
        activated_at: new Date().toISOString(),
        activation_source: 'url_callback',
        mercadopago_payment_id: '126859045826',
        collection_id: '126859045826'
      }
    };
    
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(activationData)
      .eq('id', subscriptionToActivate.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError);
      throw updateError;
    }
    
    console.log('✅ Suscripción activada exitosamente:');
    console.log('  - ID:', updatedSubscription.id);
    console.log('  - Status:', updatedSubscription.status);
    console.log('  - MercadoPago ID:', updatedSubscription.mercadopago_subscription_id);
    
    // Paso 5: Actualizar perfil del usuario (como en el código real)
    console.log('\n👤 Paso 5: Actualizando perfil del usuario...');
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({ has_active_subscription: true })
      .eq('id', testUser.id)
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Error actualizando perfil:', profileError);
    } else {
      console.log('✅ Perfil actualizado:');
      console.log('  - has_active_subscription:', updatedProfile.has_active_subscription);
    }
    
    return {
      success: true,
      activatedSubscription: updatedSubscription,
      updatedProfile,
      duplicatesRemoved: pendingSubscriptions.length - uniqueSubscriptions.length
    };
    
  } catch (error) {
    console.error('💥 Error en flujo de activación:', error);
    return { success: false, error };
  }
}

// Función principal
async function main() {
  console.log('🎯 Iniciando verificación y activación de suscripción...');
  console.log('Usuario:', testUser.email);
  console.log('External Reference objetivo:', realExternalReference);
  
  // Paso 1: Verificar registros existentes
  const verificationResult = await verifyExistingRecords();
  
  if (!verificationResult.success) {
    console.error('❌ Falló la verificación de registros');
    return;
  }
  
  // Paso 2: Crear un registro con el external_reference real si no existe
  if (!verificationResult.realRefRecord) {
    console.log('\n📝 Creando registro con external_reference real...');
    
    const realSubscriptionData = {
      user_id: testUser.id,
      product_id: 'real-product-1',
      product_name: 'Alimento Premium Real',
      product_image: 'https://petgourmet.mx/product.jpg',
      subscription_type: 'monthly',
      status: 'pending',
      external_reference: realExternalReference,
      base_price: 600,
      discounted_price: 570,
      discount_percentage: 5,
      transaction_amount: 570,
      size: 'Standard',
      quantity: 1,
      frequency: 1,
      frequency_type: 'months',
      currency_id: 'MXN',
      start_date: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      back_url: 'https://petgourmet.mx/suscripcion',
      reason: 'Suscripción monthly - Alimento Premium Real (Standard)',
      version: 1,
      collector_id: null,
      charges_made: 0,
      processed_at: new Date().toISOString(),
      notes: 'Suscripción creada para prueba de activación',
      metadata: {
        subscription_type: 'monthly',
        created_from: 'activation_test',
        timestamp: new Date().toISOString()
      }
    };
    
    const { data: createdRecord, error: createError } = await supabase
      .from('unified_subscriptions')
      .insert(realSubscriptionData)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creando registro real:', createError);
    } else {
      console.log('✅ Registro con external_reference real creado:', createdRecord.id);
    }
  }
  
  // Paso 3: Simular activación
  const activationResult = await simulateActivationFlow(realExternalReference);
  
  // Paso 4: Verificación final
  console.log('\n🏁 Verificación final...');
  const finalVerification = await verifyExistingRecords();
  
  console.log('\n📊 Resumen final:');
  console.log('- Registros totales del usuario:', finalVerification.totalRecords);
  console.log('- Activación exitosa:', activationResult.success);
  if (activationResult.duplicatesRemoved > 0) {
    console.log('- Duplicados eliminados:', activationResult.duplicatesRemoved);
  }
  
  return {
    verification: verificationResult,
    activation: activationResult,
    finalState: finalVerification
  };
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n🎉 Proceso completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { verifyExistingRecords, simulateActivationFlow, main };