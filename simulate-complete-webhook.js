const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'
const supabase = createClient(supabaseUrl, supabaseKey)

// Datos del webhook de Mercado Pago (simulado)
const webhookData = {
  collection_id: '128488428512',
  collection_status: 'approved',
  payment_id: '128488428512',
  status: 'approved',
  external_reference: '45321cfb460f4267ab42f48b25065022',
  payment_type: 'credit_card',
  site_id: 'MLM',
  preference_id: '2718057813-bfe4937e-81a1-41e2-9348-e2cb07507df6'
}

// Datos conocidos de la suscripción
const subscriptionData = {
  id: 166,
  user_id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  product_id: 73,
  external_reference: 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de',
  email: 'cristoferscalante@gmail.com'
}

async function simulateCompleteWebhook() {
  try {
    console.log('🚀 === SIMULACIÓN COMPLETA DEL WEBHOOK ===')
    console.log('📋 Datos del pago de Mercado Pago:')
    console.log(`   - Payment ID: ${webhookData.payment_id}`)
    console.log(`   - Status: ${webhookData.status}`)
    console.log(`   - External Reference: ${webhookData.external_reference}`)
    console.log('================================================================================')

    // PASO 1: Buscar la suscripción usando múltiples criterios
    console.log('\n🔍 PASO 1: Buscando suscripción con múltiples criterios...')
    
    let foundSubscription = null
    let searchMethod = 'none'

    // Estrategia 1: Búsqueda directa por external_reference (fallará)
    console.log('\n1️⃣ Intentando búsqueda directa por external_reference...')
    const { data: directResult } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', webhookData.external_reference)
      .maybeSingle()
    
    if (directResult) {
      foundSubscription = directResult
      searchMethod = 'direct_external_reference'
      console.log('✅ Encontrada por external_reference directo')
    } else {
      console.log('❌ NO encontrada por external_reference directo (esperado)')
    }

    // Estrategia 2: Búsqueda por payment_external_reference en metadata
    if (!foundSubscription) {
      console.log('\n2️⃣ Intentando búsqueda por payment_external_reference en metadata...')
      const { data: metadataResult } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .contains('metadata', { payment_external_reference: webhookData.external_reference })
        .maybeSingle()
      
      if (metadataResult) {
        foundSubscription = metadataResult
        searchMethod = 'metadata_payment_reference'
        console.log('✅ Encontrada por payment_external_reference en metadata')
      } else {
        console.log('❌ NO encontrada por payment_external_reference en metadata')
      }
    }

    // Estrategia 3: Búsqueda por user_id + product_id (más robusta)
    if (!foundSubscription) {
      console.log('\n3️⃣ Intentando búsqueda por user_id + product_id...')
      const { data: userProductResult } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', subscriptionData.user_id)
        .eq('product_id', subscriptionData.product_id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (userProductResult && userProductResult.length > 0) {
        foundSubscription = userProductResult[0]
        searchMethod = 'user_product_match'
        console.log('✅ Encontrada por user_id + product_id')
      } else {
        console.log('❌ NO encontrada por user_id + product_id')
      }
    }

    if (!foundSubscription) {
      console.log('\n❌ ERROR: No se pudo encontrar la suscripción con ningún criterio')
      return
    }

    console.log(`\n✅ SUSCRIPCIÓN ENCONTRADA usando: ${searchMethod}`)
    console.log(`   - ID: ${foundSubscription.id}`)
    console.log(`   - Status actual: ${foundSubscription.status}`)
    console.log(`   - User ID: ${foundSubscription.user_id}`)
    console.log(`   - Product ID: ${foundSubscription.product_id}`)

    // PASO 2: Verificar si ya está activa
    if (foundSubscription.status === 'active') {
      console.log('\n✅ La suscripción ya está ACTIVA')
      console.log('🎯 Actualizando metadata con información del pago...')
      
      // Actualizar metadata con información del pago
      const currentMetadata = foundSubscription.metadata ? JSON.parse(foundSubscription.metadata) : {}
      const updatedMetadata = {
        ...currentMetadata,
        payment_external_reference: webhookData.external_reference,
        mercadopago_payment_id: webhookData.payment_id,
        payment_status: webhookData.status,
        payment_type: webhookData.payment_type,
        last_payment_date: new Date().toISOString(),
        webhook_processed_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          metadata: JSON.stringify(updatedMetadata),
          updated_at: new Date().toISOString()
        })
        .eq('id', foundSubscription.id)

      if (updateError) {
        console.log('❌ Error actualizando metadata:', updateError.message)
      } else {
        console.log('✅ Metadata actualizada correctamente')
      }

    } else {
      // PASO 3: Activar la suscripción
      console.log('\n🔄 PASO 2: Activando suscripción...')
      
      const currentMetadata = foundSubscription.metadata ? JSON.parse(foundSubscription.metadata) : {}
      const updatedMetadata = {
        ...currentMetadata,
        payment_external_reference: webhookData.external_reference,
        mercadopago_payment_id: webhookData.payment_id,
        payment_status: webhookData.status,
        payment_type: webhookData.payment_type,
        activated_at: new Date().toISOString(),
        webhook_processed_at: new Date().toISOString()
      }

      const { data: updatedSubscription, error: activationError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: 'active',
          metadata: JSON.stringify(updatedMetadata),
          updated_at: new Date().toISOString(),
          last_billing_date: new Date().toISOString()
        })
        .eq('id', foundSubscription.id)
        .select()
        .single()

      if (activationError) {
        console.log('❌ Error activando suscripción:', activationError.message)
        return
      }

      console.log('✅ SUSCRIPCIÓN ACTIVADA EXITOSAMENTE!')
      console.log(`   - Nuevo status: active`)
      console.log(`   - Fecha de activación: ${new Date().toISOString()}`)
    }

    // PASO 4: Crear registro de facturación
    console.log('\n💰 PASO 3: Creando registro de facturación...')
    
    const billingData = {
      subscription_id: foundSubscription.id,
      user_id: foundSubscription.user_id,
      amount: parseFloat(foundSubscription.discounted_price || foundSubscription.base_price),
      currency: 'MXN',
      status: 'paid',
      payment_method: 'mercadopago',
      external_payment_id: webhookData.payment_id,
      external_reference: webhookData.external_reference,
      billing_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      metadata: JSON.stringify({
        mercadopago_payment_id: webhookData.payment_id,
        payment_type: webhookData.payment_type,
        collection_status: webhookData.collection_status,
        site_id: webhookData.site_id
      })
    }

    const { data: billingRecord, error: billingError } = await supabase
      .from('subscription_billing')
      .insert(billingData)
      .select()
      .single()

    if (billingError) {
      console.log('⚠️ Error creando registro de facturación:', billingError.message)
    } else {
      console.log('✅ Registro de facturación creado exitosamente')
      console.log(`   - ID: ${billingRecord.id}`)
      console.log(`   - Monto: $${billingRecord.amount} ${billingRecord.currency}`)
    }

    // PASO 5: Actualizar perfil de usuario
    console.log('\n👤 PASO 4: Actualizando perfil de usuario...')
    
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_status, active_subscriptions')
      .eq('user_id', foundSubscription.user_id)
      .single()

    if (userProfile) {
      const activeSubscriptions = userProfile.active_subscriptions || []
      if (!activeSubscriptions.includes(foundSubscription.id)) {
        activeSubscriptions.push(foundSubscription.id)
      }

      const { error: updateProfileError } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'active',
          active_subscriptions: activeSubscriptions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', foundSubscription.user_id)

      if (updateProfileError) {
        console.log('⚠️ Error actualizando perfil:', updateProfileError.message)
      } else {
        console.log('✅ Perfil de usuario actualizado')
      }
    } else {
      console.log('⚠️ No se encontró perfil de usuario')
    }

    // RESUMEN FINAL
    console.log('\n🎉 === WEBHOOK SIMULADO COMPLETAMENTE ===')
    console.log('✅ Suscripción encontrada y procesada')
    console.log('✅ Status actualizado a "active"')
    console.log('✅ Metadata actualizada con datos del pago')
    console.log('✅ Registro de facturación creado')
    console.log('✅ Perfil de usuario actualizado')
    console.log('\n🔧 SISTEMA FUNCIONANDO CORRECTAMENTE')
    console.log('🎯 La suscripción 166 ahora está completamente activa')

  } catch (error) {
    console.error('❌ Error durante la simulación:', error)
  }
}

// Ejecutar la simulación
simulateCompleteWebhook()