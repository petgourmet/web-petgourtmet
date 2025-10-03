/**
 * Script para investigar por qué la suscripción ID 134 sigue en estado pending
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const { URL } = require('url')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuración de Mercado Pago
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

if (!MP_ACCESS_TOKEN) {
  console.error('❌ Token de Mercado Pago no configurado')
  process.exit(1)
}

const SUBSCRIPTION_ID = 134
const EXTERNAL_REFERENCE = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
const USER_ID = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
const USER_EMAIL = 'cristoferscalante@gmail.com'

// Función helper para hacer requests HTTPS
function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }

    const req = https.request(requestOptions, (res) => {
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        })
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (options.body) {
      req.write(options.body)
    }

    req.end()
  })
}

async function investigateSubscription134() {
  console.log('🔍 === INVESTIGACIÓN SUSCRIPCIÓN ID 134 ===')
  console.log(`📋 External Reference: ${EXTERNAL_REFERENCE}`)
  console.log(`👤 Usuario: ${USER_ID}`)
  console.log(`📧 Email: ${USER_EMAIL}`)
  console.log('=' .repeat(80))

  try {
    // 1. Obtener datos actuales de la suscripción
    console.log('\n📊 1. DATOS ACTUALES DE LA SUSCRIPCIÓN')
    console.log('-' .repeat(50))
    
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', SUBSCRIPTION_ID)
      .single()

    if (subError) {
      console.error('❌ Error obteniendo suscripción:', subError.message)
      return
    }

    console.log(`✅ Suscripción encontrada:`)
    console.log(`   ID: ${subscription.id}`)
    console.log(`   Estado: ${subscription.status}`)
    console.log(`   External Reference: ${subscription.external_reference}`)
    console.log(`   MercadoPago Subscription ID: ${subscription.mercadopago_subscription_id || 'NULL'}`)
    console.log(`   MercadoPago Plan ID: ${subscription.mercadopago_plan_id || 'NULL'}`)
    console.log(`   Creada: ${subscription.created_at}`)
    console.log(`   Actualizada: ${subscription.updated_at}`)
    console.log(`   Última sincronización: ${subscription.last_sync_at || 'NULL'}`)

    // 2. Buscar webhooks relacionados por texto
    console.log('\n📨 2. BÚSQUEDA DE WEBHOOKS EN WEBHOOK_LOGS')
    console.log('-' .repeat(50))
    
    // Buscar por external_reference específico
    const { data: webhooksByRef, error: webhookRefError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${EXTERNAL_REFERENCE}%`)
      .order('created_at', { ascending: false })

    // Buscar por user_id
    const { data: webhooksByUser, error: webhookUserError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${USER_ID}%`)
      .order('created_at', { ascending: false })

    // Buscar por email
    const { data: webhooksByEmail, error: webhookEmailError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${USER_EMAIL}%`)
      .order('created_at', { ascending: false })

    console.log(`📊 Webhooks por external_reference: ${webhooksByRef?.length || 0}`)
    console.log(`📊 Webhooks por user_id: ${webhooksByUser?.length || 0}`)
    console.log(`📊 Webhooks por email: ${webhooksByEmail?.length || 0}`)

    // Combinar y deduplicar webhooks
    const allWebhooks = []
    const seenIds = new Set()
    
    ;[webhooksByRef, webhooksByUser, webhooksByEmail].forEach(webhookArray => {
      if (webhookArray) {
        webhookArray.forEach(webhook => {
          if (!seenIds.has(webhook.id)) {
            seenIds.add(webhook.id)
            allWebhooks.push(webhook)
          }
        })
      }
    })

    if (allWebhooks.length > 0) {
      console.log(`\n📋 Total webhooks únicos encontrados: ${allWebhooks.length}`)
      allWebhooks.forEach((webhook, index) => {
        console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
        console.log(`      Tipo: ${webhook.event_type}`)
        console.log(`      Estado: ${webhook.status}`)
        console.log(`      Fecha: ${webhook.created_at}`)
        console.log(`      Error: ${webhook.error_message || 'Ninguno'}`)
        
        // Mostrar datos relevantes
        if (webhook.webhook_data) {
          try {
            const data = typeof webhook.webhook_data === 'string' ? JSON.parse(webhook.webhook_data) : webhook.webhook_data
            if (data.data && data.data.id) {
              console.log(`      Data ID: ${data.data.id}`)
            }
            if (data.type) {
              console.log(`      Tipo MP: ${data.type}`)
            }
            if (data.action) {
              console.log(`      Acción: ${data.action}`)
            }
            if (data.external_reference) {
              console.log(`      External Ref: ${data.external_reference}`)
            }
          } catch (e) {
            console.log(`      Webhook Data: ${JSON.stringify(webhook.webhook_data).substring(0, 100)}...`)
          }
        }
      })
    } else {
      console.log('❌ No se encontraron webhooks relacionados')
    }

    // 3. Buscar webhooks recientes (últimas 48 horas)
    console.log('\n📨 3. BÚSQUEDA DE WEBHOOKS RECIENTES (48H)')
    console.log('-' .repeat(50))
    
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data: recentWebhooks, error: recentError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentError) {
      console.log('⚠️ Error buscando webhooks recientes:', recentError.message)
    } else {
      console.log(`📊 Webhooks recientes encontrados: ${recentWebhooks?.length || 0}`)
      
      if (recentWebhooks && recentWebhooks.length > 0) {
        console.log('\n📋 Últimos webhooks recibidos:')
        recentWebhooks.forEach((webhook, index) => {
          console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
          console.log(`      Tipo: ${webhook.webhook_type}`)
          console.log(`      Estado: ${webhook.status}`)
          console.log(`      Fecha: ${webhook.created_at}`)
          console.log(`      MP ID: ${webhook.mercadopago_id || 'N/A'}`)
          
          // Verificar si está relacionado con nuestra suscripción
          if (webhook.webhook_data) {
            try {
              const data = typeof webhook.webhook_data === 'string' ? JSON.parse(webhook.webhook_data) : webhook.webhook_data
              
              const isRelated = (
                (data.external_reference && data.external_reference.includes(USER_ID)) ||
                (data.payer_email === USER_EMAIL) ||
                (data.external_reference === EXTERNAL_REFERENCE)
              )
              
              if (isRelated) {
                console.log(`      🎯 RELACIONADO CON SUSCRIPCIÓN 134`)
                if (data.external_reference) {
                  console.log(`      External Ref: ${data.external_reference}`)
                }
                if (data.status) {
                  console.log(`      Estado MP: ${data.status}`)
                }
                if (data.type) {
                  console.log(`      Tipo MP: ${data.type}`)
                }
              }
            } catch (e) {
              // Ignorar errores de parsing
            }
          }
        })
      } else {
        console.log('❌ No se encontraron webhooks recientes')
      }
    }

    // 4. Consultar directamente a Mercado Pago API
    console.log('\n🌐 4. CONSULTA DIRECTA A MERCADO PAGO API')
    console.log('-' .repeat(50))
    
    // Buscar suscripciones por external_reference
    try {
      const mpResponse = await axios.get(`https://api.mercadopago.com/preapproval/search`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          external_reference: EXTERNAL_REFERENCE
        }
      })

      console.log(`📊 Respuesta de MercadoPago:`)
      console.log(`   Status: ${mpResponse.status}`)
      console.log(`   Suscripciones encontradas: ${mpResponse.data.results?.length || 0}`)
      
      if (mpResponse.data.results && mpResponse.data.results.length > 0) {
        const mpSubscription = mpResponse.data.results[0]
        console.log(`\n   ✅ Suscripción en MercadoPago:`)
        console.log(`      ID: ${mpSubscription.id}`)
        console.log(`      Estado: ${mpSubscription.status}`)
        console.log(`      External Reference: ${mpSubscription.external_reference}`)
        console.log(`      Fecha creación: ${mpSubscription.date_created}`)
        console.log(`      Última modificación: ${mpSubscription.last_modified}`)
        console.log(`      Auto recurring: ${JSON.stringify(mpSubscription.auto_recurring)}`)
        console.log(`      Payer ID: ${mpSubscription.payer_id}`)
        console.log(`      Payer Email: ${mpSubscription.payer_email}`)
        
        // Comparar estados
        console.log(`\n   🔍 COMPARACIÓN DE ESTADOS:`)
        console.log(`      Estado en BD: ${subscription.status}`)
        console.log(`      Estado en MP: ${mpSubscription.status}`)
        console.log(`      ¿Coinciden?: ${subscription.status === mpSubscription.status ? '✅' : '❌'}`)
        
        // Si el estado en MP es diferente, mostrar recomendación
        if (subscription.status !== mpSubscription.status) {
          console.log(`\n   ⚠️ INCONSISTENCIA DETECTADA:`)
          console.log(`      La suscripción en MercadoPago tiene estado "${mpSubscription.status}"`)
          console.log(`      Pero en nuestra BD tiene estado "${subscription.status}"`)
          console.log(`      Esto indica que los webhooks no se procesaron correctamente`)
        }
        
        // Guardar datos de MP para posible sincronización
        global.mpSubscriptionData = mpSubscription
        
      } else {
        console.log('❌ No se encontró la suscripción en MercadoPago')
        console.log('   Esto podría indicar que:')
        console.log('   1. La suscripción no se creó correctamente en MP')
        console.log('   2. El external_reference no coincide')
        console.log('   3. Hay un problema con la configuración de MP')
      }
      
    } catch (mpError) {
      console.log('❌ Error consultando MercadoPago API:', mpError.response?.data || mpError.message)
    }

    // 5. Análisis y diagnóstico
    console.log('\n🔍 5. ANÁLISIS Y DIAGNÓSTICO')
    console.log('-' .repeat(50))
    
    const hasWebhooks = (allWebhooks?.length || 0) > 0
    const hasMpSubscriptionId = !!subscription.mercadopago_subscription_id
    const hasLastSync = !!subscription.last_sync_at
    
    console.log(`📊 Resumen del diagnóstico:`)
    console.log(`   ✅ Suscripción existe en BD: Sí`)
    console.log(`   ${hasWebhooks ? '✅' : '❌'} Webhooks encontrados: ${hasWebhooks ? 'Sí' : 'No'}`)
    console.log(`   ${hasMpSubscriptionId ? '✅' : '❌'} MP Subscription ID: ${hasMpSubscriptionId ? 'Sí' : 'No'}`)
    console.log(`   ${hasLastSync ? '✅' : '❌'} Última sincronización: ${hasLastSync ? 'Sí' : 'No'}`)
    
    // Determinar el problema principal
    if (!hasWebhooks) {
      console.log(`\n❌ PROBLEMA PRINCIPAL: NO HAY WEBHOOKS`)
      console.log(`   Causas posibles:`)
      console.log(`   1. MercadoPago no está enviando webhooks`)
      console.log(`   2. Los webhooks no llegan al servidor`)
      console.log(`   3. Los webhooks fallan al procesarse`)
      console.log(`   4. La configuración de webhooks está incorrecta`)
    } else if (!hasMpSubscriptionId) {
      console.log(`\n❌ PROBLEMA PRINCIPAL: WEBHOOKS NO PROCESADOS`)
      console.log(`   Los webhooks llegaron pero no se procesaron correctamente`)
      console.log(`   La suscripción no tiene mercadopago_subscription_id`)
    } else if (subscription.status === 'pending') {
      console.log(`\n❌ PROBLEMA PRINCIPAL: ESTADO NO ACTUALIZADO`)
      console.log(`   Los webhooks se procesaron pero el estado no se actualizó`)
      console.log(`   Posible problema en la lógica de activación`)
    }

    // 6. Recomendaciones de acción
    console.log('\n💡 6. RECOMENDACIONES DE ACCIÓN')
    console.log('-' .repeat(50))
    
    if (global.mpSubscriptionData) {
      const mpSub = global.mpSubscriptionData
      if (mpSub.status === 'authorized' || mpSub.status === 'approved') {
        console.log(`✅ ACCIÓN RECOMENDADA: SINCRONIZACIÓN AUTOMÁTICA`)
        console.log(`   La suscripción está activa en MercadoPago (${mpSub.status})`)
        console.log(`   Se puede activar automáticamente basándose en los datos de MP`)
        console.log(`   Ejecutar: node scripts/sync-subscription-134.js`)
      } else {
        console.log(`⚠️ ESTADO EN MP: ${mpSub.status}`)
        console.log(`   Revisar por qué la suscripción no está activa en MercadoPago`)
      }
    } else {
      console.log(`❌ ACCIÓN REQUERIDA: INVESTIGACIÓN MANUAL`)
      console.log(`   1. Verificar configuración de webhooks en MercadoPago`)
      console.log(`   2. Revisar logs del servidor web`)
      console.log(`   3. Probar webhook manualmente`)
      console.log(`   4. Verificar que la suscripción se creó en MP`)
    }

  } catch (error) {
    console.error('❌ Error durante la investigación:', error.message)
    console.error(error.stack)
  }
}

// Ejecutar investigación
investigateSubscription134().then(() => {
  console.log('\n✅ Investigación completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando investigación:', error.message)
  process.exit(1)
})