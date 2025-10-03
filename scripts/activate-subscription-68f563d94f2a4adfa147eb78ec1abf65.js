/**
 * Script para activar manualmente la suscripción con external_reference: 68f563d94f2a4adfa147eb78ec1abf65
 * Collection ID: 127917919415
 * Status: approved
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function activateSubscription() {
  const externalRef = '68f563d94f2a4adfa147eb78ec1abf65';
  const collectionId = '127917919415';
  
  console.log('🔍 === ACTIVACIÓN MANUAL DE SUSCRIPCIÓN ===');
  console.log(`📋 External Reference: ${externalRef}`);
  console.log(`📋 Collection ID: ${collectionId}`);
  console.log('=' .repeat(60));
  
  try {
    // 1. Buscar suscripción por external_reference
    console.log('\n🔍 1. BUSCANDO SUSCRIPCIÓN...');
    let { data: subscription, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalRef)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error buscando suscripción:', error);
      return;
    }
    
    if (!subscription) {
      console.log('❌ No se encontró suscripción con external_reference:', externalRef);
      
      // Buscar en metadata
      console.log('🔍 Buscando en metadata...');
      const { data: metadataResults } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .contains('metadata', { mercadopago_external_reference: externalRef });
      
      if (metadataResults && metadataResults.length > 0) {
        subscription = metadataResults[0];
        console.log('✅ Suscripción encontrada en metadata');
      } else {
        console.log('❌ No se encontró suscripción en metadata tampoco');
        
        // Buscar suscripciones pendientes recientes
        console.log('🔍 Buscando suscripciones pendientes recientes...');
        const { data: pendingResults } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (pendingResults && pendingResults.length > 0) {
          console.log(`📋 Suscripciones pendientes encontradas: ${pendingResults.length}`);
          pendingResults.forEach((sub, index) => {
            console.log(`   ${index + 1}. ID: ${sub.id} | External Ref: ${sub.external_reference} | Created: ${new Date(sub.created_at).toLocaleString()}`);
          });
        }
        
        return;
      }
    } else {
      console.log('✅ Suscripción encontrada por external_reference');
    }
    
    console.log('\n📋 INFORMACIÓN DE LA SUSCRIPCIÓN:');
    console.log(`   ID: ${subscription.id}`);
    console.log(`   User ID: ${subscription.user_id}`);
    console.log(`   Product ID: ${subscription.product_id}`);
    console.log(`   Estado actual: ${subscription.status}`);
    console.log(`   External Reference: ${subscription.external_reference}`);
    console.log(`   MercadoPago ID: ${subscription.mercadopago_subscription_id || 'N/A'}`);
    console.log(`   Creado: ${new Date(subscription.created_at).toLocaleString()}`);
    
    if (subscription.status === 'active') {
      console.log('\n✅ La suscripción ya está activa');
      return;
    }
    
    // 2. Activar la suscripción
    console.log('\n🚀 2. ACTIVANDO SUSCRIPCIÓN...');
    
    const updateData = {
      status: 'active',
      mercadopago_subscription_id: collectionId,
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      notes: `Activada manualmente después de pago exitoso - collection_id: ${collectionId} - ${new Date().toISOString()}`
    };
    
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscription.id);
    
    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError);
    } else {
      console.log('\n🎉 ¡SUSCRIPCIÓN ACTIVADA EXITOSAMENTE!');
      console.log(`✅ ID de suscripción: ${subscription.id}`);
      console.log(`✅ Collection ID: ${collectionId}`);
      console.log(`✅ Estado: pending → active`);
      
      // 3. Verificar la activación
      console.log('\n🔍 3. VERIFICANDO ACTIVACIÓN...');
      const { data: verifyData } = await supabase
        .from('unified_subscriptions')
        .select('status, mercadopago_subscription_id, updated_at')
        .eq('id', subscription.id)
        .single();
      
      if (verifyData) {
        console.log('✅ Verificación exitosa:');
        console.log(`   Estado: ${verifyData.status}`);
        console.log(`   MercadoPago ID: ${verifyData.mercadopago_subscription_id}`);
        console.log(`   Actualizado: ${new Date(verifyData.updated_at).toLocaleString()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
activateSubscription()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });