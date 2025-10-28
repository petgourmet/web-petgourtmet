/**
 * Script de Migración: Actualizar pedidos existentes con customer_name y customer_email
 * 
 * Extrae la información de customer desde shipping_address y la guarda
 * en los campos customer_name y customer_email
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateOrders() {
  console.log('🚀 Iniciando migración de pedidos...\n')

  try {
    // Obtener todos los pedidos que no tienen customer_name o customer_email
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .or('customer_name.is.null,customer_email.is.null')

    if (fetchError) {
      console.error('❌ Error al obtener pedidos:', fetchError)
      return
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No hay pedidos para migrar')
      return
    }

    console.log(`📦 Encontrados ${orders.length} pedidos para actualizar\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const order of orders) {
      console.log(`\n📝 Procesando pedido #${order.id}...`)
      
      let customerName = order.customer_name
      let customerEmail = order.customer_email

      // Intentar extraer de shipping_address
      if (order.shipping_address) {
        try {
          const shippingData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address

          // Intentar obtener de diferentes ubicaciones en el objeto
          if (!customerName) {
            customerName = 
              shippingData?.customer?.name ||
              shippingData?.shipping?.name ||
              shippingData?.name ||
              null
          }

          if (!customerEmail) {
            customerEmail = 
              shippingData?.customer?.email ||
              shippingData?.shipping?.email ||
              shippingData?.email ||
              null
          }

          console.log(`   Nombre encontrado: ${customerName || 'N/A'}`)
          console.log(`   Email encontrado: ${customerEmail || 'N/A'}`)

        } catch (e) {
          console.log(`   ⚠️  Error al parsear shipping_address:`, e)
        }
      }

      // Si no hay datos en shipping_address, intentar desde metadata
      if ((!customerName || !customerEmail) && order.metadata) {
        try {
          const metadata = typeof order.metadata === 'string' 
            ? JSON.parse(order.metadata) 
            : order.metadata

          if (!customerName && metadata.customer_name) {
            customerName = metadata.customer_name
            console.log(`   Nombre desde metadata: ${customerName}`)
          }

          if (!customerEmail && metadata.customer_email) {
            customerEmail = metadata.customer_email
            console.log(`   Email desde metadata: ${customerEmail}`)
          }
        } catch (e) {
          console.log(`   ⚠️  Error al parsear metadata:`, e)
        }
      }

      // Actualizar solo si encontramos al menos uno de los dos
      if (customerName || customerEmail) {
        const updateData: any = {}
        if (customerName) updateData.customer_name = customerName
        if (customerEmail) updateData.customer_email = customerEmail

        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', order.id)

        if (updateError) {
          console.log(`   ❌ Error al actualizar: ${updateError.message}`)
          errors++
        } else {
          console.log(`   ✅ Actualizado correctamente`)
          updated++
        }
      } else {
        console.log(`   ⏭️  Sin datos para actualizar`)
        skipped++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN DE MIGRACIÓN:')
    console.log('='.repeat(60))
    console.log(`✅ Actualizados: ${updated}`)
    console.log(`⏭️  Omitidos: ${skipped}`)
    console.log(`❌ Errores: ${errors}`)
    console.log(`📦 Total procesados: ${orders.length}`)
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Error general en la migración:', error)
  }
}

// Ejecutar migración
migrateOrders()
  .then(() => {
    console.log('✅ Migración completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
