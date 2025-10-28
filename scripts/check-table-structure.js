/**
 * Script para verificar la estructura de la tabla unified_subscriptions
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function checkTableStructure() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno de Supabase')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 Verificando estructura de la tabla unified_subscriptions...\n')

  // Intentar obtener una fila de ejemplo
  const { data: sample, error } = await supabase
    .from('unified_subscriptions')
    .select('*')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error al consultar la tabla:', error)
    process.exit(1)
  }

  if (sample) {
    console.log('✅ Ejemplo de registro existente:')
    console.log(JSON.stringify(sample, null, 2))
    console.log('\n📋 Columnas disponibles:')
    Object.keys(sample).forEach(key => {
      console.log(`  - ${key}: ${typeof sample[key]}`)
    })
  } else {
    console.log('⚠️  No hay registros en la tabla, pero puedo intentar insertar uno de prueba para ver qué columnas acepta...')
    
    // Intentar con columnas mínimas
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      product_id: 1,
      status: 'test',
      subscription_type: 'monthly'
    }
    
    const { error: insertError } = await supabase
      .from('unified_subscriptions')
      .insert(testData)
    
    if (insertError) {
      console.log('Error al insertar (esto nos ayuda a ver qué columnas faltan):')
      console.log(insertError)
    }
  }

  process.exit(0)
}

checkTableStructure()
