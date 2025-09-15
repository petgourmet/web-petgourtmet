// Script para debuggear los datos que recibe el frontend
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

async function debugFrontendData() {
  const fetch = (await import('node-fetch')).default
  
  try {
    console.log('🔍 Verificando datos del frontend...')
    console.log('=' .repeat(50))
    
    // 1. Probar la API directamente
    console.log('\n1. Probando API /api/admin/subscriptions:')
    const response = await fetch('http://localhost:3000/api/admin/subscriptions')
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`)
      return
    }
    
    const result = await response.json()
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Success: ${result.success}`)
    console.log(`✅ Total suscripciones: ${result.data?.length || 0}`)
    
    if (result.data && result.data.length > 0) {
      console.log('\n2. Estructura de la primera suscripción:')
      const firstSub = result.data[0]
      console.log('   Campos principales:')
      console.log(`   - id: ${firstSub.id}`)
      console.log(`   - user_id: ${firstSub.user_id}`)
      console.log(`   - status: ${firstSub.status}`)
      console.log(`   - product_id: ${firstSub.product_id}`)
      console.log(`   - subscription_type: ${firstSub.subscription_type}`)
      console.log(`   - created_at: ${firstSub.created_at}`)
      console.log(`   - is_active: ${firstSub.is_active}`)
      
      console.log('\n   Campos de usuario:')
      console.log(`   - user_profile: ${firstSub.user_profile ? 'Presente' : 'Ausente'}`)
      if (firstSub.user_profile) {
        console.log(`     - full_name: ${firstSub.user_profile.full_name}`)
        console.log(`     - email: ${firstSub.user_profile.email}`)
      }
      
      console.log('\n   Campos de producto:')
      console.log(`   - product: ${firstSub.product || firstSub.products ? 'Presente' : 'Ausente'}`)
      console.log(`   - product_name: ${firstSub.product_name}`)
      console.log(`   - product_image: ${firstSub.product_image}`)
      
      console.log('\n   Campos de precio:')
      console.log(`   - price: ${firstSub.price}`)
      console.log(`   - base_price: ${firstSub.base_price}`)
      console.log(`   - discounted_price: ${firstSub.discounted_price}`)
      console.log(`   - transaction_amount: ${firstSub.transaction_amount}`)
      
      console.log('\n3. Verificando filtros que usa el frontend:')
      
      // Simular filtros del frontend
      const activeCount = result.data.filter(s => s.status === 'active').length
      const pendingCount = result.data.filter(s => s.status === 'pending').length
      const cancelledCount = result.data.filter(s => s.status === 'cancelled').length
      const inactiveCount = result.data.filter(s => !s.is_active && s.status !== 'cancelled' && s.status !== 'pending').length
      
      console.log(`   - Activas: ${activeCount}`)
      console.log(`   - Pendientes: ${pendingCount}`)
      console.log(`   - Canceladas: ${cancelledCount}`)
      console.log(`   - Inactivas: ${inactiveCount}`)
      
      // Verificar si hay suscripciones que pasarían el filtro "all"
      const allSubscriptions = result.data // Sin filtro
      console.log(`   - Total sin filtro: ${allSubscriptions.length}`)
      
      console.log('\n4. Estados únicos encontrados:')
      const uniqueStatuses = [...new Set(result.data.map(s => s.status))]
      console.log(`   - Estados: ${uniqueStatuses.join(', ')}`)
      
      console.log('\n5. Verificando campos requeridos para renderizado:')
      let validSubscriptions = 0
      result.data.forEach((sub, index) => {
        const hasRequiredFields = sub.id && sub.status && (sub.user_profile || sub.user_id)
        if (hasRequiredFields) {
          validSubscriptions++
        } else {
          console.log(`   ⚠️ Suscripción ${index + 1} falta campos: id=${!!sub.id}, status=${!!sub.status}, user=${!!(sub.user_profile || sub.user_id)}`)
        }
      })
      console.log(`   - Suscripciones válidas para renderizar: ${validSubscriptions}/${result.data.length}`)
      
    } else {
      console.log('❌ No se encontraron suscripciones en la respuesta')
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ Debug completado')
    
  } catch (error) {
    console.error('💥 Error en debug:', error)
  }
}

// Ejecutar debug
debugFrontendData()