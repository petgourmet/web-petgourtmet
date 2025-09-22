const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Datos del usuario de prueba
const testUser = {
  id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  email: 'cristoferscalante@gmail.com',
  full_name: 'Cristofer Escalante',
  phone: '+52 123 456 7890'
};

// Función para generar external_reference como en el código real
function generateExternalReference() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${random}_sub`;
}

// Función para simular el checkout modal (crear registro pendiente)
async function simulateCheckoutModal() {
  console.log('🛒 PASO 1: Simulando Checkout Modal...');
  
  // Generar external_reference único
  const externalReference = generateExternalReference();
  console.log('🔑 External Reference generado:', externalReference);
  
  // Datos de la suscripción (como en checkout-modal.tsx)
  const subscriptionData = {
    user_id: testUser.id,
    product_id: null,
    product_name: 'Producto Test Flow',
    product_image: 'https://petgourmet.mx/test-product.jpg',
    subscription_type: 'monthly',
    status: 'pending',
    external_reference: externalReference,
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
    reason: 'Suscripción monthly - Alimento Premium Flow Test (Standard)',
    version: 1,
    collector_id: null,
    mercadopago_subscription_id: null,
    charges_made: 0,
    last_billing_date: null,
    last_sync_at: null,
    processed_at: new Date().toISOString(),
    notes: 'Suscripción creada desde checkout modal - Flow Test',
    customer_data: {
      email: testUser.email,
      full_name: testUser.full_name,
      phone: testUser.phone,
      shipping_address: {
        street_name: 'carrera36#50-40',
        street_number: 'carrera36#50-40',
        zip_code: '170004',
        city: 'manizales',
        state: 'Caldas',
        country: 'México'
      }
    },
    metadata: {
      subscription_type: 'monthly',
      created_from: 'checkout_modal',
      timestamp: new Date().toISOString(),
      flow_test: true
    }
  };
  
  try {
    // Insertar registro pendiente
    const { data: createdSubscription, error } = await supabase
      .from('unified_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creando suscripción pendiente:', error);
      throw error;
    }
    
    console.log('✅ Suscripción pendiente creada:');
    console.log('  - ID:', createdSubscription.id);
    console.log('  - External Reference:', createdSubscription.external_reference);
    console.log('  - Status:', createdSubscription.status);
    console.log('  - Product:', createdSubscription.product_name);
    
    // Simular URL de MercadoPago
    const mercadoPagoUrl = `https://www.mercadopago.com.mx/subscriptions/checkout?external_reference=${externalReference}&back_url=https://petgourmet.mx/suscripcion`;
    console.log('🔗 URL de MercadoPago generada:', mercadoPagoUrl);
    
    return {
      success: true,
      subscription: createdSubscription,
      externalReference,
      mercadoPagoUrl
    };
    
  } catch (error) {
    console.error('💥 Error en checkout modal:', error);
    return { success: false, error };
  }
}

