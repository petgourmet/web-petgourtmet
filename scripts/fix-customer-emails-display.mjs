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

// Función para extraer email del shipping_address
function extractEmailFromShippingAddress(shippingAddress) {
  if (!shippingAddress) return null
  
  try {
    const parsed = typeof shippingAddress === 'string' 
      ? JSON.parse(shippingAddress) 
      : shippingAddress
    
    if (parsed.customer_data && parsed.customer_data.email) {
      return parsed.customer_data.email
    }
  } catch (error) {
    console.warn('Error parsing shipping_address:', error.message)
  }
  
  return null
}

// Función para extraer nombre del shipping_address
function extractNameFromShippingAddress(shippingAddress) {
  if (!shippingAddress) return null
  
  try {
    const parsed = typeof shippingAddress === 'string' 
      ? JSON.parse(shippingAddress) 
      : shippingAddress
    
    if (parsed.customer_data) {
      const { firstName, lastName } = parsed.customer_data
      if (firstName || lastName) {
        return `${firstName || ''} ${lastName || ''}`.trim()
      }
    }
  } catch (error) {
    console.warn('Error parsing shipping_address:', error.message)
  }
  
  return null
}

async function analyzeAndDisplayEmails() {
  console.log('🔄 Analizando emails de clientes en órdenes...')
  
  try {
    // Obtener todas las órdenes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_name, shipping_address, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (ordersError) {
      console.error('❌ Error obteniendo órdenes:', ordersError)
      return
    }

    console.log(`📋 Analizando ${orders?.length || 0} órdenes recientes...\n`)

    if (!orders || orders.length === 0) {
      console.log('✅ No hay órdenes para analizar')
      return
    }

    let withRealEmail = 0
    let withGenericEmail = 0
    let withoutEmail = 0
    const emailSummary = []

    // Analizar cada orden
    for (const order of orders) {
      const extractedEmail = extractEmailFromShippingAddress(order.shipping_address)
      const extractedName = extractNameFromShippingAddress(order.shipping_address)
      
      let status = ''
      let displayEmail = 'Sin email'
      
      if (extractedEmail) {
        if (extractedEmail === 'cliente@petgourmet.mx') {
          status = '🟡 Email genérico'
          withGenericEmail++
        } else {
          status = '🟢 Email real'
          withRealEmail++
        }
        displayEmail = extractedEmail
      } else {
        status = '🔴 Sin email'
        withoutEmail++
      }
      
      emailSummary.push({
        id: order.id,
        name: extractedName || order.customer_name || 'Sin nombre',
        email: displayEmail,
        status: status,
        date: new Date(order.created_at).toLocaleDateString('es-MX')
      })
    }

    // Mostrar resumen
    console.log('📊 RESUMEN DE EMAILS:')
    console.log(`🟢 Con email real: ${withRealEmail}`)
    console.log(`🟡 Con email genérico: ${withGenericEmail}`)
    console.log(`🔴 Sin email: ${withoutEmail}`)
    console.log(`📋 Total analizado: ${orders.length}\n`)

    // Mostrar detalles de las primeras 20 órdenes
    console.log('📋 DETALLES DE ÓRDENES (últimas 20):')
    console.log('ID\t| Cliente\t\t| Email\t\t\t| Estado\t| Fecha')
    console.log(''.padEnd(80, '-'))
    
    emailSummary.slice(0, 20).forEach(order => {
      const id = `#${order.id}`.padEnd(8)
      const name = order.name.substring(0, 15).padEnd(16)
      const email = order.email.substring(0, 25).padEnd(26)
      const status = order.status.padEnd(16)
      const date = order.date
      
      console.log(`${id}| ${name}| ${email}| ${status}| ${date}`)
    })

    // Mostrar órdenes problemáticas
    const problematicOrders = emailSummary.filter(order => 
      order.email === 'cliente@petgourmet.mx' || order.email === 'Sin email'
    )

    if (problematicOrders.length > 0) {
      console.log(`\n⚠️ ÓRDENES QUE NECESITAN ATENCIÓN (${problematicOrders.length}):`)
      problematicOrders.forEach(order => {
        console.log(`   • Orden #${order.id}: ${order.name} - ${order.status}`)
      })
      
      console.log('\n💡 RECOMENDACIONES:')
      console.log('   1. Verificar que el formulario de checkout esté guardando emails correctamente')
      console.log('   2. Revisar webhooks de MercadoPago para obtener emails de pagadores')
      console.log('   3. Considerar agregar columna customer_email a la tabla orders')
    } else {
      console.log('\n✅ ¡Todas las órdenes tienen emails válidos!')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el análisis
analyzeAndDisplayEmails()
  .then(() => {
    console.log('\n🎉 Análisis completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })

export { analyzeAndDisplayEmails }