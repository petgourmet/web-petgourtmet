#!/usr/bin/env node

/**
 * Script de prueba para simular el flujo completo de suscripción dinámica
 * Simula todo el proceso: API call, respuesta de MercadoPago, BD y SDK link
 */

// Usar fetch nativo de Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Configuración del servidor local
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/subscriptions/create-dynamic';

// Función para crear un usuario de prueba primero
async function createTestUser() {
  const testUser = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'test_user_mx_789012@testuser.com',
    full_name: 'Juan Pérez Test'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/debug/create-test-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (response.ok) {
      console.log('✅ Usuario de prueba creado exitosamente');
      return true;
    } else {
      console.log('⚠️ Usuario de prueba ya existe o error al crear');
      return true; // Continuar de todas formas
    }
  } catch (error) {
    console.log('⚠️ No se pudo crear usuario de prueba, continuando...');
    return true;
  }
}

// Función para crear producto de prueba
async function createTestProduct() {
  try {
    console.log('🛍️ CREANDO PRODUCTO DE PRUEBA...');
    
    const response = await fetch('http://localhost:3000/api/debug/create-test-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Producto de prueba listo');
      return true;
    } else {
      console.log('❌ Error creando producto:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error en createTestProduct:', error.message);
    return false;
  }
}

// Datos de prueba realistas con UUIDs válidos
const TEST_DATA = {
  user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // UUID válido de ejemplo
  product_id: 59, // ID real del primer producto encontrado en la BD
  frequency: 1,
  frequency_type: 'months',
  payment_method: 'pending', // Para generar init_point del SDK
  customer_data: {
    // Email de prueba específico para MercadoPago México (sin registrar en otros países)
    email: 'test_user_mx_789012@testuser.com',
    name: 'APRO Test', // Nombre completo para MercadoPago
    first_name: 'APRO', // Nombre de prueba que aprueba automáticamente
    last_name: 'Test',
    phone: '+5255123456789', // Teléfono de México para coincidir con MX
    address: {
      street: 'Av. Insurgentes Sur', // Cambiar street_name por street
      number: '1234', // Cambiar street_number por number
      zip_code: '03100',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'MX' // México para coincidir con las credenciales MXN
    }
  }
};

// Función para mostrar logs con formato
function log(emoji, title, data = null) {
  console.log(`\n${emoji} ${title}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Función para mostrar errores
function logError(title, error) {
  console.log(`\n❌ ${title}`);
  console.error(error);
}

// Función principal de prueba
async function testDynamicSubscription() {
  console.log('🚀 INICIANDO PRUEBA DE SUSCRIPCIÓN DINÁMICA');
  console.log('============================================================\n');
  
  // Crear usuario de prueba
  const userCreated = await createTestUser();
  if (!userCreated) {
    console.log('❌ No se pudo crear el usuario de prueba. Continuando con datos existentes...\n');
  }
  
  // Crear producto de prueba
  const productCreated = await createTestProduct();
  if (!productCreated) {
    console.log('❌ No se pudo crear el producto de prueba. Continuando con datos existentes...\n');
  }
  
  console.log('📤 DATOS DE LA PETICIÓN:');
  console.log(JSON.stringify(TEST_DATA, null, 2));
  console.log('\n🔄 ENVIANDO PETICIÓN AL ENDPOINT...\n');
  
  try {
    const response = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_DATA)
    });
    
    // PASO 3: Procesar respuesta
    const responseData = await response.json();
    
    if (!response.ok) {
      logError('ERROR EN LA RESPUESTA DE LA API', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      // Si es error de usuario no encontrado, mostrar sugerencia
      if (responseData.error === 'Usuario no encontrado') {
        console.log('\n💡 SUGERENCIA: El usuario de prueba no existe en la BD.');
        console.log('   Puedes crear un usuario real en la aplicación o usar un UUID existente.');
      }
      
      return;
    }
    
    log('✅', 'RESPUESTA DE LA API EXITOSA:', {
      status: response.status,
      success: responseData.success
    });
    
    // PASO 4: Analizar respuesta de MercadoPago
    if (responseData.mercadopago_response) {
      log('💳', 'RESPUESTA DE MERCADOPAGO:', responseData.mercadopago_response);
      
      // Extraer init_point (SDK link)
      if (responseData.mercadopago_response.init_point) {
        log('🔗', 'LINK DEL SDK GENERADO:', {
          init_point: responseData.mercadopago_response.init_point,
          preapproval_id: responseData.mercadopago_response.id
        });
      } else {
        logError('LINK DEL SDK NO ENCONTRADO', 'No se generó init_point en la respuesta');
      }
    } else {
      logError('RESPUESTA DE MERCADOPAGO NO ENCONTRADA', 'No hay datos de MercadoPago en la respuesta');
    }
    
    // PASO 5: Verificar datos de la suscripción creada
    if (responseData.subscription) {
      log('📊', 'SUSCRIPCIÓN CREADA EN BD:', {
        id: responseData.subscription.id,
        status: responseData.subscription.status,
        user_id: responseData.subscription.user_id,
        product_id: responseData.subscription.product_id,
        next_payment_date: responseData.subscription.next_payment_date,
        created_at: responseData.subscription.created_at
      });
      
      // Validar estado pending
      if (responseData.subscription.status === 'pending') {
        log('✅', 'VALIDACIÓN: Suscripción en estado PENDING correcto');
      } else {
        logError('VALIDACIÓN FALLIDA', `Estado esperado: pending, obtenido: ${responseData.subscription.status}`);
      }
      
      // Validar formato de fechas ISO
      const nextPaymentDate = responseData.subscription.next_payment_date;
      if (nextPaymentDate && nextPaymentDate.includes('T') && nextPaymentDate.includes('Z')) {
        log('✅', 'VALIDACIÓN: Fecha en formato ISO correcto', { next_payment_date: nextPaymentDate });
      } else {
        logError('VALIDACIÓN FALLIDA', `Formato de fecha incorrecto: ${nextPaymentDate}`);
      }
    } else {
      logError('DATOS DE SUSCRIPCIÓN NO ENCONTRADOS', 'No se creó la suscripción en la BD');
    }
    
    // PASO 6: Resumen final
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RESUMEN DE LA PRUEBA:');
    console.log('=' .repeat(60));
    
    const validations = [
      { name: 'API Response', status: response.ok ? '✅' : '❌' },
      { name: 'MercadoPago Integration', status: responseData.mercadopago_response ? '✅' : '❌' },
      { name: 'SDK Link Generated', status: responseData.mercadopago_response?.init_point ? '✅' : '❌' },
      { name: 'Subscription Created', status: responseData.subscription ? '✅' : '❌' },
      { name: 'Pending Status', status: responseData.subscription?.status === 'pending' ? '✅' : '❌' },
      { name: 'ISO Date Format', status: responseData.subscription?.next_payment_date?.includes('T') ? '✅' : '❌' }
    ];
    
    validations.forEach(validation => {
      console.log(`${validation.status} ${validation.name}`);
    });
    
    const allPassed = validations.every(v => v.status === '✅');
    console.log(`\n🎯 RESULTADO FINAL: ${allPassed ? '✅ TODAS LAS VALIDACIONES PASARON' : '❌ ALGUNAS VALIDACIONES FALLARON'}`);
    
  } catch (error) {
    logError('ERROR CRÍTICO EN LA PRUEBA', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Ejecutar la prueba
if (require.main === module) {
  testDynamicSubscription();
}

module.exports = { testDynamicSubscription };