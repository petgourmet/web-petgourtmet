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
    // Verificar si la columna ya existe
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'orders')
      .eq('column_name', 'customer_email')
    
    if (columnsError) {
      console.error('❌ Error verificando columnas:', columnsError)
      return
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ La columna customer_email ya existe')
    } else {
      console.log('📝 Agregando columna customer_email...')
      
      // Agregar la columna usando una query SQL directa
      const { error: alterError } = await supabase
        .from('orders')
        .select('id')
        .limit(1)
      
      // Si llegamos aquí, intentemos usar el SQL editor
      console.log('🔧 Intentando agregar columna usando SQL...')
      
      // Usar el método de query SQL directo
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        query: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);'
      })
      
      if (sqlError) {
        console.error('❌ Error agregando columna:', sqlError)
        
        // Intentar método alternativo
        console.log('🔄 Intentando método alternativo...')
        
        // Crear una función temporal para ejecutar SQL
        const sqlCommands = [
          'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);',
          'CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);'
        ]
        
        for (const sql of sqlCommands) {
          try {
            console.log(`Ejecutando: ${sql}`)
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query: sql })
            })
            
            if (response.ok) {
              console.log('✅ SQL ejecutado exitosamente')
            } else {
              const errorText = await response.text()
              console.error('❌ Error en SQL:', errorText)
            }
          } catch (error) {
            console.error('❌ Error ejecutando SQL:', error.message)
          }
        }
      } else {
        console.log('✅ Columna agregada exitosamente')
      }
    }
    
    // Ahora intentar actualizar órdenes existentes
    console.log('\n🔄 Actualizando órdenes existentes con emails del shipping_address...')
    
    const { data: ordersToUpdate, error: fetchError } = await supabase
      .from('orders')
      .select('id, shipping_address')
      .not('shipping_address', 'is', null)
      .limit(50)
    
    if (fetchError) {
      console.error('❌ Error obteniendo órdenes:', fetchError)
      return
    }
    
    let updated = 0
    
    for (const order of ordersToUpdate || []) {
      try {
        if (order.shipping_address) {
          let shippingData
          
          if (typeof order.shipping_address === 'string') {
            shippingData = JSON.parse(order.shipping_address)
          } else {
            shippingData = order.shipping_address
          }
          
          if (shippingData.customer_data && shippingData.customer_data.email) {
            const email = shippingData.customer_data.email
            
            console.log(`📧 Actualizando orden ${order.id} con email: ${email}`)
            
            const { error: updateError } = await supabase
              .from('orders')
              .update({ customer_email: email })
              .eq('id', order.id)
            
            if (updateError) {
              console.error(`❌ Error actualizando orden ${order.id}:`, updateError)
            } else {
              updated++
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error procesando orden ${order.id}:`, error.message)
      }
    }
    
    console.log(`\n📊 Resumen:`)
    console.log(`✅ Órdenes actualizadas: ${updated}`)
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
addCustomerEmailColumn()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })