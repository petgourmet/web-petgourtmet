require('dotenv').config()

async function createMercadoPagoWebhook() {
  console.log('🔧 CREANDO WEBHOOK EN MERCADOPAGO')
  console.log('================================================================================')
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`)
  console.log('================================================================================\n')

  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const webhookUrl = `${baseUrl}/api/mercadopago/webhook`

  if (!mpToken) {
    console.error('❌ Token de MercadoPago no configurado')
    process.exit(1)
  }

  if (!baseUrl) {
    console.error('❌ Base URL no configurada')
    process.exit(1)
  }

  console.log(`🎯 URL del webhook: ${webhookUrl}`)
  console.log(`🔑 Token tipo: ${mpToken.startsWith('APP_USR') ? 'PRODUCCIÓN' : 'TEST'}`)
  console.log('')

  try {
    // 1. Verificar webhooks existentes
    console.log('📋 PASO 1: Verificando webhooks existentes...')
    
    const checkResponse = await fetch('https://api.mercadopago.com/v1/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (checkResponse.ok) {
      const existingWebhooks = await checkResponse.json()
      console.log(`   ✅ Webhooks existentes: ${existingWebhooks.length}`)
      
      const ourWebhook = existingWebhooks.find(w => w.url === webhookUrl)
      
      if (ourWebhook) {
        console.log(`   ⚠️ Webhook ya existe (ID: ${ourWebhook.id})`)
        console.log(`   Estado: ${ourWebhook.status}`)
        console.log(`   Eventos: ${ourWebhook.events ? ourWebhook.events.join(', ') : 'N/A'}`)
        
        if (ourWebhook.status === 'active') {
          console.log('   ✅ El webhook ya está activo - no se necesita crear uno nuevo')
          return
        } else {
          console.log('   ⚠️ El webhook existe pero no está activo')
        }
      } else {
        console.log('   📝 No existe webhook para nuestra URL - procediendo a crear')
      }
    } else {
      const errorText = await checkResponse.text()
      console.log(`   ⚠️ No se pudieron consultar webhooks existentes: ${checkResponse.status}`)
      console.log(`   Error: ${errorText}`)
      console.log('   Procediendo a crear webhook...')
    }
    console.log('')

    // 2. Crear el webhook
    console.log('📋 PASO 2: Creando webhook...')
    
    const webhookData = {
      url: webhookUrl,
      events: [
        "subscription_preapproval",
        "subscription_authorized_payment", 
        "payment"
      ]
    }
    
    console.log(`   Datos del webhook:`)
    console.log(`   ${JSON.stringify(webhookData, null, 2)}`)
    console.log('')
    
    const createResponse = await fetch('https://api.mercadopago.com/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    })

    if (createResponse.ok) {
      const newWebhook = await createResponse.json()
      console.log('   ✅ Webhook creado exitosamente!')
      console.log(`   ID: ${newWebhook.id}`)
      console.log(`   URL: ${newWebhook.url}`)
      console.log(`   Estado: ${newWebhook.status}`)
      console.log(`   Eventos: ${newWebhook.events ? newWebhook.events.join(', ') : 'N/A'}`)
      console.log(`   Fecha creación: ${newWebhook.date_created}`)
    } else {
      const errorData = await createResponse.text()
      console.log(`   ❌ Error creando webhook: ${createResponse.status}`)
      console.log(`   Error: ${errorData}`)
      
      // Intentar parsear el error para más detalles
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.cause && errorJson.cause.length > 0) {
          console.log('   Detalles del error:')
          errorJson.cause.forEach((cause, index) => {
            console.log(`     ${index + 1}. ${cause.description || cause.message}`)
          })
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }
    console.log('')

    // 3. Verificar el webhook creado
    console.log('📋 PASO 3: Verificando webhook creado...')
    
    const verifyResponse = await fetch('https://api.mercadopago.com/v1/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (verifyResponse.ok) {
      const allWebhooks = await verifyResponse.json()
      const ourWebhook = allWebhooks.find(w => w.url === webhookUrl)
      
      if (ourWebhook) {
        console.log('   ✅ Webhook verificado correctamente')
        console.log(`   ID: ${ourWebhook.id}`)
        console.log(`   Estado: ${ourWebhook.status}`)
        console.log(`   Eventos configurados: ${ourWebhook.events ? ourWebhook.events.join(', ') : 'N/A'}`)
        
        if (ourWebhook.status === 'active') {
          console.log('   🎉 ¡Webhook está activo y listo para recibir notificaciones!')
        } else {
          console.log('   ⚠️ Webhook creado pero no está activo')
        }
      } else {
        console.log('   ❌ No se pudo verificar el webhook creado')
      }
    } else {
      console.log('   ⚠️ No se pudo verificar el webhook')
    }
    console.log('')

    // 4. Probar el webhook
    console.log('📋 PASO 4: Probando accesibilidad del webhook...')
    
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MercadoPago-Webhook-Test/1.0'
        }
      })
      
      if (testResponse.ok) {
        const testData = await testResponse.json()
        console.log('   ✅ Webhook accesible desde internet')
        console.log(`   Respuesta: ${testData.message}`)
      } else {
        console.log(`   ❌ Webhook no accesible: ${testResponse.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Error probando webhook: ${error.message}`)
    }
    console.log('')

    // 5. Resumen final
    console.log('📊 RESUMEN FINAL')
    console.log('================================================================================')
    console.log('✅ Proceso de configuración de webhook completado')
    console.log('')
    console.log('🔧 PRÓXIMOS PASOS:')
    console.log('   1. El webhook debería estar configurado y activo')
    console.log('   2. MercadoPago enviará notificaciones para:')
    console.log('      - subscription_preapproval (cuando se autoriza una suscripción)')
    console.log('      - subscription_authorized_payment (cuando se procesa un pago de suscripción)')
    console.log('      - payment (cuando se procesa cualquier pago)')
    console.log('   3. Probar con una nueva suscripción para verificar funcionamiento')
    console.log('   4. Monitorear logs de webhook para confirmar recepción de eventos')
    
  } catch (error) {
    console.error('❌ Error ejecutando configuración de webhook:', error.message)
    process.exit(1)
  }
}

// Ejecutar configuración
createMercadoPagoWebhook().then(() => {
  console.log('\n✅ Configuración de webhook completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando configuración:', error.message)
  process.exit(1)
})