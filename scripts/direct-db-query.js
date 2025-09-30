/**
 * CONSULTA DIRECTA A LA BASE DE DATOS
 * 
 * Script para ejecutar consultas SQL directas usando el cliente de Supabase
 * para investigar la suscripción con external_reference específico del webhook
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuración de Supabase con service role key para acceso completo
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function querySubscriptionByExternalReference() {
  console.log('🔍 Buscando suscripción con external_reference del webhook...')
  
  try {
    // Consulta específica por external_reference del webhook
    const { data: webhookSubscription, error: webhookError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', '2c938084726fca8a01726fd4f4b80331')
    
    console.log('\n📋 RESULTADO - Suscripción con external_reference del webhook:')
    if (webhookError) {
      console.error('❌ Error:', webhookError)
    } else if (!webhookSubscription || webhookSubscription.length === 0) {
      console.log('❌ NO ENCONTRADA - No existe suscripción con external_reference: 2c938084726fca8a01726fd4f4b80331')
    } else {
      console.log('✅ ENCONTRADA:')
      console.table(webhookSubscription)
    }
    
    // Consulta por user_id para ver todas las suscripciones del usuario
    console.log('\n🔍 Buscando todas las suscripciones del usuario aefdfc64-cc93-4219-8ca5-a614a9e7bb84...')
    
    const { data: userSubscriptions, error: userError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', 'aefdfc64-cc93-4219-8ca5-a614a9e7bb84')
      .order('created_at', { ascending: false })
    
    console.log('\n📋 RESULTADO - Todas las suscripciones del usuario:')
    if (userError) {
      console.error('❌ Error:', userError)
    } else if (!userSubscriptions || userSubscriptions.length === 0) {
      console.log('❌ NO ENCONTRADAS - No hay suscripciones para el usuario')
    } else {
      console.log(`✅ ENCONTRADAS ${userSubscriptions.length} suscripciones:`)
      console.table(userSubscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        external_reference: sub.external_reference,
        mercadopago_subscription_id: sub.mercadopago_subscription_id,
        product_id: sub.product_id,
        created_at: sub.created_at,
        updated_at: sub.updated_at
      })))
    }
    
    // Buscar suscripciones con product_id = 73 (del webhook)
    console.log('\n🔍 Buscando suscripciones con product_id = 73...')
    
    const { data: productSubscriptions, error: productError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('product_id', 73)
      .order('created_at', { ascending: false })
    
    console.log('\n📋 RESULTADO - Suscripciones con product_id = 73:')
    if (productError) {
      console.error('❌ Error:', productError)
    } else if (!productSubscriptions || productSubscriptions.length === 0) {
      console.log('❌ NO ENCONTRADAS - No hay suscripciones para product_id = 73')
    } else {
      console.log(`✅ ENCONTRADAS ${productSubscriptions.length} suscripciones:`)
      console.table(productSubscriptions.map(sub => ({
        id: sub.id,
        user_id: sub.user_id,
        status: sub.status,
        external_reference: sub.external_reference,
        mercadopago_subscription_id: sub.mercadopago_subscription_id,
        created_at: sub.created_at
      })))
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando consultas:', error)
  }
}

// Ejecutar la consulta
querySubscriptionByExternalReference()
  .then(() => {
    console.log('\n✅ Consulta completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })