// 🔍 Script de Verificación de Configuración Webhook MercadoPago
// Este script valida que la configuración esté correcta para producción

const fs = require('fs');
const path = require('path');

// Colores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Leer variables de entorno
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    logError('Archivo .env no encontrado');
    return null;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return envVars;
}

// Validaciones de configuración
function validateConfiguration() {
  logHeader('VALIDACIÓN DE CONFIGURACIÓN');
  
  const env = loadEnvFile();
  if (!env) return false;
  
  let isValid = true;
  const errors = [];
  const warnings = [];
  
  // 1. Validar NODE_ENV
  if (env.NODE_ENV !== 'production') {
    errors.push('NODE_ENV debe ser "production"');
    isValid = false;
  } else {
    logSuccess('NODE_ENV configurado correctamente');
  }
  
  // 2. Validar entorno de MercadoPago
  if (env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT !== 'production') {
    errors.push('NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT debe ser "production"');
    isValid = false;
  } else {
    logSuccess('Entorno de MercadoPago configurado para producción');
  }
  
  // 3. Validar que no sea modo mock
  if (env.USE_MERCADOPAGO_MOCK === 'true') {
    errors.push('USE_MERCADOPAGO_MOCK debe ser "false" en producción');
    isValid = false;
  } else {
    logSuccess('Modo mock deshabilitado correctamente');
  }
  
  // 4. Validar que no sea modo test
  if (env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true') {
    errors.push('NEXT_PUBLIC_PAYMENT_TEST_MODE debe ser "false" en producción');
    isValid = false;
  } else {
    logSuccess('Modo test deshabilitado correctamente');
  }
  
  // 5. Validar tokens de MercadoPago
  const requiredTokens = [
    'MERCADOPAGO_ACCESS_TOKEN',
    'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
    'MERCADOPAGO_WEBHOOK_SECRET'
  ];
  
  requiredTokens.forEach(token => {
    if (!env[token]) {
      errors.push(`${token} no está configurado`);
      isValid = false;
    } else if (env[token].includes('[REEMPLAZAR')) {
      errors.push(`${token} contiene placeholder - debe reemplazarse con valor real`);
      isValid = false;
    } else if (env[token].includes('APP_USR-1329434229865091')) {
      errors.push(`${token} contiene token de SANDBOX - debe usar token de PRODUCCIÓN`);
      isValid = false;
    } else {
      logSuccess(`${token} configurado`);
    }
  });
  
  // Mostrar errores y warnings
  if (errors.length > 0) {
    logHeader('ERRORES CRÍTICOS');
    errors.forEach(error => logError(error));
  }
  
  if (warnings.length > 0) {
    logHeader('ADVERTENCIAS');
    warnings.forEach(warning => logWarning(warning));
  }
  
  return isValid;
}

// Test de conectividad del webhook
async function testWebhookConnectivity() {
  logHeader('TEST DE CONECTIVIDAD WEBHOOK');
  
  try {
    const testPayload = {
      "action": "payment.updated",
      "api_version": "v1",
      "data": { "id": "test123" },
      "date_created": new Date().toISOString(),
      "id": Date.now(),
      "live_mode": false,
      "type": "payment",
      "user_id": "test"
    };
    
    log('Enviando webhook de prueba...');
    
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago/1.0'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      logSuccess(`Webhook responde correctamente (${response.status})`);
      const responseData = await response.text();
      log(`Respuesta: ${responseData}`);
      return true;
    } else {
      logError(`Webhook falló con status ${response.status}`);
      const errorData = await response.text();
      log(`Error: ${errorData}`);
      return false;
    }
    
  } catch (error) {
    logError(`Error de conectividad: ${error.message}`);
    logWarning('Asegúrate de que el servidor esté ejecutándose (npm run dev)');
    return false;
  }
}

// Función principal
async function main() {
  log(`${colors.bold}🔍 VERIFICADOR DE CONFIGURACIÓN WEBHOOK MERCADOPAGO${colors.reset}`, 'blue');
  log('Este script valida la configuración para resolver el error 500\n');
  
  const configValid = validateConfiguration();
  const webhookWorking = await testWebhookConnectivity();
  
  logHeader('RESUMEN');
  
  if (configValid && webhookWorking) {
    logSuccess('✅ CONFIGURACIÓN CORRECTA - Webhook funcionando');
    log('\n🚀 Pasos siguientes:');
    log('1. Desplegar cambios a producción');
    log('2. Probar con payment ID real: 127639262364');
    log('3. Verificar que orden #178 se actualice correctamente');
  } else {
    logError('❌ CONFIGURACIÓN INCORRECTA');
    log('\n🔧 Acciones requeridas:');
    
    if (!configValid) {
      log('1. Corregir variables de entorno según errores mostrados');
      log('2. Obtener credenciales reales de MercadoPago producción');
      log('3. Reemplazar placeholders [REEMPLAZAR_CON_*] con valores reales');
    }
    
    if (!webhookWorking) {
      log('4. Verificar que el servidor esté ejecutándose');
      log('5. Revisar logs del servidor para errores específicos');
    }
  }
  
  log('\n📖 Ver GUIA-CORRECCION-WEBHOOK-500.md para instrucciones detalladas');
}

// Ejecutar verificación
main().catch(error => {
  logError(`Error inesperado: ${error.message}`);
  process.exit(1);
});