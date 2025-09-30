#!/usr/bin/env node

/**
 * Script para configurar variables de entorno y ejecutar corrección de suscripciones
 * Lee la configuración desde archivos de entorno disponibles
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Configurando entorno y ejecutando corrección de suscripciones...');

/**
 * Busca y carga variables de entorno
 */
function loadEnvironmentVariables() {
  const possibleEnvFiles = [
    '.env.local',
    '.env.production',
    '.env.development',
    '.env'
  ];

  let envLoaded = false;

  for (const envFile of possibleEnvFiles) {
    const envPath = path.join(process.cwd(), envFile);
    
    if (fs.existsSync(envPath)) {
      console.log(`📁 Cargando variables de entorno desde: ${envFile}`);
      
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n');
        
        for (const line of envLines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            
            if (key && value && !process.env[key]) {
              process.env[key] = value;
            }
          }
        }
        
        envLoaded = true;
        break;
      } catch (error) {
        console.error(`❌ Error leyendo ${envFile}:`, error.message);
      }
    }
  }

  // Si no se encontró archivo .env, intentar usar variables del sistema
  if (!envLoaded) {
    console.log('⚠️ No se encontró archivo .env, usando variables del sistema...');
  }

  // Verificar variables críticas
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'MERCADOPAGO_ACCESS_TOKEN'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    
    // Intentar configurar valores por defecto para desarrollo
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('🔧 Configurando URL de Supabase por defecto para desarrollo...');
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    }
    
    return false;
  }

  console.log('✅ Variables de entorno configuradas correctamente');
  return true;
}

/**
 * Ejecuta diagnóstico de suscripciones problemáticas
 */
async function runSubscriptionDiagnosis() {
  console.log('\n🔍 Ejecutando diagnóstico de suscripciones...');
  
  try {
    // Importar módulos necesarios después de configurar env
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Buscar suscripciones problemáticas
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .in('status', ['pending', 'processing'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error consultando suscripciones: ${error.message}`);
    }

    console.log(`📊 Encontradas ${subscriptions?.length || 0} suscripciones pendientes`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No hay suscripciones problemáticas que corregir');
      return { success: true, count: 0 };
    }

    // Mostrar detalles de suscripciones problemáticas
    console.log('\n📋 Suscripciones que requieren atención:');
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ID: ${sub.id}`);
      console.log(`   Email: ${sub.user_email}`);
      console.log(`   Producto: ${sub.product_name}`);
      console.log(`   Estado: ${sub.status}`);
      console.log(`   Referencia: ${sub.external_reference}`);
      console.log(`   Creada: ${new Date(sub.created_at).toLocaleString('es-MX')}`);
      console.log('');
    });

    return { success: true, count: subscriptions.length, subscriptions };

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Aplica correcciones automáticas
 */
async function applyAutomaticFixes(subscriptions) {
  console.log('\n🔧 Aplicando correcciones automáticas...');
  
  if (!subscriptions || subscriptions.length === 0) {
    return { fixed: 0, failed: 0 };
  }

  const results = { fixed: 0, failed: 0, errors: [] };

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    for (const subscription of subscriptions) {
      try {
        console.log(`🔄 Procesando: ${subscription.external_reference}`);

        // Verificar si la suscripción necesita activación
        const hoursSinceCreation = (Date.now() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCreation > 1 && subscription.status === 'pending') {
          // Activar suscripción automáticamente
          const nextBillingDate = new Date();
          nextBillingDate.setDate(nextBillingDate.getDate() + 30);

          const { error: updateError } = await supabase
            .from('unified_subscriptions')
            .update({
              status: 'active',
              activated_at: new Date().toISOString(),
              next_billing_date: nextBillingDate.toISOString(),
              updated_at: new Date().toISOString(),
              notes: (subscription.notes || '') + ` [AUTO-ACTIVADA: ${new Date().toISOString()}]`
            })
            .eq('id', subscription.id);

          if (updateError) {
            throw new Error(`Error activando suscripción: ${updateError.message}`);
          }

          // Crear registro de facturación
          const { error: billingError } = await supabase
            .from('billing_history')
            .insert({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              amount: subscription.amount || 0,
              currency: subscription.currency || 'MXN',
              status: 'paid',
              payment_date: new Date().toISOString(),
              billing_period_start: new Date().toISOString(),
              billing_period_end: nextBillingDate.toISOString(),
              created_at: new Date().toISOString()
            });

          if (billingError && !billingError.message.includes('duplicate')) {
            console.warn('⚠️ Error creando registro de facturación:', billingError.message);
          }

          console.log(`✅ Suscripción activada: ${subscription.id}`);
          results.fixed++;
        } else {
          console.log(`⏭️ Suscripción no requiere corrección: ${subscription.id}`);
        }

      } catch (error) {
        console.error(`❌ Error procesando ${subscription.id}:`, error.message);
        results.failed++;
        results.errors.push({
          subscription_id: subscription.id,
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Error en correcciones automáticas:', error.message);
    results.failed = subscriptions.length;
  }

  return results;
}

/**
 * Función principal
 */
async function main() {
  try {
    // 1. Configurar variables de entorno
    const envConfigured = loadEnvironmentVariables();
    
    if (!envConfigured) {
      console.error('❌ No se pudieron configurar las variables de entorno necesarias');
      process.exit(1);
    }

    // 2. Ejecutar diagnóstico
    const diagnosis = await runSubscriptionDiagnosis();
    
    if (!diagnosis.success) {
      console.error('❌ Error en diagnóstico:', diagnosis.error);
      process.exit(1);
    }

    if (diagnosis.count === 0) {
      console.log('🎉 No hay suscripciones que requieran corrección');
      return;
    }

    // 3. Aplicar correcciones automáticas
    const fixes = await applyAutomaticFixes(diagnosis.subscriptions);

    // 4. Mostrar resumen
    console.log('\n📊 Resumen de correcciones:');
    console.log(`✅ Corregidas: ${fixes.fixed}`);
    console.log(`❌ Fallidas: ${fixes.failed}`);
    
    if (fixes.errors.length > 0) {
      console.log('\n❌ Errores encontrados:');
      fixes.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.subscription_id}: ${error.error}`);
      });
    }

    console.log('\n🎉 Proceso completado');

  } catch (error) {
    console.error('💥 Error crítico:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { main, loadEnvironmentVariables, runSubscriptionDiagnosis };