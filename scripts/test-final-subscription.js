const fs = require('fs');

console.log('🚀 PRUEBA FINAL DE SUSCRIPCIÓN DINÁMICA - MERCADOPAGO MX');
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

// Datos de prueba específicos para MercadoPago México
const TEST_DATA = {
  user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  product_id: 59, // Producto real encontrado en la BD
  frequency: 1,
  frequency_type: 'months',
  payment_method: 'pending',
  customer_data: {
    // Email de prueba específico para MercadoPago México
    email: 'test_user_mx@testuser.com',
    first_name: 'APRO', // Nombre de prueba que aprueba automáticamente
    last_name: 'Test',
    phone: '+5255123456789',
    address: {
      street_name: 'Av. Insurgentes Sur',
      street_number: '1234',
      zip_code: '03100',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'MX'
    }
  }
};

async function testDynamicSubscription() {
  try {
    console.log('📊 CONFIGURACIÓN ACTUAL:');
    console.log('Modo:', envVars.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true' ? 'PRUEBAS' : 'PRODUCCIÓN');
    console.log('Entorno:', envVars.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT || 'sandbox');
    console.log('Locale:', envVars.NEXT_PUBLIC_MERCADOPAGO_LOCALE || 'es-MX');
    console.log('');

    console.log('📤 DATOS DE LA PETICIÓN:');
    console.log(JSON.stringify(TEST_DATA, null, 2));
    console.log('');

    console.log('🔄 ENVIANDO PETICIÓN AL ENDPOINT...');
    console.log('');

    const response = await fetch('http://localhost:3000/api/subscriptions/create-dynamic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_DATA)
    });

    const responseData = await response.json();

    if (response.ok && responseData.success) {
      console.log('✅ SUSCRIPCIÓN CREADA EXITOSAMENTE');
      console.log('============================================================');
      console.log('');
      
      console.log('📋 RESPUESTA DE LA API:');
      console.log(JSON.stringify(responseData, null, 2));
      console.log('');
      
      if (responseData.init_point) {
        console.log('🔗 LINK DEL SDK DE MERCADOPAGO:');
        console.log(responseData.init_point);
        console.log('');
        console.log('💡 INSTRUCCIONES:');
        console.log('1. Copia el link anterior en tu navegador');
        console.log('2. Usa los siguientes datos de prueba:');
        console.log('   - Tarjeta: 4509 9535 6623 3704');
        console.log('   - CVV: 123');
        console.log('   - Vencimiento: 11/25');
        console.log('   - Nombre: APRO');
        console.log('   - Email: test_user_mx@testuser.com');
        console.log('');
      }
      
      if (responseData.subscription_id) {
        console.log('🗄️ REGISTRO EN BASE DE DATOS:');
        console.log('ID de suscripción:', responseData.subscription_id);
        console.log('External Reference:', responseData.external_reference);
        console.log('Estado:', responseData.status);
        console.log('');
      }
      
      console.log('🎉 PRUEBA COMPLETADA EXITOSAMENTE');
      console.log('La suscripción está lista para procesar pagos.');
      
    } else {
      console.log('❌ ERROR EN LA RESPUESTA DE LA API');
      console.log({
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      // Sugerencias específicas según el error
      if (responseData.error && responseData.error.includes('Cannot operate between different countries')) {
        console.log('');
        console.log('💡 SUGERENCIA:');
        console.log('Este error indica que hay un conflicto de países entre:');
        console.log('- Las credenciales de MercadoPago (configuradas para MX)');
        console.log('- El email del usuario (puede estar registrado en otro país)');
        console.log('- La ubicación del servidor o IP');
        console.log('');
        console.log('SOLUCIONES:');
        console.log('1. Usar un email de prueba específico para MX');
        console.log('2. Verificar que las credenciales sean de México');
        console.log('3. Usar VPN con IP de México si es necesario');
      }
    }

  } catch (error) {
    console.log('❌ ERROR DE CONEXIÓN:');
    console.log(error.message);
    console.log('');
    console.log('💡 VERIFICA:');
    console.log('- Que el servidor esté ejecutándose (npm run dev)');
    console.log('- Que el puerto 3000 esté disponible');
    console.log('- La conectividad a internet');
  }
}

// Ejecutar la prueba
testDynamicSubscription();