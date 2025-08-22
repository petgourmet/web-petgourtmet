import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

async function addCustomerEmailColumn() {
  console.log('🔄 Agregando columna customer_email a la tabla orders...')
  
  try {
    // Primero verificar si la columna ya existe
    console.log('🔍 Verificando si la columna customer_email ya existe...')
    
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('customer_email')
      .limit(1)
    
    if (testError && testError.code === '42703') {
      console.log('📝 La columna customer_email no existe, necesita ser agregada')
      console.log('⚠️ No se puede agregar columnas directamente desde el cliente de Supabase')
      console.log('💡 La columna debe agregarse desde el dashboard de Supabase o usando SQL directo')
      
      console.log('\n📋 INSTRUCCIONES PARA AGREGAR LA COLUMNA:')
      console.log('1. Ve al dashboard de Supabase')
      console.log('2. Navega a Database > Tables > orders')
      console.log('3. Haz clic en "Add Column"')
      console.log('4. Nombre: customer_email')
      console.log('5. Tipo: varchar(255)')
      console.log('6. Nullable: true')
      console.log('7. Guarda los cambios')
      
      console.log('\n🔧 O ejecuta este SQL en el SQL Editor:')
      console.log('ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);')
      
      return false
    } else if (testError) {
      console.error('❌ Error inesperado:', testError)
      return false
    } else {
      console.log('✅ La columna customer_email ya existe')
    }
    
    // Si llegamos aquí, la columna existe, ahora actualizar los datos
    console.log('\n🔄 Actualizando órdenes existentes con emails del shipping_address...')
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, shipping_address, customer_email')
      .not('shipping_address', 'is', null)
      .limit(100)
    
    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError)
      return false
    }
    
    console.log(`📋 Procesando ${orders?.length || 0} órdenes...`)
    
    let updated = 0
    let skipped = 0
    let errors = 0
    
    for (const order of orders || []) {
      try {
        // Solo actualizar si no tiene customer_email o es el genérico
        if (order.customer_email && order.customer_email !== 'cliente@petgourmet.mx') {
          skipped++
          continue
        }
        
        if (order.shipping_address) {
          const parsed = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
          
          if (parsed.customer_data && parsed.customer_data.email) {
            const email = parsed.customer_data.email
            
            console.log(`📧 Actualizando orden ${order.id} con email: ${email}`)
            
            const { error: updateError } = await supabase
              .from('orders')
              .update({ customer_email: email })
              .eq('id', order.id)
            
            if (updateError) {
              console.error(`❌ Error actualizando orden ${order.id}:`, updateError)
              errors++
            } else {
              updated++
            }
          }
        }
      } catch (parseError) {
        console.warn(`⚠️ Error parseando shipping_address para orden ${order.id}:`, parseError.message)
        errors++
      }
    }
    
    console.log('\n📊 Resumen de actualización:')
    console.log(`✅ Órdenes actualizadas: ${updated}`)
    console.log(`⏭️ Órdenes omitidas (ya tenían email): ${skipped}`)
    console.log(`❌ Errores: ${errors}`)
    console.log(`📋 Total procesadas: ${(orders?.length || 0)}`)
    
    return true
    
  } catch (error) {
    console.error('❌ Error general:', error)
    return false
  }
}

// Ejecutar el script
addCustomerEmailColumn()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Proceso completado exitosamente')
    } else {
      console.log('\n⚠️ Proceso completado con limitaciones')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })