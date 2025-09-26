#!/usr/bin/env node

/**
 * Script para probar el webhook de MercadoPago localmente
 * Uso: node scripts/test-webhook.js
 */

const https = require('https');
const http = require('http');

const WEBHOOK_URL = 'http://localhost:3000/api/mercadopago/webhook';

// Payloads de prueba
const testPayloads = [
  {
    name: 'Payment Created',
    payload: {
      action: 'payment.created',
      api_version: 'v1',
      data: { id: '123456' },
      date_created: '2021-11-01T02:02:02Z',
      id: '123456',
      live_mode: false,
      type: 'payment',
      user_id: 1227980651
    }
  },
  {
    name: 'Payment Updated',
    payload: {
      action: 'payment.updated',
      api_version: 'v1',
      data: { id: '127639262364' },
      date_created: '2021-11-01T02:02:02Z',
      id: '127639262364',
      live_mode: false,
      type: 'payment',
      user_id: 1227980651
    }
  },
  {
    name: 'Subscription Payment',
    payload: {
      action: 'payment.updated',
      api_version: 'v1',
      data: { id: 'subscription_123456' },
      date_created: '2021-11-01T02:02:02Z',
      id: 'subscription_123456',
      live_mode: false,
      type: 'subscription_authorized_payment',
      user_id: 1227980651
    }
  }
];

function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload.payload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/mercadopago/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'MercadoPago-Webhook-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          data: responseData,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function testWebhooks() {
  console.log('🔔 Iniciando pruebas del webhook de MercadoPago...');
  console.log(`📍 URL: ${WEBHOOK_URL}`);
  console.log('');

  for (const testCase of testPayloads) {
    try {
      console.log(`🧪 Probando: ${testCase.name}`);
      console.log(`📦 Payload:`, JSON.stringify(testCase.payload, null, 2));
      
      const response = await makeRequest(testCase);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${testCase.name}: SUCCESS (${response.statusCode})`);
        console.log(`📄 Respuesta:`, response.data);
      } else {
        console.log(`❌ ${testCase.name}: FAILED (${response.statusCode})`);
        console.log(`📄 Respuesta:`, response.data);
      }
      
    } catch (error) {
      console.log(`💥 ${testCase.name}: ERROR`);
      console.log(`❌ Error:`, error.message);
    }
    
    console.log(''.padEnd(50, '-'));
  }

  console.log('🏁 Pruebas completadas');
}

// Verificar si el servidor está corriendo
function checkServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/mercadopago/webhook',
      method: 'GET'
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
}

async function main() {
  console.log('🚀 Verificando servidor...');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ El servidor no está corriendo en localhost:3000');
    console.log('💡 Ejecuta: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Servidor detectado en localhost:3000');
  console.log('');
  
  await testWebhooks();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebhooks, makeRequest };