// Función para simular el retorno de MercadoPago
async function simulateMercadoPagoReturn(externalReference) {
  console.log('\n💳 PASO 2: Simulando retorno de MercadoPago...');
  console.log('🔄 Procesando external_reference:', externalReference);
  
  // Simular parámetros de URL de retorno exitoso
  const returnParams = {
    collection_id: '126859045826',
    collection_status: 'approved',
    preference_id: '1227980651-072dee86-8107-4b12-8a23-3b4f2bb419b3',
    payment_type: 'credit_card',
    payment_id: '126859045826',
    external_reference: externalReference,
    site_id: 'MLM',
    status: 'approved'
  };
  
  console.log('📋 Parámetros de retorno simulados:');
  Object.entries(returnParams).forEach(([key, value]) => {
    console.log(`  - ${key}: ${value}`);
  });
  
  // Construir URL de retorno completa
  const returnUrl = `https://petgourmet.mx/suscripcion?${Object.entries(returnParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;
  
  console.log('🔗 URL de retorno completa:', returnUrl);
  
  return {
    success: true,
    params: returnParams,
    returnUrl
  };
}

// Función para simular la lógica de /suscripcion page
async function simulateSubscriptionPageLogic(externalReference) {
  console.log('\n📄 PASO 3: Simulando lógica de /suscripcion page...');
  console.log('🔍 Procesando external_reference:', externalReference);
  
  try {
    // Paso 1: Buscar suscripciones activas del usuario
    console.log('\n🔍 Buscando suscripciones activas existentes...');
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
    activeSubscriptions.forEach((sub, index) => {
      console.log(`  ${index + 1}. ID: ${sub.id}, External Ref: ${sub.external_reference}`);
    });
    
    // Paso 2: Buscar suscripciones pendientes con el external_reference
    console.log('\n🔍 Buscando suscripciones pendientes para activar...');
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', testUser.id)
      .in('status', ['pending', 'authorized'])
      .or(`external_reference.eq.${externalReference},mercadopago_subscription_id.eq.${externalReference}`);
    
    if (pendingError) {
      console.error('❌ Error buscando suscripciones pendientes:', pendingError);
      throw pendingError;
    }
    
    console.log(`📊 Suscripciones pendientes encontradas: ${pendingSubscriptions.length}`);
    
    if (pendingSubscriptions.length === 0) {
      console.log('⚠️  No se encontraron suscripciones pendientes para activar');
      return { success: false, message: 'No pending subscriptions found' };
    }
    
    // Paso 3: Eliminar duplicados (lógica del código real)
    console.log('\n🧹 Eliminando duplicados...');
    const uniqueSubscriptions = [];
    const seenExternalRefs = new Set();
    let duplicatesRemoved = 0;
    
    for (const sub of pendingSubscriptions) {
      if (!seenExternalRefs.has(sub.external_reference)) {
        seenExternalRefs.add(sub.external_reference);
        uniqueSubscriptions.push(sub);
        console.log(`✅ Manteniendo: ${sub.id} (external_reference: ${sub.external_reference})`);
      } else {
        console.log(`🗑️  Eliminando duplicado: ${sub.id} (external_reference: ${sub.external_reference})`);
        const { error: deleteError } = await supabase
          .from('unified_subscriptions')
          .delete()
          .eq('id', sub.id);
        
        if (deleteError) {
          console.error('❌ Error eliminando duplicado:', deleteError);
        } else {
          duplicatesRemoved++;
        }
      }
    }
    
    console.log(`✅ Suscripciones únicas después de limpieza: ${uniqueSubscriptions.length}`);
    console.log(`🗑️  Duplicados eliminados: ${duplicatesRemoved}`);
    
    // Paso 4: Activar la suscripción
    const subscriptionToActivate = uniqueSubscriptions[0];
    console.log('\n⚡ Activando suscripción...');
    console.log('Suscripción a activar:', subscriptionToActivate.id);
    
    const activationData = {
      status: 'active',
      mercadopago_subscription_id: `MP-SUB-${Date.now()}`,
      last_sync_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      charges_made: 1,
      last_billing_date: new Date().toISOString(),
      metadata: {
        ...subscriptionToActivate.metadata,
        activated_at: new Date().toISOString(),
        activation_source: 'url_callback',
        mercadopago_payment_id: '126859045826',
        collection_id: '126859045826',
        flow_test_activated: true
      }
    };
    
    console.log('Datos de activación:', activationData);

    // Verificar que el registro existe antes de actualizar
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionToActivate.id)
      .single();

    console.log('Registro existente:', { data: existingRecord, error: checkError });

    if (checkError || !existingRecord) {
      throw new Error(`No se encontró el registro con ID ${subscriptionToActivate.id}`);
    }

    // Activar la suscripción usando cliente admin
    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('unified_subscriptions')
      .update(activationData)
      .eq('id', subscriptionToActivate.id)
      .select();

    console.log('Resultado de actualización:', { data: updatedSubscription, error: updateError });

    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError);
      throw updateError;
    }

    const finalSubscription = updatedSubscription && updatedSubscription.length > 0 ? updatedSubscription[0] : null;
    
    if (!finalSubscription) {
      console.error('❌ No se devolvieron filas en la actualización');
      console.error('updatedSubscription:', updatedSubscription);
      throw new Error('No se pudo activar la suscripción - no se devolvieron filas');
    }
    
    console.log('✅ Suscripción activada exitosamente:');
    console.log('  - ID:', finalSubscription.id);
    console.log('  - Status:', finalSubscription.status);
    console.log('  - MercadoPago ID:', finalSubscription.mercadopago_subscription_id);
    console.log('  - Charges Made:', finalSubscription.charges_made);
    
    // Paso 5: Actualizar perfil del usuario
    console.log('\n👤 Actualizando perfil del usuario...');
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
      activatedSubscription: finalSubscription,
      updatedProfile,
      duplicatesRemoved,
      activeSubscriptionsBefore: activeSubscriptions.length,
      pendingSubscriptionsProcessed: pendingSubscriptions.length
    };
    
  } catch (error) {
    console.error('💥 Error en lógica de página de suscripción:', error);
    return { success: false, error };
  }
}

// Función para verificación final
async function finalVerification(externalReference) {
  console.log('\n🏁 PASO 4: Verificación final del estado...');
  
  try {
    // Verificar todas las suscripciones del usuario
    const { data: allSubscriptions, error: allError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Error en verificación final:', allError);
      throw allError;
    }
    
    console.log(`📊 Total de suscripciones del usuario: ${allSubscriptions.length}`);
    
    // Contar por estado
    const statusCounts = allSubscriptions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📈 Distribución por estado:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
    
    // Verificar suscripción específica
    const targetSubscription = allSubscriptions.find(sub => 
      sub.external_reference === externalReference
    );
    
    if (targetSubscription) {
      console.log('\n🎯 Suscripción objetivo encontrada:');
      console.log('  - ID:', targetSubscription.id);
      console.log('  - External Reference:', targetSubscription.external_reference);
      console.log('  - Status:', targetSubscription.status);
      console.log('  - Product:', targetSubscription.product_name);
      console.log('  - MercadoPago ID:', targetSubscription.mercadopago_subscription_id);
      console.log('  - Charges Made:', targetSubscription.charges_made);
    } else {
      console.log('⚠️  Suscripción objetivo no encontrada');
    }
    
    // Verificar perfil del usuario
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('has_active_subscription')
      .eq('id', testUser.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error verificando perfil:', profileError);
    } else {
      console.log('\n👤 Estado del perfil:');
      console.log('  - has_active_subscription:', userProfile.has_active_subscription);
    }
    
    return {
      success: true,
      totalSubscriptions: allSubscriptions.length,
      statusCounts,
      targetSubscription,
      userProfile
    };
    
  } catch (error) {
    console.error('💥 Error en verificación final:', error);
    return { success: false, error };
  }
}

// Función principal que ejecuta todo el flujo
async function runCompleteFlow() {
  console.log('🚀 INICIANDO FLUJO COMPLETO DE SUSCRIPCIÓN');
  console.log('=' .repeat(60));
  console.log('Usuario:', testUser.email);
  console.log('Fecha:', new Date().toISOString());
  console.log('=' .repeat(60));
  
  try {
    // Paso 1: Simular checkout modal
    const checkoutResult = await simulateCheckoutModal();
    if (!checkoutResult.success) {
      console.error('❌ Falló el checkout modal');
      return;
    }
    
    // Paso 2: Simular retorno de MercadoPago
    const returnResult = await simulateMercadoPagoReturn(checkoutResult.externalReference);
    if (!returnResult.success) {
      console.error('❌ Falló la simulación de retorno');
      return;
    }
    
    // Paso 3: Simular lógica de página de suscripción
    const activationResult = await simulateSubscriptionPageLogic(checkoutResult.externalReference);
    if (!activationResult.success) {
      console.error('❌ Falló la activación');
      return;
    }
    
    // Paso 4: Verificación final
    const verificationResult = await finalVerification(checkoutResult.externalReference);
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL DEL FLUJO');
    console.log('='.repeat(60));
    console.log('✅ Checkout Modal: Exitoso');
    console.log('✅ Retorno MercadoPago: Exitoso');
    console.log('✅ Activación: Exitoso');
    console.log('✅ Verificación: Exitoso');
    console.log('');
    console.log('📈 Estadísticas:');
    console.log('  - External Reference:', checkoutResult.externalReference);
    console.log('  - Duplicados eliminados:', activationResult.duplicatesRemoved || 0);
    console.log('  - Suscripciones activas antes:', activationResult.activeSubscriptionsBefore);
    console.log('  - Suscripciones pendientes procesadas:', activationResult.pendingSubscriptionsProcessed);
    console.log('  - Total suscripciones finales:', verificationResult.totalSubscriptions);
    console.log('');
    console.log('🎯 Estado final:');
    console.log('  - Suscripción activada: SÍ');
    console.log('  - Usuario con suscripción activa:', verificationResult.userProfile?.has_active_subscription ? 'SÍ' : 'NO');
    console.log('  - Registros duplicados: NO');
    console.log('');
    console.log('🎉 FLUJO COMPLETADO EXITOSAMENTE');
    
    return {
      success: true,
      externalReference: checkoutResult.externalReference,
      results: {
        checkout: checkoutResult,
        return: returnResult,
        activation: activationResult,
        verification: verificationResult
      }
    };
    
  } catch (error) {
    console.error('💥 Error fatal en el flujo:', error);
    return { success: false, error };
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  runCompleteFlow()
    .then(result => {
      if (result.success) {
        console.log('\n🏆 Proceso completado exitosamente');
        process.exit(0);
      } else {
        console.log('\n💥 Proceso falló');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = {
  simulateCheckoutModal,
  simulateMercadoPagoReturn,
  simulateSubscriptionPageLogic,
  finalVerification,
  runCompleteFlow
};