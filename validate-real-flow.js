const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Datos del usuario real
const realUser = {
  id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  email: 'cristoferscalante@gmail.com',
  full_name: 'Cristofer Escalante',
  first_name: 'Cristofer',
  last_name: 'Escalante'
};

// External reference real del usuario
const realExternalReference = '7aff2471329b4b66a6ba6ca91af7858b';

// URL de retorno real de MercadoPago
const realReturnUrl = 'https://www.mercadopago.com.mx/subscriptions/checkout/congrats?collection_id=126859045826&collection_status=approved&preference_id=1227980651-072dee86-8107-4b12-8a23-3b4f2bb419b3&payment_type=credit_card&payment_id=126859045826&external_reference=7aff2471329b4b66a6ba6ca91af7858b&site_id=MLM&status=approved&';

/**
 * Simula la lógica exacta de app/suscripcion/page.tsx
 */
async function simulateRealSubscriptionPageLogic(externalReference) {
  try {
    console.log('🔍 Procesando external_reference:', externalReference);

    // Paso 1: Buscar suscripciones activas existentes
    console.log('\n🔍 Buscando suscripciones activas existentes...');
    const { data: activeSubscriptions, error: activeError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', realUser.id)
      .eq('status', 'active');

    if (activeError) {
      throw activeError;
    }

    console.log('📊 Suscripciones activas encontradas:', activeSubscriptions?.length || 0);
    if (activeSubscriptions && activeSubscriptions.length > 0) {
      activeSubscriptions.forEach((sub, index) => {
        console.log(`  ${index + 1}. ID: ${sub.id}, External Ref: ${sub.external_reference}`);
      });
    }

    // Paso 2: Buscar suscripciones pendientes para activar
    console.log('\n🔍 Buscando suscripciones pendientes para activar...');
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', realUser.id)
      .eq('external_reference', externalReference)
      .eq('status', 'pending');

    if (pendingError) {
      throw pendingError;
    }

    console.log('📊 Suscripciones pendientes encontradas:', pendingSubscriptions?.length || 0);
    
    if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
      console.log('⚠️  No se encontraron suscripciones pendientes para activar');
      console.log('🔍 Verificando si ya existe una suscripción activa con este external_reference...');
      
      const { data: existingActive, error: existingError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', realUser.id)
        .eq('external_reference', externalReference)
        .eq('status', 'active');

      if (existingError) {
        throw existingError;
      }

      if (existingActive && existingActive.length > 0) {
        console.log('✅ Ya existe una suscripción activa con este external_reference:');
        console.log('  - ID:', existingActive[0].id);
        console.log('  - Status:', existingActive[0].status);
        console.log('  - MercadoPago ID:', existingActive[0].mercadopago_subscription_id);
        return {
          success: true,
          message: 'Suscripción ya activa',
          subscription: existingActive[0],
          duplicatesRemoved: 0
        };
      } else {
        console.log('❌ No se encontró ninguna suscripción (activa o pendiente) con este external_reference');
        return {
          success: false,
          message: 'No se encontró suscripción para activar',
          duplicatesRemoved: 0
        };
      }
    }

    // Paso 3: Eliminar duplicados (mantener solo el más reciente)
    console.log('\n🧹 Eliminando duplicados...');
    const sortedPending = pendingSubscriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const subscriptionToActivate = sortedPending[0];
    const duplicatesToRemove = sortedPending.slice(1);

    console.log('✅ Manteniendo:', subscriptionToActivate.id, `(external_reference: ${subscriptionToActivate.external_reference})`);
    
    let duplicatesRemoved = 0;
    if (duplicatesToRemove.length > 0) {
      console.log('🗑️  Eliminando duplicados:', duplicatesToRemove.map(d => d.id).join(', '));
      
      for (const duplicate of duplicatesToRemove) {
        const { error: deleteError } = await supabaseAdmin
          .from('unified_subscriptions')
          .delete()
          .eq('id', duplicate.id);
        
        if (deleteError) {
          console.error('❌ Error eliminando duplicado:', deleteError);
        } else {
          duplicatesRemoved++;
        }
      }
    }

    console.log('✅ Suscripciones únicas después de limpieza:', 1);
    console.log('🗑️  Duplicados eliminados:', duplicatesRemoved);

    // Paso 4: Activar la suscripción
    console.log('\n⚡ Activando suscripción...');
    
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
        real_flow_validation: true
      }
    };

    console.log('Suscripción a activar:', subscriptionToActivate.id);
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

    return {
      success: true,
      activatedSubscription: finalSubscription,
      duplicatesRemoved
    };

  } catch (error) {
    console.error('💥 Error en lógica de página de suscripción:', error);
    throw error;
  }
}

