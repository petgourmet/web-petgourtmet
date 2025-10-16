const fs = require('fs');

console.log('🚀 PRUEBA SIMPLE DE SUSCRIPCIÓN DINÁMICA');
console.log('============================================================');

// Datos de prueba mínimos
const TEST_DATA = {
  user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  product_id: 59,
  frequency: 1,
  frequency_type: 'months',
  payment_method: 'pending',
  customer_data: {
    email: 'test_mx_simple@testuser.com',
    first_name: 'Test',
    last_name: 'User',
    phone: '+5255123456789',
    address: {
      street_name: 'Av. Insurgentes',
      street_number: '123',
      zip_code: '03100',
      city: 'CDMX',
      state: 'CDMX',
      country: 'MX'
    }
  }
};

async function testSimpleSubscription() {
  try {
    console.log('📤 ENVIANDO PETICIÓN SIMPLE...');
    console.log(JSON.stringify(TEST_DATA, null, 2));
    console.log('');

    const response = await fetch('http://localhost:3000/api/subscriptions/create-dynamic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_DATA)
    });

    const responseData = await response.json();

    console.log('📥 RESPUESTA:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.success) {
      console.log('');
      console.log('✅ ÉXITO! SUSCRIPCIÓN CREADA');
      
      if (responseData.init_point) {
        console.log('');
        console.log('🔗 LINK DE PAGO:');
        console.log(responseData.init_point);
        console.log('');
        console.log('🎯 DATOS DE PRUEBA PARA EL CHECKOUT:');
        console.log('Tarjeta: 4509 9535 6623 3704');
        console.log('CVV: 123');
        console.log('Vencimiento: 11/25');
        console.log('Nombre: APRO');
      }
      
      console.log('');
      console.log('🎉 PRUEBA COMPLETADA EXITOSAMENTE');
      
    } else {
      console.log('');
      console.log('❌ ERROR:', responseData.error || 'Error desconocido');
    }

  } catch (error) {
    console.log('❌ ERROR DE CONEXIÓN:', error.message);
  }
}

testSimpleSubscription();