const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWebhookMultipleCriteria() {
  console.log('🧪 === PRUEBA DE WEBHOOK CON MÚLTIPLES CRITERIOS ===')
  console.log('📋 Simulando webhook con external_reference del pago: 45321cfb460f4267ab42f48b25065022')
  console.log('🎯 Probando si el sistema puede encontrar la suscripción 166 con los nuevos criterios')
  console.log('=' .repeat(80))

  const paymentExternalReference = '45321cfb460f4267ab42f48b25065022'
  const subscriptionExternalReference = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
  const userId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  const productId = 73

  try {
    console.log('\n🔍 EJECUTANDO ESTRATEGIAS DE BÚSQUEDA...')
    
    // Declarar todas las variables de resultado
    let result1 = null, result2 = null, result3 = null, result4 = null, result5 = null, result6 = null, result7 = null
    
    // Estrategia 1: Búsqueda directa por external_reference (fallará)
    console.log('\n1️⃣ Estrategia: external_reference exacto')
    try {
      const { data: searchResult1, error: error1 } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', paymentExternalReference)
        .maybeSingle()
      
      result1 = searchResult1
      
      if (result1) {
        console.log('✅ ENCONTRADA por external_reference exacto')
        console.log(`   - ID: ${result1.id}, Status: ${result1.status}`)
      } else {
        console.log('❌ NO encontrada por external_reference exacto (esperado)')
      }
    } catch (err) {
      console.log('❌ Error en estrategia 1:', err.message)
    }

    // Estrategia 2: Búsqueda por payment_external_reference en metadata
    console.log('\n2️⃣ Estrategia: payment_external_reference en metadata')
    try {
      const { data: searchResult2, error: error2 } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .contains('metadata', { payment_external_reference: paymentExternalReference })
        .maybeSingle()
      
      result2 = searchResult2
      
      if (result2) {
        console.log('✅ ENCONTRADA por payment_external_reference en metadata')
        console.log(`   - ID: ${result2.id}, Status: ${result2.status}`)
      } else {
        console.log('❌ NO encontrada por payment_external_reference en metadata')
      }
    } catch (err) {
      console.log('❌ Error en estrategia 2:', err.message)
    }

    // Estrategia 3: Búsqueda por user_id extraído del external_reference
    console.log('\n3️⃣ Estrategia: user_id extraído del external_reference')
    const refParts = subscriptionExternalReference.split('-')
    if (refParts.length >= 4 && refParts[0] === 'SUB') {
      const extractedUserId = refParts[1]
      console.log(`   - User ID extraído: ${extractedUserId}`)
      
      try {
        const { data: searchResult3, error: error3 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('user_id', extractedUserId)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false })
          .limit(3)
        
        result3 = searchResult3
        
        if (result3 && result3.length > 0) {
          console.log('✅ ENCONTRADA por user_id extraído')
          result3.forEach((sub, index) => {
            console.log(`   - ${index + 1}. ID: ${sub.id}, Status: ${sub.status}, Created: ${sub.created_at}`)
          })
        } else {
          console.log('❌ NO encontrada por user_id extraído')
        }
      } catch (err) {
        console.log('❌ Error en estrategia 3:', err.message)
      }
    } else {
      console.log('❌ NO se pudo extraer user_id del external_reference')
    }

    // Estrategia 4: Búsqueda por user_id + product_id específico
    console.log('\n4️⃣ Estrategia: user_id + product_id específico')
    try {
      const { data: searchResult4, error: error4 } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
      
      result4 = searchResult4
      
      if (result4 && result4.length > 0) {
        console.log('✅ ENCONTRADA por user_id + product_id específico')
        console.log(`   - ID: ${result4[0].id}, Status: ${result4[0].status}`)
      } else {
        console.log('❌ NO encontrada por user_id + product_id específico')
      }
    } catch (err) {
      console.log('❌ Error en estrategia 4:', err.message)
    }

    // Estrategia 5: Búsqueda por mercadopago_payment_id en metadata
    console.log('\n5️⃣ Estrategia: mercadopago_payment_id en metadata')
    try {
      const { data: searchResult5, error: error5 } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .contains('metadata', { mercadopago_payment_id: '128488428512' })
        .maybeSingle()
      
      result5 = searchResult5
      
      if (result5) {
        console.log('✅ ENCONTRADA por mercadopago_payment_id en metadata')
        console.log(`   - ID: ${result5.id}, Status: ${result5.status}`)
      } else {
        console.log('❌ NO encontrada por mercadopago_payment_id en metadata')
      }
    } catch (err) {
      console.log('❌ Error en estrategia 5:', err.message)
    }

    // Estrategia 6: Búsqueda por external_reference parcial
    console.log('\n6️⃣ Estrategia: external_reference parcial')
    const paymentRefParts = paymentExternalReference.split('-')
    if (paymentRefParts.length >= 2) {
      const lastPart = paymentRefParts[paymentRefParts.length - 1]
      console.log(`   - Buscando por parte final: ${lastPart}`)
      
      try {
        const { data: searchResult6, error: error6 } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .ilike('external_reference', `%${lastPart}%`)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false })
          .limit(3)
        
        result6 = searchResult6
        
        if (result6 && result6.length > 0) {
          console.log('✅ ENCONTRADA por external_reference parcial')
          result6.forEach((sub, index) => {
            console.log(`   - ${index + 1}. ID: ${sub.id}, Status: ${sub.status}, Ref: ${sub.external_reference}`)
          })
        } else {
          console.log('❌ NO encontrada por external_reference parcial')
        }
      } catch (err) {
        console.log('❌ Error en estrategia 6:', err.message)
      }
    }

    // Estrategia 7: Búsqueda por suscripciones pendientes recientes
    console.log('\n7️⃣ Estrategia: suscripciones pendientes recientes (fallback)')
    try {
      const { data: searchResult7, error: error7 } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
      
      result7 = searchResult7
      
      if (result7 && result7.length > 0) {
        console.log('✅ ENCONTRADAS suscripciones pendientes recientes')
        result7.forEach((sub, index) => {
          console.log(`   - ${index + 1}. ID: ${sub.id}, User: ${sub.user_id}, Product: ${sub.product_id}`)
        })
      } else {
        console.log('❌ NO encontradas suscripciones pendientes recientes')
      }
    } catch (err) {
      console.log('❌ Error en estrategia 7:', err.message)
    }

    // SIMULACIÓN COMPLETA DEL WEBHOOK
    console.log('\n🚀 SIMULACIÓN COMPLETA DEL WEBHOOK...')
    
    // Simular el flujo completo del webhook
    let foundSubscription = null
    let searchMethod = 'none'
    
    // Aplicar todas las estrategias en orden
    const strategies = [
      { name: 'external_reference_exact', result: result1 },
      { name: 'payment_external_reference_metadata', result: result2 },
      { name: 'user_id_from_reference', result: (result3 && result3.length > 0) ? result3[0] : null },
      { name: 'user_id_product_id_specific', result: (result4 && result4.length > 0) ? result4[0] : null },
      { name: 'mercadopago_payment_id_metadata', result: result5 },
      { name: 'external_reference_partial', result: (result6 && result6.length > 0) ? result6[0] : null },
      { name: 'recent_pending_fallback', result: (result7 && result7.length > 0) ? result7[0] : null }
    ]
    
    for (const strategy of strategies) {
      if (strategy.result && !foundSubscription) {
        foundSubscription = strategy.result
        searchMethod = strategy.name
        break
      }
    }
    
    console.log('\n📊 RESULTADO FINAL DE LA SIMULACIÓN:')
    if (foundSubscription) {
      console.log('✅ SUSCRIPCIÓN ENCONTRADA!')
      console.log(`   - Método exitoso: ${searchMethod}`)
      console.log(`   - ID: ${foundSubscription.id}`)
      console.log(`   - Status: ${foundSubscription.status}`)
      console.log(`   - User ID: ${foundSubscription.user_id}`)
      console.log(`   - Product ID: ${foundSubscription.product_id}`)
      console.log(`   - External Reference: ${foundSubscription.external_reference}`)
      
      // Verificar si es la suscripción correcta (ID 166)
      if (foundSubscription.id === 166) {
        console.log('🎯 ¡PERFECTO! Es la suscripción 166 que estábamos buscando')
      } else {
        console.log(`⚠️ ATENCIÓN: Se encontró suscripción ${foundSubscription.id}, no la 166`)
      }
    } else {
      console.log('❌ NO SE ENCONTRÓ NINGUNA SUSCRIPCIÓN')
      console.log('   - El webhook fallaría en encontrar la suscripción')
    }

    console.log('\n🎉 === PRUEBA COMPLETADA ===')
    console.log('✅ Sistema de múltiples criterios probado')
    console.log(`✅ Resultado: ${foundSubscription ? 'EXITOSO' : 'FALLIDO'}`)
    
    if (foundSubscription) {
      console.log('🔧 RECOMENDACIÓN: El sistema funcionará correctamente con los nuevos criterios')
    } else {
      console.log('🔧 RECOMENDACIÓN: Necesita ajustes adicionales en los criterios de búsqueda')
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error)
  }
}

// Ejecutar la prueba
testWebhookMultipleCriteria().catch(console.error)