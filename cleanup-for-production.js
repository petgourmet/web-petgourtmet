#!/usr/bin/env node

/**
 * Script de limpieza para producción
 * Elimina archivos de prueba, debug y datos sensibles antes del despliegue
 */

const fs = require('fs');
const path = require('path');

// Lista de archivos de prueba y debug a eliminar
const filesToDelete = [
  // Scripts de prueba
  'test_subscription_creation.js',
  'debug_preference_id.js',
  'create-test-data.js',
  'create_test_subscription.js',
  'test_mercadopago_api.js',
  'test_subscription_flow.js',
  'analyze_rejected_payment.js',
  'analyze_rejected_payment_v2.js',
  'analyze_subscription_flow.js',
  'check-preapproval.js',
  'check-user-subscriptions.js',
  'check_mp_subscription.js',
  'check_products.js',
  'check_recent_logs.js',
  'check_subscriptions.js',
  'check_user_data.js',
  'debug-db.js',
  'fix_subscription_status.js',
  'process-preapproval.js',
  'search_payment_logs.js',
  'temp_query.sql',
  
  // Archivos de documentación de análisis
  'DIAGNOSTICO_WEBHOOKS_MERCADOPAGO.md',
  'RESUMEN_ANALISIS_PAGO_RECHAZADO.md',
  'RESUMEN_FINAL_ANALISIS_SUSCRIPCIONES.md',
  '.trae/documents/scripts-prueba-monitoreo.md'
];

// Archivos sensibles que NO deben ir a producción
const sensitiveFiles = [
  '.env.local',
  '.env.development',
  '.env.test'
];

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Eliminado: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  No encontrado: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error eliminando ${filePath}:`, error.message);
    return false;
  }
}

function checkSensitiveFiles() {
  console.log('\n🔍 Verificando archivos sensibles...');
  let foundSensitive = false;
  
  sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`⚠️  ADVERTENCIA: Archivo sensible encontrado: ${file}`);
      console.log(`   Este archivo NO debe incluirse en el despliegue`);
      foundSensitive = true;
    }
  });
  
  if (!foundSensitive) {
    console.log('✅ No se encontraron archivos sensibles en el directorio raíz');
  }
  
  return foundSensitive;
}

function main() {
  console.log('🧹 Iniciando limpieza para producción...');
  console.log('=====================================\n');
  
  let deletedCount = 0;
  let totalFiles = filesToDelete.length;
  
  // Eliminar archivos de prueba y debug
  console.log('📁 Eliminando archivos de prueba y debug...');
  filesToDelete.forEach(file => {
    if (deleteFile(file)) {
      deletedCount++;
    }
  });
  
  // Verificar archivos sensibles
  const hasSensitiveFiles = checkSensitiveFiles();
  
  // Resumen
  console.log('\n📊 Resumen de limpieza:');
  console.log('========================');
  console.log(`Archivos eliminados: ${deletedCount}/${totalFiles}`);
  console.log(`Archivos no encontrados: ${totalFiles - deletedCount}`);
  
  if (hasSensitiveFiles) {
    console.log('\n⚠️  IMPORTANTE: Se encontraron archivos sensibles.');
    console.log('   Asegúrate de que estos archivos estén en .gitignore');
    console.log('   y no se incluyan en el despliegue.');
  }
  
  console.log('\n✅ Limpieza completada.');
  console.log('\n📋 Siguiente paso: Revisar el checklist de seguridad');
}

if (require.main === module) {
  main();
}

module.exports = { deleteFile, checkSensitiveFiles };