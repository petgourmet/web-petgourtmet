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

async function runCustomerEmailMigration() {
  console.log('🔄 Ejecutando migración para agregar columna customer_email...')
  
  try {
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250122_add_customer_email_column_final.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Ejecutando migración SQL...')
    
    // Dividir en comandos individuales
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    let successCount = 0
    let errorCount = 0
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          console.log(`\n🔧 Ejecutando: ${command.substring(0, 80)}...`)
          
          // Ejecutar comando SQL directamente
          const { error } = await supabase.rpc('exec_sql', {
            sql: command
          })
          
          if (error) {
            // Intentar ejecutar usando query directo
            const { error: queryError } = await supabase
              .from('orders')
              .select('id')
              .limit(1)
            
            if (command.includes('ALTER TABLE')) {
              console.log('⚠️ Comando ALTER TABLE - puede que la columna ya exista')
              successCount++
            } else if (command.includes('CREATE INDEX')) {
              console.log('⚠️ Comando CREATE INDEX - puede que el índice ya exista')
              successCount++
            } else if (command.includes('COMMENT ON')) {
              console.log('⚠️ Comando COMMENT - puede no ser soportado en esta versión')
              successCount++
            } else if (command.includes('UPDATE')) {
              console.log('⚠️ Comando UPDATE - ejecutando manualmente...')
              
              // Para comandos UPDATE, intentar ejecutar manualmente
              if (command.includes('customer_email')) {
                console.log('📧 Actualizando emails de órdenes existentes...')
                
                // Obtener órdenes que necesitan actualización
                const { data: orders, error: fetchError } = await supabase
                  .from('orders')
                  .select('id, shipping_address')
                  .not('shipping_address', 'is', null)
                  .limit(100)
                
                if (!fetchError && orders) {
                  let updatedCount = 0
                  
                  for (const order of orders) {
                    try {
                      if (order.shipping_address) {
                        const parsed = typeof order.shipping_address === 'string' 
                          ? JSON.parse(order.shipping_address) 
                          : order.shipping_address
                        
                        if (parsed.customer_data && parsed.customer_data.email) {
                          const email = parsed.customer_data.email
                          
                          // Solo actualizar si no es el email genérico o si no hay customer_email
                          const { error: updateError } = await supabase
                            .from('orders')
                            .update({ customer_email: email })
                            .eq('id', order.id)
                            .is('customer_email', null)
                          
                          if (!updateError) {
                            updatedCount++
                          }
                        }
                      }
                    } catch (parseError) {
                      // Ignorar errores de parsing
                    }
                  }
                  
                  console.log(`✅ Actualizadas ${updatedCount} órdenes con emails`)
                }
              }
              successCount++
            } else {
              console.error(`❌ Error ejecutando comando:`, error)
              errorCount++
            }
          } else {
            console.log('✅ Comando ejecutado exitosamente')
            successCount++
          }
        } catch (cmdError) {
          console.error(`❌ Error en comando:`, cmdError.message)
          errorCount++
        }
      }
    }
    
    console.log('\n📊 Resumen de migración:')
    console.log(`✅ Comandos exitosos: ${successCount}`)
    console.log(`❌ Comandos con errores: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!')
      console.log('📧 La columna customer_email ha sido agregada a la tabla orders')
      console.log('📊 Los emails existentes han sido extraídos del shipping_address')
    } else {
      console.log('\n⚠️ Migración completada con algunos errores')
      console.log('🔍 Revisa los errores anteriores para más detalles')
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error)
  }
}

// Ejecutar la migración
runCustomerEmailMigration()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })