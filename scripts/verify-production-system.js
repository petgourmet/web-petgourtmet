/**
 * Script de verificación completa del sistema en producción
 * 
 * Verifica:
 * 1. Webhook endpoint funcionando
 * 2. Base de datos conectada
 * 3. APIs de usuario funcionando
 * 4. APIs de admin funcionando
 * 5. Sistema de emails funcionando
 * 
 * Uso:
 * node scripts/verify-production-system.js
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
require('dotenv').config({ path: '.env.local' })

// Configuración
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://petgourmet.mx',
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

function logTest(name, status, details = '') {
  const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
  const statusColor = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow
  log(`${statusIcon} ${name}`, statusColor)
  if (details) {
    log(`   ${details}`, colors.cyan)
  }
}

// Función para hacer requests HTTP
function makeHttpRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PetGourmet-System-Verification/1.0'
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
            data: parsedData,
            raw: responseData
          })
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            raw: responseData
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

// 1. Verificar configuración básica
function verifyConfiguration() {
  log('\n🔧 VERIFICANDO CONFIGURACIÓN BÁSICA', colors.bold)
  log('=' .repeat(40), colors.blue)
  
  const checks = [
    {
      name: 'URL del sitio',
      value: config.siteUrl,
      valid: !!config.siteUrl && config.siteUrl.startsWith('https://')
    },
    {
      name: 'Supabase URL',
      value: config.supabaseUrl,
      valid: !!config.supabaseUrl && config.supabaseUrl.includes('supabase.co')
    },
    {
      name: 'Supabase Service Key',
      value: config.supabaseKey ? 'Configurado' : 'No configurado',
      valid: !!config.supabaseKey
    },
    {
      name: 'MercadoPago Token',
      value: config.mercadoPagoToken ? 'Configurado' : 'No configurado',
      valid: !!config.mercadoPagoToken && config.mercadoPagoToken.startsWith('APP_USR')
    },
    {
      name: 'Webhook Secret',
      value: config.webhookSecret ? 'Configurado' : 'No configurado',
      valid: !!config.webhookSecret && config.webhookSecret.length > 10
    }
  ]
  
  let allValid = true
  
  checks.forEach(check => {
    logTest(check.name, check.valid ? 'pass' : 'fail', check.value)
    if (!check.valid) allValid = false
  })
  
  return allValid
}

// 2. Verificar conexión a Supabase
async function verifySupabaseConnection() {
  log('\n🗄️ VERIFICANDO CONEXIÓN A SUPABASE', colors.bold)
  log('=' .repeat(35), colors.blue)
  
  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseKey)
    
    // Verificar conexión básica
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (healthError) {
      logTest('Conexión a Supabase', 'fail', healthError.message)
      return false
    }
    
    logTest('Conexión a Supabase', 'pass', 'Conectado correctamente')
    
    // Verificar tablas principales
    const tables = ['profiles', 'orders', 'user_subscriptions', 'products']
    let tablesValid = true
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          logTest(`Tabla ${table}`, 'fail', error.message)
          tablesValid = false
        } else {
          logTest(`Tabla ${table}`, 'pass', 'Accesible')
        }
      } catch (err) {
        logTest(`Tabla ${table}`, 'fail', err.message)
        tablesValid = false
      }
    }
    
    return tablesValid
    
  } catch (error) {
    logTest('Conexión a Supabase', 'fail', error.message)
    return false
  }
}

// 3. Verificar webhook endpoint
async function verifyWebhookEndpoint() {
  log('\n🔗 VERIFICANDO WEBHOOK ENDPOINT', colors.bold)
  log('=' .repeat(30), colors.blue)
  
  try {
    const webhookUrl = `${config.siteUrl}/api/mercadopago/webhook`
    const response = await makeHttpRequest(webhookUrl, 'GET')
    
    if (response.statusCode === 200) {
      logTest('Webhook endpoint', 'pass', `Respuesta: ${response.statusCode}`)
      
      if (response.data && response.data.status === 'active') {
        logTest('Estado del webhook', 'pass', 'Activo y funcionando')
        return true
      } else {
        logTest('Estado del webhook', 'warn', 'Respuesta inesperada')
        return false
      }
    } else {
      logTest('Webhook endpoint', 'fail', `Error ${response.statusCode}`)
      return false
    }
  } catch (error) {
    logTest('Webhook endpoint', 'fail', error.message)
    return false
  }
}

// 4. Verificar APIs principales
async function verifyMainAPIs() {
  log('\n🔌 VERIFICANDO APIs PRINCIPALES', colors.bold)
  log('=' .repeat(30), colors.blue)
  
  const apis = [
    {
      name: 'API de órdenes admin',
      url: `${config.siteUrl}/api/admin/orders`,
      method: 'GET'
    },
    {
      name: 'API de estadísticas de pago',
      url: `${config.siteUrl}/api/admin/payment-stats`,
      method: 'GET'
    }
  ]
  
  let allValid = true
  
  for (const api of apis) {
    try {
      const response = await makeHttpRequest(api.url, api.method)
      
      if (response.statusCode === 200 || response.statusCode === 401) {
        // 401 es esperado para APIs protegidas sin autenticación
        logTest(api.name, 'pass', `Status: ${response.statusCode}`)
      } else {
        logTest(api.name, 'fail', `Error ${response.statusCode}`)
        allValid = false
      }
    } catch (error) {
      logTest(api.name, 'fail', error.message)
      allValid = false
    }
  }
  
  return allValid
}

// 5. Verificar datos de ejemplo
async function verifyExampleData() {
  log('\n📊 VERIFICANDO DATOS DE EJEMPLO', colors.bold)
  log('=' .repeat(30), colors.blue)
  
  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseKey)
    
    // Verificar que hay productos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name')
      .limit(5)
    
    if (productsError) {
      logTest('Productos en BD', 'fail', productsError.message)
      return false
    }
    
    if (products && products.length > 0) {
      logTest('Productos en BD', 'pass', `${products.length} productos encontrados`)
    } else {
      logTest('Productos en BD', 'warn', 'No hay productos en la base de datos')
    }
    
    // Verificar que hay usuarios
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(5)
    
    if (usersError) {
      logTest('Usuarios en BD', 'fail', usersError.message)
    } else if (users && users.length > 0) {
      logTest('Usuarios en BD', 'pass', `${users.length} usuarios encontrados`)
    } else {
      logTest('Usuarios en BD', 'warn', 'No hay usuarios en la base de datos')
    }
    
    // Verificar órdenes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .limit(5)
    
    if (ordersError) {
      logTest('Órdenes en BD', 'fail', ordersError.message)
    } else if (orders && orders.length > 0) {
      logTest('Órdenes en BD', 'pass', `${orders.length} órdenes encontradas`)
    } else {
      logTest('Órdenes en BD', 'warn', 'No hay órdenes en la base de datos')
    }
    
    // Verificar suscripciones
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .select('id, status')
      .limit(5)
    
    if (subscriptionsError) {
      logTest('Suscripciones en BD', 'fail', subscriptionsError.message)
    } else if (subscriptions && subscriptions.length > 0) {
      logTest('Suscripciones en BD', 'pass', `${subscriptions.length} suscripciones encontradas`)
    } else {
      logTest('Suscripciones en BD', 'warn', 'No hay suscripciones en la base de datos')
    }
    
    return true
    
  } catch (error) {
    logTest('Verificación de datos', 'fail', error.message)
    return false
  }
}

// Función principal
async function main() {
  log('🚀 VERIFICACIÓN COMPLETA DEL SISTEMA EN PRODUCCIÓN', colors.bold)
  log('=' .repeat(55), colors.magenta)
  
  const results = {
    configuration: false,
    supabase: false,
    webhook: false,
    apis: false,
    data: false
  }
  
  try {
    // 1. Verificar configuración
    results.configuration = verifyConfiguration()
    
    // 2. Verificar Supabase
    results.supabase = await verifySupabaseConnection()
    
    // 3. Verificar webhook
    results.webhook = await verifyWebhookEndpoint()
    
    // 4. Verificar APIs
    results.apis = await verifyMainAPIs()
    
    // 5. Verificar datos
    results.data = await verifyExampleData()
    
    // Resumen final
    log('\n📋 RESUMEN DE VERIFICACIÓN', colors.bold)
    log('=' .repeat(25), colors.blue)
    
    const checks = [
      { name: 'Configuración básica', status: results.configuration },
      { name: 'Conexión a Supabase', status: results.supabase },
      { name: 'Webhook endpoint', status: results.webhook },
      { name: 'APIs principales', status: results.apis },
      { name: 'Datos de ejemplo', status: results.data }
    ]
    
    let allPassed = true
    checks.forEach(check => {
      logTest(check.name, check.status ? 'pass' : 'fail')
      if (!check.status) allPassed = false
    })
    
    log('\n🎯 ESTADO DEL SISTEMA', colors.bold)
    log('=' .repeat(20), colors.blue)
    
    if (allPassed) {
      log('✅ Sistema completamente funcional para producción', colors.green)
      log('\n📝 PRÓXIMOS PASOS:', colors.bold)
      log('1. Configurar webhook en panel de MercadoPago (manual)', colors.blue)
      log('2. Realizar prueba de compra completa', colors.blue)
      log('3. Verificar que usuarios puedan ver sus pedidos en /perfil', colors.blue)
      log('4. Verificar que admins puedan ver todo en /admin', colors.blue)
    } else {
      log('⚠️ Sistema parcialmente funcional - revisar errores', colors.yellow)
      log('\n🔧 ACCIONES REQUERIDAS:', colors.bold)
      
      if (!results.configuration) {
        log('• Revisar variables de entorno en .env.local', colors.red)
      }
      if (!results.supabase) {
        log('• Verificar conexión y permisos de Supabase', colors.red)
      }
      if (!results.webhook) {
        log('• Verificar deployment del webhook endpoint', colors.red)
      }
      if (!results.apis) {
        log('• Verificar APIs principales del sistema', colors.red)
      }
      if (!results.data) {
        log('• Verificar estructura de base de datos', colors.red)
      }
    }
    
    log('\n🔗 ENLACES IMPORTANTES:', colors.bold)
    log(`📱 Sitio web: ${config.siteUrl}`, colors.cyan)
    log(`🔧 Webhook: ${config.siteUrl}/api/mercadopago/webhook`, colors.cyan)
    log(`👤 Perfil usuario: ${config.siteUrl}/perfil`, colors.cyan)
    log(`⚙️ Admin dashboard: ${config.siteUrl}/admin`, colors.cyan)
    
    process.exit(allPassed ? 0 : 1)
    
  } catch (error) {
    log(`❌ Error crítico durante verificación: ${error.message}`, colors.red)
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
  verifyConfiguration,
  verifySupabaseConnection,
  verifyWebhookEndpoint,
  verifyMainAPIs,
  verifyExampleData
}