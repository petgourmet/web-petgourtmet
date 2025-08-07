import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * API endpoint para asociar automáticamente órdenes con usuarios
 * Se puede llamar después de crear una orden o como proceso batch
 */

// Función para extraer email del shipping_address
function extractEmailFromOrder(order: any): string | null {
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

// Función para buscar usuario por email
async function findUserByEmail(email: string) {
  const supabase = createServiceClient()
  
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

// Función para actualizar el user_id de una orden
async function updateOrderUserId(orderId: number, userId: string) {
  const supabase = createServiceClient()
  
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

// Función para procesar una orden específica
async function processOrder(orderId: number) {
  const supabase = createServiceClient()
  
  try {
    // Obtener la orden
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .is('user_id', null)
      .single()
    
    if (orderError || !order) {
      return {
        success: false,
        message: 'Orden no encontrada o ya tiene user_id asignado'
      }
    }
    
    // Extraer email
    const email = extractEmailFromOrder(order)
    
    if (!email) {
      return {
        success: false,
        message: 'No se pudo extraer email del shipping_address'
      }
    }
    
    // Buscar usuario
    const user = await findUserByEmail(email)
    
    if (!user) {
      return {
        success: false,
        message: `Usuario no encontrado para email ${email}`
      }
    }
    
    // Actualizar orden
    const success = await updateOrderUserId(orderId, user.id)
    
    if (success) {
      return {
        success: true,
        message: `Orden ${orderId} asociada exitosamente con usuario ${user.id}`,
        data: {
          orderId,
          userId: user.id,
          email
        }
      }
    } else {
      return {
        success: false,
        message: 'Error al actualizar la orden'
      }
    }
    
  } catch (error) {
    console.error(`Error procesando orden ${orderId}:`, error)
    return {
      success: false,
      message: `Error interno: ${error.message}`
    }
  }
}

// Función para procesar todas las órdenes sin user_id
async function processAllOrders() {
  const supabase = createServiceClient()
  
  try {
    // Obtener órdenes sin user_id
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .is('user_id', null)
      .limit(50) // Limitar para evitar timeouts
    
    if (error) {
      return {
        success: false,
        message: `Error obteniendo órdenes: ${error.message}`
      }
    }
    
    if (!orders || orders.length === 0) {
      return {
        success: true,
        message: 'No hay órdenes que necesiten procesamiento',
        data: { processed: 0, successful: 0, failed: 0 }
      }
    }
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: []
    }
    
    // Procesar cada orden
    for (const order of orders) {
      results.processed++
      
      const result = await processOrder(order.id)
      
      if (result.success) {
        results.successful++
      } else {
        results.failed++
      }
      
      results.details.push({
        orderId: order.id,
        success: result.success,
        message: result.message
      })
    }
    
    return {
      success: true,
      message: `Procesamiento completado: ${results.successful}/${results.processed} órdenes asociadas exitosamente`,
      data: results
    }
    
  } catch (error) {
    console.error('Error en processAllOrders:', error)
    return {
      success: false,
      message: `Error interno: ${error.message}`
    }
  }
}

// POST: Procesar orden específica o todas las órdenes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { orderId, processAll } = body
    
    console.log('🔄 Auto-assign orders API called:', { orderId, processAll })
    
    if (orderId) {
      // Procesar orden específica
      const result = await processOrder(parseInt(orderId))
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })
    } else if (processAll) {
      // Procesar todas las órdenes
      const result = await processAllOrders()
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Debe especificar orderId o processAll=true'
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error en auto-assign API:', error)
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// GET: Obtener estadísticas de órdenes sin user_id
export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Contar órdenes sin user_id
    const { count: ordersWithoutUserId, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null)
    
    if (countError) {
      return NextResponse.json({
        success: false,
        message: `Error obteniendo estadísticas: ${countError.message}`
      }, { status: 500 })
    }
    
    // Obtener algunas órdenes de ejemplo
    const { data: sampleOrders, error: sampleError } = await supabase
      .from('orders')
      .select('id, total, status, created_at, shipping_address')
      .is('user_id', null)
      .limit(5)
      .order('created_at', { ascending: false })
    
    const ordersWithEmails = sampleOrders?.map(order => ({
      ...order,
      email: extractEmailFromOrder(order)
    })) || []
    
    return NextResponse.json({
      success: true,
      data: {
        ordersWithoutUserId: ordersWithoutUserId || 0,
        sampleOrders: ordersWithEmails
      }
    })
    
  } catch (error) {
    console.error('Error en GET auto-assign API:', error)
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 })
  }
}