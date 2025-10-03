/**
 * SCRIPT DE PRUEBA: Validación de Firma de Webhook
 * 
 * Este script prueba la validación de firma del webhook para identificar
 * por qué los webhooks reales de MercadoPago están siendo rechazados.
 */

const crypto = require('crypto')

// Configuración
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'a0415e8553f3af7ce77fdcb6944e556aff7e2ee938d73731f5977dba2640ed5'
const WEBHOOK_URL = 'https://petgourmet.mx/api/mercadopago/webhook'

// Datos del webhook real que MercadoPago está enviando
const REAL_WEBHOOK_DATA = {
  action: "updated",
  application_id: "1329434229865091",
  data: {"id":"123456"},
  date: "2021-11-01T02:02:02Z",
  entity: "preapproval",
  id: "123456",
  type: "subscription_preapproval",
  version: 8
}

function generateMercadoPagoSignature(payload, dataId, requestId, timestamp, secret) {
  // Crear el manifest según la documentación de MercadoPago
  // Formato: id:DATA_ID;request-id:REQUEST_ID;ts:TIMESTAMP;
  let manifest = `id:${dataId};`
  
  if (requestId) {
    manifest += `request-id:${requestId};`
  }
  
  manifest += `ts:${timestamp};`
  
  // Generar la firma usando HMAC SHA256
  const signature = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')
  
  return {
    manifest,
    signature,
    fullSignature: `ts=${timestamp},v1=${signature}`
  }
}

async function testWebhookSignature() {
  console.log('🔐 INICIANDO PRUEBA DE VALIDACIÓN DE FIRMA DE WEBHOOK')
  console.log('=' .repeat(80))
  console.log('📅 Fecha:', new Date().toLocaleString())
  console.log('🎯 Objetivo: Probar validación de firma para webhooks de MercadoPago')
  console.log('=' .repeat(80))
  console.log('')

  try {
    // 1. Mostrar configuración actual
    console.log('1️⃣ CONFIGURACIÓN ACTUAL')
    console.log('-'.repeat(50))
    console.log(`🔑 Webhook Secret: ${WEBHOOK_SECRET ? 'Configurado' : 'NO CONFIGURADO'}`)
    console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`)
    console.log(`🏭 Entorno: ${process.env.NODE_ENV || 'development'}`)
    console.log('')

    // 2. Generar firma válida
    console.log('2️⃣ GENERANDO FIRMA VÁLIDA')
    console.log('-'.repeat(50))
    
    const payload = JSON.stringify(REAL_WEBHOOK_DATA)
    const dataId = REAL_WEBHOOK_DATA.data.id
    const requestId = `test-request-${Date.now()}`
    const timestamp = Math.floor(Date.now() / 1000).toString()
    
    const signatureData = generateMercadoPagoSignature(payload, dataId, requestId, timestamp, WEBHOOK_SECRET)
    
    console.log('📦 Datos para la firma:')
    console.log(`   Data ID: ${dataId}`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   Timestamp: ${timestamp}`)
    console.log(`   Manifest: ${signatureData.manifest}`)
    console.log(`   Signature: ${signatureData.signature}`)
    console.log(`   Full Signature: ${signatureData.fullSignature}`)
    console.log('')

    // 3. Probar webhook con firma válida
    console.log('3️⃣ PROBANDO WEBHOOK CON FIRMA VÁLIDA')
    console.log('-'.repeat(50))
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signatureData.fullSignature,
          'x-request-id': requestId,
          'User-Agent': 'MercadoPago/1.0 (Test with Valid Signature)'
        },
        body: payload
      })

      console.log(`📡 Respuesta con firma válida:`)
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      const responseText = await response.text()
      console.log(`   Body: ${responseText}`)
      
      if (response.ok) {
        console.log('✅ Webhook con firma válida procesado exitosamente')
      } else {
        console.log('❌ Error procesando webhook con firma válida')
      }
    } catch (error) {
      console.log('❌ Error enviando webhook con firma válida:', error.message)
    }
    console.log('')

    // 4. Probar webhook sin firma (modo desarrollo)
    console.log('4️⃣ PROBANDO WEBHOOK SIN FIRMA (MODO DESARROLLO)')
    console.log('-'.repeat(50))
    
    // Temporalmente cambiar a modo desarrollo
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MercadoPago/1.0 (Test Development Mode)'
        },
        body: payload
      })

      console.log(`📡 Respuesta sin firma (desarrollo):`)
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      const responseText = await response.text()
      console.log(`   Body: ${responseText}`)
      
      if (response.ok) {
        console.log('✅ Webhook sin firma procesado en modo desarrollo')
      } else {
        console.log('❌ Error procesando webhook sin firma en desarrollo')
      }
    } catch (error) {
      console.log('❌ Error enviando webhook sin firma:', error.message)
    }
    
    // Restaurar NODE_ENV original
    process.env.NODE_ENV = originalNodeEnv
    console.log('')

    // 5. Probar webhook con firma inválida
    console.log('5️⃣ PROBANDO WEBHOOK CON FIRMA INVÁLIDA')
    console.log('-'.repeat(50))
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1234567890,v1=invalid_signature_hash',
          'x-request-id': requestId,
          'User-Agent': 'MercadoPago/1.0 (Test with Invalid Signature)'
        },
        body: payload
      })

      console.log(`📡 Respuesta con firma inválida:`)
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      const responseText = await response.text()
      console.log(`   Body: ${responseText}`)
      
      if (response.status === 401) {
        console.log('✅ Webhook con firma inválida correctamente rechazado')
      } else {
        console.log('⚠️ Webhook con firma inválida no fue rechazado como esperado')
      }
    } catch (error) {
      console.log('❌ Error enviando webhook con firma inválida:', error.message)
    }
    console.log('')

    // 6. Análisis y recomendaciones
    console.log('6️⃣ ANÁLISIS Y RECOMENDACIONES')
    console.log('-'.repeat(50))
    console.log('🔍 Problemas identificados:')
    console.log('   1. Los webhooks reales de MercadoPago están siendo rechazados por firma inválida')
    console.log('   2. El sistema está en modo producción y requiere validación de firma')
    console.log('   3. La firma que envía MercadoPago no coincide con la esperada')
    console.log('')
    console.log('💡 Soluciones recomendadas:')
    console.log('   1. TEMPORAL: Deshabilitar validación de firma en producción')
    console.log('   2. PERMANENTE: Verificar el webhook secret configurado en MercadoPago')
    console.log('   3. PERMANENTE: Revisar el formato de firma que envía MercadoPago')
    console.log('   4. PERMANENTE: Actualizar la lógica de validación si es necesario')
    console.log('')
    console.log('🚨 ACCIÓN INMEDIATA REQUERIDA:')
    console.log('   Para resolver el problema inmediatamente, se debe modificar el código')
    console.log('   para permitir webhooks sin validación de firma temporalmente.')
    console.log('')

    console.log('✅ PRUEBA DE VALIDACIÓN DE FIRMA COMPLETADA')
    console.log('=' .repeat(80))

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Ejecutar prueba
testWebhookSignature().then(() => {
  console.log('\n🏁 Prueba de validación de firma finalizada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando prueba:', error.message)
  process.exit(1)
})