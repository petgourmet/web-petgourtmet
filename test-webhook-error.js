// Test para reproducir el error 500 del webhook de MercadoPago
// Payment ID: 127639262364, Order ID: 178

const testWebhookPayload = {
  "action": "payment.created",
  "api_version": "v1",
  "data": {
    "id": "127639262364"
  },
  "date_created": "2025-09-26T17:48:13Z",
  "id": 125030034984,
  "live_mode": true,
  "type": "payment",
  "user_id": "1227980651"
};

async function testWebhook() {
  try {
    console.log('🧪 Probando webhook con datos del error...');
    console.log('📦 Payload:', JSON.stringify(testWebhookPayload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago/1.0'
      },
      body: JSON.stringify(testWebhookPayload)
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Response:', responseText);
    
    if (response.status === 500) {
      console.log('❌ ERROR 500 REPRODUCIDO');
      try {
        const errorData = JSON.parse(responseText);
        console.log('🔍 Detalles del error:', errorData);
      } catch (e) {
        console.log('🔍 Response no es JSON válido');
      }
    } else {
      console.log('✅ Webhook procesado exitosamente');
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

// Ejecutar el test
testWebhook();