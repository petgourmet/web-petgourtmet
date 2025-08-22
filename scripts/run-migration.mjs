import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno necesarias')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runMigration() {
  console.log('🔄 Ejecutando migración para agregar customer_email...')
  
  try {
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250122_add_customer_email_column.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Contenido de la migración:')
    console.log(migrationSQL)
    
    // Ejecutar cada comando SQL por separado
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    for (const command of commands) {
      if (command.trim()) {
        console.log(`\n🔧 Ejecutando: ${command.substring(0, 100)}...`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: command
        })
        
        if (error) {
          console.error(`❌ Error ejecutando comando:`, error)
          // Continuar con el siguiente comando
        } else {
          console.log('✅ Comando ejecutado exitosamente')
        }
      }
    }
    
    console.log('\n🎉 Migración completada')
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error)
  }
}

// Ejecutar la migración
runMigration()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })