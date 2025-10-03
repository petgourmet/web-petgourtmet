/**
 * SCRIPT DE DEPURACIÓN: Webhook Processing Debug
 * 
 * Este script simula exactamente el webhook que MercadoPago está enviando
 * para identificar dónde está fallando el procesamiento interno.
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK_URL = 'https://petgourmet.mx/api/mercadopago/webhook'

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Datos del webhook exactos que MercadoPago está enviando
const WEBHOOK_DATA = {
  action: "updated",
  application_id: "1329434229865091",
  data: {"id":"123456"},
  date: "2021-11-01T02:02:02Z",
  entity: "preapproval",
  id: "123456",
  type: "subscription_preapproval",
  version: 8
}

async function debugWebhookProcessing() {
  console.log('🔍 INICIANDO DEPURACIÓN DE PROCESAMIENTO DE WEBHOOK')
  console.log('=' .repeat(80))
  console.log('📅 Fecha:', new Date().toLocaleString())
  console.log('🎯 Objetivo: Identificar por qué no se activan las suscripciones automáticamente')
  console.log('=' .repeat(80))
  console.log('')

  try {
    // 1. Verificar suscripciones pendientes
    console.log('1️⃣ VERIFICANDO SUSCRIPCIONES PENDIENTES')
    console.log('-'.repeat(50))
    
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (pendingError) {
      console.log('❌ Error obteniendo suscripciones pendientes:', pendingError.message)
      return
    }
    
    console.log(`📊 Suscripciones pendientes encontradas: ${pendingSubscriptions.length}`)
    
    if (pendingSubscriptions.length > 0) {
      console.log('📋 Últimas suscripciones pendientes:')
      pendingSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID: ${sub.id} | Usuario: ${sub.user_id} | Referencia: ${sub.external_reference}`)
      })
    }
    console.log('')

    // 2. Simular el webhook exacto que está llegando
    console.log('2️⃣ SIMULANDO WEBHOOK DE MERCADOPAGO')
    console.log('-'.repeat(50))
    console.log('📦 Datos del webhook a simular:')
    console.log(JSON.stringify(WEBHOOK_DATA, null, 2))
    console.log('')

    // 3. Enviar webhook al endpoint local
    console.log('3️⃣ ENVIANDO WEBHOOK AL ENDPOINT')
    console.log('-'.repeat(50))
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature-debug',
          'x-request-id': `debug-request-${Date.now()}`,
          'User-Agent': 'MercadoPago/1.0 (Debug Test)'
        },
        body: JSON.stringify(WEBHOOK_DATA)
      })

      console.log(`📡 Respuesta del webhook:`)
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      const responseText = await response.text()
      console.log(`   Body: ${responseText}`)
      
      if (response.ok) {
        console.log('✅ Webhook procesado exitosamente')
      } else {
        console.log('❌ Error en el procesamiento del webhook')
      }
    } catch (error) {
      console.log('❌ Error enviando webhook:', error.message)
    }
    console.log('')

    // 4. Verificar logs de webhooks recientes
    console.log('4️⃣ VERIFICANDO LOGS DE WEBHOOKS')
    console.log('-'.repeat(50))
    
    const { data: webhookLogs, error: logsError } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (logsError) {
      console.log('❌ Error obteniendo logs de webhooks:', logsError.message)
    } else {
      console.log(`📊 Logs de webhooks encontrados: ${webhookLogs.length}`)
      
      if (webhookLogs.length > 0) {
        console.log('📋 Últimos webhooks procesados:')
        webhookLogs.forEach((log, index) => {
          console.log(`   ${index + 1}. Tipo: ${log.webhook_type} | Status: ${log.status} | Fecha: ${log.created_at}`)
        })
      }
    }
    console.log('')

    // 5. Verificar si alguna suscripción cambió de estado
    console.log('5️⃣ VERIFICANDO CAMBIOS EN SUSCRIPCIONES')
    console.log('-'.repeat(50))
    
    const { data: recentSubscriptions, error: recentError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5)
    
    if (recentError) {
      console.log('❌ Error obteniendo suscripciones recientes:', recentError.message)
    } else {
      console.log(`📊 Suscripciones recientes: ${recentSubscriptions.length}`)
      
      if (recentSubscriptions.length > 0) {
        console.log('📋 Últimas suscripciones actualizadas:')
        recentSubscriptions.forEach((sub, index) => {
          console.log(`   ${index + 1}. ID: ${sub.id} | Status: ${sub.status} | Actualizada: ${sub.updated_at}`)
        })
      }
    }
    console.log('')

    // 6. Análisis de problemas potenciales
    console.log('6️⃣ ANÁLISIS DE PROBLEMAS POTENCIALES')
    console.log('-'.repeat(50))
    
    const issues = []
    
    // Verificar si hay suscripciones pendientes sin mercadopago_subscription_id
    const pendingWithoutMPId = pendingSubscriptions.filter(sub => !sub.mercadopago_subscription_id)
    if (pendingWithoutMPId.length > 0) {
      issues.push(`${pendingWithoutMPId.length} suscripciones pendientes sin mercadopago_subscription_id`)
    }
    
    // Verificar si hay suscripciones con external_reference pero sin activar
    const pendingWithReference = pendingSubscriptions.filter(sub => sub.external_reference)
    if (pendingWithReference.length > 0) {
      issues.push(`${pendingWithReference.length} suscripciones pendientes con external_reference`)
    }
    
    if (issues.length > 0) {
      console.log('⚠️ Problemas identificados:')
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`)
      })
    } else {
      console.log('✅ No se identificaron problemas obvios')
    }
    console.log('')

    // 7. Recomendaciones
    console.log('7️⃣ RECOMENDACIONES')
    console.log('-'.repeat(50))
    console.log('🔧 Para resolver el problema:')
    console.log('   1. Verificar que el WebhookService.processSubscriptionWebhook() esté funcionando')
    console.log('   2. Revisar los logs del servidor durante el procesamiento del webhook')
    console.log('   3. Verificar que la búsqueda de suscripciones por external_reference funcione')
    console.log('   4. Confirmar que la activación automática se ejecute correctamente')
    console.log('   5. Revisar si hay errores en la base de datos durante la actualización')
    console.log('')

    console.log('✅ DEPURACIÓN COMPLETADA')
    console.log('=' .repeat(80))

  } catch (error) {
    console.error('❌ Error durante la depuración:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Ejecutar depuración
debugWebhookProcessing().then(() => {
  console.log('\n🏁 Depuración finalizada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando depuración:', error.message)
  process.exit(1)
})