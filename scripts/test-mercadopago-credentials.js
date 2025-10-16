const fs = require('fs');

console.log('🔍 VERIFICANDO CONFIGURACIÓN DE MERCADOPAGO');
console.log('============================================================');

// Leer variables de entorno del archivo .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/[\"']/g, '');
  }
});

const isTestMode = envVars.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true';

console.log('📊 MODO ACTUAL:', isTestMode ? 'PRUEBAS/SANDBOX' : 'PRODUCCIÓN');
console.log('');

if (isTestMode) {
  console.log('🧪 CREDENCIALES DE PRUEBA:');
  console.log('Access Token TEST:', envVars.MERCADOPAGO_ACCESS_TOKEN_TEST ? '✅ Configurado' : '❌ Faltante');
  console.log('Public Key TEST:', envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST ? '✅ Configurado' : '❌ Faltante');
  console.log('');
  console.log('🔑 CREDENCIALES ACTIVAS (las que usa la app):');
  console.log('Access Token:', envVars.MERCADOPAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ Faltante');
  console.log('Public Key:', envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? '✅ Configurado' : '❌ Faltante');
  
  // Verificar si las credenciales activas coinciden con las de test
  const tokenMatch = envVars.MERCADOPAGO_ACCESS_TOKEN === envVars.MERCADOPAGO_ACCESS_TOKEN_TEST;
  const keyMatch = envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY === envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST;
  
  console.log('');
  console.log('🔄 CONSISTENCIA:');
  console.log('Access Token coincide:', tokenMatch ? '✅ Sí' : '❌ No');
  console.log('Public Key coincide:', keyMatch ? '✅ Sí' : '❌ No');
  
  if (!tokenMatch || !keyMatch) {
    console.log('');
    console.log('⚠️  PROBLEMA DETECTADO:');
    console.log('Las credenciales activas no coinciden con las de TEST.');
    console.log('Esto puede causar el error "Both payer and collector must be real or test users"');
  }
} else {
  console.log('🏭 CREDENCIALES DE PRODUCCIÓN:');
  console.log('Access Token PROD:', envVars.MERCADOPAGO_ACCESS_TOKEN_PROD ? '✅ Configurado' : '❌ Faltante');
  console.log('Public Key PROD:', envVars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD ? '✅ Configurado' : '❌ Faltante');
}

console.log('');
console.log('📋 DATOS DE PRUEBA RECOMENDADOS PARA SANDBOX:');
console.log('Email de prueba: test_user_123456@testuser.com');
console.log('Tarjeta de prueba: 4509 9535 6623 3704');
console.log('CVV: 123');
console.log('Vencimiento: 11/25');
console.log('Nombre: APRO (para aprobar automáticamente)');