#!/usr/bin/env node

/**
 * Script de verificación de configuración de MercadoPago
 * Verifica que las credenciales estén correctamente configuradas según el modo
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO CONFIGURACIÓN DE MERCADOPAGO');
console.log('============================================================');

// Leer variables de entorno del archivo .env.local
const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ Archivo .env.local no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    envVars[key.trim()] = value;
  }
});

// Verificar configuración
const isTestMode = envVars.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true';
const environment = envVars.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT;

console.log('📊 CONFIGURACIÓN ACTUAL:');
console.log(`   Modo de prueba: ${isTestMode ? '✅ ACTIVADO' : '❌ DESACTIVADO'}`);
console.log(`   Entorno: ${environment || 'NO DEFINIDO'}`);
console.log('');

// Verificar credenciales según el modo
let errors = [];
let warnings = [];

if (isTestMode) {
  console.log('🧪 VERIFICANDO CREDENCIALES DE PRUEBA:');
  
  // Verificar credenciales de prueba
  const testAccessToken = envVars.MERCADOPAGO_ACCESS_TOKEN_TEST;
  const testPublicKey = envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST;
  const testWebhookSecret = envVars.MERCADOPAGO_WEBHOOK_SECRET_TEST;
  
  console.log(`   Access Token TEST: ${testAccessToken ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   Public Key TEST: ${testPublicKey ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   Webhook Secret TEST: ${testWebhookSecret ? '✅ Configurado' : '❌ Faltante'}`);
  
  if (!testAccessToken) errors.push('MERCADOPAGO_ACCESS_TOKEN_TEST faltante');
  if (!testPublicKey) errors.push('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST faltante');
  if (!testWebhookSecret) warnings.push('MERCADOPAGO_WEBHOOK_SECRET_TEST faltante');
  
  // Verificar que las credenciales activas coincidan con las de prueba
  const activeAccessToken = envVars.MERCADOPAGO_ACCESS_TOKEN;
  const activePublicKey = envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  
  console.log('');
  console.log('🔄 VERIFICANDO CONSISTENCIA:');
  
  if (activeAccessToken === testAccessToken) {
    console.log('   Access Token activo: ✅ Coincide con TEST');
  } else {
    console.log('   Access Token activo: ❌ NO coincide con TEST');
    errors.push('Access Token activo no coincide con credenciales de prueba');
  }
  
  if (activePublicKey === testPublicKey) {
    console.log('   Public Key activo: ✅ Coincide con TEST');
  } else {
    console.log('   Public Key activo: ❌ NO coincide con TEST');
    errors.push('Public Key activo no coincide con credenciales de prueba');
  }
  
} else {
  console.log('🏭 VERIFICANDO CREDENCIALES DE PRODUCCIÓN:');
  
  // Verificar credenciales de producción
  const prodAccessToken = envVars.MERCADOPAGO_ACCESS_TOKEN_PROD;
  const prodPublicKey = envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD;
  const prodWebhookSecret = envVars.MERCADOPAGO_WEBHOOK_SECRET_PROD;
  
  console.log(`   Access Token PROD: ${prodAccessToken ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   Public Key PROD: ${prodPublicKey ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   Webhook Secret PROD: ${prodWebhookSecret ? '✅ Configurado' : '❌ Faltante'}`);
  
  if (!prodAccessToken) errors.push('MERCADOPAGO_ACCESS_TOKEN_PROD faltante');
  if (!prodPublicKey) errors.push('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD faltante');
  if (!prodWebhookSecret) warnings.push('MERCADOPAGO_WEBHOOK_SECRET_PROD faltante');
  
  // Verificar que las credenciales activas coincidan con las de producción
  const activeAccessToken = envVars.MERCADOPAGO_ACCESS_TOKEN;
  const activePublicKey = envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  
  console.log('');
  console.log('🔄 VERIFICANDO CONSISTENCIA:');
  
  if (activeAccessToken === prodAccessToken) {
    console.log('   Access Token activo: ✅ Coincide con PROD');
  } else {
    console.log('   Access Token activo: ❌ NO coincide con PROD');
    errors.push('Access Token activo no coincide con credenciales de producción');
  }
  
  if (activePublicKey === prodPublicKey) {
    console.log('   Public Key activo: ✅ Coincide con PROD');
  } else {
    console.log('   Public Key activo: ❌ NO coincide con PROD');
    errors.push('Public Key activo no coincide con credenciales de producción');
  }
}

// Verificar que no haya mezcla de credenciales
console.log('');
console.log('🔍 VERIFICANDO MEZCLA DE CREDENCIALES:');

const activeAccessToken = envVars.MERCADOPAGO_ACCESS_TOKEN;
const activePublicKey = envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

// Detectar tipo de credenciales por patrones conocidos
let accessTokenType = 'unknown';
let publicKeyType = 'unknown';

if (activeAccessToken) {
  if (activeAccessToken.startsWith('APP_USR')) {
    accessTokenType = 'production';
  } else if (activeAccessToken.startsWith('TEST')) {
    accessTokenType = 'test';
  }
}

if (activePublicKey) {
  if (activePublicKey.startsWith('APP_USR')) {
    publicKeyType = 'production';
  } else if (activePublicKey.startsWith('TEST')) {
    publicKeyType = 'test';
  }
}

console.log(`   Access Token detectado como: ${accessTokenType}`);
console.log(`   Public Key detectado como: ${publicKeyType}`);

// Verificar consistencia entre tipos
if (accessTokenType !== publicKeyType && accessTokenType !== 'unknown' && publicKeyType !== 'unknown') {
  errors.push(`Mezcla de credenciales detectada: Access Token es ${accessTokenType} pero Public Key es ${publicKeyType}`);
  console.log('   ❌ MEZCLA DE CREDENCIALES DETECTADA');
} else {
  console.log('   ✅ No se detectó mezcla de credenciales');
}

// Verificar consistencia con el modo configurado
if (isTestMode && accessTokenType === 'production') {
  errors.push('Modo de prueba activado pero usando credenciales de producción');
} else if (!isTestMode && accessTokenType === 'test') {
  errors.push('Modo de producción activado pero usando credenciales de prueba');
}

// Mostrar resumen
console.log('');
console.log('============================================================');
console.log('📋 RESUMEN DE VERIFICACIÓN:');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ CONFIGURACIÓN CORRECTA - No se encontraron problemas');
} else {
  if (errors.length > 0) {
    console.log('❌ ERRORES CRÍTICOS ENCONTRADOS:');
    errors.forEach(error => console.log(`   • ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS:');
    warnings.forEach(warning => console.log(`   • ${warning}`));
  }
}

console.log('');
console.log('💡 RECOMENDACIONES:');

if (isTestMode) {
  console.log('   • Estás en modo de prueba, asegúrate de usar credenciales de sandbox');
  console.log('   • Para producción, cambia NEXT_PUBLIC_PAYMENT_TEST_MODE=false');
} else {
  console.log('   • Estás en modo de producción, verifica que uses credenciales reales');
  console.log('   • Para pruebas, cambia NEXT_PUBLIC_PAYMENT_TEST_MODE=true');
}

console.log('   • Usa el archivo lib/mercadopago-config.ts para obtener credenciales');
console.log('   • Evita usar process.env.MERCADOPAGO_ACCESS_TOKEN directamente');

console.log('============================================================');

// Salir con código de error si hay problemas críticos
if (errors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}