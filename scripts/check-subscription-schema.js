/**
 * VERIFICACIÓN DE ESQUEMA DE SUSCRIPCIONES
 * 
 * Script para verificar la estructura de la tabla unified_subscriptions
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSubscriptionSchema() {
  console.log('🔍 Verificando estructura de la tabla unified_subscriptions...')
  
  try {
    // Obtener una suscripción de ejemplo para ver todas las columnas
    const { data: sampleSubscription, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .limit(1)
      .single()
    
    if (error) {
      console.error('❌ Error obteniendo muestra:', error)
      return
    }
    
    console.log('✅ Columnas disponibles en unified_subscriptions:')
    console.log(Object.keys(sampleSubscription).sort())
    
    console.log('\n📋 Estructura completa de una suscripción:')
    console.log(JSON.stringify(sampleSubscription, null, 2))
    
    // También verificar la suscripción específica que queremos activar
    console.log('\n🎯 Verificando suscripción pendiente (ID 117):')
    const { data: targetSubscription, error: targetError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 117)
      .single()
    
    if (targetError) {
      console.error('❌ Error obteniendo suscripción 117:', targetError)
      return
    }
    
    console.log('✅ Suscripción 117 encontrada:')
    console.log(JSON.stringify(targetSubscription, null, 2))
    
  } catch (error) {
    console.error('❌ Error fatal:', error)
  }
}

checkSubscriptionSchema()