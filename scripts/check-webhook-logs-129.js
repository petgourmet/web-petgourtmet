/**
 * Script para revisar logs de webhook específicos para la suscripción ID 129
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de
 * Usuario: 2f4ec8c0-0e58-486d-9c11-a652368f7c19
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkWebhookLogs129() {
  console.log('🔍 Revisando logs de webhook para suscripción ID 129...')
  
  const targetExternalRef = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
  const targetUserId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  const targetEmail = 'cristoferscalante@gmail.com'
  
  try {
    // 1. Buscar en webhook_logs por external_reference
    console.log('\n1️⃣ Buscando webhooks por external_reference...')
    const { data: webhooksByRef, error: refError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${targetExternalRef}%`)
      .order('created_at', { ascending: false })
    
    if (refError) {
      console.log('ℹ️ Tabla webhook_logs no encontrada o error:', refError.message)
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
    
    // 2. Buscar webhooks por email del usuario
    console.log('\n2️⃣ Buscando webhooks por email del usuario...')
    const { data: webhooksByEmail, error: emailError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${targetEmail}%`)
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
    
    // 3. Buscar webhooks recientes (últimas 24 horas)
    console.log('\n3️⃣ Buscando webhooks recientes (últimas 24 horas)...')
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
    
    // 4. Verificar si hay errores específicos
    console.log('\n4️⃣ Buscando errores de webhook...')
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
    
    // 5. Resumen y diagnóstico
    console.log('\n🔍 === DIAGNÓSTICO DE WEBHOOKS ===')
    
    const totalWebhooksForSub = (webhooksByRef?.length || 0)
    const totalWebhooksForEmail = (webhooksByEmail?.length || 0)
    const totalRecentWebhooks = (recentWebhooks?.length || 0)
    const totalErrorWebhooks = (errorWebhooks?.length || 0)
    
    console.log(`📊 Resumen:`)
    console.log(`   • Webhooks para external_reference: ${totalWebhooksForSub}`)
    console.log(`   • Webhooks para email: ${totalWebhooksForEmail}`)
    console.log(`   • Webhooks recientes (24h): ${totalRecentWebhooks}`)
    console.log(`   • Webhooks con errores: ${totalErrorWebhooks}`)
    
    if (totalWebhooksForSub === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:')
      console.log('   No se encontraron webhooks para la suscripción ID 129')
      console.log('   Esto indica que:')
      console.log('   1. MercadoPago no está enviando webhooks')
      console.log('   2. Los webhooks no están llegando al servidor')
      console.log('   3. Los webhooks no se están guardando en la BD')
      
      console.log('\n🔧 ACCIONES RECOMENDADAS:')
      console.log('   1. Verificar configuración de webhooks en MercadoPago')
      console.log('   2. Revisar logs del servidor web')
      console.log('   3. Probar webhook manualmente')
      console.log('   4. Verificar que la URL del webhook sea accesible')
    } else {
      console.log('\n✅ Se encontraron webhooks para esta suscripción')
      console.log('   Revisar los detalles arriba para identificar problemas de procesamiento')
    }
    
  } catch (error) {
    console.error('❌ Error revisando logs de webhook:', error.message)
  }
}

// Ejecutar revisión
checkWebhookLogs129().then(() => {
  console.log('\n✅ Revisión de logs completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando revisión:', error.message)
  process.exit(1)
})