// Script para reproducir el error del SDK de MercadoPago
require('dotenv').config({ path: '.env.local' });

async function testMercadoPagoAPI() {
  console.log('🧪 PROBANDO API DE MERCADOPAGO - REPRODUCIR ERROR 400');
  console.log('=' .repeat(60));
  
  // Datos de ejemplo que podrían estar causando el error
  const testData = {
    items: [
      {
        id: "test-product-1",
        name: "Galletas de pollo",
        title: "Galletas de pollo",
        description: "Galletas nutritivas para perros",
        picture_url: "https://example.com/image.jpg",
        quantity: 1,
        price: 130,
        unit_price: 130
      }
    ],
    customerData: {
      firstName: "Juan",
      lastName: "Pérez",
      email: "test@example.com",
      phone: "5551234567",
      address: {
        street_name: "Calle Principal",
        street_number: "123",
        zip_code: "12345",
        city: "Ciudad de México",
        state: "CDMX",
        country: "México"
      }
    },
    externalReference: `test-${Date.now()}`,
    backUrls: {
      success: "http://localhost:3000/checkout/success",
      failure: "http://localhost:3000/checkout/failure",
      pending: "http://localhost:3000/checkout/pending"
    }
  };
  
  console.log('📤 Enviando datos a la API:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/mercadopago/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📥 Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseData = await response.json();
    console.log('Response Data:', JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      console.log('\n❌ ERROR DETECTADO:');
      console.log('Detalles del error:', responseData.details);
      if (responseData.receivedData) {
        console.log('\n📋 Datos recibidos por el servidor:');
        console.log(JSON.stringify(responseData.receivedData, null, 2));
      }
    } else {
      console.log('\n✅ API funcionó correctamente');
    }
    
  } catch (error) {
    console.error('\n💥 Error en la solicitud:', error.message);
  }
}

// Ejecutar la prueba
testMercadoPagoAPI();