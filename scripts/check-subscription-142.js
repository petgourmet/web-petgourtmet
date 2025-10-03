/**
 * INVESTIGACIÓN DE SUSCRIPCIÓN ID 142
 * 
 * Analiza por qué la suscripción ID 142 no se activó automáticamente
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

async function investigateSubscription142() {
  console.log('🔍 INVESTIGANDO SUSCRIPCIÓN ID 142')
  console.log('================================================================================')
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`)
  console.log(`🎯 Objetivo: Resolver problema de carga infinita`)
  console.log('================================================================================\n')

  try {
    // 1. Obtener detalles completos de la suscripción
    console.log('📋 PASO 1: Obteniendo detalles de la suscripción...')
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', SUBSCRIPTION_ID)
      .single()

    if (subError) {
      console.error('❌ Error obteniendo suscripción:', subError)
      return
    }

    console.log('✅ Suscripción encontrada:')
    console.log(`   📧 Usuario: ${USER_EMAIL}`)
    console.log(`   📝 External Reference: ${subscription.external_reference}`)
    console.log(`   📊 Estado: ${subscription.status}`)
    console.log(`   💰 Monto: $${subscription.transaction_amount} ${subscription.currency_id}`)
    console.log(`   📅 Creada: ${subscription.created_at}`)
    console.log(`   🔄 Actualizada: ${subscription.updated_at}`)
    console.log(`   🏷️ MercadoPago ID: ${subscription.mercadopago_subscription_id || 'NO ASIGNADO'}`)
    console.log(`   📦 Producto: ${subscription.product_name} (${subscription.size})`)
    console.log(`   🔁 Tipo: ${subscription.subscription_type}`)
    console.log('')

    // 2. Verificar webhooks relacionados
    console.log('📋 PASO 2: Verificando webhooks relacionados...')
    
    // Buscar en webhook_logs si existe
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`external_reference.eq.${EXTERNAL_REFERENCE},subscription_id.eq.${SUBSCRIPTION_ID}`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (webhookError && !webhookError.message.includes('does not exist')) {
      console.error('❌ Error verificando webhooks:', webhookError)
    } else if (webhooks && webhooks.length > 0) {
      console.log(`✅ Encontrados ${webhooks.length} webhooks relacionados:`)
      webhooks.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.created_at} - ${webhook.event_type} - ${webhook.status}`)
      })
    } else {
      console.log('⚠️ No se encontraron webhooks relacionados')
    }
    console.log('')

    // 3. Verificar estado del usuario
    console.log('📋 PASO 3: Verificando perfil del usuario...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', USER_ID)
      .single()

    if (profileError) {
      console.log('⚠️ No se encontró perfil de usuario o error:', profileError.message)
    } else {
      console.log('✅ Perfil de usuario encontrado:')
      console.log(`   📧 Email: ${profile.email}`)
      console.log(`   🔔 Suscripción activa: ${profile.has_active_subscription}`)
      console.log(`   📅 Última actualización: ${profile.updated_at}`)
    }
    console.log('')

    // 4. Buscar otras suscripciones del usuario
    console.log('📋 PASO 4: Verificando otras suscripciones del usuario...')
    const { data: userSubs, error: userSubsError } = await supabase
      .from('unified_subscriptions')
      .select('id, status, subscription_type, created_at, mercadopago_subscription_id')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })

    if (userSubsError) {
      console.error('❌ Error obteniendo suscripciones del usuario:', userSubsError)
    } else {
      console.log(`✅ Usuario tiene ${userSubs.length} suscripciones:`)
      userSubs.forEach((sub, index) => {
        const isCurrentSub = sub.id === SUBSCRIPTION_ID
        console.log(`   ${index + 1}. ID ${sub.id} - ${sub.status} - ${sub.subscription_type} - ${sub.created_at}${isCurrentSub ? ' ← ACTUAL' : ''}`)
      })
    }
    console.log('')

    // 5. Análisis de problemas potenciales
    console.log('📋 PASO 5: Análisis de problemas...')
    const issues = []
    
    if (subscription.status === 'pending') {
      issues.push('❌ Suscripción en estado pending - no activada')
    }
    
    if (!subscription.mercadopago_subscription_id) {
      issues.push('❌ Sin mercadopago_subscription_id - no sincronizada con MercadoPago')
    }
    
    if (!subscription.last_sync_at) {
      issues.push('❌ Sin last_sync_at - nunca sincronizada')
    }

    const timeSinceCreation = Date.now() - new Date(subscription.created_at).getTime()
    const minutesSinceCreation = Math.floor(timeSinceCreation / (1000 * 60))
    
    if (minutesSinceCreation > 5) {
      issues.push(`⚠️ Suscripción creada hace ${minutesSinceCreation} minutos - debería haberse activado`)
    }

    if (issues.length > 0) {
      console.log('🚨 PROBLEMAS IDENTIFICADOS:')
      issues.forEach(issue => console.log(`   ${issue}`))
    } else {
      console.log('✅ No se identificaron problemas obvios')
    }
    console.log('')

    // 6. Recomendaciones
    console.log('💡 RECOMENDACIONES:')
    if (subscription.status === 'pending' && !subscription.mercadopago_subscription_id) {
      console.log('   1. 🔄 Ejecutar sincronización con MercadoPago')
      console.log('   2. 📞 Verificar estado real en MercadoPago API')
      console.log('   3. 🔧 Activar manualmente si está autorizada en MercadoPago')
    }
    
    if (minutesSinceCreation > 10) {
      console.log('   4. ⚡ Activación urgente requerida - usuario esperando')
    }

    console.log('')
    console.log('================================================================================')
    console.log('🏁 Investigación completada')
    console.log('================================================================================')

    return {
      subscription,
      issues,
      needsActivation: subscription.status === 'pending',
      minutesSinceCreation
    }

  } catch (error) {
    console.error('❌ Error durante la investigación:', error)
    throw error
  }
}

// Ejecutar investigación
if (require.main === module) {
  investigateSubscription142()
    .then(result => {
      if (result?.needsActivation) {
        console.log('\n🚨 ACCIÓN REQUERIDA: La suscripción necesita activación inmediata')
        process.exit(1)
      } else {
        console.log('\n✅ Investigación completada exitosamente')
        process.exit(0)
      }
    })
    .catch(error => {
      console.error('\n❌ Error en la investigación:', error)
      process.exit(1)
    })
}

module.exports = { investigateSubscription142 }