/**
 * Script para verificar y configurar webhooks de MercadoPago
 * 
 * Uso:
 * node scripts/check-webhook-config.js
 */

const https = require('https')
require('dotenv').config({ path: '.env.local' })

// Configuración
const config = {
  mercadoPagoToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  webhookUrl: process.env.NEXT_PUBLIC_SITE_URL ? 
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook` : 
    'http://localhost:3000/api/mercadopago/webhook'
}

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

// Función para hacer requests a MercadoPago
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${config.mercadoPagoToken}`,
        'Content-Type': 'application/json'
      }
    }
    
    const req = https.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {}
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          })
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

// Obtener webhooks existentes
async function getExistingWebhooks() {
  log('🔍 Obteniendo webhooks existentes...', colors.blue)
  
  try {
    const response = await makeRequest('GET', '/v1/webhooks')
    
    if (response.statusCode === 200) {
      log(`✅ Webhooks obtenidos exitosamente`, colors.green)
      return response.data
    } else {
      log(`❌ Error obteniendo webhooks: ${response.statusCode}`, colors.red)
      log(`Respuesta: ${JSON.stringify(response.data, null, 2)}`, colors.yellow)
      return null
    }
  } catch (error) {
    log(`❌ Error en request: ${error.message}`, colors.red)
    return null
  }
}

// Crear webhook
async function createWebhook() {
  log('🔧 Creando nuevo webhook...', colors.blue)
  
  const webhookData = {
    url: config.webhookUrl,
    events: [
      'payment',
      'plan',
      'subscription',
      'invoice'
    ]
  }
  
  try {
    const response = await makeRequest('POST', '/v1/webhooks', webhookData)
    
    if (response.statusCode === 201) {
      log(`✅ Webhook creado exitosamente`, colors.green)
      log(`ID: ${response.data.id}`, colors.blue)
      log(`URL: ${response.data.url}`, colors.blue)
      return response.data
    } else {
      log(`❌ Error creando webhook: ${response.statusCode}`, colors.red)
      log(`Respuesta: ${JSON.stringify(response.data, null, 2)}`, colors.yellow)
      return null
    }
  } catch (error) {
    log(`❌ Error en request: ${error.message}`, colors.red)
    return null
  }
}

// Actualizar webhook existente
async function updateWebhook(webhookId) {
  log(`🔧 Actualizando webhook ${webhookId}...`, colors.blue)
  
  const webhookData = {
    url: config.webhookUrl,
    events: [
      'payment',
      'plan',
      'subscription',
      'invoice'
    ]
  }
  
  try {
    const response = await makeRequest('PUT', `/v1/webhooks/${webhookId}`, webhookData)
    
    if (response.statusCode === 200) {
      log(`✅ Webhook actualizado exitosamente`, colors.green)
      return response.data
    } else {
      log(`❌ Error actualizando webhook: ${response.statusCode}`, colors.red)
      log(`Respuesta: ${JSON.stringify(response.data, null, 2)}`, colors.yellow)
      return null
    }
  } catch (error) {
    log(`❌ Error en request: ${error.message}`, colors.red)
    return null
  }
}

