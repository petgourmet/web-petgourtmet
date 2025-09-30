/**
 * Script para procesar webhooks pendientes de suscripciones
 * Procesa webhooks que no han sido procesados y actualiza el estado de las suscripciones
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
function loadEnvironmentVariables() {
  const envFiles = ['.env.local', '.env.production', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      console.log(`📁 Cargando variables de entorno desde: ${envFile}`);
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (value) {
            process.env[key.trim()] = value;
          }
        }
      });
      break;
    }
  }
}

// Inicializar Supabase
function initializeSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables de entorno de Supabase no encontradas');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Obtener webhooks pendientes
async function getPendingWebhooks(supabase) {
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('webhook_type', 'subscription')
    .eq('status', 'received')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Error obteniendo webhooks pendientes: ${error.message}`);
  }

  return data || [];
}

// Procesar webhook de suscripción
async function processSubscriptionWebhook(supabase, webhook) {
  try {
    console.log(`🔄 Procesando webhook ${webhook.id}...`);
    
    const webhookData = webhook.payload;
    if (!webhookData || !webhookData.external_reference) {
      console.log(`⚠️  Webhook ${webhook.id} no tiene external_reference válido`);
      return false;
    }

    const { external_reference, status, id: mp_subscription_id } = webhookData;
    
    // Buscar suscripción existente
    const { data: existingSubscription, error: searchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', external_reference)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.log(`❌ Error buscando suscripción: ${searchError.message}`);
      return false;
    }

    if (!existingSubscription) {
      console.log(`⚠️  No se encontró suscripción con external_reference: ${external_reference}`);
      return false;
    }

    // Actualizar estado de la suscripción según el webhook
    let newStatus = existingSubscription.status;
    let shouldCreateBilling = false;

    switch (status) {
      case 'authorized':
        newStatus = 'active';
        shouldCreateBilling = true;
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        break;
      case 'paused':
        newStatus = 'paused';
        break;
      case 'pending':
        newStatus = 'pending';
        break;
      default:
        console.log(`⚠️  Estado de webhook no reconocido: ${status}`);
        return false;
    }

    // Actualizar suscripción
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: newStatus,
        mp_subscription_id: mp_subscription_id || existingSubscription.mp_subscription_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id);

    if (updateError) {
      console.log(`❌ Error actualizando suscripción: ${updateError.message}`);
      return false;
    }

    // Crear registro de facturación si es necesario
    if (shouldCreateBilling && newStatus === 'active') {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const { error: billingError } = await supabase
        .from('billing_history')
        .insert({
          subscription_id: existingSubscription.id,
          user_id: existingSubscription.user_id,
          amount: existingSubscription.price,
          status: 'paid',
          billing_date: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          payment_method: 'mercadopago',
          external_reference: external_reference,
          created_at: new Date().toISOString()
        });

      if (billingError) {
        console.log(`⚠️  Error creando registro de facturación: ${billingError.message}`);
      } else {
        console.log(`✅ Registro de facturación creado para suscripción ${existingSubscription.id}`);
      }
    }

    console.log(`✅ Suscripción ${existingSubscription.id} actualizada a estado: ${newStatus}`);
    return true;

  } catch (error) {
    console.log(`❌ Error procesando webhook ${webhook.id}: ${error.message}`);
    return false;
  }
}

// Marcar webhook como procesado
async function markWebhookAsProcessed(supabase, webhookId, success) {
  const { error } = await supabase
    .from('webhook_logs')
    .update({
      status: success ? 'processed' : 'error',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', webhookId);

  if (error) {
    console.log(`❌ Error marcando webhook como procesado: ${error.message}`);
  }
}

// Función principal
async function main() {
  try {
    console.log('🔧 Procesando webhooks pendientes de suscripciones...');
    
    // Cargar variables de entorno
    loadEnvironmentVariables();
    console.log('✅ Variables de entorno configuradas correctamente');

    // Inicializar Supabase
    const supabase = initializeSupabase();
    console.log('✅ Cliente Supabase inicializado');

    // Obtener webhooks pendientes
    const pendingWebhooks = await getPendingWebhooks(supabase);
    console.log(`📊 Encontrados ${pendingWebhooks.length} webhooks pendientes`);

    if (pendingWebhooks.length === 0) {
      console.log('🎉 No hay webhooks pendientes que procesar');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    // Procesar cada webhook
    for (const webhook of pendingWebhooks) {
      const success = await processSubscriptionWebhook(supabase, webhook);
      await markWebhookAsProcessed(supabase, webhook.id, success);
      
      if (success) {
        processedCount++;
      } else {
        errorCount++;
      }

      // Pequeña pausa entre procesamiento
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Resumen del procesamiento:');
    console.log(`✅ Webhooks procesados exitosamente: ${processedCount}`);
    console.log(`❌ Webhooks con errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${pendingWebhooks.length}`);

  } catch (error) {
    console.error('❌ Error en el procesamiento:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main };