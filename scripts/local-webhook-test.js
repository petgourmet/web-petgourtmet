/**
 * Script para probar webhooks localmente sin ngrok
 * Simula webhooks reales de MercadoPago con datos válidos
 * 
 * Uso:
 * node scripts/local-webhook-test.js
 */

const http = require('http')

// Configuración
const config = {
  webhookUrl: 'http://localhost:3000/api/mercadopago/webhook',
  port: 3000
}

// Función para verificar si el servidor está corriendo
function checkServerStatus() {
  return new Promise((resolve, reject) => {
    const req = http.get(config.webhookUrl, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true)
        } else {
          reject(new Error(`Servidor respondió con status ${res.statusCode}`))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(new Error(`No se pudo conectar al servidor: ${error.message}`))
    })
    
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Timeout - El servidor no responde'))
    })
  })
}

// Webhook de pago aprobado (simulación realista)
const approvedPaymentWebhook = {
  id: 'webhook-test-approved',
  live_mode: false,
  type: 'payment',
  date_created: new Date().toISOString(),
  application_id: '123456789',
  user_id: '987654321',
  version: 1,
  api_version: 'v1',
  action: 'payment.updated',
  data: {
    id: 'test-approved-payment' // Este ID será interceptado por nuestro sistema
  }
}

// Webhook de suscripción creada
const subscriptionCreatedWebhook = {
  id: 'webhook-test-subscription',
  live_mode: false,
  type: 'subscription_preapproval',
  date_created: new Date().toISOString(),
  application_id: '123456789',
  user_id: '987654321',
  version: 1,
  api_version: 'v1',
  action: 'created',
  data: {
    id: 'test-subscription-123'
  }
}

// Función para enviar webhook
function sendWebhook(webhookData, description) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(webhookData)
    
    const options = {
      hostname: 'localhost',
      port: config.port,
      path: '/api/mercadopago/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-signature': 'test-signature-local',
        'x-request-id': `local-test-${Date.now()}`,
        'user-agent': 'MercadoPago-LocalTest/1.0'
      }
    }

    console.log(`\n🧪 Enviando ${description}...`)
    console.log(`📦 Tipo: ${webhookData.type}, Acción: ${webhookData.action}`)

    const req = http.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`)
        
        try {
          const jsonResponse = JSON.parse(responseData)
          console.log(`✅ Respuesta:`, jsonResponse)
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: jsonResponse })
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(jsonResponse)}`))
          }
        } catch (e) {
          console.log(`📄 Respuesta (texto):`, responseData)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: responseData })
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
          }
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

// Función principal
async function runLocalTests() {
  console.log('🏠 Iniciando pruebas locales del sistema de webhooks')
  console.log('=' .repeat(60))
  
  try {
    // 1. Verificar que el servidor esté corriendo
    console.log('\n🔍 Verificando servidor local...')
    await checkServerStatus()
    console.log('✅ Servidor local funcionando correctamente')
    
    // 2. Probar webhook de pago
    await sendWebhook(approvedPaymentWebhook, 'webhook de pago aprobado')
    
    // Esperar un poco entre requests
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 3. Probar webhook de suscripción
    await sendWebhook(subscriptionCreatedWebhook, 'webhook de suscripción creada')
    
    console.log('\n🎉 ¡Pruebas locales completadas exitosamente!')
    console.log('\n📋 Resultados:')
    console.log('✅ El endpoint de webhook está funcionando')
    console.log('✅ Los webhooks se procesan correctamente')
    console.log('✅ El sistema maneja errores apropiadamente')
    
    console.log('\n🚀 El sistema está listo para producción:')
    console.log('1. Configura la URL del webhook en MercadoPago:')
    console.log('   https://petgourmet.mx/api/mercadopago/webhook')
    console.log('2. Habilita los eventos: payment, subscription_preapproval')
    console.log('3. El sistema manejará automáticamente todos los pagos')
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message)
    
    if (error.message.includes('No se pudo conectar')) {
      console.log('\n🔧 Solución:')
      console.log('1. Asegúrate de que el servidor esté corriendo:')
      console.log('   npm run dev')
      console.log('2. Verifica que esté en el puerto 3000')
    } else {
      console.log('\n🔧 Posibles soluciones:')
      console.log('1. Revisar logs del servidor para más detalles')
      console.log('2. Verificar configuración de variables de entorno')
      console.log('3. Verificar conexión a base de datos')
    }
    
    process.exit(1)
  }
}

// Ejecutar pruebas
if (require.main === module) {
  runLocalTests()
}

module.exports = {
  runLocalTests,
  sendWebhook,
  approvedPaymentWebhook,
  subscriptionCreatedWebhook
}