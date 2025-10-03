const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const COLLECTION_ID = '127917919415'
const EXTERNAL_REFERENCE = '68f563d94f2a4adfa147eb78ec1abf65'
const ORIGINAL_EXTERNAL_REF = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'

async function checkWebhookLogs() {
  console.log('🔍 DIAGNÓSTICO DE WEBHOOKS PARA COLLECTION_ID 127917919415')
  console.log('================================================================================')
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`)
  console.log(`🎯 Collection ID: ${COLLECTION_ID}`)
  console.log(`📝 External Reference (MP): ${EXTERNAL_REFERENCE}`)
  console.log(`📝 External Reference (Original): ${ORIGINAL_EXTERNAL_REF}`)
  console.log('================================================================================\n')

  try {
    // 1. Buscar webhooks por collection_id
    console.log('📋 PASO 1: Buscando webhooks por collection_id...')
    const { data: webhooksByCollection, error: collectionError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`webhook_data.ilike.%${COLLECTION_ID}%,payload.ilike.%${COLLECTION_ID}%`)
      .order('created_at', { ascending: false })

    if (collectionError && !collectionError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks por collection_id:', collectionError.message)
    } else if (webhooksByCollection && webhooksByCollection.length > 0) {
      console.log(`✅ Encontrados ${webhooksByCollection.length} webhooks por collection_id:`)
      webhooksByCollection.forEach((webhook, index) => {
        console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
        console.log(`      📅 Fecha: ${webhook.created_at}`)
        console.log(`      🏷️ Tipo: ${webhook.webhook_type || webhook.event_type || 'N/A'}`)
        console.log(`      📊 Estado: ${webhook.status}`)
        
        if (webhook.error_message) {
          console.log(`      ❌ Error: ${webhook.error_message}`)
        }
        
        if (webhook.webhook_data || webhook.payload) {
          try {
            const data = webhook.webhook_data || webhook.payload
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data
            console.log(`      📋 Datos del webhook:`)
            console.log(`         ${JSON.stringify(parsedData, null, 8)}`)
          } catch (e) {
            console.log(`      ⚠️ Error parseando datos del webhook`)
          }
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks por collection_id')
    }
    console.log('')

    // 2. Buscar webhooks por external_reference de MercadoPago
    console.log('📋 PASO 2: Buscando webhooks por external_reference de MercadoPago...')
    const { data: webhooksByExtRef, error: extRefError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`webhook_data.ilike.%${EXTERNAL_REFERENCE}%,payload.ilike.%${EXTERNAL_REFERENCE}%`)
      .order('created_at', { ascending: false })

    if (extRefError && !extRefError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks por external_reference:', extRefError.message)
    } else if (webhooksByExtRef && webhooksByExtRef.length > 0) {
      console.log(`✅ Encontrados ${webhooksByExtRef.length} webhooks por external_reference:`)
      webhooksByExtRef.forEach((webhook, index) => {
        console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
        console.log(`      📅 Fecha: ${webhook.created_at}`)
        console.log(`      🏷️ Tipo: ${webhook.webhook_type || webhook.event_type || 'N/A'}`)
        console.log(`      📊 Estado: ${webhook.status}`)
        
        if (webhook.error_message) {
          console.log(`      ❌ Error: ${webhook.error_message}`)
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks por external_reference de MercadoPago')
    }
    console.log('')

    // 3. Buscar webhooks por external_reference original
    console.log('📋 PASO 3: Buscando webhooks por external_reference original...')
    const { data: webhooksByOrigRef, error: origRefError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`webhook_data.ilike.%${ORIGINAL_EXTERNAL_REF}%,payload.ilike.%${ORIGINAL_EXTERNAL_REF}%`)
      .order('created_at', { ascending: false })

    if (origRefError && !origRefError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks por external_reference original:', origRefError.message)
    } else if (webhooksByOrigRef && webhooksByOrigRef.length > 0) {
      console.log(`✅ Encontrados ${webhooksByOrigRef.length} webhooks por external_reference original:`)
      webhooksByOrigRef.forEach((webhook, index) => {
        console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
        console.log(`      📅 Fecha: ${webhook.created_at}`)
        console.log(`      🏷️ Tipo: ${webhook.webhook_type || webhook.event_type || 'N/A'}`)
        console.log(`      📊 Estado: ${webhook.status}`)
        
        if (webhook.error_message) {
          console.log(`      ❌ Error: ${webhook.error_message}`)
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks por external_reference original')
    }
    console.log('')

    // 4. Buscar webhooks recientes (últimas 6 horas)
    console.log('📋 PASO 4: Buscando webhooks recientes (últimas 6 horas)...')
    const sixHoursAgo = new Date()
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)
    
    const { data: recentWebhooks, error: recentError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', sixHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(30)

    if (recentError && !recentError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks recientes:', recentError.message)
    } else if (recentWebhooks && recentWebhooks.length > 0) {
      console.log(`✅ Encontrados ${recentWebhooks.length} webhooks recientes:`)
      recentWebhooks.forEach((webhook, index) => {
        const webhookDataStr = typeof webhook.webhook_data === 'string' ? webhook.webhook_data : JSON.stringify(webhook.webhook_data || {})
        const payloadStr = typeof webhook.payload === 'string' ? webhook.payload : JSON.stringify(webhook.payload || {})
        
        const isRelated = webhookDataStr.includes(COLLECTION_ID) || 
                         payloadStr.includes(COLLECTION_ID) ||
                         webhookDataStr.includes(EXTERNAL_REFERENCE) ||
                         payloadStr.includes(EXTERNAL_REFERENCE) ||
                         webhookDataStr.includes(ORIGINAL_EXTERNAL_REF) ||
                         payloadStr.includes(ORIGINAL_EXTERNAL_REF)
        
        console.log(`   ${index + 1}. ${webhook.webhook_type || webhook.event_type || 'N/A'} | ${webhook.status} | ${webhook.created_at}${isRelated ? ' ← RELACIONADO' : ''}`)
        
        if (isRelated && webhook.error_message) {
          console.log(`      ❌ Error: ${webhook.error_message}`)
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks recientes')
    }
    console.log('')

    // 5. Buscar webhooks con errores
    console.log('📋 PASO 5: Buscando webhooks con errores...')
    const { data: errorWebhooks, error: errorSearchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(15)

    if (errorSearchError && !errorSearchError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks con errores:', errorSearchError.message)
    } else if (errorWebhooks && errorWebhooks.length > 0) {
      console.log(`✅ Encontrados ${errorWebhooks.length} webhooks con errores:`)
      errorWebhooks.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.webhook_type || webhook.event_type || 'N/A'} | ${webhook.created_at}`)
        if (webhook.error_message) {
          console.log(`      Error: ${webhook.error_message}`)
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks con errores')
    }
    console.log('')

    // 6. Verificar tabla mercadopago_webhooks
    console.log('📋 PASO 6: Verificando tabla mercadopago_webhooks...')
    const { data: mpWebhooks, error: mpError } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .or(`webhook_data.ilike.%${COLLECTION_ID}%,webhook_data.ilike.%${EXTERNAL_REFERENCE}%,webhook_data.ilike.%${ORIGINAL_EXTERNAL_REF}%`)
      .order('created_at', { ascending: false })

    if (mpError && !mpError.message.includes('does not exist')) {
      console.error('❌ Error buscando en mercadopago_webhooks:', mpError.message)
    } else if (mpWebhooks && mpWebhooks.length > 0) {
      console.log(`✅ Encontrados ${mpWebhooks.length} webhooks en mercadopago_webhooks:`)
      mpWebhooks.forEach((webhook, index) => {
        console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
        console.log(`      📅 Fecha: ${webhook.created_at}`)
        console.log(`      🏷️ Tipo: ${webhook.webhook_type || webhook.event_type || 'N/A'}`)
        console.log(`      📊 Estado: ${webhook.status}`)
        
        if (webhook.error_message) {
          console.log(`      ❌ Error: ${webhook.error_message}`)
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks en mercadopago_webhooks')
    }
    console.log('')

    // 7. Resumen y diagnóstico
    console.log('📊 DIAGNÓSTICO FINAL')
    console.log('================================================================================')
    
    const totalWebhooksForCollection = (webhooksByCollection?.length || 0)
    const totalWebhooksForExtRef = (webhooksByExtRef?.length || 0)
    const totalWebhooksForOrigRef = (webhooksByOrigRef?.length || 0)
    const totalErrorWebhooks = (errorWebhooks?.length || 0)
    const totalMpWebhooks = (mpWebhooks?.length || 0)
    
    console.log(`   • Webhooks para collection_id ${COLLECTION_ID}: ${totalWebhooksForCollection}`)
    console.log(`   • Webhooks para external_reference ${EXTERNAL_REFERENCE}: ${totalWebhooksForExtRef}`)
    console.log(`   • Webhooks para external_reference original: ${totalWebhooksForOrigRef}`)
    console.log(`   • Webhooks con errores: ${totalErrorWebhooks}`)
    console.log(`   • Webhooks en mercadopago_webhooks: ${totalMpWebhooks}`)
    
    console.log('\n🔍 ANÁLISIS:')
    if (totalWebhooksForCollection === 0 && totalWebhooksForExtRef === 0 && totalWebhooksForOrigRef === 0) {
      console.log('❌ PROBLEMA CRÍTICO: No se encontraron webhooks para este pago')
      console.log('   Esto indica que:')
      console.log('   1. MercadoPago NO envió el webhook de confirmación de pago')
      console.log('   2. El webhook se perdió en el camino')
      console.log('   3. El webhook llegó pero no se guardó correctamente')
      console.log('   4. Hay un problema con la configuración de webhooks en MercadoPago')
      
      console.log('\n🔧 ACCIONES RECOMENDADAS:')
      console.log('   1. Verificar configuración de webhooks en MercadoPago')
      console.log('   2. Revisar logs del servidor web (nginx/apache)')
      console.log('   3. Verificar que la URL del webhook sea accesible públicamente')
      console.log('   4. Probar webhook manualmente con ngrok o similar')
      console.log('   5. Revisar si hay filtros de firewall bloqueando MercadoPago')
    } else {
      console.log('✅ Se encontraron webhooks relacionados')
      console.log('   Revisar los detalles arriba para identificar problemas de procesamiento')
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando diagnóstico:', error.message)
  }
}

// Ejecutar diagnóstico
checkWebhookLogs().then(() => {
  console.log('\n✅ Diagnóstico completado')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando diagnóstico:', error.message)
  process.exit(1)
})