// Verificar configuración del webhook
async function checkWebhookConfiguration() {
  log('🔧 VERIFICANDO CONFIGURACIÓN DE WEBHOOKS', colors.bold)
  log('=' .repeat(45), colors.blue)
  
  // Verificar variables de entorno
  log('\n📋 Verificando configuración...', colors.blue)
  
  if (!config.mercadoPagoToken) {
    log('❌ MERCADOPAGO_ACCESS_TOKEN no configurado', colors.red)
    return false
  }
  log('✅ Token de MercadoPago configurado', colors.green)
  
  log(`📍 URL del webhook: ${config.webhookUrl}`, colors.blue)
  
  // Obtener webhooks existentes
  const webhooks = await getExistingWebhooks()
  
  if (!webhooks) {
    log('❌ No se pudieron obtener los webhooks', colors.red)
    return false
  }
  
  log(`\n📊 Webhooks encontrados: ${webhooks.length}`, colors.blue)
  
  // Buscar webhook con nuestra URL
  const existingWebhook = webhooks.find(webhook => 
    webhook.url === config.webhookUrl
  )
  
  if (existingWebhook) {
    log(`\n✅ Webhook existente encontrado:`, colors.green)
    log(`   ID: ${existingWebhook.id}`, colors.blue)
    log(`   URL: ${existingWebhook.url}`, colors.blue)
    log(`   Estado: ${existingWebhook.status}`, colors.blue)
    log(`   Eventos: ${existingWebhook.events.join(', ')}`, colors.blue)
    
    // Verificar si está activo
    if (existingWebhook.status !== 'active') {
      log(`⚠️ El webhook no está activo (${existingWebhook.status})`, colors.yellow)
      
      // Intentar actualizar
      const updated = await updateWebhook(existingWebhook.id)
      if (updated) {
        log(`✅ Webhook reactivado`, colors.green)
      }
    }
    
    // Verificar eventos
    const requiredEvents = ['payment', 'plan', 'subscription', 'invoice']
    const missingEvents = requiredEvents.filter(event => 
      !existingWebhook.events.includes(event)
    )
    
    if (missingEvents.length > 0) {
      log(`⚠️ Eventos faltantes: ${missingEvents.join(', ')}`, colors.yellow)
      
      // Actualizar eventos
      const updated = await updateWebhook(existingWebhook.id)
      if (updated) {
        log(`✅ Eventos actualizados`, colors.green)
      }
    }
    
  } else {
    log(`\n⚠️ No se encontró webhook para la URL: ${config.webhookUrl}`, colors.yellow)
    
    // Mostrar webhooks existentes
    if (webhooks.length > 0) {
      log('\n📋 Webhooks existentes:', colors.blue)
      webhooks.forEach((webhook, index) => {
        log(`   ${index + 1}. ${webhook.url} (${webhook.status})`, colors.yellow)
      })
    }
    
    // Crear nuevo webhook
    log('\n🔧 Creando nuevo webhook...', colors.blue)
    const newWebhook = await createWebhook()
    
    if (newWebhook) {
      log(`\n✅ Webhook configurado correctamente`, colors.green)
    } else {
      log(`\n❌ No se pudo crear el webhook`, colors.red)
      return false
    }
  }
  
  // Verificar conectividad del endpoint
  log('\n🌐 Verificando conectividad del endpoint...', colors.blue)
  
  try {
    const testResponse = await makeRequest('POST', '/v1/webhooks/test', {
      url: config.webhookUrl,
      events: ['payment']
    })
    
    if (testResponse.statusCode === 200) {
      log('✅ Endpoint del webhook es accesible', colors.green)
    } else {
      log(`⚠️ Problema con el endpoint: ${testResponse.statusCode}`, colors.yellow)
    }
  } catch (error) {
    log(`⚠️ No se pudo verificar el endpoint: ${error.message}`, colors.yellow)
  }
  
  // Recomendaciones finales
  log('\n🎯 RECOMENDACIONES', colors.bold)
  log('=' .repeat(15), colors.blue)
  log('1. Verificar que el servidor esté ejecutándose en la URL configurada')
  log('2. Asegurarse de que el endpoint /api/mercadopago/webhook esté funcionando')
  log('3. Monitorear los logs del servidor para webhooks entrantes')
  log('4. Probar con un pago real para verificar el flujo completo')
  
  if (config.webhookUrl.includes('localhost')) {
    log('\n⚠️ IMPORTANTE: Estás usando localhost', colors.yellow)
    log('   Los webhooks de MercadoPago no pueden llegar a localhost')
    log('   Para testing, usa ngrok o un dominio público')
  }
  
  return true
}

// Ejecutar script
if (require.main === module) {
  checkWebhookConfiguration().catch(error => {
    log(`❌ Error crítico: ${error.message}`, colors.red)
    process.exit(1)
  })
}

module.exports = {
  checkWebhookConfiguration,
  getExistingWebhooks,
  createWebhook,
  updateWebhook
}