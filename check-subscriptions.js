// Script temporal para verificar suscripciones
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSubscriptions() {
  console.log('🔍 Verificando suscripciones en la base de datos...')
  
  try {
    // Verificar suscripciones activas
    const { data: activeSubscriptions, error: activeError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (activeError) {
      console.error('❌ Error consultando suscripciones activas:', activeError)
    } else {
      console.log(`📊 Suscripciones activas encontradas: ${activeSubscriptions?.length || 0}`)
      if (activeSubscriptions && activeSubscriptions.length > 0) {
        activeSubscriptions.forEach((sub, index) => {
          console.log(`${index + 1}. ID: ${sub.id}`)
          console.log(`   Usuario: ${sub.user_id}`)
          console.log(`   Tipo: ${sub.subscription_type}`)
          console.log(`   Estado: ${sub.status}`)
          console.log(`   Referencia: ${sub.external_reference || 'N/A'}`)
          console.log(`   Creada: ${sub.created_at}`)
          console.log('   ---')
        })
      }
    }
    
    // Verificar suscripciones pendientes
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (pendingError) {
      console.error('❌ Error consultando suscripciones pendientes:', pendingError)
    } else {
      console.log(`📋 Suscripciones pendientes encontradas: ${pendingSubscriptions?.length || 0}`)
      if (pendingSubscriptions && pendingSubscriptions.length > 0) {
        pendingSubscriptions.forEach((sub, index) => {
          console.log(`${index + 1}. ID: ${sub.id}`)
          console.log(`   Usuario: ${sub.user_id}`)
          console.log(`   Tipo: ${sub.subscription_type}`)
          console.log(`   Estado: ${sub.status}`)
          console.log(`   Referencia: ${sub.external_reference || 'N/A'}`)
          console.log(`   Creada: ${sub.created_at}`)
          console.log('   ---')
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error)
  }
}

checkSubscriptions()