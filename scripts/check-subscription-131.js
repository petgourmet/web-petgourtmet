/**
 * Script para verificar el estado de la suscripción 131 y validar sincronización con webhooks
 * Suscripción ID: 131
 * User ID: 2f4ec8c0-0e58-486d-9c11-a652368f7c19
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de
 */

const { createClient } = require('@supabase/supabase-js')

async function checkSubscription131() {
  try {
    // Configurar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no configuradas')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔍 Verificando estado de la suscripción 131...')
    console.log('=' .repeat(60))

    // 1. Verificar estado actual de la suscripción 131
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 131)
      .single()

    if (subError) {
      console.error('❌ Error al obtener suscripción:', subError)
      return
    }

    if (!subscription) {
      console.log('❌ Suscripción 131 no encontrada')
      return
    }

    console.log('📋 Estado actual de la suscripción:')
    console.log(`   ID: ${subscription.id}`)
    console.log(`   Estado: ${subscription.status}`)
    console.log(`   User ID: ${subscription.user_id}`)
    console.log(`   External Reference: ${subscription.external_reference}`)
    console.log(`   Creada: ${subscription.created_at}`)
    console.log(`   Actualizada: ${subscription.updated_at}`)
    console.log(`   MercadoPago Subscription ID: ${subscription.mercadopago_subscription_id || 'NULL'}`)
    console.log(`   MercadoPago Plan ID: ${subscription.mercadopago_plan_id || 'NULL'}`)
    console.log(`   Próxima facturación: ${subscription.next_billing_date}`)
    console.log(`   Última sincronización: ${subscription.last_sync_at || 'NULL'}`)

    // 2. Buscar webhooks relacionados con esta suscripción
    console.log('\n🔍 Buscando webhooks relacionados...')
    console.log('=' .repeat(60))

    // Buscar por external_reference
    const { data: webhooksByRef, error: webhookRefError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`payload.ilike.%${subscription.external_reference}%,response.ilike.%${subscription.external_reference}%`)
      .order('created_at', { ascending: false })

    if (webhookRefError) {
      console.log('⚠️ Error al buscar webhooks por external_reference:', webhookRefError.message)
    } else {
      console.log(`📨 Webhooks encontrados por external_reference: ${webhooksByRef?.length || 0}`)
      if (webhooksByRef && webhooksByRef.length > 0) {
        webhooksByRef.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ID: ${webhook.id} | Tipo: ${webhook.event_type} | Estado: ${webhook.status} | Fecha: ${webhook.created_at}`)
        })
      }
    }

    // Buscar por user_id
    const { data: webhooksByUser, error: webhookUserError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`payload.ilike.%${subscription.user_id}%,response.ilike.%${subscription.user_id}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (webhookUserError) {
      console.log('⚠️ Error al buscar webhooks por user_id:', webhookUserError.message)
    } else {
      console.log(`📨 Webhooks encontrados por user_id: ${webhooksByUser?.length || 0}`)
      if (webhooksByUser && webhooksByUser.length > 0) {
        webhooksByUser.slice(0, 5).forEach((webhook, index) => {
          console.log(`   ${index + 1}. ID: ${webhook.id} | Tipo: ${webhook.event_type} | Estado: ${webhook.status} | Fecha: ${webhook.created_at}`)
        })
      }
    }

    // 3. Buscar webhooks recientes (últimas 24 horas)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: recentWebhooks, error: recentError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentError) {
      console.log('⚠️ Error al buscar webhooks recientes:', recentError.message)
    } else {
      console.log(`\n📨 Webhooks recientes (últimas 24h): ${recentWebhooks?.length || 0}`)
      if (recentWebhooks && recentWebhooks.length > 0) {
        recentWebhooks.slice(0, 10).forEach((webhook, index) => {
          console.log(`   ${index + 1}. ID: ${webhook.id} | Tipo: ${webhook.event_type} | Estado: ${webhook.status} | Fecha: ${webhook.created_at}`)
        })
      }
    }

    // 4. Verificar si hay webhooks con errores
    const { data: errorWebhooks, error: errorWebhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(10)

    if (errorWebhookError) {
      console.log('⚠️ Error al buscar webhooks con errores:', errorWebhookError.message)
    } else {
      console.log(`\n❌ Webhooks con errores recientes: ${errorWebhooks?.length || 0}`)
      if (errorWebhooks && errorWebhooks.length > 0) {
        errorWebhooks.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ID: ${webhook.id} | Tipo: ${webhook.event_type} | Error: ${webhook.error_message || 'Sin mensaje'} | Fecha: ${webhook.created_at}`)
        })
      }
    }

    // 5. Análisis y recomendaciones
    console.log('\n📊 Análisis de sincronización:')
    console.log('=' .repeat(60))

    if (subscription.status === 'pending') {
      console.log('⚠️ La suscripción sigue en estado PENDING')
      
      if (!subscription.mercadopago_subscription_id) {
        console.log('❌ No tiene mercadopago_subscription_id - indica que no se ha procesado el webhook de activación')
      }
      
      if (!subscription.last_sync_at) {
        console.log('❌ No tiene last_sync_at - indica que nunca se ha sincronizado con MercadoPago')
      }

      const hasRelatedWebhooks = (webhooksByRef?.length || 0) > 0 || (webhooksByUser?.length || 0) > 0
      if (!hasRelatedWebhooks) {
        console.log('❌ No se encontraron webhooks relacionados - posible problema:')
        console.log('   • MercadoPago no está enviando webhooks')
        console.log('   • Los webhooks no están llegando al servidor')
        console.log('   • Los webhooks no se están guardando correctamente')
      }

      console.log('\n💡 Recomendaciones:')
      console.log('   1. Verificar configuración de webhooks en MercadoPago')
      console.log('   2. Revisar logs del servidor para webhooks entrantes')
      console.log('   3. Ejecutar activación manual si es necesario')
      console.log('   4. Verificar conectividad con MercadoPago API')
    } else {
      console.log('✅ La suscripción está en estado:', subscription.status)
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message)
  }
}

// Ejecutar el script
checkSubscription131()