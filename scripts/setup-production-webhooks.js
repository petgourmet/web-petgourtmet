/**
 * Script para configurar webhooks de MercadoPago en producción
 * 
 * Este script proporciona:
 * 1. Verificación del endpoint de webhook
 * 2. Instrucciones para configuración manual
 * 3. Script de prueba para validar la configuración
 * 
 * Uso:
 * node scripts/setup-production-webhooks.js
 */

const https = require('https')
require('dotenv').config({ path: '.env.local' })

// Configuración
const config = {
  webhookUrl: process.env.NEXT_PUBLIC_SITE_URL ? 
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/webhook` : 
    'https://petgourmet.mx/api/mercadopago/webhook',
  mercadoPagoToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET
}

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

// Función para verificar el endpoint del webhook
function verifyWebhookEndpoint() {
  return new Promise((resolve, reject) => {
    const url = new URL(config.webhookUrl)
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'PetGourmet-Webhook-Verification/1.0'
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          resolve({
            statusCode: res.statusCode,
            data: response
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          })
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.end()
  })
}

// Función para mostrar instrucciones de configuración
function showConfigurationInstructions() {
  log('\n🔧 CONFIGURACIÓN DE WEBHOOKS EN MERCADOPAGO', colors.bold)
  log('=' .repeat(50), colors.blue)
  
  log('\n📋 Sigue estos pasos para configurar los webhooks:', colors.cyan)
  
  log('\n1. 🌐 Ve al panel de MercadoPago:', colors.blue)
  log('   https://www.mercadopago.com.mx/developers/panel/app', colors.cyan)
  
  log('\n2. 🔑 Selecciona tu aplicación de producción', colors.blue)
  
  log('\n3. 📡 Ve a la sección "Webhooks" o "Notificaciones"', colors.blue)
  
  log('\n4. ➕ Crear nuevo webhook con esta configuración:', colors.blue)
  log(`   📍 URL: ${config.webhookUrl}`, colors.cyan)
  log('   🔒 Método: POST', colors.cyan)
  log('   📋 Eventos a seleccionar:', colors.cyan)
  log('      ✅ Pagos (payment)', colors.green)
  log('      ✅ Suscripciones (subscription_preapproval)', colors.green)
  log('      ✅ Pagos de suscripciones (subscription_authorized_payment)', colors.green)
  log('      ✅ Planes (plan) - opcional', colors.yellow)
  log('      ✅ Facturas (invoice) - opcional', colors.yellow)
  
  log('\n5. 🔐 Configurar el secreto del webhook:', colors.blue)
  log(`   Secret: ${config.webhookSecret}`, colors.cyan)
  log('   (Este valor ya está configurado en tu .env.local)', colors.yellow)
  
  log('\n6. 💾 Guardar la configuración', colors.blue)
  
  log('\n⚠️ IMPORTANTE:', colors.yellow)
  log('   • Asegúrate de estar en el entorno de PRODUCCIÓN', colors.yellow)
  log('   • Usa las credenciales de producción, no de sandbox', colors.yellow)
  log('   • El webhook debe estar ACTIVO después de crearlo', colors.yellow)
}

// Función para mostrar script de prueba
function showTestScript() {
  log('\n🧪 SCRIPT DE PRUEBA', colors.bold)
  log('=' .repeat(20), colors.blue)
  
  log('\nPara probar que el webhook funciona correctamente:', colors.cyan)
  log('\n1. Ejecuta este comando:', colors.blue)
  log('   node scripts/test-webhook.js', colors.cyan)
  
  log('\n2. O realiza una compra de prueba en:', colors.blue)
  log('   https://petgourmet.mx', colors.cyan)
  
  log('\n3. Monitorea los logs del servidor:', colors.blue)
  log('   vercel logs --follow', colors.cyan)
}

// Función para verificar configuración
function verifyConfiguration() {
  log('\n🔍 VERIFICANDO CONFIGURACIÓN', colors.bold)
  log('=' .repeat(30), colors.blue)
  
  const checks = [
    {
      name: 'Token de MercadoPago',
      value: config.mercadoPagoToken,
      valid: !!config.mercadoPagoToken && config.mercadoPagoToken.startsWith('APP_USR')
    },
    {
      name: 'Secret del webhook',
      value: config.webhookSecret,
      valid: !!config.webhookSecret && config.webhookSecret.length > 10
    },
    {
      name: 'URL del webhook',
      value: config.webhookUrl,
      valid: config.webhookUrl.startsWith('https://') && config.webhookUrl.includes('petgourmet.mx')
    }
  ]
  
  let allValid = true
  
  checks.forEach(check => {
    const status = check.valid ? '✅' : '❌'
    const color = check.valid ? colors.green : colors.red
    log(`${status} ${check.name}: ${check.valid ? 'OK' : 'ERROR'}`, color)
    
    if (!check.valid) {
      allValid = false
      log(`   Valor actual: ${check.value || 'No configurado'}`, colors.yellow)
    }
  })
  
  return allValid
}

// Función principal
async function main() {
  log('🚀 CONFIGURACIÓN DE WEBHOOKS PARA PRODUCCIÓN', colors.bold)
  log('=' .repeat(50), colors.magenta)
  
  try {
    // 1. Verificar configuración
    const configValid = verifyConfiguration()
    
    if (!configValid) {
      log('\n❌ Hay problemas en la configuración que deben resolverse primero', colors.red)
      return
    }
    
    // 2. Verificar endpoint
    log('\n🔍 Verificando endpoint del webhook...', colors.cyan)
    const endpointResult = await verifyWebhookEndpoint()
    
    if (endpointResult.statusCode === 200) {
      log('✅ Endpoint del webhook funcionando correctamente', colors.green)
      log(`   Respuesta: ${JSON.stringify(endpointResult.data)}`, colors.cyan)
    } else {
      log(`❌ Problema con el endpoint: ${endpointResult.statusCode}`, colors.red)
      log(`   Respuesta: ${JSON.stringify(endpointResult.data)}`, colors.yellow)
      return
    }
    
    // 3. Mostrar instrucciones
    showConfigurationInstructions()
    
    // 4. Mostrar script de prueba
    showTestScript()
    
    // 5. Resumen final
    log('\n🎯 RESUMEN', colors.bold)
    log('=' .repeat(10), colors.blue)
    log('✅ Endpoint del webhook: FUNCIONANDO', colors.green)
    log('✅ Variables de entorno: CONFIGURADAS', colors.green)
    log('⏳ Configuración en MercadoPago: PENDIENTE (manual)', colors.yellow)
    
    log('\n📝 PRÓXIMOS PASOS:', colors.bold)
    log('1. Configurar webhook en el panel de MercadoPago (manual)', colors.blue)
    log('2. Probar con una compra real', colors.blue)
    log('3. Monitorear logs para confirmar funcionamiento', colors.blue)
    
    log('\n✅ Sistema listo para recibir webhooks en producción', colors.green)
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red)
    process.exit(1)
  }
}

// Ejecutar script
if (require.main === module) {
  main().catch(error => {
    log(`❌ Error crítico: ${error.message}`, colors.red)
    process.exit(1)
  })
}

module.exports = {
  verifyWebhookEndpoint,
  verifyConfiguration
}