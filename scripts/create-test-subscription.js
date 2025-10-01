require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestSubscription() {
  console.log('🧪 === CREANDO SUSCRIPCIÓN DE PRUEBA ===\n')
  
  try {
    // Usar el generador oficial de external_reference
    const { makeExternalReferenceWithoutPreapproval } = require('../utils/external-reference-generator.ts')
    const testUserId = '00000000-0000-0000-0000-000000000000' // UUID de prueba
    const testPlanId = '1' // ID del producto como string
    const testExternalReference = makeExternalReferenceWithoutPreapproval(testUserId, testPlanId, 'monthly')
    
    console.log('📝 Creando suscripción de prueba...')
    console.log(`   Usuario ID: ${testUserId}`)
    console.log(`   External Reference: ${testExternalReference}`)
    
    // Crear suscripción de prueba en estado pending
    const { data: newSubscription, error: createError } = await supabase
      .from('unified_subscriptions')
      .insert({
        user_id: testUserId,
        product_name: 'Flan de Pollo (3oz) - PRUEBA',
        subscription_type: 'monthly',
        status: 'pending',
        external_reference: testExternalReference,
        transaction_amount: 36.45,
        base_price: 36.45,
        product_id: 1,
        customer_data: {
          name: 'Usuario de Prueba',
          email: 'test@petgourmet.com',
          phone: '1234567890'
        },
        cart_items: [{
          id: 1,
          name: 'Flan de Pollo (3oz)',
          price: 36.45,
          quantity: 1
        }],
        frequency: 30,
        frequency_type: 'days',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          test_subscription: true,
          created_for_testing: true,
          test_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Error creando suscripción de prueba:', createError.message)
      return
    }
    
    console.log('✅ Suscripción de prueba creada exitosamente!')
    console.log(`   ID: ${newSubscription.id}`)
    console.log(`   Estado: ${newSubscription.status}`)
    console.log(`   External Reference: ${newSubscription.external_reference}`)
    
    // Simular parámetros de retorno de MercadoPago
    const mercadopagoParams = {
      external_reference: testExternalReference,
      collection_id: `test_collection_${Date.now()}`,
      payment_id: `test_payment_${Date.now()}`,
      status: 'approved',
      collection_status: 'approved',
      preference_id: `test_preference_${Date.now()}`,
      payment_type: 'credit_card',
      site_id: 'MLM'
    }
    
    console.log('\n🔗 URL de prueba para activación:')
    const testUrl = `http://localhost:3001/suscripcion?${new URLSearchParams(mercadopagoParams).toString()}`
    console.log(testUrl)
    
    console.log('\n📋 Parámetros de MercadoPago simulados:')
    Object.entries(mercadopagoParams).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`)
    })
    
    console.log('\n🧪 Para probar el flujo de activación:')
    console.log('1. Copia la URL de arriba')
    console.log('2. Pégala en el navegador')
    console.log('3. Observa si la suscripción se activa automáticamente')
    console.log('4. Verifica en la base de datos si el estado cambió a "active"')
    
    // Probar el endpoint de verificación directamente
    console.log('\n🔧 Probando endpoint de verificación...')
    
    try {
      const response = await fetch('http://localhost:3001/api/subscriptions/verify-return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mercadopagoParams)
      })
      
      const result = await response.json()
      
      console.log(`   Status HTTP: ${response.status}`)
      console.log(`   Respuesta:`, result)
      
      if (response.ok && result.success) {
        console.log('✅ Endpoint de verificación funcionó correctamente')
        
        // Verificar si la suscripción se activó
        const { data: updatedSub, error: checkError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('id', newSubscription.id)
          .single()
        
        if (checkError) {
          console.error('❌ Error verificando estado actualizado:', checkError.message)
        } else {
          console.log(`   Estado actualizado: ${updatedSub.status}`)
          if (updatedSub.status === 'active') {
            console.log('🎉 ¡SUSCRIPCIÓN ACTIVADA EXITOSAMENTE!')
          } else {
            console.log('⚠️ La suscripción no se activó automáticamente')
          }
        }
      } else {
        console.log('❌ Error en endpoint de verificación')
      }
      
    } catch (fetchError) {
      console.error('❌ Error probando endpoint:', fetchError.message)
      console.log('   Asegúrate de que el servidor esté corriendo en localhost:3001')
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message)
  }
}

// Ejecutar la prueba
createTestSubscription().then(() => {
  console.log('\n✅ Prueba completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando prueba:', error.message)
  process.exit(1)
})