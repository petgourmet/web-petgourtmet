/**
 * SCRIPT DE PRUEBA: Webhook Real para Suscripción 168
 * 
 * Este script simula exactamente el webhook que MercadoPago debería enviar
 * para el pago exitoso de la suscripción 168 con Payment ID: 128490999834
 */

const http = require('http')

// Datos exactos del webhook que MercadoPago enviaría
const webhookPayload = {
  id: `webhook_${Date.now()}`,
  live_mode: true,
  type: "payment",
  date_created: new Date().toISOString(),
  application_id: "1329434229865091",
  user_id: null,
  version: 1,
  api_version: "v1",
  action: "payment.updated",
  data: {
    id: "128490999834"  // Payment ID real del pago exitoso
  }
}

async function testRealWebhook() {
  console.log('🚀 === PRUEBA DE WEBHOOK REAL PARA SUSCRIPCIÓN 168 ===')
  console.log('📋 Simulando webhook de MercadoPago con datos reales del pago exitoso')
  console.log('================================================================================')
  console.log('')
  
  console.log('📨 DATOS DEL WEBHOOK:')
  console.log(`   - Type: ${webhookPayload.type}`)
  console.log(`   - Action: ${webhookPayload.action}`)
  console.log(`   - Payment ID: ${webhookPayload.data.id}`)
  console.log(`   - Live Mode: ${webhookPayload.live_mode}`)
  console.log('')
  
  console.log('💳 DATOS DEL PAGO ESPERADOS:')
  console.log('   - Payment ID: 128490999834')
  console.log('   - Status: approved')
  console.log('   - External Reference: af0e2bea36b84a9b99851cfc1cbaece7')
  console.log('   - Amount: 36.45 MXN')
  console.log('   - Payer Email: cristoferscalante@gmail.com')
  console.log('   - Subscription ID: 168')
  console.log('')
  
  console.log('🔍 SUSCRIPCIÓN OBJETIVO:')
  console.log('   - ID: 168')
  console.log('   - User ID: 2f4ec8c0-0e58-486d-9c11-a652368f7c19')
  console.log('   - External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de')
  console.log('   - Status Actual: pending')
  console.log('   - Status Esperado: active')
  console.log('')
  
  try {
    console.log('📤 ENVIANDO WEBHOOK AL ENDPOINT LOCAL...')
    console.log('================================================================================')
    
    const postData = JSON.stringify(webhookPayload)
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/mercadopago/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-signature': 'test-signature-168',
        'x-request-id': `test-request-168-${Date.now()}`,
        'User-Agent': 'MercadoPago/1.0 (Test Webhook 168)'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: data
          })
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.write(postData)
      req.end()
    })

    console.log('📡 RESPUESTA DEL WEBHOOK:')
    console.log(`   - Status Code: ${response.status}`)
    console.log(`   - Status Text: ${response.statusText}`)
    console.log(`   - Response Body: ${response.data}`)
    console.log('')

    if (response.status === 200) {
      console.log('✅ WEBHOOK PROCESADO EXITOSAMENTE')
      console.log('   El sistema debería haber:')
      console.log('   1. ✅ Recibido el webhook de pago')
      console.log('   2. ✅ Obtenido los datos del pago (Payment ID: 128490999834)')
      console.log('   3. ✅ Identificado que es un pago de suscripción')
      console.log('   4. ✅ Encontrado la suscripción 168 usando múltiples criterios')
      console.log('   5. ✅ Activado la suscripción (pending → active)')
      console.log('   6. ✅ Enviado email de confirmación')
      console.log('')
      console.log('🎉 LA SUSCRIPCIÓN 168 DEBERÍA ESTAR ACTIVA AHORA')
    } else {
      console.log('❌ ERROR EN EL PROCESAMIENTO DEL WEBHOOK')
      console.log('   Posibles causas:')
      console.log('   - El método processPaymentWebhook no está funcionando')
      console.log('   - Error en la búsqueda de la suscripción')
      console.log('   - Error en la activación de la suscripción')
      console.log('   - Error en la base de datos')
    }

  } catch (error) {
    console.log('❌ ERROR ENVIANDO WEBHOOK:', error.message)
    console.log('')
    console.log('🔧 POSIBLES SOLUCIONES:')
    console.log('   1. Verificar que el servidor esté corriendo en puerto 3000')
    console.log('   2. Verificar que el endpoint /api/mercadopago/webhook esté disponible')
    console.log('   3. Revisar logs del servidor para más detalles')
  }
  
  console.log('')
  console.log('================================================================================')
  console.log('🔍 PRÓXIMOS PASOS:')
  console.log('   1. Verificar el estado de la suscripción 168 en la base de datos')
  console.log('   2. Revisar logs del webhook para confirmar procesamiento')
  console.log('   3. Si sigue pending, activar manualmente')
  console.log('   4. Diagnosticar por qué el sistema automático no funciona')
  console.log('================================================================================')
}

// Ejecutar la prueba
testRealWebhook().then(() => {
  console.log('\n✅ Prueba de webhook completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando prueba:', error.message)
  process.exit(1)
})