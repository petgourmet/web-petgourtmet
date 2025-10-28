/**
 * Script para verificar los datos de los pedidos
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkOrders() {
  console.log('🔍 Verificando pedidos...\n')

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, shipping_address, metadata')
    .order('id', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`📦 Últimos 5 pedidos:\n`)
  
  orders?.forEach(order => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Pedido #${order.id}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`customer_name: ${order.customer_name || 'NULL'}`)
    console.log(`customer_email: ${order.customer_email || 'NULL'}`)
    console.log(`\nshipping_address:`)
    console.log(JSON.stringify(order.shipping_address, null, 2))
    console.log(`\nmetadata:`)
    console.log(JSON.stringify(order.metadata, null, 2))
  })
}

checkOrders()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