/**
 * Función principal para validar el flujo real
 */
async function validateRealFlow() {
  console.log('🚀 VALIDANDO FLUJO REAL DE SUSCRIPCIÓN');
  console.log('=' .repeat(60));
  console.log('👤 Usuario:', realUser.full_name, `(${realUser.email})`);
  console.log('🔗 External Reference:', realExternalReference);
  console.log('🌐 URL de retorno:', realReturnUrl);
  console.log('=' .repeat(60));

  let result;
  
  try {
    // Simular el procesamiento de la página de suscripción
    console.log('\n📄 Simulando lógica de /suscripcion page...');
    result = await simulateRealSubscriptionPageLogic(realExternalReference);
    
    if (result.success) {
      console.log('✅ Activación exitosa');
    } else {
      console.log('❌ Falló la activación');
    }
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
    result = { success: false, error: error.message };
  }

  // Verificación final del estado
  console.log('\n🏁 Verificación final del estado...');
  
  try {
    const { data: allSubscriptions, error: allError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', realUser.id);

    if (allError) {
      console.error('❌ Error verificando suscripciones:', allError);
    } else {
      console.log('📊 Total de suscripciones del usuario:', allSubscriptions?.length || 0);
      
      // Agrupar por estado
      const statusCounts = {};
      allSubscriptions?.forEach(sub => {
        statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
      });
      
      console.log('📈 Distribución por estado:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
      
      // Buscar la suscripción específica
      const targetSubscription = allSubscriptions?.find(sub => 
        sub.external_reference === realExternalReference
      );
      
      if (targetSubscription) {
        console.log('\n🎯 Suscripción objetivo encontrada:');
        console.log('  - ID:', targetSubscription.id);
        console.log('  - External Reference:', targetSubscription.external_reference);
        console.log('  - Status:', targetSubscription.status);
        console.log('  - Product:', targetSubscription.product_name || 'N/A');
        console.log('  - MercadoPago ID:', targetSubscription.mercadopago_subscription_id || 'N/A');
        console.log('  - Charges Made:', targetSubscription.charges_made || 0);
      } else {
        console.log('\n❌ No se encontró la suscripción objetivo');
      }
    }
  } catch (error) {
    console.error('❌ Error en verificación final:', error);
  }

  // Mostrar resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN FINAL DE VALIDACIÓN');
  console.log('='.repeat(60));
  
  if (result && result.success) {
    console.log('✅ Validación: Exitosa');
    console.log('✅ Suscripción activada: SÍ');
    console.log('📈 Duplicados eliminados:', result.duplicatesRemoved || 0);
  } else {
    console.log('❌ Validación: Fallida');
    console.log('❌ Suscripción activada: NO');
    if (result && result.error) {
      console.log('💥 Error:', result.error);
    }
  }
  
  console.log('\n🎉 VALIDACIÓN COMPLETADA');
  
  return result;
}

// Ejecutar la validación
validateRealFlow()
  .then(result => {
    if (result && result.success) {
      console.log('\n🏆 Proceso completado exitosamente');
      process.exit(0);
    } else {
      console.log('\n💥 Proceso completado con errores');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Error fatal en validación:', error);
    process.exit(1);
  });