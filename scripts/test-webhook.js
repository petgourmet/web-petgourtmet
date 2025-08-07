/**
 * Script de prueba para verificar el sistema de webhooks de MercadoPago
 * 
 * Uso:
 * node scripts/test-webhook.js
 */

const https = require('https')
const http = require('http')

// Configuración
const config = {
  // Cambia esta URL por tu dominio en producción o ngrok en desarrollo
  webhookUrl: 'http://localhost:3000/api/mercadopago/webhook',
  // webhookUrl: 'https://your-domain.com/api/mercadopago/webhook',
  // webhookUrl: 'https://abc123.ngrok.io/api/mercadopago/webhook',
}

// Datos de prueba para webhook de pago
const paymentWebhookData = {
  id: 'test-webhook-payment',
  live_mode: false,
  type: 'payment',
  date_created: new Date().toISOString(),
  application_id: '123456789',
  user_id: '987654321',
  version: 1,
  api_version: 'v1',
  action: 'payment.updated',
  data: {
    id: '1234567890' // ID de pago de prueba
  }
}

// Datos de prueba para webhook de suscripción
const subscriptionWebhookData = {
  id: 'test-webhook-subscription',
  live_mode: false,
  type: 'subscription_preapproval',
  date_created: new Date().toISOString(),
  application_id: '123456789',
  user_id: '987654321',
  version: 1,
  api_version: 'v1',
  action: 'created',
  data: {
    id: 'sub_1234567890' // ID de suscripción de prueba
  }
}

// Función para enviar webhook
function sendWebhook(webhookData, description) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.webhookUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http
    
    const postData = JSON.stringify(webhookData)
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-signature': 'test-signature',
        'x-request-id': `test-${Date.now()}`,
        'user-agent': 'MercadoPago/Test'
      }
    }

    console.log(`\n🧪 Enviando ${description}...`)
    console.log(`📍 URL: ${config.webhookUrl}`)
    console.log(`📦 Datos:`, {
      type: webhookData.type,
      action: webhookData.action,
      dataId: webhookData.data.id
    })

    const req = client.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`)
        
        try {
          const jsonResponse = JSON.parse(responseData)
          console.log(`✅ Respuesta:`, jsonResponse)
        } catch (e) {
          console.log(`📄 Respuesta (texto):`, responseData)
        }
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: responseData })
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
        }
      })
    })

    req.on('error', (error) => {
      console.error(`❌ Error de conexión:`, error.message)
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

// Función para verificar el endpoint GET
function checkEndpointStatus() {
  return new Promise((resolve, reject) => {
    const url = new URL(config.webhookUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'user-agent': 'Test-Script/1.0'
      }
    }

    console.log(`\n🔍 Verificando estado del endpoint...`)
    console.log(`📍 URL: ${config.webhookUrl}`)

    const req = client.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`)
        
        try {
          const jsonResponse = JSON.parse(responseData)
          console.log(`✅ Estado del endpoint:`, jsonResponse)
        } catch (e) {
          console.log(`📄 Respuesta (texto):`, responseData)
        }
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: responseData })
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
        }
      })
    })

    req.on('error', (error) => {
      console.error(`❌ Error de conexión:`, error.message)
      reject(error)
    })

    req.end()
  })
}

// Función principal
async function runTests() {
  console.log('🚀 Iniciando pruebas del sistema de webhooks de MercadoPago')
  console.log('=' .repeat(60))
  
  try {
    // 1. Verificar estado del endpoint
    await checkEndpointStatus()
    
    // 2. Probar webhook de pago
    await sendWebhook(paymentWebhookData, 'webhook de pago')
    
    // 3. Probar webhook de suscripción
    await sendWebhook(subscriptionWebhookData, 'webhook de suscripción')
    
    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!')
    console.log('\n📋 Próximos pasos:')
    console.log('1. Verificar logs del servidor para confirmar el procesamiento')
    console.log('2. Revisar la base de datos para confirmar actualizaciones')
    console.log('3. Configurar la URL del webhook en el panel de MercadoPago')
    console.log('4. Probar con pagos reales en el entorno de sandbox')
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message)
    console.log('\n🔧 Posibles soluciones:')
    console.log('1. Verificar que el servidor esté corriendo (npm run dev)')
    console.log('2. Verificar la URL del webhook en la configuración')
    console.log('3. Si usas ngrok, verificar que esté corriendo y la URL sea correcta')
    console.log('4. Verificar que no haya errores en el código del webhook')
    
    process.exit(1)
  }
}

// Ejecutar pruebas
if (require.main === module) {
  runTests()
}

module.exports = {
  sendWebhook,
  checkEndpointStatus,
  paymentWebhookData,
  subscriptionWebhookData
}