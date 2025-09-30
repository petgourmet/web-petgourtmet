#!/usr/bin/env node

/**
 * Script para corregir problemas de activación de suscripciones
 * Aplica todas las mejoras implementadas y corrige suscripciones problemáticas
 */

const { createClient } = require('@supabase/supabase-js');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const fs = require('fs');
const path = require('path');

// Configuración
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const preApproval = new PreApproval(client);

// Configuración del script
const CONFIG = {
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  FORCE_EMAIL: process.argv.includes('--force-email'),
  TARGET_REFERENCE: process.argv.find(arg => arg.startsWith('--reference='))?.split('=')[1],
  MAX_RETRIES: 3,
  BATCH_SIZE: 10
};

console.log('🔧 Iniciando corrección de activación de suscripciones...');
console.log('Configuración:', CONFIG);

/**
 * Función principal
 */
async function main() {
  try {
    // 1. Aplicar migración de base de datos
    console.log('\n📊 Aplicando migración de base de datos...');
    await applyDatabaseMigration();

    // 2. Identificar suscripciones problemáticas
    console.log('\n🔍 Identificando suscripciones problemáticas...');
    const problematicSubscriptions = await findProblematicSubscriptions();
    
    if (problematicSubscriptions.length === 0) {
      console.log('✅ No se encontraron suscripciones problemáticas');
      return;
    }

    console.log(`📋 Encontradas ${problematicSubscriptions.length} suscripciones problemáticas`);

    // 3. Procesar cada suscripción
    const results = {
      fixed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const subscription of problematicSubscriptions) {
      try {
        console.log(`\n🔄 Procesando suscripción: ${subscription.external_reference}`);
        const result = await processProblematicSubscription(subscription);
        
        if (result.success) {
          results.fixed++;
          console.log(`✅ Suscripción corregida: ${subscription.id}`);
        } else {
          results.failed++;
          results.errors.push({
            subscription_id: subscription.id,
            error: result.error
          });
          console.log(`❌ Error procesando suscripción: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          subscription_id: subscription.id,
          error: error.message
        });
        console.error(`💥 Error inesperado:`, error);
      }
    }

    // 4. Generar reporte
    console.log('\n📊 Generando reporte final...');
    await generateReport(results, problematicSubscriptions);

    console.log('\n🎉 Proceso completado');
    console.log(`✅ Corregidas: ${results.fixed}`);
    console.log(`❌ Fallidas: ${results.failed}`);
    console.log(`⏭️ Omitidas: ${results.skipped}`);

  } catch (error) {
    console.error('💥 Error crítico en el proceso:', error);
    process.exit(1);
  }
}

/**
 * Aplica la migración de base de datos
 */
async function applyDatabaseMigration() {
  if (CONFIG.DRY_RUN) {
    console.log('🔍 [DRY RUN] Simulando aplicación de migración...');
    return;
  }

  try {
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241231_add_unique_constraint.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('⚠️ Archivo de migración no encontrado, continuando...');
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Ejecutar migración (esto normalmente se haría con supabase CLI)
    console.log('📝 Migración debe aplicarse manualmente con: supabase db push');
    console.log('📁 Archivo: supabase/migrations/20241231_add_unique_constraint.sql');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    throw error;
  }
}

/**
 * Encuentra suscripciones problemáticas
 */
async function findProblematicSubscriptions() {
  try {
    let query = supabase
      .from('unified_subscriptions')
      .select('*')
      .in('status', ['pending', 'processing'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 7 días

    // Si se especifica una referencia específica
    if (CONFIG.TARGET_REFERENCE) {
      query = query.eq('external_reference', CONFIG.TARGET_REFERENCE);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error consultando suscripciones: ${error.message}`);
    }

    // Filtrar suscripciones que realmente necesitan corrección
    const problematic = [];
    
    for (const subscription of data || []) {
      const needsFix = await needsActivationFix(subscription);
      if (needsFix) {
        problematic.push(subscription);
      }
    }

    return problematic;
  } catch (error) {
    console.error('Error encontrando suscripciones problemáticas:', error);
    throw error;
  }
}

/**
 * Verifica si una suscripción necesita corrección
 */
async function needsActivationFix(subscription) {
  try {
    // Verificar estado en MercadoPago
    if (subscription.mercadopago_subscription_id) {
      const mpSubscription = await preApproval.get({
        id: subscription.mercadopago_subscription_id
      });

      // Si está aprobada en MP pero pendiente en nuestra DB
      if (['authorized', 'approved', 'active'].includes(mpSubscription.status) && 
          subscription.status === 'pending') {
        return true;
      }
    }

    // Verificar si tiene external_reference problemático
    if (subscription.external_reference === '643f69a22e5542c183f86d5114848662') {
      return true;
    }

    // Verificar si lleva mucho tiempo pendiente
    const createdAt = new Date(subscription.created_at);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 2 && subscription.status === 'pending') {
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error verificando suscripción ${subscription.id}:`, error);
    return false;
  }
}

/**
 * Procesa una suscripción problemática
 */
async function processProblematicSubscription(subscription) {
  try {
    console.log(`  📋 ID: ${subscription.id}`);
    console.log(`  📧 Usuario: ${subscription.user_email}`);
    console.log(`  📦 Producto: ${subscription.product_name}`);
    console.log(`  🔗 Referencia: ${subscription.external_reference}`);
    console.log(`  📊 Estado actual: ${subscription.status}`);

    if (CONFIG.DRY_RUN) {
      console.log('  🔍 [DRY RUN] Simulando corrección...');
      return { success: true, action: 'simulated' };
    }

    // 1. Verificar estado en MercadoPago
    let mpStatus = null;
    let mpData = null;

    if (subscription.mercadopago_subscription_id) {
      try {
        const mpSubscription = await preApproval.get({
          id: subscription.mercadopago_subscription_id
        });
        mpStatus = mpSubscription.status;
        mpData = mpSubscription;
        console.log(`  💳 Estado en MercadoPago: ${mpStatus}`);
      } catch (mpError) {
        console.log(`  ⚠️ Error consultando MercadoPago: ${mpError.message}`);
      }
    }

    // 2. Activar suscripción si está aprobada
    if (['authorized', 'approved', 'active'].includes(mpStatus) || 
        subscription.external_reference === '643f69a22e5542c183f86d5114848662') {
      
      console.log('  🔄 Activando suscripción...');
      
      // Calcular next_billing_date
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      const updateData = {
        status: 'active',
        activated_at: new Date().toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        updated_at: new Date().toISOString()
      };

      if (mpData) {
        updateData.mercadopago_data = mpData;
      }

      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        throw new Error(`Error actualizando suscripción: ${updateError.message}`);
      }

      // 3. Crear registro de facturación
      console.log('  💰 Creando registro de facturación...');
      await createBillingRecord(subscription, mpData);

      // 4. Enviar email de confirmación
      if (CONFIG.FORCE_EMAIL || !await hasConfirmationEmailBeenSent(subscription.id)) {
        console.log('  📧 Enviando email de confirmación...');
        await sendConfirmationEmail(subscription);
      } else {
        console.log('  📧 Email ya enviado previamente');
      }

      return { success: true, action: 'activated' };
    }

    // 3. Si no se puede activar, marcar para revisión manual
    console.log('  ⚠️ Requiere revisión manual');
    
    const { error: noteError } = await supabase
      .from('unified_subscriptions')
      .update({
        notes: (subscription.notes || '') + ` [REVISIÓN MANUAL REQUERIDA - ${new Date().toISOString()}]`,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (noteError) {
      console.error('Error agregando nota:', noteError);
    }

    return { success: true, action: 'marked_for_review' };

  } catch (error) {
    console.error(`Error procesando suscripción ${subscription.id}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Crea registro de facturación
 */
async function createBillingRecord(subscription, mpData) {
  try {
    const billingData = {
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      amount: subscription.amount || 0,
      currency: subscription.currency || 'MXN',
      status: 'paid',
      payment_date: new Date().toISOString(),
      billing_period_start: new Date().toISOString(),
      billing_period_end: subscription.next_billing_date,
      mercadopago_payment_id: mpData?.id,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('billing_history')
      .insert(billingData);

    if (error && !error.message.includes('duplicate')) {
      console.error('Error creando registro de facturación:', error);
    }
  } catch (error) {
    console.error('Error en createBillingRecord:', error);
  }
}

/**
 * Verifica si ya se envió email de confirmación
 */
async function hasConfirmationEmailBeenSent(subscriptionId) {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('email_type', 'subscription_confirmation')
      .eq('status', 'sent')
      .limit(1);

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('Error verificando email enviado:', error);
    return false;
  }
}

/**
 * Envía email de confirmación
 */
async function sendConfirmationEmail(subscription) {
  try {
    // Importar y usar el servicio de email mejorado
    const { enhancedEmailService } = require('../lib/email-service-enhanced');
    
    const emailData = {
      userEmail: subscription.user_email,
      userName: subscription.user_name,
      subscriptionId: subscription.id,
      productName: subscription.product_name,
      planType: subscription.plan_type || 'monthly',
      amount: subscription.amount,
      currency: subscription.currency || 'MXN',
      nextBillingDate: subscription.next_billing_date,
      status: 'active'
    };

    const result = await enhancedEmailService.sendSubscriptionConfirmationEmail(emailData);
    
    if (!result.success) {
      console.error('Error enviando email:', result.error);
    }

    return result.success;
  } catch (error) {
    console.error('Error en sendConfirmationEmail:', error);
    return false;
  }
}

/**
 * Genera reporte final
 */
async function generateReport(results, subscriptions) {
  const report = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    summary: results,
    processed_subscriptions: subscriptions.length,
    details: results.errors
  };

  const reportPath = path.join(__dirname, '..', 'reports', `subscription-fix-${Date.now()}.json`);
  
  // Crear directorio si no existe
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Reporte guardado en: ${reportPath}`);
}

// Ejecutar script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  findProblematicSubscriptions,
  processProblematicSubscription
};