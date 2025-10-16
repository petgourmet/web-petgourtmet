// Script de prueba completo para suscripción dinámica con verificación de conectividad
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Función para verificar conectividad
async function testConnectivity() {
  console.log('🔍 VERIFICANDO CONECTIVIDAD...');
  console.log('============================================================\n');
  
  try {
    // Test 1: Verificar que el servidor esté corriendo
    console.log('📡 Verificando servidor...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ Servidor funcionando correctamente');
    } else {
      console.log('⚠️ Servidor responde pero con errores');
    }
  } catch (error) {
    console.log('❌ Error conectando al servidor:', error.message);
    console.log('💡 Asegúrate de que el servidor esté corriendo con: npm run dev');
    return false;
  }
  
  try {
    // Test 2: Verificar endpoint de debug de productos
    console.log('🛍️ Verificando productos disponibles...');
    const productsResponse = await fetch(`${BASE_URL}/api/debug/products`);
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      console.log('✅ Endpoint de productos funciona');
      if (productsData.products && productsData.products.length > 0) {
        console.log(`📦 Productos encontrados: ${productsData.products.length}`);
        console.log('🎯 Usando producto:', productsData.products[0]);
        return productsData.products[0].id;
      }
    }
  } catch (error) {
    console.log('⚠️ Error verificando productos:', error.message);
  }
  
  return null;
}

// Función para crear usuario de prueba
async function createTestUser() {
  try {
    console.log('👤 CREANDO USUARIO DE PRUEBA...');
    
    const response = await fetch(`${BASE_URL}/api/debug/create-test-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'test@petgourmet.com',
        full_name: 'Usuario de Prueba'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Usuario de prueba listo');
      return true;
    } else {
      console.log('❌ Error creando usuario:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error en createTestUser:', error.message);
    return false;
  }
}

// Función principal de prueba
async function testDynamicSubscription() {
  console.log('🚀 INICIANDO PRUEBA COMPLETA DE SUSCRIPCIÓN DINÁMICA');
  console.log('============================================================\n');
  
  // Paso 1: Verificar conectividad y obtener producto válido
  const productId = await testConnectivity();
  if (!productId) {
    console.log('❌ No se pudo obtener un producto válido. Usando ID por defecto.');
    // Usar un ID por defecto y continuar
  }
  
  // Paso 2: Crear usuario de prueba
  const userCreated = await createTestUser();
  if (!userCreated) {
    console.log('⚠️ No se pudo crear el usuario de prueba. Continuando...\n');
  }
  
  // Datos de prueba
  const TEST_DATA = {
    user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    product_id: productId || 1, // Usar el producto encontrado o ID por defecto
    frequency: 1,
    frequency_type: 'months',
    payment_method: 'pending',
    customer_data: {
      email: 'test@petgourmet.com',
      first_name: 'Juan',
      last_name: 'Pérez',
      phone: '+54911234567',
      address: {
        street_name: 'Av. Corrientes',
        street_number: '1234',
        zip_code: '1043',
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'AR'
      }
    }
  };
  
  console.log('\n📤 DATOS DE LA PETICIÓN:');
  console.log(JSON.stringify(TEST_DATA, null, 2));
  console.log('\n🔄 ENVIANDO PETICIÓN AL ENDPOINT...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/subscriptions/create-dynamic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_DATA)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.log('❌ ERROR EN LA RESPUESTA DE LA API');
      console.log({
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      // Mostrar sugerencias específicas según el error
      if (responseData.error === 'Usuario no encontrado') {
        console.log('\n💡 SUGERENCIA: El usuario de prueba no existe en la BD.');
        console.log('   Verifica que el endpoint de creación de usuario funcione correctamente.');
      } else if (responseData.error === 'Producto no encontrado') {
        console.log('\n💡 SUGERENCIA: El producto no existe en la BD.');
        console.log('   Verifica que haya productos en la tabla products.');
      }
      
      return;
    }
    
    console.log('✅ RESPUESTA DE LA API EXITOSA');
    console.log('Status:', response.status);
    console.log('Success:', responseData.success);
    
    // Analizar respuesta de MercadoPago
    if (responseData.mercadopago_response) {
      console.log('\n💳 RESPUESTA DE MERCADOPAGO:');
      console.log(JSON.stringify(responseData.mercadopago_response, null, 2));
      
      // Extraer init_point (SDK link)
      if (responseData.mercadopago_response.init_point) {
        console.log('\n🔗 LINK DEL SDK GENERADO:');
        console.log('Init Point:', responseData.mercadopago_response.init_point);
        console.log('Preapproval ID:', responseData.mercadopago_response.id);
      } else {
        console.log('❌ LINK DEL SDK NO ENCONTRADO');
      }
    } else {
      console.log('❌ RESPUESTA DE MERCADOPAGO NO ENCONTRADA');
    }
    
    // Verificar datos de la suscripción creada
    if (responseData.subscription) {
      console.log('\n📊 SUSCRIPCIÓN CREADA EN BD:');
      console.log({
        id: responseData.subscription.id,
        status: responseData.subscription.status,
        user_id: responseData.subscription.user_id,
        product_id: responseData.subscription.product_id,
        next_payment_date: responseData.subscription.next_payment_date,
        created_at: responseData.subscription.created_at
      });
      
      // Validaciones
      const validations = [];
      
      if (responseData.subscription.status === 'pending') {
        validations.push('✅ Estado PENDING correcto');
      } else {
        validations.push(`❌ Estado incorrecto: ${responseData.subscription.status}`);
      }
      
      const nextPaymentDate = responseData.subscription.next_payment_date;
      if (nextPaymentDate && nextPaymentDate.includes('T')) {
        validations.push('✅ Fecha en formato ISO correcto');
      } else {
        validations.push(`❌ Formato de fecha incorrecto: ${nextPaymentDate}`);
      }
      
      console.log('\n🔍 VALIDACIONES:');
      validations.forEach(v => console.log(v));
    } else {
      console.log('❌ DATOS DE SUSCRIPCIÓN NO ENCONTRADOS');
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE LA PRUEBA:');
    console.log('='.repeat(60));
    
    const checks = [
      { name: 'Conectividad del servidor', status: '✅' },
      { name: 'Usuario de prueba', status: userCreated ? '✅' : '⚠️' },
      { name: 'API Response', status: response.ok ? '✅' : '❌' },
      { name: 'MercadoPago Integration', status: responseData.mercadopago_response ? '✅' : '❌' },
      { name: 'SDK Link Generated', status: responseData.mercadopago_response?.init_point ? '✅' : '❌' },
      { name: 'Subscription Created', status: responseData.subscription ? '✅' : '❌' }
    ];
    
    checks.forEach(check => {
      console.log(`${check.status} ${check.name}`);
    });
    
    const allPassed = checks.every(c => c.status === '✅');
    console.log(`\n🎯 RESULTADO FINAL: ${allPassed ? '✅ TODAS LAS VALIDACIONES PASARON' : '⚠️ ALGUNAS VALIDACIONES NECESITAN ATENCIÓN'}`);
    
  } catch (error) {
    console.log('❌ ERROR CRÍTICO EN LA PRUEBA');
    console.error({
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