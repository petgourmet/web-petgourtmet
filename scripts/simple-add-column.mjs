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

async function addColumnAndUpdate() {
  console.log('🔄 Verificando y agregando columna customer_email...')
  
  try {
    // Primero intentar hacer una consulta simple para ver si la columna existe
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('customer_email')
      .limit(1)
    
    if (testError && testError.code === '42703') {
      console.log('📝 La columna customer_email no existe, agregándola...')
      
      // Usar el endpoint SQL directo de Supabase
      const sqlQuery = `
        ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
        CREATE INDEX idx_orders_customer_email ON orders(customer_email);
      `
      
      // Intentar ejecutar usando fetch directo a la API de Supabase
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ sql: sqlQuery })
        })
        
        if (response.ok) {
          console.log('✅ Columna agregada exitosamente')
        } else {
          const errorText = await response.text()
          console.log('⚠️ Respuesta de la API:', errorText)
          
          // Intentar comando por comando
          console.log('🔄 Intentando agregar columna paso a paso...')
          
          // Comando 1: Agregar columna
          const addColumnResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: 'ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);' })
          })
          
          if (addColumnResponse.ok) {
            console.log('✅ Columna customer_email agregada')
          } else {
            console.log('⚠️ Error agregando columna:', await addColumnResponse.text())
          }
        }
      } catch (fetchError) {
        console.error('❌ Error en fetch:', fetchError.message)
      }
    } else if (testError) {
      console.error('❌ Error inesperado:', testError)
      return
    } else {
      console.log('✅ La columna customer_email ya existe')
    }
    
    // Ahora actualizar órdenes existentes
    console.log('\n🔄 Actualizando órdenes existentes...')
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, shipping_address')
      .not('shipping_address', 'is', null)
      .limit(100)
    
    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError)
      return
    }
    
    console.log(`📋 Encontradas ${orders?.length || 0} órdenes para procesar`)
    
    let updated = 0
    
    for (const order of orders || []) {
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
      
      // Pausa pequeña
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n📊 Resumen:`)
    console.log(`✅ Órdenes actualizadas: ${updated}`)
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
addColumnAndUpdate()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })