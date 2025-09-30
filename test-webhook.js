const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testWebhookEndpoint() {
  console.log('🧪 Probando endpoint de webhook...');
  
  // Datos de prueba simulando un webhook de MercadoPago
  const testWebhookData = {
    id: "test-webhook-" + Date.now(),
    live_mode: false,
    type: "subscription_preapproval",
    date_created: new Date().toISOString(),
    application_id: "test-app",
    user_id: "test-user",
    version: 1,
    api_version: "v1",
    action: "updated",
    data: {
      id: "test-subscription-123"
    }
  };

  try {
    // Probar endpoint con POST (simulando webhook real)
    console.log('📤 Enviando webhook de prueba...');
    
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago/Test',
        'X-Request-Id': 'test-request-' + Date.now()
      },
      body: JSON.stringify(testWebhookData)
    });

    console.log(`📊 Respuesta del webhook:`);
    console.log(`   - Status: ${response.status} ${response.statusText}`);
    console.log(`   - Headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`   - Body: ${responseText}`);
    
    if (response.ok) {
      console.log('✅ Webhook endpoint respondió correctamente');
    } else {
      console.log('⚠️ Webhook endpoint respondió con error');
    }

    // Probar endpoint con GET (verificación de estado)
    console.log('\n🔍 Probando endpoint GET...');
    
    const getResponse = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'GET'
    });
    
    console.log(`📊 Respuesta GET:`);
    console.log(`   - Status: ${getResponse.status} ${getResponse.statusText}`);
    
    const getResponseText = await getResponse.text();
    console.log(`   - Body: ${getResponseText}`);
    
    if (getResponse.ok) {
      console.log('✅ Endpoint GET funcionando correctamente');
    }

  } catch (error) {
    console.error('❌ Error probando webhook:', error.message);
  }
}

testWebhookEndpoint();