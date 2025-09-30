const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = 'https://kwhubfkvpvrlawpylopc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI';
const WEBHOOK_EXTERNAL_REFERENCE = '2c938084726fca8a01726fd4f4b80331';
const PENDING_SUBSCRIPTION_ID = 117;

console.log('🚀 Activando suscripción pendiente ID 117...\n');

async function activateSubscription() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Verificar la suscripción actual
    console.log('🔍 Verificando suscripción actual...');
    const { data: currentSub, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .single();

    if (fetchError) {
      console.error('❌ Error al buscar suscripción:', fetchError);
      return;
    }

    if (!currentSub) {
      console.error('❌ No se encontró la suscripción ID 117');
      return;
    }

    console.log('✅ Suscripción encontrada:');
    console.log(`   - ID: ${currentSub.id}`);
    console.log(`   - Status actual: ${currentSub.status}`);
    console.log(`   - External Reference actual: ${currentSub.external_reference}`);
    console.log(`   - User ID: ${currentSub.user_id}`);
    console.log(`   - Product ID: ${currentSub.product_id}`);
    console.log(`   - Price: ${currentSub.price || currentSub.transaction_amount}`);

    if (currentSub.status === 'active') {
      console.log('⚠️  La suscripción ya está activa');
      return;
    }

    // 2. Verificar duplicados activos
    console.log('\n🔍 Verificando duplicados activos...');
    const { data: activeSubs, error: duplicateError } = await supabase
      .from('unified_subscriptions')
      .select('id, external_reference, status')
      .eq('user_id', currentSub.user_id)
      .eq('product_id', currentSub.product_id)
      .eq('status', 'active');

    if (duplicateError) {
      console.error('❌ Error al verificar duplicados:', duplicateError);
      return;
    }

    if (activeSubs && activeSubs.length > 0) {
      console.log('⚠️  Se encontraron suscripciones activas duplicadas:');
      activeSubs.forEach(sub => {
        console.log(`   - ID: ${sub.id}, External Ref: ${sub.external_reference}`);
      });
      console.log('❌ No se puede activar hasta resolver duplicados');
      return;
    }

    console.log('✅ No se encontraron duplicados activos');

    // 3. Usar el external_reference existente (ya tiene formato correcto)
    console.log(`\n🔧 Manteniendo external_reference existente (ya tiene formato correcto):`);
    console.log(`   - External reference actual: ${currentSub.external_reference}`);

    // 4. Preparar metadata con trazabilidad
    const currentMetadata = currentSub.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      mercadopago_external_reference: WEBHOOK_EXTERNAL_REFERENCE,
      sync_correction_date: new Date().toISOString(),
      sync_correction_reason: 'Manual activation due to external_reference mismatch',
      webhook_external_reference: WEBHOOK_EXTERNAL_REFERENCE,
      activation_method: 'script_correction'
    };

    // 5. Activar la suscripción manteniendo el external_reference original
    console.log('\n🚀 Activando suscripción...');
    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
        metadata: updatedMetadata,
        processed_at: new Date().toISOString(),
        last_billing_date: new Date().toISOString()
      })
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error al activar suscripción:', updateError);
      return;
    }

    console.log('✅ Suscripción activada exitosamente:');
    console.log(`   - Nuevo Status: ${updatedSub.status}`);
    console.log(`   - External Reference: ${updatedSub.external_reference}`);
    console.log(`   - Fecha de activación: ${updatedSub.updated_at}`);
    console.log(`   - Procesada en: ${updatedSub.processed_at}`);

    // 6. Crear registro de facturación
    console.log('\n💰 Creando registro de facturación...');
    const { data: billingRecord, error: billingError } = await supabase
      .from('billing_history')
      .insert({
        subscription_id: PENDING_SUBSCRIPTION_ID,
        user_id: currentSub.user_id,
        amount: currentSub.transaction_amount || currentSub.price || 138.25,
        currency: 'ARS',
        status: 'paid',
        billing_date: new Date().toISOString(),
        payment_method: 'mercadopago',
        external_reference: currentSub.external_reference,
        metadata: {
          activation_type: 'manual_correction',
          correction_date: new Date().toISOString(),
          webhook_reference: WEBHOOK_EXTERNAL_REFERENCE,
          mercadopago_reference: WEBHOOK_EXTERNAL_REFERENCE
        }
      })
      .select()
      .single();

    if (billingError) {
      console.error('⚠️  Error al crear registro de facturación:', billingError);
      console.log('   Continuando sin registro de facturación...');
    } else {
      console.log('✅ Registro de facturación creado:', billingRecord.id);
    }

    // 7. Verificación final
    console.log('\n🔍 Verificación final...');
    const { data: finalCheck, error: checkError } = await supabase
      .from('unified_subscriptions')
      .select('id, status, external_reference, updated_at, user_id, product_id')
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .single();

    if (checkError) {
      console.error('❌ Error en verificación final:', checkError);
      return;
    }

    console.log('✅ Verificación exitosa:');
    console.log(`   - ID: ${finalCheck.id}`);
    console.log(`   - Status: ${finalCheck.status}`);
    console.log(`   - External Reference: ${finalCheck.external_reference}`);
    console.log(`   - User ID: ${finalCheck.user_id}`);
    console.log(`   - Product ID: ${finalCheck.product_id}`);
    console.log(`   - Última actualización: ${finalCheck.updated_at}`);

    console.log('\n🎉 ¡Activación completada exitosamente!');
    console.log('\n📋 Resumen de cambios:');
    console.log(`   - Suscripción ID ${PENDING_SUBSCRIPTION_ID} activada`);
    console.log(`   - External reference mantenido: ${finalCheck.external_reference}`);
    console.log(`   - Referencia de MercadoPago guardada en metadata: ${WEBHOOK_EXTERNAL_REFERENCE}`);
    console.log(`   - Metadata de trazabilidad agregada`);
    console.log(`   - Status cambiado de "${currentSub.status}" a "active"`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar el script
activateSubscription();