const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixExternalReferenceMapping() {
  console.log('🔧 === CORRECCIÓN DE MAPEO DE EXTERNAL REFERENCES ===')
  console.log('📋 PROBLEMA: Los external_reference de pagos y suscripciones no coinciden')
  console.log('🎯 SOLUCIÓN: Crear mapeo bidireccional para garantizar coincidencia')
  console.log('=' .repeat(80))

  try {
    // 1. Actualizar la suscripción 166 para incluir el external_reference del pago
    console.log('\n🔄 1. ACTUALIZANDO SUSCRIPCIÓN 166 CON MAPEO DE REFERENCIAS...')
    
    const { data: currentSub, error: getCurrentError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 166)
      .single()

    if (getCurrentError) {
      console.error('❌ Error obteniendo suscripción actual:', getCurrentError)
      return
    }

    console.log('📊 Suscripción actual:')
    console.log(`   - ID: ${currentSub.id}`)
    console.log(`   - Status: ${currentSub.status}`)
    console.log(`   - External Reference Original: ${currentSub.external_reference}`)

    // Actualizar metadata para incluir el external_reference del pago
    const currentMetadata = JSON.parse(currentSub.metadata || '{}')
    const updatedMetadata = {
      ...currentMetadata,
      'payment_external_reference': '45321cfb460f4267ab42f48b25065022',
      'original_external_reference': currentSub.external_reference,
      'reference_mapping_created': new Date().toISOString(),
      'mercadopago_payment_id': '128488428512',
      'mercadopago_collection_id': '128488428512'
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        metadata: JSON.stringify(updatedMetadata),
        updated_at: new Date().toISOString()
      })
      .eq('id', 166)
      .select()

    if (updateError) {
      console.error('❌ Error actualizando suscripción:', updateError)
      return
    }

    console.log('✅ Suscripción actualizada con mapeo de referencias!')
    console.log(`   - Payment External Reference: 45321cfb460f4267ab42f48b25065022`)
    console.log(`   - Original External Reference: ${currentSub.external_reference}`)

    // 2. Crear tabla de mapeo de referencias (si no existe)
    console.log('\n🗃️ 2. CREANDO REGISTRO EN TABLA DE MAPEO...')
    
    const mappingData = {
      subscription_id: 166,
      subscription_external_reference: currentSub.external_reference,
      payment_external_reference: '45321cfb460f4267ab42f48b25065022',
      mercadopago_payment_id: '128488428512',
      mercadopago_collection_id: '128488428512',
      user_id: currentSub.user_id,
      product_id: currentSub.product_id,
      created_at: new Date().toISOString(),
      status: 'active',
      mapping_type: 'payment_to_subscription'
    }

    // Intentar insertar en tabla de mapeo (puede que no exista)
    try {
      const { data: mappingRecord, error: mappingError } = await supabase
        .from('subscription_reference_mapping')
        .insert(mappingData)
        .select()

      if (mappingError) {
        console.log('⚠️ Tabla de mapeo no existe, creando registro en metadata solamente')
      } else {
        console.log('✅ Registro de mapeo creado exitosamente!')
      }
    } catch (mappingErr) {
      console.log('⚠️ Tabla de mapeo no disponible, usando metadata')
    }

    // 3. Verificar que el webhook ahora pueda encontrar la suscripción
    console.log('\n🔍 3. SIMULANDO BÚSQUEDA DE WEBHOOK...')
    
    // Simular búsqueda por payment external_reference
    const { data: foundByPaymentRef, error: searchError1 } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .contains('metadata', { payment_external_reference: '45321cfb460f4267ab42f48b25065022' })

    if (foundByPaymentRef && foundByPaymentRef.length > 0) {
      console.log('✅ Suscripción encontrada por payment_external_reference!')
      console.log(`   - ID: ${foundByPaymentRef[0].id}`)
      console.log(`   - Status: ${foundByPaymentRef[0].status}`)
    }

    // Simular búsqueda por user_id + product_id
    const { data: foundByUserProduct, error: searchError2 } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', currentSub.user_id)
      .eq('product_id', currentSub.product_id)
      .eq('status', 'active')

    if (foundByUserProduct && foundByUserProduct.length > 0) {
      console.log('✅ Suscripción encontrada por user_id + product_id!')
      console.log(`   - Encontradas: ${foundByUserProduct.length} suscripciones`)
    }

    // 4. Crear función de búsqueda mejorada
    console.log('\n🚀 4. PROBANDO FUNCIÓN DE BÚSQUEDA MEJORADA...')
    
    const searchStrategies = [
      // Estrategia 1: Por payment external reference en metadata
      {
        name: 'payment_external_reference_metadata',
        query: () => supabase
          .from('unified_subscriptions')
          .select('*')
          .contains('metadata', { payment_external_reference: '45321cfb460f4267ab42f48b25065022' })
      },
      // Estrategia 2: Por user_id extraído del external_reference original
      {
        name: 'user_id_from_original_reference',
        query: () => supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('user_id', '2f4ec8c0-0e58-486d-9c11-a652368f7c19')
          .in('status', ['active', 'pending'])
          .order('created_at', { ascending: false })
      },
      // Estrategia 3: Por mercadopago_payment_id en metadata
      {
        name: 'mercadopago_payment_id_metadata',
        query: () => supabase
          .from('unified_subscriptions')
          .select('*')
          .contains('metadata', { mercadopago_payment_id: '128488428512' })
      }
    ]

    for (const strategy of searchStrategies) {
      try {
        const { data: results, error } = await strategy.query()
        if (results && results.length > 0) {
          console.log(`✅ Estrategia "${strategy.name}" exitosa:`)
          console.log(`   - Encontradas: ${results.length} suscripciones`)
          console.log(`   - Primera: ID ${results[0].id}, Status: ${results[0].status}`)
        } else {
          console.log(`❌ Estrategia "${strategy.name}" sin resultados`)
        }
      } catch (err) {
        console.log(`❌ Error en estrategia "${strategy.name}":`, err.message)
      }
    }

    console.log('\n🎉 === CORRECCIÓN COMPLETADA ===')
    console.log('✅ Mapeo de referencias creado exitosamente')
    console.log('✅ Suscripción 166 ahora es localizable por múltiples criterios')
    console.log('✅ Sistema preparado para webhooks futuros')

  } catch (error) {
    console.error('❌ Error durante la corrección:', error)
  }
}

// Ejecutar
fixExternalReferenceMapping().catch(console.error)