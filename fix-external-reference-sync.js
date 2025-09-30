const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixqjqvqvqvqvqvqvqvqv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxdnF2cXZxdnF2cXZxdnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNzE0NzIwMCwiZXhwIjoyMDIyNzIzMjAwfQ.example';
const WEBHOOK_EXTERNAL_REFERENCE = '2c938084726fca8a01726fd4f4b80331';
const PENDING_SUBSCRIPTION_ID = 117;

console.log('🔧 Configuración:');
console.log(`   - Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
console.log(`   - Service Key: ${SUPABASE_SERVICE_KEY ? 'Configurado' : 'No configurado'}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables de entorno faltantes');
  console.log('💡 Asegúrate de tener configuradas:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixExternalReferenceSync() {
  console.log('🔧 Iniciando corrección de sincronización external_reference...\n');

  try {
    // 1. Buscar la suscripción pendiente
    console.log(`📋 Buscando suscripción pendiente ID: ${PENDING_SUBSCRIPTION_ID}`);
    const { data: pendingSubscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .single();

    if (fetchError) {
      console.error('❌ Error al buscar suscripción:', fetchError);
      return;
    }

    if (!pendingSubscription) {
      console.error('❌ No se encontró la suscripción pendiente');
      return;
    }

    console.log('✅ Suscripción encontrada:');
    console.log(`   - ID: ${pendingSubscription.id}`);
    console.log(`   - Status: ${pendingSubscription.status}`);
    console.log(`   - External Reference: ${pendingSubscription.external_reference}`);
    console.log(`   - User ID: ${pendingSubscription.user_id}`);
    console.log(`   - Product ID: ${pendingSubscription.product_id}`);

    // 2. Verificar si ya está activa
    if (pendingSubscription.status === 'active') {
      console.log('⚠️  La suscripción ya está activa');
      return;
    }

    // 3. Verificar duplicados activos
    console.log('\n🔍 Verificando duplicados activos...');
    const { data: activeSubs, error: duplicateError } = await supabase
      .from('unified_subscriptions')
      .select('id, external_reference, status')
      .eq('user_id', pendingSubscription.user_id)
      .eq('product_id', pendingSubscription.product_id)
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

    // 4. Preparar metadata con trazabilidad
    const currentMetadata = pendingSubscription.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      original_external_reference: pendingSubscription.external_reference,
      mercadopago_external_reference: WEBHOOK_EXTERNAL_REFERENCE,
      sync_correction_date: new Date().toISOString(),
      sync_correction_reason: 'Manual activation due to external_reference mismatch',
      webhook_external_reference: WEBHOOK_EXTERNAL_REFERENCE
    };

    // 5. Calcular fechas de facturación
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // 6. Activar la suscripción
    console.log('\n🚀 Activando suscripción...');
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        external_reference: WEBHOOK_EXTERNAL_REFERENCE,
        updated_at: now.toISOString(),
        last_billing_date: now.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        metadata: updatedMetadata
      })
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error al activar suscripción:', updateError);
      return;
    }

    console.log('✅ Suscripción activada exitosamente:');
    console.log(`   - Nuevo Status: ${updatedSubscription.status}`);
    console.log(`   - Nuevo External Reference: ${updatedSubscription.external_reference}`);
    console.log(`   - Fecha de activación: ${updatedSubscription.updated_at}`);

    // 7. Crear registro de facturación
    console.log('\n💰 Creando registro de facturación...');
    const { data: billingRecord, error: billingError } = await supabase
      .from('billing_history')
      .insert({
        subscription_id: PENDING_SUBSCRIPTION_ID,
        user_id: pendingSubscription.user_id,
        amount: pendingSubscription.price || 0,
        currency: 'ARS',
        status: 'paid',
        billing_date: now.toISOString(),
        payment_method: 'mercadopago',
        external_reference: WEBHOOK_EXTERNAL_REFERENCE,
        metadata: {
          activation_type: 'manual_correction',
          original_external_reference: pendingSubscription.external_reference,
          correction_date: now.toISOString()
        }
      })
      .select()
      .single();

    if (billingError) {
      console.error('⚠️  Error al crear registro de facturación:', billingError);
    } else {
      console.log('✅ Registro de facturación creado:', billingRecord.id);
    }

    // 8. Verificación final
    console.log('\n🔍 Verificación final...');
    const { data: finalCheck, error: checkError } = await supabase
      .from('unified_subscriptions')
      .select('id, status, external_reference, updated_at')
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
    console.log(`   - Última actualización: ${finalCheck.updated_at}`);

    console.log('\n🎉 ¡Corrección completada exitosamente!');
    console.log('\n📋 Resumen de cambios:');
    console.log(`   - Suscripción ID ${PENDING_SUBSCRIPTION_ID} activada`);
    console.log(`   - External reference sincronizado: ${WEBHOOK_EXTERNAL_REFERENCE}`);
    console.log(`   - Registro de facturación creado`);
    console.log(`   - Metadata de trazabilidad agregada`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar el script
fixExternalReferenceSync();