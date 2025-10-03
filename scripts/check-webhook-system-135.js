const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Datos de la suscripción ID 135
const SUBSCRIPTION_DATA = {
  id: 135,
  preapproval_id: '271804c66ace41499fe81348f35e184b',
  external_reference: 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-bea44606',
  user_id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  email: 'cristoferscalante@gmail.com'
}

async function checkWebhookSystem() {
  console.log('🔍 Verificando sistema de sincronización automática de webhooks')
  console.log('=' .repeat(70))
  
  try {
    // 1. Verificar configuración del webhook endpoint
    console.log('\n1️⃣ Verificando endpoint de webhook...')
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`
    
    console.log(`   URL del webhook: ${webhookUrl}`)
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`   ✅ Endpoint accesible (Status: ${response.status})`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   📋 Respuesta: ${data.message || 'OK'}`)
      }
    } catch (error) {
      console.log(`   ❌ Error accediendo al endpoint: ${error.message}`)
    }
    
    // 2. Verificar configuración de variables de entorno
    console.log('\n2️⃣ Verificando configuración de MercadoPago...')
    
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const mpSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    
    console.log(`   Token configurado: ${mpToken ? '✅ Sí' : '❌ No'}`)
    console.log(`   Secret configurado: ${mpSecret ? '✅ Sí' : '❌ No'}`)
    
    if (mpToken) {
      const tokenType = mpToken.startsWith('APP_USR') ? 'Producción' : 
                       mpToken.startsWith('TEST') ? 'Sandbox' : 'Desconocido'
      console.log(`   Tipo de token: ${tokenType}`)
    }
    
    // 3. Verificar estado actual de la suscripción
    console.log('\n3️⃣ Verificando estado actual de la suscripción...')
    
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', SUBSCRIPTION_DATA.id)
      .single()
    
    if (subError) {
      console.log(`   ❌ Error obteniendo suscripción: ${subError.message}`)
      return
    }
    
    console.log(`   📋 Estado actual: ${subscription.status}`)
    console.log(`   📋 MercadoPago ID: ${subscription.mercadopago_subscription_id || 'NULL'}`)
    console.log(`   📋 External Reference: ${subscription.external_reference}`)
    console.log(`   📋 Última sincronización: ${subscription.last_sync_at || 'Nunca'}`)
    
    // 4. Verificar webhooks recientes en la base de datos
    console.log('\n4️⃣ Verificando webhooks recientes...')
    
    const { data: recentWebhooks, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 7 días
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (webhookError) {
      console.log(`   ❌ Error obteniendo webhooks: ${webhookError.message}`)
    } else {
      console.log(`   📊 Webhooks recientes (7 días): ${recentWebhooks.length}`)
      
      if (recentWebhooks.length > 0) {
        console.log('   📋 Últimos webhooks:')
        recentWebhooks.slice(0, 5).forEach((webhook, index) => {
          console.log(`      ${index + 1}. ${webhook.webhook_type} - ${webhook.status} (${new Date(webhook.created_at).toLocaleString()})`)
        })
      } else {
        console.log('   ⚠️ No se encontraron webhooks recientes')
      }
    }
    
    // 5. Verificar webhooks específicos para esta suscripción
    console.log('\n5️⃣ Verificando webhooks para suscripción ID 135...')
    
    const { data: subscriptionWebhooks, error: subWebhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`external_reference.eq.${SUBSCRIPTION_DATA.external_reference},preapproval_id.eq.${SUBSCRIPTION_DATA.preapproval_id}`)
      .order('created_at', { ascending: false })
    
    if (subWebhookError) {
      console.log(`   ❌ Error obteniendo webhooks de suscripción: ${subWebhookError.message}`)
    } else {
      console.log(`   📊 Webhooks para esta suscripción: ${subscriptionWebhooks.length}`)
      
      if (subscriptionWebhooks.length > 0) {
        console.log('   📋 Webhooks encontrados:')
        subscriptionWebhooks.forEach((webhook, index) => {
          console.log(`      ${index + 1}. ${webhook.webhook_type} - ${webhook.status} - ${webhook.action || 'N/A'} (${new Date(webhook.created_at).toLocaleString()})`)
        })
      } else {
        console.log('   ❌ No se encontraron webhooks para esta suscripción')
      }
    }
    
    // 6. Probar conectividad con MercadoPago API
    console.log('\n6️⃣ Probando conectividad con MercadoPago API...')
    
    if (mpToken) {
      try {
        const response = await fetch(`https://api.mercadopago.com/preapproval/${SUBSCRIPTION_DATA.preapproval_id}`, {
          headers: {
            'Authorization': `Bearer ${mpToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   ✅ API accesible - Estado: ${data.status}`)
          console.log(`   📋 Próximo pago: ${data.next_payment_date || 'N/A'}`)
        } else {
          console.log(`   ❌ Error API: ${response.status} - ${response.statusText}`)
        }
      } catch (error) {
        console.log(`   ❌ Error conectando con API: ${error.message}`)
      }
    } else {
      console.log('   ⚠️ No se puede probar API sin token')
    }
    
    // 7. Diagnóstico y recomendaciones
    console.log('\n7️⃣ Diagnóstico del sistema de webhooks')
    console.log('-' .repeat(50))
    
    const issues = []
    const recommendations = []
    
    // Verificar si la suscripción ya está activa
    if (subscription.status === 'active') {
      console.log('✅ ESTADO: La suscripción ya está activa')
      console.log('   No se requiere acción adicional')
    } else {
      console.log('⚠️ ESTADO: La suscripción sigue pendiente')
      
      // Verificar si hay webhooks
      if (subscriptionWebhooks.length === 0) {
        issues.push('No se han recibido webhooks para esta suscripción')
        recommendations.push('Verificar configuración de webhooks en MercadoPago')
        recommendations.push('Revisar logs del servidor web')
        recommendations.push('Probar webhook manualmente')
      } else {
        issues.push('Se recibieron webhooks pero no activaron la suscripción')
        recommendations.push('Revisar logs de procesamiento de webhooks')
        recommendations.push('Verificar lógica de activación automática')
      }
      
      // Verificar configuración
      if (!mpToken) {
        issues.push('Token de MercadoPago no configurado')
        recommendations.push('Configurar MERCADOPAGO_ACCESS_TOKEN')
      }
      
      if (!mpSecret) {
        issues.push('Secret de webhook no configurado')
        recommendations.push('Configurar MERCADOPAGO_WEBHOOK_SECRET')
      }
    }
    
    // Mostrar diagnóstico
    if (issues.length > 0) {
      console.log('\n❌ PROBLEMAS IDENTIFICADOS:')
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`)
      })
    }
    
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMENDACIONES:')
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`)
      })
    }
    
    if (issues.length === 0) {
      console.log('\n✅ SISTEMA FUNCIONANDO CORRECTAMENTE')
      console.log('   No se detectaron problemas en el sistema de webhooks')
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message)
  }
}

// Ejecutar verificación
checkWebhookSystem().then(() => {
  console.log('\n✅ Verificación del sistema de webhooks completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando verificación:', error.message)
  process.exit(1)
})