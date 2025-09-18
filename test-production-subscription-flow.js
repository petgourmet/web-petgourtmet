/**
 * Script para probar el flujo completo de suscripciones en producción
 * Verifica que los correos se envíen correctamente usando SMTP
 */

const https = require('https');
const { URL } = require('url');

// Configuración para producción
const PRODUCTION_URL = 'https://petgourmet.mx';
const TEST_EMAIL = 'test@petgourmet.mx';

/**
 * Función para hacer peticiones HTTP
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PetGourmet-Test/1.0',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Verificar el estado de salud del sistema
 */
async function checkSystemHealth() {
  console.log('🔍 Verificando estado del sistema...');
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/health`);
    
    if (response.status === 200) {
      const health = response.data;
      console.log('✅ Sistema en línea');
      console.log(`📊 Estado general: ${health.status}`);
      console.log(`📈 Servicios saludables: ${health.summary.healthy}/${health.summary.total}`);
      
      // Verificar específicamente el servicio de email
      const emailService = health.checks.find(check => check.service === 'email');
      if (emailService) {
        console.log(`📧 Servicio de email: ${emailService.status}`);
        if (emailService.details.host) {
          console.log(`🌐 Host SMTP: ${emailService.details.host}`);
        }
      }
      
      return health.status === 'healthy';
    } else {
      console.log(`❌ Error en health check: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error conectando al sistema: ${error.message}`);
    return false;
  }
}

/**
 * Probar el endpoint de test de email
 */
async function testEmailService() {
  console.log('\n📧 Probando servicio de email...');
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/test-email`, {
      method: 'POST',
      body: {
        to: TEST_EMAIL,
        subject: 'Prueba de Email - Producción',
        message: 'Este es un email de prueba del sistema de suscripciones en producción.'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Servicio de email funcionando correctamente');
      console.log('📤 Email de prueba enviado exitosamente');
      return true;
    } else {
      console.log(`❌ Error en servicio de email: ${response.status}`);
      console.log('📄 Respuesta:', response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error probando email: ${error.message}`);
    return false;
  }
}

/**
 * Verificar los planes de suscripción disponibles
 */
async function checkSubscriptionPlans() {
  console.log('\n📋 Verificando planes de suscripción...');
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/subscriptions/plans`);
    
    if (response.status === 200) {
      const plans = response.data;
      console.log(`✅ ${plans.length} planes disponibles`);
      
      plans.forEach((plan, index) => {
        console.log(`📦 Plan ${index + 1}: ${plan.reason} - $${plan.auto_recurring.transaction_amount} ${plan.auto_recurring.currency_id}`);
      });
      
      return plans.length > 0;
    } else {
      console.log(`❌ Error obteniendo planes: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error verificando planes: ${error.message}`);
    return false;
  }
}

/**
 * Verificar la página de suscripciones
 */
async function checkSubscriptionPage() {
  console.log('\n🌐 Verificando página de suscripciones...');
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/suscripcion`);
    
    if (response.status === 200) {
      console.log('✅ Página de suscripciones accesible');
      return true;
    } else {
      console.log(`❌ Error accediendo a página: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error verificando página: ${error.message}`);
    return false;
  }
}

/**
 * Función principal
 */
async function runProductionTests() {
  console.log('🚀 Iniciando pruebas del flujo de suscripciones en producción');
  console.log(`🌍 URL de producción: ${PRODUCTION_URL}`);
  console.log(`📧 Email de prueba: ${TEST_EMAIL}`);
  console.log('=' .repeat(60));
  
  const results = {
    systemHealth: false,
    emailService: false,
    subscriptionPlans: false,
    subscriptionPage: false
  };
  
  // Ejecutar todas las pruebas
  results.systemHealth = await checkSystemHealth();
  results.emailService = await testEmailService();
  results.subscriptionPlans = await checkSubscriptionPlans();
  results.subscriptionPage = await checkSubscriptionPage();
  
  // Resumen final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS EN PRODUCCIÓN');
  console.log('=' .repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASÓ' : '❌ FALLÓ';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${status} - ${testName}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n' + '=' .repeat(60));
  if (allPassed) {
    console.log('🎉 TODAS LAS PRUEBAS PASARON - SISTEMA OPERATIVO');
    console.log('✅ El flujo de suscripciones está funcionando correctamente en producción');
    console.log('📧 Los correos SMTP se están enviando correctamente');
  } else {
    console.log('⚠️  ALGUNAS PRUEBAS FALLARON - REVISAR CONFIGURACIÓN');
    const failedTests = Object.entries(results)
      .filter(([, passed]) => !passed)
      .map(([test]) => test);
    console.log(`❌ Pruebas fallidas: ${failedTests.join(', ')}`);
  }
  console.log('=' .repeat(60));
  
  return allPassed;
}

// Ejecutar las pruebas
if (require.main === module) {
  runProductionTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runProductionTests };