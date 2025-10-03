const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testWebhookConfiguration() {
  console.log('🔧 VERIFICANDO CONFIGURACIÓN DE WEBHOOKS DE MERCADOPAGO')
  console.log('================================================================================')
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`)
  console.log('================================================================================\n')

  try {
    // 1. Verificar variables de entorno
    console.log('📋 PASO 1: Verificando variables de entorno...')
    
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const mpSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`
    
    console.log(`   Token MP configurado: ${mpToken ? '✅ Sí' : '❌ No'}`)
    console.log(`   Secret configurado: ${mpSecret ? '✅ Sí' : '❌ No'}`)
    console.log(`   Base URL: ${baseUrl}`)
    console.log(`   Webhook URL: ${webhookUrl}`)
    
    if (mpToken) {
      const tokenType = mpToken.startsWith('APP_USR') ? 'PRODUCCIÓN' : 
                       mpToken.startsWith('TEST') ? 'SANDBOX/TEST' : 'DESCONOCIDO'
      console.log(`   Tipo de token: ${tokenType}`)
    }
    console.log('')

    // 2. Verificar accesibilidad del webhook
    console.log('📋 PASO 2: Verificando accesibilidad del webhook...')
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MercadoPago-Test/1.0'
        }
      })
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   ✅ Webhook accesible`)
        console.log(`   Respuesta: ${JSON.stringify(data, null, 2)}`)
      } else {
        console.log(`   ❌ Webhook no accesible`)
      }
    } catch (error) {
      console.log(`   ❌ Error accediendo al webhook: ${error.message}`)
    }
    console.log('')

    // 3. Consultar webhooks configurados en MercadoPago
    console.log('📋 PASO 3: Consultando webhooks configurados en MercadoPago...')
    
    if (mpToken) {
      try {
        const response = await fetch('https://api.mercadopago.com/v1/webhooks', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mpToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const webhooks = await response.json()
          console.log(`   ✅ Webhooks configurados: ${webhooks.length}`)
          
          if (webhooks.length > 0) {
            webhooks.forEach((webhook, index) => {
              console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
              console.log(`      URL: ${webhook.url}`)
              console.log(`      Estado: ${webhook.status}`)
              console.log(`      Eventos: ${webhook.events ? webhook.events.join(', ') : 'N/A'}`)
              console.log(`      Creado: ${webhook.date_created}`)
              
              // Verificar si es nuestro webhook
              if (webhook.url === webhookUrl) {
                console.log(`      🎯 ESTE ES NUESTRO WEBHOOK`)
              }
            })
          } else {
            console.log(`   ⚠️ No hay webhooks configurados en MercadoPago`)
            console.log(`   📝 Esto explica por qué no se reciben notificaciones`)
          }
        } else {
          const errorData = await response.text()
          console.log(`   ❌ Error consultando webhooks: ${response.status}`)
          console.log(`   Error: ${errorData}`)
        }
      } catch (error) {
        console.log(`   ❌ Error consultando API de MercadoPago: ${error.message}`)
      }
    } else {
      console.log(`   ❌ No se puede consultar - token no configurado`)
    }
    console.log('')

    // 4. Verificar webhooks recientes en la base de datos
    console.log('📋 PASO 4: Verificando webhooks recientes en la base de datos...')
    
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    
    const { data: recentWebhooks, error: recentError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError && !recentError.message.includes('does not exist')) {
      console.error('   ❌ Error consultando webhooks:', recentError.message)
    } else if (recentWebhooks && recentWebhooks.length > 0) {
      console.log(`   ✅ Webhooks recientes encontrados: ${recentWebhooks.length}`)
      
      recentWebhooks.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.webhook_type || 'N/A'} | ${webhook.status} | ${webhook.created_at}`)
      })
    } else {
      console.log('   ⚠️ No se encontraron webhooks recientes (últimas 24h)')
      console.log('   📝 Esto indica que MercadoPago no está enviando webhooks')
    }
    console.log('')

    // 5. Crear webhook si no existe
    console.log('📋 PASO 5: Verificando si necesitamos crear webhook...')
    
    if (mpToken) {
      try {
        // Primero verificar si ya existe nuestro webhook
        const checkResponse = await fetch('https://api.mercadopago.com/v1/webhooks', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mpToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (checkResponse.ok) {
          const existingWebhooks = await checkResponse.json()
          const ourWebhook = existingWebhooks.find(w => w.url === webhookUrl)
          
          if (ourWebhook) {
            console.log(`   ✅ Webhook ya existe (ID: ${ourWebhook.id})`)
            console.log(`   Estado: ${ourWebhook.status}`)
            
            if (ourWebhook.status !== 'active') {
              console.log(`   ⚠️ Webhook no está activo`)
            }
          } else {
            console.log(`   ⚠️ Webhook no existe - se necesita crear`)
            console.log(`   📝 Para crear el webhook manualmente:`)
            console.log(`   
POST https://api.mercadopago.com/v1/webhooks
Authorization: Bearer ${mpToken}
Content-Type: application/json

{
  "url": "${webhookUrl}",
  "events": [
    "subscription_preapproval",
    "subscription_authorized_payment",
    "payment"
  ]
}`)
          }
        }
      } catch (error) {
        console.log(`   ❌ Error verificando webhooks existentes: ${error.message}`)
      }
    }
    console.log('')

    // 6. Diagnóstico final
    console.log('📊 DIAGNÓSTICO FINAL')
    console.log('================================================================================')
    
    const issues = []
    const recommendations = []
    
    if (!mpToken) {
      issues.push('Token de MercadoPago no configurado')
      recommendations.push('Configurar MERCADOPAGO_ACCESS_TOKEN')
    }
    
    if (!mpSecret) {
      issues.push('Secret de webhook no configurado')
      recommendations.push('Configurar MERCADOPAGO_WEBHOOK_SECRET')
    }
    
    // Basado en los resultados anteriores, agregar más diagnósticos
    console.log('🔍 PROBLEMAS IDENTIFICADOS:')
    if (issues.length > 0) {
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`)
      })
    } else {
      console.log('   ✅ No se detectaron problemas de configuración básica')
    }
    
    console.log('\n💡 RECOMENDACIONES:')
    if (recommendations.length > 0) {
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`)
      })
    }
    
    console.log('\n🔧 PRÓXIMOS PASOS PARA RESOLVER EL PROBLEMA:')
    console.log('   1. Verificar que el webhook esté configurado en MercadoPago')
    console.log('   2. Si no existe, crear el webhook con los eventos necesarios')
    console.log('   3. Probar el webhook manualmente')
    console.log('   4. Verificar que los eventos de suscripción estén incluidos')
    console.log('   5. Revisar logs del servidor para webhooks perdidos')
    
  } catch (error) {
    console.error('❌ Error ejecutando verificación:', error.message)
  }
}

// Ejecutar verificación
testWebhookConfiguration().then(() => {
  console.log('\n✅ Verificación de configuración completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando verificación:', error.message)
  process.exit(1)
})