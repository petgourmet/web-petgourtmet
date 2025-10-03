// Script para simular webhook de MercadoPago con datos reales

async function simulateWebhook() {
  console.log('🧪 SIMULANDO WEBHOOK DE MERCADOPAGO');
  console.log('📋 Datos del caso real:');
  console.log('- Suscripción ID: 172');
  console.log('- User ID: 2f4ec8c0-0e58-486d-9c11-a652368f7c19');
  console.log('- External Reference Suscripción: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de');
  console.log('- Collection ID: 128493659214');
  console.log('- External Reference Pago: 29e2b00ced3e47f981e3bec896ef1643');
  console.log('- Status: approved');
  console.log('');

  const webhookData = {
    id: 128493659214,
    live_mode: true,
    type: "payment",
    date_created: "2025-10-03T17:24:29.000-04:00",
    application_id: 2718057813,
    user_id: 1459023464,
    version: 1,
    api_version: "v1",
    action: "payment.created",
    data: {
      id: "128493659214"
    }
  };

  try {
    console.log('🚀 Enviando webhook a localhost:3000...');
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago/1.0',
        'X-Request-Id': 'test-request-' + Date.now()
      },
      body: JSON.stringify(webhookData)
    });

    console.log('📊 Respuesta del servidor:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('- Body:', responseText);

    if (response.ok) {
      console.log('✅ WEBHOOK PROCESADO EXITOSAMENTE');
    } else {
      console.log('❌ ERROR EN EL PROCESAMIENTO DEL WEBHOOK');
    }

  } catch (error) {
    console.error('💥 ERROR AL ENVIAR WEBHOOK:', error.message);
  }
}

// Ejecutar la simulación
simulateWebhook().catch(console.error);