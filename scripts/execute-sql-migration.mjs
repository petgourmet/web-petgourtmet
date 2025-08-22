import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas')
  console.log('Asegúrate de que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas en .env.local')
  process.exit(1)
}

// Crear cliente de Supabase con service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQLMigration() {
  try {
    console.log('🔄 Ejecutando migración SQL para agregar columna customer_email...')
    
    // Ejecutar SQL para agregar la columna
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);'
    })
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error)
      
      // Intentar método alternativo usando la función SQL directa
      console.log('🔄 Intentando método alternativo...')
      
      const { data: altData, error: altError } = await supabase
        .from('orders')
        .select('customer_email')
        .limit(1)
      
      if (altError && altError.code === 'PGRST116') {
        console.log('✅ Confirmado: La columna customer_email no existe')
        console.log('📋 SOLUCIÓN MANUAL REQUERIDA:')
        console.log('1. Ve al dashboard de Supabase: https://supabase.com/dashboard')
        console.log('2. Selecciona tu proyecto')
        console.log('3. Ve a Database > SQL Editor')
        console.log('4. Ejecuta este SQL:')
        console.log('   ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);')
        console.log('5. Haz clic en "Run"')
        return false
      }
    } else {
      console.log('✅ Migración SQL ejecutada exitosamente')
      
      // Verificar que la columna se agregó
      const { data: testData, error: testError } = await supabase
        .from('orders')
        .select('customer_email')
        .limit(1)
      
      if (testError) {
        console.error('❌ Error verificando la columna:', testError)
        return false
      } else {
        console.log('✅ Columna customer_email agregada y verificada exitosamente')
        return true
      }
    }
  } catch (error) {
    console.error('❌ Error general:', error)
    return false
  }
}

// Ejecutar la migración
executeSQLMigration()
  .then((success) => {
    if (success) {
      console.log('🎉 Migración completada exitosamente')
      process.exit(0)
    } else {
      console.log('⚠️ Migración requiere intervención manual')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

export { executeSQLMigration }