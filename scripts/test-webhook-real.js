#!/usr/bin/env node

/**
 * Script para probar webhook real de MercadoPago con el servidor en funcionamiento
 * Simula un webhook de subscription_preapproval para verificar que funcione correctamente
 */

const fetch = require('node-fetch')

async function testWebhookReal() {
  console.log('🚀 INICIANDO PRUEBA DE WEBHOOK REAL')
  console.log('================================================================================')
  
  // Datos del webhook simulado (basado en el ejemplo del usuario)
  const webhookData = {
    action: "updated",
    application_id: "1329434229865091",
    data: { id: "123456" },
    date: "2021-11-01T02:02:02Z",
    entity: "preapproval",
    id: "123456",
    type: "subscription_preapproval",
    version: 8
  }

  console.log('1️⃣ DATOS DEL WEBHOOK A ENVIAR')
  console.log('--------------------------------------------------')
  console.log(JSON.stringify(webhookData, null, 2))

  try {
    console.log('\n2️⃣ ENVIANDO WEBHOOK AL SERVIDOR LOCAL')
    console.log('--------------------------------------------------')
    
    const response = await fetch('http://localhost:3000/api/mercadopago/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago/1.0'
      },
      body: JSON.stringify(webhookData)
    })

    const responseText = await response.text()
    
    console.log(`📡 Respuesta del webhook:`)
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Body: ${responseText}`)
    
    if (response.ok) {
      console.log('✅ Webhook procesado exitosamente')
      
      // Parsear respuesta para obtener más detalles
      try {
        const responseData = JSON.parse(responseText)
        console.log('📋 Detalles de la respuesta:')
        console.log(`   - Tipo: ${responseData.type || 'N/A'}`)
        console.log(`   - Acción: ${responseData.action || 'N/A'}`)
        console.log(`   - Timestamp: ${responseData.timestamp || 'N/A'}`)
        console.log(`   - Mensaje: ${responseData.message || 'N/A'}`)
      } catch (e) {
        console.log('📋 Respuesta no es JSON válido')
      }
    } else {
      console.log('❌ Error procesando webhook')
    }

  } catch (error) {
    console.error('💥 Error enviando webhook:', error.message)
  }

  console.log('\n3️⃣ VERIFICANDO LOGS DEL SERVIDOR')
  console.log('--------------------------------------------------')
  console.log('💡 Revisa la consola del servidor (terminal donde corre npm run dev)')
  console.log('   para ver los logs detallados del procesamiento del webhook')

  console.log('\n✅ PRUEBA DE WEBHOOK REAL COMPLETADA')
  console.log('================================================================================')
}

// Ejecutar la prueba
testWebhookReal().catch(console.error)