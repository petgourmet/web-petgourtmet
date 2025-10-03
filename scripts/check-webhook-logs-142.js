/**
 * VERIFICACIÓN DE WEBHOOKS PARA SUSCRIPCIÓN ID 142
 * 
 * Busca webhooks relacionados con la suscripción ID 142 que está en estado pending
 * y está causando carga infinita en la página de suscripción.
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Datos de la suscripción problemática
const SUBSCRIPTION_ID = 142
const EXTERNAL_REFERENCE = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
const USER_ID = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
const USER_EMAIL = 'cristoferscalante@gmail.com'

async function checkWebhookLogs142() {
  console.log('🔍 VERIFICANDO WEBHOOKS PARA SUSCRIPCIÓN ID 142')
  console.log('================================================================================')
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`)
  console.log(`🎯 Objetivo: Encontrar webhooks pendientes o perdidos`)
  console.log(`📝 External Reference: ${EXTERNAL_REFERENCE}`)
  console.log(`👤 Usuario: ${USER_EMAIL}`)
  console.log('================================================================================\n')

  try {
    // 1. Buscar en webhook_logs por external_reference
    console.log('📋 PASO 1: Buscando en webhook_logs por external_reference...')
    const { data: webhooksByRef, error: webhookRefError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`payload.ilike.%${EXTERNAL_REFERENCE}%,response.ilike.%${EXTERNAL_REFERENCE}%,webhook_data.ilike.%${EXTERNAL_REFERENCE}%`)
      .order('created_at', { ascending: false })

    if (webhookRefError && !webhookRefError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks por external_reference:', webhookRefError.message)
    } else if (webhooksByRef && webhooksByRef.length > 0) {
      console.log(`✅ Encontrados ${webhooksByRef.length} webhooks por external_reference:`)
      webhooksByRef.forEach((webhook, index) => {
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
            console.log(`      📋 Datos relevantes:`)
            if (parsedData.external_reference) {
              console.log(`         External Ref: ${parsedData.external_reference}`)
            }
            if (parsedData.status) {
              console.log(`         Estado MP: ${parsedData.status}`)
            }
            if (parsedData.id) {
              console.log(`         MP ID: ${parsedData.id}`)
            }
          } catch (e) {
            console.log(`      ⚠️ Error parseando datos del webhook`)
          }
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks por external_reference')
    }
    console.log('')

    // 2. Buscar en mercadopago_webhooks por external_reference
    console.log('📋 PASO 2: Buscando en mercadopago_webhooks por external_reference...')
    const { data: mpWebhooksByRef, error: mpRefError } = await supabase
      .from('mercadopago_webhooks')
      .select('*')
      .or(`raw_data.ilike.%${EXTERNAL_REFERENCE}%,data.ilike.%${EXTERNAL_REFERENCE}%`)
      .order('created_at', { ascending: false })

    if (mpRefError && !mpRefError.message.includes('does not exist')) {
      console.error('❌ Error buscando en mercadopago_webhooks:', mpRefError.message)
    } else if (mpWebhooksByRef && mpWebhooksByRef.length > 0) {
      console.log(`✅ Encontrados ${mpWebhooksByRef.length} webhooks en mercadopago_webhooks:`)
      mpWebhooksByRef.forEach((webhook, index) => {
        console.log(`\n   ${index + 1}. MP Webhook ID: ${webhook.id}`)
        console.log(`      📅 Fecha: ${webhook.created_at}`)
        console.log(`      🏷️ Tipo: ${webhook.event_type}`)
        console.log(`      📊 Data ID: ${webhook.data_id}`)
        console.log(`      🔗 Webhook ID: ${webhook.webhook_id}`)
        
        if (webhook.raw_data) {
          try {
            const data = typeof webhook.raw_data === 'string' ? JSON.parse(webhook.raw_data) : webhook.raw_data
            if (data.external_reference && data.external_reference.includes(EXTERNAL_REFERENCE)) {
              console.log(`      🎯 COINCIDENCIA: External reference encontrado`)
            }
          } catch (e) {
            console.log(`      ⚠️ Error parseando raw_data`)
          }
        }
      })
    } else {
      console.log('⚠️ No se encontraron webhooks en mercadopago_webhooks')
    }
    console.log('')

    // 3. Buscar webhooks por user_id
    console.log('📋 PASO 3: Buscando webhooks por user_id...')
    const { data: webhooksByUser, error: webhookUserError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`payload.ilike.%${USER_ID}%,response.ilike.%${USER_ID}%,webhook_data.ilike.%${USER_ID}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (webhookUserError && !webhookUserError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks por user_id:', webhookUserError.message)
    } else if (webhooksByUser && webhooksByUser.length > 0) {
      console.log(`✅ Encontrados ${webhooksByUser.length} webhooks por user_id:`)
      webhooksByUser.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.webhook_type || webhook.event_type || 'N/A'} | ${webhook.status} | ${webhook.created_at}`)
      })
    } else {
      console.log('⚠️ No se encontraron webhooks por user_id')
    }
    console.log('')

    // 4. Buscar webhooks por email
    console.log('📋 PASO 4: Buscando webhooks por email...')
    const { data: webhooksByEmail, error: webhookEmailError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`payload.ilike.%${USER_EMAIL}%,response.ilike.%${USER_EMAIL}%,webhook_data.ilike.%${USER_EMAIL}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (webhookEmailError && !webhookEmailError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks por email:', webhookEmailError.message)
    } else if (webhooksByEmail && webhooksByEmail.length > 0) {
      console.log(`✅ Encontrados ${webhooksByEmail.length} webhooks por email:`)
      webhooksByEmail.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.webhook_type || webhook.event_type || 'N/A'} | ${webhook.status} | ${webhook.created_at}`)
      })
    } else {
      console.log('⚠️ No se encontraron webhooks por email')
    }
    console.log('')

    // 5. Buscar webhooks recientes (últimas 24 horas)
    console.log('📋 PASO 5: Buscando webhooks recientes (últimas 24 horas)...')
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    
    const { data: recentWebhooks, error: recentError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentError && !recentError.message.includes('does not exist')) {
      console.error('❌ Error buscando webhooks recientes:', recentError.message)
    } else if (recentWebhooks && recentWebhooks.length > 0) {
      console.log(`✅ Encontrados ${recentWebhooks.length} webhooks recientes:`)
      recentWebhooks.forEach((webhook, index) => {
        const webhookDataStr = typeof webhook.webhook_data === 'string' ? webhook.webhook_data : JSON.stringify(webhook.webhook_data || {})
        const payloadStr = typeof webhook.payload === 'string' ? webhook.payload : JSON.stringify(webhook.payload || {})
        
        const isRelated = webhookDataStr.includes(EXTERNAL_REFERENCE) || 
                         payloadStr.includes(EXTERNAL_REFERENCE) ||
                         webhookDataStr.includes(USER_ID) ||
                         payloadStr.includes(USER_ID)
        
        console.log(`   ${index + 1}. ${webhook.webhook_type || webhook.event_type || 'N/A'} | ${webhook.status} | ${webhook.created_at}${isRelated ? ' ← RELACIONADO' : ''}`)
      })
    } else {
      console.log('⚠️ No se encontraron webhooks recientes')
    }
    console.log('')

    // 6. Buscar webhooks con errores
    console.log('📋 PASO 6: Buscando webhooks con errores...')
    const { data: errorWebhooks, error: errorSearchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(10)

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

    // 7. Resumen y análisis
    console.log('📊 RESUMEN DE WEBHOOKS')
    console.log('================================================================================')
    
    const totalWebhooksForSub = (webhooksByRef?.length || 0)
    const totalWebhooksForUser = (webhooksByUser?.length || 0)
    const totalWebhooksForEmail = (webhooksByEmail?.length || 0)
    const totalRecentWebhooks = (recentWebhooks?.length || 0)
    const totalErrorWebhooks = (errorWebhooks?.length || 0)
    const totalMpWebhooks = (mpWebhooksByRef?.length || 0)

    console.log(`   • Webhooks para external_reference: ${totalWebhooksForSub}`)
    console.log(`   • Webhooks para user_id: ${totalWebhooksForUser}`)
    console.log(`   • Webhooks para email: ${totalWebhooksForEmail}`)
    console.log(`   • Webhooks en mercadopago_webhooks: ${totalMpWebhooks}`)
    console.log(`   • Webhooks recientes (24h): ${totalRecentWebhooks}`)
    console.log(`   • Webhooks con errores: ${totalErrorWebhooks}`)
    console.log('')

    // 8. Diagnóstico
    console.log('🔍 DIAGNÓSTICO')
    console.log('================================================================================')
    
    if (totalWebhooksForSub === 0 && totalMpWebhooks === 0) {
      console.log('❌ PROBLEMA CRÍTICO: NO HAY WEBHOOKS PARA ESTA SUSCRIPCIÓN')
      console.log('   Esto indica que:')
      console.log('   1. MercadoPago no está enviando webhooks para esta suscripción')
      console.log('   2. Los webhooks no están llegando al servidor')
      console.log('   3. Los webhooks no se están guardando en la base de datos')
      console.log('   4. La suscripción no se creó correctamente en MercadoPago')
      console.log('')
      console.log('🔧 ACCIONES REQUERIDAS:')
      console.log('   1. ⚡ URGENTE: Consultar estado real en MercadoPago API')
      console.log('   2. 🔄 Ejecutar sincronización manual con MercadoPago')
      console.log('   3. 🔧 Activar suscripción si está autorizada en MercadoPago')
      console.log('   4. 📞 Verificar configuración de webhooks en MercadoPago')
    } else if (totalWebhooksForSub > 0) {
      console.log('⚠️ WEBHOOKS ENCONTRADOS PERO SUSCRIPCIÓN SIGUE PENDING')
      console.log('   Los webhooks llegaron pero no activaron la suscripción')
      console.log('   Posibles causas:')
      console.log('   1. Error en el procesamiento de webhooks')
      console.log('   2. Webhook con estado incorrecto')
      console.log('   3. Fallo en la lógica de activación automática')
      console.log('')
      console.log('🔧 ACCIONES REQUERIDAS:')
      console.log('   1. 📋 Revisar detalles de los webhooks encontrados')
      console.log('   2. 🔄 Re-procesar webhooks si es necesario')
      console.log('   3. 🔧 Activar manualmente basándose en el estado de MercadoPago')
    } else {
      console.log('✅ ANÁLISIS COMPLETADO')
      console.log('   Se encontraron algunos webhooks relacionados')
      console.log('   Revisar los detalles arriba para identificar el problema específico')
    }

    console.log('')
    console.log('================================================================================')
    console.log('🏁 Verificación de webhooks completada')
    console.log('================================================================================')

    return {
      webhooksForSubscription: totalWebhooksForSub,
      webhooksForUser: totalWebhooksForUser,
      webhooksForEmail: totalWebhooksForEmail,
      mpWebhooks: totalMpWebhooks,
      recentWebhooks: totalRecentWebhooks,
      errorWebhooks: totalErrorWebhooks,
      hasWebhooks: totalWebhooksForSub > 0 || totalMpWebhooks > 0,
      needsUrgentAction: totalWebhooksForSub === 0 && totalMpWebhooks === 0
    }

  } catch (error) {
    console.error('❌ Error durante la verificación de webhooks:', error)
    throw error
  }
}

// Ejecutar verificación
if (require.main === module) {
  checkWebhookLogs142()
    .then(result => {
      if (result?.needsUrgentAction) {
        console.log('\n🚨 ACCIÓN URGENTE REQUERIDA: No se encontraron webhooks para esta suscripción')
        process.exit(1)
      } else {
        console.log('\n✅ Verificación de webhooks completada')
        process.exit(0)
      }
    })
    .catch(error => {
      console.error('\n❌ Error en la verificación de webhooks:', error)
      process.exit(1)
    })
}

module.exports = { checkWebhookLogs142 }