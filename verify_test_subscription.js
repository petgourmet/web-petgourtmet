// Script para verificar la suscripción de prueba específica

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzk1NzAsImV4cCI6MjA2MTUxNTU3MH0.GnS3-jHg1cBX1vUw8lYLhkWyPYMTFOYyH0Et4zMgciE'
const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTestSubscription() {
  console.log('🔍 Verificando suscripción de prueba...')
  
  try {
    // Buscar todas las suscripciones recientes para debug
    const { data: allSubscriptions, error: allError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (allError) {
      console.error('❌ Error obteniendo todas las suscripciones:', allError)
      return
    }
    
    console.log(`\n📊 Encontradas ${allSubscriptions.length} suscripciones recientes:`)
    allSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ID: ${sub.id}, External Ref: ${sub.external_reference}, Status: ${sub.status}, Created: ${sub.created_at}`)
    })
    
    // Buscar la suscripción de prueba específica
    const testSubscription = allSubscriptions.find(sub => 
      sub.external_reference && sub.external_reference.startsWith('test_')
    )
    
    if (!testSubscription) {
      console.log('\n❌ No se encontró la suscripción de prueba en la base de datos')
      console.log('⚠️ Esto indica que el endpoint create-without-plan no está guardando en unified_subscriptions')
      return
    }
    
    const subscription = testSubscription
    
    // Error handling is done above for allError
    
    console.log(`\n📋 Suscripción encontrada (ID: ${subscription.id}):`)
    console.log(`   External Reference: ${subscription.external_reference}`)
    console.log(`   Status: ${subscription.status}`)
    console.log(`   Created: ${subscription.created_at}`)
    
    console.log('\n🔍 VERIFICACIÓN DE CAMPOS CRÍTICOS:')
    console.log('================================================')
    
    // Campos críticos que deben estar presentes
    const criticalFields = [
      'product_name',
      'product_image', 
      'transaction_amount',
      'base_price',
      'discounted_price',
      'discount_percentage',
      'size',
      'product_id',
      'processed_at',
      'cart_items',
      'customer_data'
    ]
    
    let missingFields = 0
    let presentFields = 0
    
    criticalFields.forEach(field => {
      const value = subscription[field]
      const isEmpty = value === null || value === undefined || value === '' || 
                     (Array.isArray(value) && value.length === 0) ||
                     (typeof value === 'object' && Object.keys(value).length === 0)
      
      if (isEmpty) {
        console.log(`❌ ${field}: FALTANTE`)
        missingFields++
      } else {
        presentFields++
        if (field === 'cart_items' || field === 'customer_data') {
          console.log(`✅ ${field}: PRESENTE (${typeof value})`)
          
          // Mostrar contenido de objetos JSON
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value
            console.log(`   📦 Contenido:`, JSON.stringify(parsed, null, 6))
          } catch (e) {
            console.log(`   📦 Contenido: ${value}`)
          }
        } else {
          console.log(`✅ ${field}: ${value}`)
        }
      }
    })
    
    console.log('\n📊 RESUMEN DE VERIFICACIÓN:')
    console.log('================================')
    console.log(`Total campos verificados: ${criticalFields.length}`)
    console.log(`Campos presentes: ${presentFields}`)
    console.log(`Campos faltantes: ${missingFields}`)
    console.log(`Porcentaje completado: ${Math.round((presentFields / criticalFields.length) * 100)}%`)
    
    if (missingFields === 0) {
      console.log('\n🎉 ¡ÉXITO TOTAL! Todos los campos críticos están presentes')
      console.log('✅ Las correcciones implementadas funcionan correctamente')
    } else if (missingFields <= 2) {
      console.log('\n⚠️ ÉXITO PARCIAL: Solo faltan algunos campos menores')
      console.log('✅ Las correcciones principales funcionan correctamente')
    } else {
      console.log('\n❌ FALTAN CAMPOS CRÍTICOS: Se requieren más correcciones')
    }
    
    // Verificaciones específicas de las correcciones implementadas
    console.log('\n🔧 VERIFICACIÓN DE CORRECCIONES IMPLEMENTADAS:')
    console.log('===============================================')
    
    // 1. Verificar cart_items
    if (subscription.cart_items) {
      console.log('✅ cart_items: CORREGIDO - Campo presente')
      try {
        const cartItems = typeof subscription.cart_items === 'string' 
          ? JSON.parse(subscription.cart_items) 
          : subscription.cart_items
        
        if (Array.isArray(cartItems) && cartItems.length > 0) {
          console.log(`   📦 Contiene ${cartItems.length} productos`)
          cartItems.forEach((item, i) => {
            console.log(`      - Producto ${i + 1}: ${item.product_name || item.name || 'Sin nombre'}`)
          })
        }
      } catch (e) {
        console.log('   ⚠️ Error parseando cart_items:', e.message)
      }
    } else {
      console.log('❌ cart_items: AÚN FALTA - Corrección no aplicada')
    }
    
    // 2. Verificar customer_data
    if (subscription.customer_data) {
      console.log('✅ customer_data: CORREGIDO - Campo presente')
      try {
        const customerData = typeof subscription.customer_data === 'string'
          ? JSON.parse(subscription.customer_data)
          : subscription.customer_data
        
        console.log(`   👤 Email: ${customerData.email || 'N/A'}`)
        console.log(`   👤 Nombre: ${customerData.name || 'N/A'}`)
      } catch (e) {
        console.log('   ⚠️ Error parseando customer_data:', e.message)
      }
    } else {
      console.log('❌ customer_data: AÚN FALTA - Corrección no aplicada')
    }
    
    // 3. Verificar size y processed_at
    if (subscription.size) {
      console.log('✅ size: CORREGIDO - Campo presente')
    } else {
      console.log('❌ size: AÚN FALTA - Corrección no aplicada')
    }
    
    if (subscription.processed_at) {
      console.log('✅ processed_at: CORREGIDO - Campo presente')
    } else {
      console.log('❌ processed_at: AÚN FALTA - Corrección no aplicada')
    }
    
    // Mostrar algunos campos adicionales importantes
    console.log('\n📋 CAMPOS ADICIONALES:')
    console.log('======================')
    console.log(`mercadopago_subscription_id: ${subscription.mercadopago_subscription_id || 'N/A'}`)
    console.log(`subscription_type: ${subscription.subscription_type || 'N/A'}`)
    console.log(`currency_id: ${subscription.currency_id || 'N/A'}`)
    console.log(`frequency: ${subscription.frequency || 'N/A'}`)
    console.log(`frequency_type: ${subscription.frequency_type || 'N/A'}`)
    
  } catch (error) {
    console.error('❌ Error en la verificación:', error)
  }
}

// Ejecutar la verificación
if (require.main === module) {
  verifyTestSubscription()
    .then(() => {
      console.log('\n✅ Verificación completada')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error ejecutando verificación:', error)
      process.exit(1)
    })
}

module.exports = { verifyTestSubscription }