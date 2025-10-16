require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables de entorno de Supabase requeridas no encontradas')
  process.exit(1)
}

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.error('❌ MERCADOPAGO_ACCESS_TOKEN no configurado')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function validatePendingOrders() {
  console.log('🔍 ==================== VALIDACIÓN DE ÓRDENES PENDIENTES ====================')
  console.log('📋 Buscando órdenes pendientes con preference_id para validar pagos')
  console.log('🌍 Ambiente:', process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT)
  console.log('==========================================================================\n')

  try {
    // 1. Buscar órdenes pendientes con preference_id
    const { data: pendingOrders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .not('mercadopago_preference_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (orderError) {
      console.error('❌ Error obteniendo órdenes:', orderError.message)
      return
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('✅ No hay órdenes pendientes con preference_id')
      return
    }

    console.log(`📋 Encontradas ${pendingOrders.length} órdenes pendientes:`)
    pendingOrders.forEach(order => {
      console.log(`  - Orden ${order.id}: ${order.total} MXN (${new Date(order.created_at).toLocaleString()})`)
    })
    console.log('')

    // 2. Validar cada orden
    const results = {
      processed: 0,
      found: 0,
      updated: 0,
      errors: 0
    }

    for (const order of pendingOrders) {
      results.processed++
      console.log(`🔍 Validando orden ${order.id}...`)
      
      try {
        // Buscar pagos por external_reference
        const searchResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
          }
        })

        if (!searchResponse.ok) {
          console.log(`⚠️ Error buscando pagos para orden ${order.id}: ${searchResponse.status}`)
          results.errors++
          continue
        }

        const searchData = await searchResponse.json()
        
        if (searchData.results && searchData.results.length > 0) {
          results.found++
          console.log(`✅ Encontrados ${searchData.results.length} pago(s) para orden ${order.id}`)
          
          // Buscar pagos aprobados
          const approvedPayments = searchData.results.filter(p => p.status === 'approved')
          if (approvedPayments.length > 0) {
            const latestApproved = approvedPayments[approvedPayments.length - 1]
            console.log(`🎉 ¡Pago aprobado encontrado! ID: ${latestApproved.id}`)
            
            // Actualizar la orden
            const { error: updateError } = await supabase
              .from('orders')
              .update({
                mercadopago_payment_id: latestApproved.id,
                payment_status: 'paid',
                status: 'confirmed',
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id)

            if (updateError) {
              console.error(`❌ Error actualizando orden ${order.id}:`, updateError.message)
              results.errors++
            } else {
              console.log(`✅ Orden ${order.id} actualizada exitosamente`)
              results.updated++
            }
          } else {
            console.log(`⏳ Pagos encontrados pero ninguno aprobado aún`)
          }
        } else {
          console.log(`🔍 No se encontraron pagos para orden ${order.id}`)
        }
        
      } catch (error) {
        console.error(`❌ Error procesando orden ${order.id}:`, error.message)
        results.errors++
      }
    }

    // 3. Resumen final
    console.log('==========================================================================')
    console.log('📊 RESUMEN DE VALIDACIÓN:')
    console.log(`   • Órdenes procesadas: ${results.processed}`)
    console.log(`   • Órdenes con pagos encontrados: ${results.found}`)
    console.log(`   • Órdenes actualizadas: ${results.updated}`)
    console.log(`   • Errores: ${results.errors}`)
    console.log('==========================================================================')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

validatePendingOrders()