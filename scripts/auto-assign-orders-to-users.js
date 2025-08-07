#!/usr/bin/env node

/**
 * Script para asociar automáticamente órdenes con usuarios basándose en el email
 * Busca órdenes sin user_id y las asocia con el usuario correspondiente por email
 * 
 * Uso:
 * node scripts/auto-assign-orders-to-users.js
 * 
 * Opciones:
 * --dry-run : Solo muestra qué cambios se harían sin ejecutarlos
 * --order-id=123 : Procesa solo una orden específica
 * --email=user@example.com : Procesa solo órdenes de un email específico
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(70))
  log(title, 'cyan')
  console.log('='.repeat(70))
}

// Parsear argumentos de línea de comandos
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    dryRun: false,
    orderId: null,
    email: null
  }
  
  args.forEach(arg => {
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg.startsWith('--order-id=')) {
      options.orderId = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--email=')) {
      options.email = arg.split('=')[1]
    }
  })
  
  return options
}

// Obtener órdenes sin user_id
async function getOrdersWithoutUserId(orderId = null, email = null) {
  try {
    log('🔍 Buscando órdenes sin user_id asignado...', 'blue')
    
    let query = supabase
      .from('orders')
      .select('*')
      .is('user_id', null)
    
    if (orderId) {
      query = query.eq('id', orderId)
    }
    
    const { data: orders, error } = await query
    
    if (error) {
      console.error('Error obteniendo órdenes:', error)
      return []
    }
    
    // Filtrar por email si se especifica
    let filteredOrders = orders || []
    
    if (email) {
      filteredOrders = orders.filter(order => {
        if (!order.shipping_address) return false
        
        try {
          const shippingData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
          
          return shippingData.customer_data?.email === email
        } catch (e) {
          return false
        }
      })
    }
    
    log(`✅ Encontradas ${filteredOrders.length} órdenes sin user_id`, 'green')
    return filteredOrders
    
  } catch (error) {
    console.error('Error en getOrdersWithoutUserId:', error)
    return []
  }
}

// Extraer email de shipping_address
function extractEmailFromOrder(order) {
  if (!order.shipping_address) return null
  
  try {
    const shippingData = typeof order.shipping_address === 'string' 
      ? JSON.parse(order.shipping_address) 
      : order.shipping_address
    
    return shippingData.customer_data?.email || null
  } catch (e) {
    return null
  }
}

// Buscar usuario por email
async function findUserByEmail(email) {
  try {
    // Primero buscar en la tabla profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .limit(1)
    
    if (!profileError && profiles && profiles.length > 0) {
      return profiles[0]
    }
    
    // Si no se encuentra en profiles, buscar en auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error(`Error buscando usuario ${email}:`, usersError)
      return null
    }
    
    const user = users.find(u => u.email === email)
    return user || null
    
  } catch (error) {
    console.error(`Error en findUserByEmail para ${email}:`, error)
    return null
  }
}

// Actualizar orden con user_id
async function updateOrderUserId(orderId, userId, dryRun = false) {
  if (dryRun) {
    log(`[DRY RUN] Actualizaría orden ${orderId} con user_id: ${userId}`, 'yellow')
    return true
  }
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
    
    if (error) {
      console.error(`Error actualizando orden ${orderId}:`, error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error(`Error en updateOrderUserId para orden ${orderId}:`, error)
    return false
  }
}

// Procesar una orden individual
async function processOrder(order, dryRun = false) {
  const email = extractEmailFromOrder(order)
  
  if (!email) {
    log(`⚠️ Orden ${order.id}: No se pudo extraer email del shipping_address`, 'yellow')
    return { success: false, reason: 'No email found' }
  }
  
  log(`🔍 Orden ${order.id}: Buscando usuario para email ${email}`, 'blue')
  
  const user = await findUserByEmail(email)
  
  if (!user) {
    log(`❌ Orden ${order.id}: Usuario no encontrado para email ${email}`, 'red')
    return { success: false, reason: 'User not found' }
  }
  
  log(`✅ Orden ${order.id}: Usuario encontrado - ID: ${user.id}`, 'green')
  
  const success = await updateOrderUserId(order.id, user.id, dryRun)
  
  if (success) {
    const action = dryRun ? 'Se actualizaría' : 'Actualizada'
    log(`✅ Orden ${order.id}: ${action} exitosamente`, 'green')
    return { success: true, userId: user.id, email }
  } else {
    log(`❌ Orden ${order.id}: Error al actualizar`, 'red')
    return { success: false, reason: 'Update failed' }
  }
}

// Función principal
async function main() {
  const options = parseArgs()
  
  logSection('🔧 SCRIPT DE ASOCIACIÓN AUTOMÁTICA DE ÓRDENES')
  
  if (options.dryRun) {
    log('🔍 MODO DRY RUN - Solo se mostrarán los cambios sin ejecutarlos', 'yellow')
  }
  
  if (options.orderId) {
    log(`🎯 Procesando solo la orden ID: ${options.orderId}`, 'blue')
  }
  
  if (options.email) {
    log(`📧 Procesando solo órdenes del email: ${options.email}`, 'blue')
  }
  
  try {
    // Obtener órdenes sin user_id
    const orders = await getOrdersWithoutUserId(options.orderId, options.email)
    
    if (orders.length === 0) {
      log('✅ No se encontraron órdenes que necesiten procesamiento', 'green')
      return
    }
    
    logSection(`📋 PROCESANDO ${orders.length} ÓRDENES`)
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      noEmail: 0,
      noUser: 0,
      updateFailed: 0
    }
    
    // Procesar cada orden
    for (const order of orders) {
      results.processed++
      
      console.log(`\n--- Procesando orden ${order.id} (${results.processed}/${orders.length}) ---`)
      console.log(`   Total: $${order.total}`)
      console.log(`   Estado: ${order.status}`)
      console.log(`   Fecha: ${order.created_at}`)
      
      const result = await processOrder(order, options.dryRun)
      
      if (result.success) {
        results.successful++
      } else {
        results.failed++
        
        switch (result.reason) {
          case 'No email found':
            results.noEmail++
            break
          case 'User not found':
            results.noUser++
            break
          case 'Update failed':
            results.updateFailed++
            break
        }
      }
      
      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Mostrar resumen
    logSection('📊 RESUMEN DE RESULTADOS')
    log(`📝 Órdenes procesadas: ${results.processed}`, 'blue')
    log(`✅ Exitosas: ${results.successful}`, 'green')
    log(`❌ Fallidas: ${results.failed}`, 'red')
    
    if (results.failed > 0) {
      console.log('\n📋 Desglose de fallos:')
      if (results.noEmail > 0) log(`   📧 Sin email: ${results.noEmail}`, 'yellow')
      if (results.noUser > 0) log(`   👤 Usuario no encontrado: ${results.noUser}`, 'yellow')
      if (results.updateFailed > 0) log(`   💾 Error de actualización: ${results.updateFailed}`, 'yellow')
    }
    
    if (options.dryRun) {
      log('\n💡 Para ejecutar los cambios realmente, ejecuta el script sin --dry-run', 'cyan')
    } else if (results.successful > 0) {
      log('\n🎉 ¡Proceso completado! Las órdenes ahora están asociadas con sus usuarios.', 'green')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

// Función para uso como webhook o API
async function processNewOrder(orderId) {
  try {
    log(`🔄 Procesando nueva orden ${orderId}...`, 'blue')
    
    const orders = await getOrdersWithoutUserId(orderId)
    
    if (orders.length === 0) {
      log(`ℹ️ Orden ${orderId} ya tiene user_id asignado o no existe`, 'blue')
      return { success: true, message: 'Order already has user_id or does not exist' }
    }
    
    const result = await processOrder(orders[0], false)
    
    if (result.success) {
      log(`✅ Orden ${orderId} asociada exitosamente con usuario ${result.userId}`, 'green')
      return { success: true, userId: result.userId, email: result.email }
    } else {
      log(`❌ No se pudo procesar la orden ${orderId}: ${result.reason}`, 'red')
      return { success: false, reason: result.reason }
    }
    
  } catch (error) {
    console.error(`Error procesando orden ${orderId}:`, error)
    return { success: false, error: error.message }
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  main().catch(console.error)
}

// Exportar funciones para uso en otros módulos
module.exports = {
  processNewOrder,
  findUserByEmail,
  extractEmailFromOrder,
  getOrdersWithoutUserId,
  updateOrderUserId
}