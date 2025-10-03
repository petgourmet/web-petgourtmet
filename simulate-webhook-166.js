const https = require('https');
const http = require('http');

async function simulateWebhook() {
  console.log('🔄 SIMULANDO WEBHOOK DE MERCADO PAGO...');
  
  // Datos del webhook simulado basados en el pago exitoso
  const webhookData = {
    id: 128488428512,
    live_mode: true,
    type: "payment",
    date_created: new Date().toISOString(),
    application_id: null,
    user_id: null,
    version: 1,
    api_version: "v1",
    action: "payment.updated",
    data: {
      id: "128488428512"
    }
  };

  // Datos del pago que MercadoPago enviaría
  const paymentData = {
    id: 128488428512,
    status: "approved",
    status_detail: "accredited",
    external_reference: "45321cfb460f4267ab42f48b25065022",
    payment_method_id: "visa",
    payment_type_id: "credit_card",
    transaction_amount: 36.45,
    currency_id: "MXN",
    date_created: "2025-10-03T16:42:01.000-04:00",
    date_approved: "2025-10-03T16:42:01.000-04:00",
    payer: {
      id: "123456789",
      email: "cristoferscalante@gmail.com",
      identification: {
        type: "RFC",
        number: "XAXX010101000"
      }
    },
    metadata: {
      subscription_id: "166",
      user_id: "2f4ec8c0-0e58-486d-9c11-a652368f7c19"
    }
  };

  try {
    console.log('📤 Enviando webhook simulado al endpoint local...');
    console.log('- Payment ID:', paymentData.id);
    console.log('- Status:', paymentData.status);
    console.log('- External Reference:', paymentData.external_reference);
    console.log('- Amount:', paymentData.transaction_amount);

    // Simular el webhook a nuestro endpoint local usando http nativo
    const postData = JSON.stringify(webhookData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/mercadopago/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-signature': 'test-signature', // Firma simulada
        'x-request-id': 'test-request-id'
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    console.log('✅ Webhook enviado exitosamente!');
    console.log('- Status Code:', response.status);
    console.log('- Response:', response.data);

    // También simular la consulta del pago
    console.log('\n📋 Simulando consulta de pago a MercadoPago API...');
    
    // Esto simularía lo que nuestro webhook haría al consultar el pago
    console.log('Payment Data que recibiría nuestro sistema:');
    console.log(JSON.stringify(paymentData, null, 2));

  } catch (error) {
    console.error('❌ Error al enviar webhook:', error.message);
    if (error.status) {
      console.error('- Status:', error.status);
      console.error('- Response:', error.data);
    }
    
    console.log('\n🔍 DIAGNÓSTICO DEL ERROR:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ El servidor local no está corriendo en puerto 3000');
      console.log('💡 Solución: Ejecutar "npm run dev" para iniciar el servidor');
    } else if (error.status === 401) {
      console.log('❌ Error de autenticación - Firma del webhook inválida');
      console.log('💡 Problema: La validación de firma está rechazando webhooks válidos');
    } else if (error.status === 404) {
      console.log('❌ Endpoint del webhook no encontrado');
      console.log('💡 Verificar que la ruta /api/mercadopago/webhook existe');
    } else if (error.status === 500) {
      console.log('❌ Error interno del servidor');
      console.log('💡 Revisar logs del servidor para más detalles');
    }
  }
}

// Ejecutar la simulación
simulateWebhook();