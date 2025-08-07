#!/usr/bin/env node

/**
 * Script para arreglar la orden 121 de Fabian Gutierrez
 * Asocia la orden con el usuario correcto para que aparezca en su perfil
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wnqhqjqjqjqjqjqjqjqj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurado')
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
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

async function findUserByEmail(email) {
  try {
    log(`🔍 Buscando usuario con email: ${email}`, 'blue')
    
    // Buscar en la tabla profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
    
    if (profileError) {
      console.error('Error buscando en profiles:', profileError)
    }
    
    if (profiles && profiles.length > 0) {
      log(`✅ Usuario encontrado en profiles:`, 'green')
      console.log(`   ID: ${profiles[0].id}`)
      console.log(`   Email: ${profiles[0].email}`)
      console.log(`   Nombre: ${profiles[0].full_name || 'No especificado'}`)
      return profiles[0]
    }
    
    // Si no se encuentra en profiles, buscar en auth.users
    log('🔍 Buscando en auth.users...', 'yellow')
    
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error buscando en auth.users:', usersError)
      return null
    }
    
    const user = users.find(u => u.email === email)
    
    if (user) {
      log(`✅ Usuario encontrado en auth.users:`, 'green')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Creado: ${user.created_at}`)
      return user
    }
    
    log(`❌ Usuario no encontrado con email: ${email}`, 'red')
    return null
    
  } catch (error) {
    console.error('Error en findUserByEmail:', error)
    return null
  }
}

async function getOrderDetails(orderId) {
  try {
    log(`🔍 Obteniendo detalles de la orden ${orderId}`, 'blue')
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (error) {
      console.error('Error obteniendo orden:', error)
      return null
    }
    
    if (order) {
      log(`✅ Orden encontrada:`, 'green')
      console.log(`   ID: ${order.id}`)
      console.log(`   User ID actual: ${order.user_id || 'null'}`)
      console.log(`   Total: $${order.total}`)
      console.log(`   Estado: ${order.status}`)
      console.log(`   Estado de pago: ${order.payment_status}`)
      console.log(`   Fecha: ${order.created_at}`)
      
      // Parsear shipping_address para obtener email
      if (order.shipping_address) {
        try {
          const shippingData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
          
          if (shippingData.customer_data) {
            console.log(`   Email en shipping: ${shippingData.customer_data.email}`)
            console.log(`   Nombre en shipping: ${shippingData.customer_data.firstName} ${shippingData.customer_data.lastName}`)
          }
        } catch (e) {
          console.log('   Error parseando shipping_address')
        }
      }
    }
    
    return order
    
  } catch (error) {
    console.error('Error en getOrderDetails:', error)
    return null
  }
}

async function updateOrderUserId(orderId, userId) {
  try {
    log(`🔄 Actualizando orden ${orderId} con user_id: ${userId}`, 'blue')
    
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
    
    if (error) {
      console.error('Error actualizando orden:', error)
      return false
    }
    
    log(`✅ Orden actualizada exitosamente`, 'green')
    return true
    
  } catch (error) {
    console.error('Error en updateOrderUserId:', error)
    return false
  }
}

async function main() {
  logSection('🔧 SCRIPT PARA ARREGLAR ORDEN 121 - FABIAN GUTIERREZ')
  
  const targetEmail = 'fabyo66@hotmail.com'
  const targetOrderId = 121
  
  try {
    // Paso 1: Obtener detalles de la orden
    const order = await getOrderDetails(targetOrderId)
    if (!order) {
      log('❌ No se pudo obtener la orden. Terminando script.', 'red')
      return
    }
    
    // Paso 2: Buscar al usuario
    const user = await findUserByEmail(targetEmail)
    if (!user) {
      log('❌ No se pudo encontrar el usuario. Terminando script.', 'red')
      return
    }
    
    // Paso 3: Verificar si la orden ya tiene user_id
    if (order.user_id) {
      log(`⚠️ La orden ya tiene user_id: ${order.user_id}`, 'yellow')
      
      if (order.user_id === user.id) {
        log('✅ La orden ya está asociada con el usuario correcto', 'green')
        return
      } else {
        log('⚠️ La orden está asociada con un usuario diferente', 'yellow')
        console.log(`   User ID actual: ${order.user_id}`)
        console.log(`   User ID esperado: ${user.id}`)
        
        const readline = require('readline')
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        
        const answer = await new Promise(resolve => {
          rl.question('¿Deseas actualizar el user_id? (y/N): ', resolve)
        })
        
        rl.close()
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          log('❌ Operación cancelada por el usuario', 'yellow')
          return
        }
      }
    }
    
    // Paso 4: Actualizar la orden
    const success = await updateOrderUserId(targetOrderId, user.id)
    
    if (success) {
      logSection('✅ OPERACIÓN COMPLETADA EXITOSAMENTE')
      log('La orden 121 ahora está asociada con el usuario correcto', 'green')
      log('El usuario debería poder ver su compra en su perfil', 'green')
    } else {
      log('❌ Error al actualizar la orden', 'red')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  findUserByEmail,
  getOrderDetails,
  updateOrderUserId
}