const { createClient } = require('@supabase/supabase-js')

// Configurar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixqhqjqxqjqxqjqx.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkWebhookLogs131() {
  console.log('🔍 Revisando logs de webhook para suscripción ID 131...')
  
  const targetExternalRef = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
  const targetUserId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  const targetEmail = 'cristoferscalante@gmail.com'
  
  try {
    // 1. Buscar en webhook_logs por external_reference
    console.log('\n1️⃣ Buscando webhooks por external_reference...')
    const { data: webhooksByRef, error: refError } = await supabase
      .from('webhook_logs')
      .select('*')
      .contains('webhook_data', { external_reference: targetExternalRef })
      .order('created_at', { ascending: false })
    
    if (refError) {
      console.log('ℹ️ Error en webhook_logs:', refError.message)
    } else {
      console.log(`📊 Webhooks encontrados por external_reference: ${webhooksByRef?.length || 0}`)
      
      if (webhooksByRef && webhooksByRef.length > 0) {
        webhooksByRef.forEach((webhook, index) => {
          console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
          console.log(`      Tipo: ${webhook.webhook_type || 'N/A'}`)
          console.log(`      Estado: ${webhook.status}`)
          console.log(`      Fecha: ${new Date(webhook.created_at).toLocaleString()}`)
          console.log(`      Procesado: ${webhook.processed_at ? new Date(webhook.processed_at).toLocaleString() : 'No procesado'}`)
          
          if (webhook.error_message) {
            console.log(`      ❌ Error: ${webhook.error_message}`)
          }
          
          if (webhook.webhook_data) {
            try {
              const data = typeof webhook.webhook_data === 'string' 
                ? JSON.parse(webhook.webhook_data) 
                : webhook.webhook_data
              console.log(`      📋 Datos: ${JSON.stringify(data, null, 2)}`)
            } catch (e) {
              console.log(`      ⚠️ Error parseando webhook_data`)
            }
          }
        })
      }
    }
    
    // 2. Buscar en mercadopago_webhooks por external_reference
    console.log('\n2️⃣ Buscando en mercadopago_webhooks por external_reference...')
    const { data: mpWebhooksByRef, error: mpRefError } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .ilike('raw_data', `%${targetExternalRef}%`)
      .order('created_at', { ascending: false })
    
    if (mpRefError) {
      console.log('ℹ️ Error en mercadopago_webhooks:', mpRefError.message)
    } else {
      console.log(`📊 MercadoPago webhooks encontrados por external_reference: ${mpWebhooksByRef?.length || 0}`)
      
      if (mpWebhooksByRef && mpWebhooksByRef.length > 0) {
        mpWebhooksByRef.forEach((webhook, index) => {
          console.log(`\n   ${index + 1}. MP Webhook ID: ${webhook.id}`)
          console.log(`      Webhook ID: ${webhook.webhook_id}`)
          console.log(`      Tipo: ${webhook.event_type}`)
          console.log(`      Data ID: ${webhook.data_id}`)
          console.log(`      Procesado: ${webhook.processed}`)
          console.log(`      Fecha: ${new Date(webhook.created_at).toLocaleString()}`)
          console.log(`      Procesado en: ${webhook.processed_at ? new Date(webhook.processed_at).toLocaleString() : 'No procesado'}`)
          
          if (webhook.error_message) {
            console.log(`      ❌ Error: ${webhook.error_message}`)
          }
          
          if (webhook.raw_data) {
            try {
              const data = typeof webhook.raw_data === 'string' 
                ? JSON.parse(webhook.raw_data) 
                : webhook.raw_data
              console.log(`      📋 Raw Data: ${JSON.stringify(data, null, 2)}`)
            } catch (e) {
              console.log(`      ⚠️ Error parseando raw_data`)
            }
          }
        })
      }
    }
    
    // 3. Buscar webhooks por email del usuario
    console.log('\n3️⃣ Buscando webhooks por email del usuario...')
    const { data: webhooksByEmail, error: emailError } = await supabase
      .from('webhook_logs')
      .select('*')
      .contains('webhook_data', { payer_email: targetEmail })
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (emailError) {
      console.log('ℹ️ Error buscando por email:', emailError.message)
    } else {
      console.log(`📊 Webhooks encontrados por email: ${webhooksByEmail?.length || 0}`)
      
      if (webhooksByEmail && webhooksByEmail.length > 0) {
        webhooksByEmail.forEach((webhook, index) => {
          console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
          console.log(`      Tipo: ${webhook.webhook_type || 'N/A'}`)
          console.log(`      Estado: ${webhook.status}`)
          console.log(`      Fecha: ${new Date(webhook.created_at).toLocaleString()}`)
        })
      }
    }
    
    // 4. Buscar webhooks recientes (últimas 24 horas)
    console.log('\n4️⃣ Buscando webhooks recientes (últimas 24 horas)...')
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: recentWebhooks, error: recentError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (recentError) {
      console.log('ℹ️ Error buscando webhooks recientes:', recentError.message)
    } else {
      console.log(`📊 Webhooks recientes encontrados: ${recentWebhooks?.length || 0}`)
      
      if (recentWebhooks && recentWebhooks.length > 0) {
        console.log('\n📋 Últimos webhooks recibidos:')
        recentWebhooks.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ${webhook.webhook_type || 'N/A'} | ${webhook.status} | ${new Date(webhook.created_at).toLocaleString()}`)
          
          // Verificar si contiene datos relacionados con nuestra suscripción
          if (webhook.webhook_data) {
            try {
              const data = typeof webhook.webhook_data === 'string' 
                ? JSON.parse(webhook.webhook_data) 
                : webhook.webhook_data
              
              if (data.external_reference && data.external_reference.includes(targetUserId)) {
                console.log(`      🎯 RELACIONADO: ${data.external_reference}`)
              }
              
              if (data.payer_email === targetEmail) {
                console.log(`      🎯 RELACIONADO: Email coincide`)
              }
            } catch (e) {
              // Ignorar errores de parsing
            }
          }
        })
      }
    }
    
    // 5. Verificar si hay errores específicos
    console.log('\n5️⃣ Buscando errores de webhook...')
    const { data: errorWebhooks, error: errorSearchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (errorSearchError) {
      console.log('ℹ️ Error buscando webhooks con errores:', errorSearchError.message)
    } else {
      console.log(`📊 Webhooks con errores encontrados: ${errorWebhooks?.length || 0}`)
      
      if (errorWebhooks && errorWebhooks.length > 0) {
        console.log('\n❌ Errores de webhook recientes:')
        errorWebhooks.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ${webhook.webhook_type || 'N/A'} | ${new Date(webhook.created_at).toLocaleString()}`)
          if (webhook.error_message) {
            console.log(`      Error: ${webhook.error_message}`)
          }
        })
      }
    }
    
    // 6. Buscar webhooks no procesados
    console.log('\n6️⃣ Buscando webhooks no procesados...')
    const { data: unprocessedWebhooks, error: unprocessedError } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (unprocessedError) {
      console.log('ℹ️ Error buscando webhooks no procesados:', unprocessedError.message)
    } else {
      console.log(`📊 Webhooks no procesados encontrados: ${unprocessedWebhooks?.length || 0}`)
      
      if (unprocessedWebhooks && unprocessedWebhooks.length > 0) {
        console.log('\n⏳ Webhooks pendientes de procesar:')
        unprocessedWebhooks.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ${webhook.event_type} | Data ID: ${webhook.data_id} | ${new Date(webhook.created_at).toLocaleString()}`)
          
          // Verificar si está relacionado con nuestra suscripción
          if (webhook.raw_data) {
            try {
              const data = typeof webhook.raw_data === 'string' 
                ? JSON.parse(webhook.raw_data) 
                : webhook.raw_data
              
              if (data.external_reference && data.external_reference.includes(targetUserId)) {
                console.log(`      🎯 RELACIONADO CON SUSCRIPCIÓN 131: ${data.external_reference}`)
              }
            } catch (e) {
              // Ignorar errores de parsing
            }
          }
        })
      }
    }
    
    // 7. Resumen y diagnóstico
    console.log('\n🔍 === DIAGNÓSTICO DE WEBHOOKS PARA SUSCRIPCIÓN 131 ===')
    
    const totalWebhooksForSub = (webhooksByRef?.length || 0) + (mpWebhooksByRef?.length || 0)
    const totalWebhooksForEmail = (webhooksByEmail?.length || 0)
    const totalRecentWebhooks = (recentWebhooks?.length || 0)
    const totalErrorWebhooks = (errorWebhooks?.length || 0)
    const totalUnprocessedWebhooks = (unprocessedWebhooks?.length || 0)
    
    console.log(`📊 Resumen:`)
    console.log(`   • Webhooks para external_reference: ${totalWebhooksForSub}`)
    console.log(`   • Webhooks para email: ${totalWebhooksForEmail}`)
    console.log(`   • Webhooks recientes (24h): ${totalRecentWebhooks}`)
    console.log(`   • Webhooks con errores: ${totalErrorWebhooks}`)
    console.log(`   • Webhooks no procesados: ${totalUnprocessedWebhooks}`)
    
    if (totalWebhooksForSub === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:')
      console.log('   No se encontraron webhooks para la suscripción ID 131')
      console.log('   Esto indica que:')
      console.log('   1. MercadoPago no está enviando webhooks para esta suscripción')
      console.log('   2. Los webhooks no están llegando al servidor')
      console.log('   3. Los webhooks no se están guardando en la BD')
      console.log('   4. La suscripción no se creó correctamente en MercadoPago')
      
      console.log('\n🔧 ACCIONES RECOMENDADAS:')
      console.log('   1. Verificar si la suscripción existe en MercadoPago')
      console.log('   2. Revisar configuración de webhooks en MercadoPago')
      console.log('   3. Probar webhook manualmente')
      console.log('   4. Activar manualmente la suscripción')
    } else {
      console.log('\n✅ Se encontraron webhooks para esta suscripción')
      console.log('   Revisar los detalles arriba para identificar problemas de procesamiento')
      
      if (totalUnprocessedWebhooks > 0) {
        console.log('\n⚠️ HAY WEBHOOKS NO PROCESADOS')
        console.log('   Esto podría ser la causa del problema')
      }
    }
    
  } catch (error) {
    console.error('❌ Error revisando logs de webhook:', error.message)
  }
}

// Ejecutar revisión
checkWebhookLogs131().then(() => {
  console.log('\n✅ Revisión de logs completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando revisión:', error.message)
  process.exit(1)
})