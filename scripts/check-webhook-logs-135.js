/**
 * Script para revisar logs de webhook específicos para la suscripción ID 135
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-bea44606
 * Usuario: 2f4ec8c0-0e58-486d-9c11-a652368f7c19
 * Email: cristoferscalante@gmail.com
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

async function checkWebhookLogs135() {
  console.log('🔍 Revisando logs de webhook para suscripción ID 135...')
  
  const targetExternalRef = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-bea44606'
  const targetUserId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  const targetEmail = 'cristoferscalante@gmail.com'
  const preapprovalId = '271804c66ace41499fe81348f35e184b'
  
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
              const data = typeof webhook.webhook_data === 'string' ? JSON.parse(webhook.webhook_data) : webhook.webhook_data
              console.log(`      📄 Datos: ${JSON.stringify(data, null, 2)}`)
            } catch (e) {
              console.log(`      📄 Datos (raw): ${webhook.webhook_data}`)
            }
          }
        })
      }
    }

    // 2. Buscar por preapproval_id
    console.log('\n2️⃣ Buscando webhooks por preapproval_id...')
    const { data: webhooksByPreapproval, error: preapprovalError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${preapprovalId}%`)
      .order('created_at', { ascending: false })
    
    if (preapprovalError) {
      console.log('ℹ️ Error buscando por preapproval_id:', preapprovalError.message)
    } else {
      console.log(`📊 Webhooks encontrados por preapproval_id: ${webhooksByPreapproval?.length || 0}`)
      
      if (webhooksByPreapproval && webhooksByPreapproval.length > 0) {
        webhooksByPreapproval.forEach((webhook, index) => {
          console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
          console.log(`      Tipo: ${webhook.webhook_type || 'N/A'}`)
          console.log(`      Estado: ${webhook.status}`)
          console.log(`      Fecha: ${new Date(webhook.created_at).toLocaleString()}`)
          console.log(`      Procesado: ${webhook.processed_at ? new Date(webhook.processed_at).toLocaleString() : 'No procesado'}`)
          
          if (webhook.error_message) {
            console.log(`      ❌ Error: ${webhook.error_message}`)
          }
        })
      }
    }

    // 3. Buscar por user_id
    console.log('\n3️⃣ Buscando webhooks por user_id...')
    const { data: webhooksByUser, error: userError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${targetUserId}%`)
      .order('created_at', { ascending: false })
    
    if (userError) {
      console.log('ℹ️ Error buscando por user_id:', userError.message)
    } else {
      console.log(`📊 Webhooks encontrados por user_id: ${webhooksByUser?.length || 0}`)
      
      if (webhooksByUser && webhooksByUser.length > 0) {
        webhooksByUser.forEach((webhook, index) => {
          console.log(`\n   ${index + 1}. Webhook ID: ${webhook.id}`)
          console.log(`      Tipo: ${webhook.webhook_type || 'N/A'}`)
          console.log(`      Estado: ${webhook.status}`)
          console.log(`      Fecha: ${new Date(webhook.created_at).toLocaleString()}`)
        })
      }
    }

    // 4. Buscar por email
    console.log('\n4️⃣ Buscando webhooks por email...')
    const { data: webhooksByEmail, error: emailError } = await supabase
      .from('webhook_logs')
      .select('*')
      .ilike('webhook_data', `%${targetEmail}%`)
      .order('created_at', { ascending: false })
    
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

    // 5. Buscar webhooks recientes (últimas 48 horas)
    console.log('\n5️⃣ Buscando webhooks recientes (48 horas)...')
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
                (data.external_reference && data.external_reference.includes(targetUserId)) ||
                (data.payer_email === targetEmail) ||
                (data.external_reference === targetExternalRef) ||
                (data.preapproval_id === preapprovalId)
              )
              
              if (isRelated) {
                console.log(`      🎯 RELACIONADO con suscripción 135`)
              }
            } catch (e) {
              // Ignorar errores de parsing
            }
          }
        })
      }
    }

    // 6. Verificar estado actual de la suscripción
    console.log('\n6️⃣ Verificando estado actual de la suscripción...')
    const { data: currentSub, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 135)
      .single()

    if (subError) {
      console.log('❌ Error obteniendo suscripción:', subError.message)
    } else if (currentSub) {
      console.log('\n📋 Estado actual de la suscripción:')
      console.log(`   ID: ${currentSub.id}`)
      console.log(`   Estado: ${currentSub.status}`)
      console.log(`   External Reference: ${currentSub.external_reference}`)
      console.log(`   MercadoPago ID: ${currentSub.mercadopago_subscription_id || 'NULL'}`)
      console.log(`   Preapproval ID: ${currentSub.preapproval_id || 'NULL'}`)
      console.log(`   Usuario: ${currentSub.user_id}`)
      console.log(`   Email: ${currentSub.customer_email}`)
      console.log(`   Creada: ${currentSub.created_at}`)
      console.log(`   Actualizada: ${currentSub.updated_at}`)
      console.log(`   Última sincronización: ${currentSub.last_sync_at || 'NULL'}`)
    }

    // 7. Resumen y diagnóstico
    console.log('\n\n🎯 === RESUMEN Y DIAGNÓSTICO ===')
    
    const totalWebhooksForSub = (webhooksByRef?.length || 0)
    const totalWebhooksForPreapproval = (webhooksByPreapproval?.length || 0)
    const totalWebhooksForUser = (webhooksByUser?.length || 0)
    const totalWebhooksForEmail = (webhooksByEmail?.length || 0)
    const totalRecentWebhooks = (recentWebhooks?.length || 0)
    
    console.log('\n📊 Estadísticas:')
    console.log(`   • Webhooks para external_reference: ${totalWebhooksForSub}`)
    console.log(`   • Webhooks para preapproval_id: ${totalWebhooksForPreapproval}`)
    console.log(`   • Webhooks para user_id: ${totalWebhooksForUser}`)
    console.log(`   • Webhooks para email: ${totalWebhooksForEmail}`)
    console.log(`   • Webhooks recientes (48h): ${totalRecentWebhooks}`)
    
    if (totalWebhooksForSub === 0 && totalWebhooksForPreapproval === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:')
      console.log('   No se encontraron webhooks para la suscripción ID 135')
      console.log('   Esto indica que:')
      console.log('   1. MercadoPago no está enviando webhooks para esta suscripción')
      console.log('   2. Los webhooks no están llegando al servidor')
      console.log('   3. Los webhooks no se están guardando en la BD')
      console.log('   4. El preapproval_id no ha generado eventos de webhook')
      
      console.log('\n🔧 ACCIONES RECOMENDADAS:')
      console.log('   1. Verificar configuración de webhooks en MercadoPago')
      console.log('   2. Consultar directamente la API de MercadoPago para el preapproval_id')
      console.log('   3. Revisar logs del servidor web')
      console.log('   4. Verificar que la URL del webhook sea accesible')
      console.log('   5. Activar manualmente si MercadoPago confirma autorización')
    } else {
      console.log('\n✅ Se encontraron webhooks relacionados')
      console.log('   Revisar los detalles arriba para identificar problemas de procesamiento')
    }
    
  } catch (error) {
    console.error('❌ Error revisando logs de webhook:', error.message)
  }
}

// Ejecutar revisión
checkWebhookLogs135().then(() => {
  console.log('\n✅ Revisión de logs completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando revisión:', error.message)
  process.exit(1)
})