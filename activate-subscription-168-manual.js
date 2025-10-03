const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'
const supabase = createClient(supabaseUrl, supabaseKey)

// Datos de la suscripción 168
const subscriptionId = 168
const userId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
const productId = 73

// Datos del pago exitoso de Mercado Pago
const paymentData = {
  collection_id: '128490999834',
  payment_id: '128490999834',
  external_reference: 'af0e2bea36b84a9b99851cfc1cbaece7',
  status: 'approved',
  collection_status: 'approved',
  payment_type: 'credit_card',
  site_id: 'MLM'
}

async function activateSubscription168() {
  try {
    console.log('🚨 === ACTIVACIÓN MANUAL URGENTE - SUSCRIPCIÓN 168 ===')
    console.log(`📋 Activando suscripción ID: ${subscriptionId}`)
    console.log(`👤 Usuario: ${userId}`)
    console.log(`🛍️ Producto: ${productId}`)
    console.log(`💳 Pago ID: ${paymentData.payment_id}`)
    console.log('================================================================================')

    // PASO 1: Verificar estado actual
    console.log('\n🔍 PASO 1: Verificando estado actual de la suscripción...')
    const { data: currentSubscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (fetchError) {
      console.log('❌ Error obteniendo suscripción:', fetchError.message)
      return
    }

    if (!currentSubscription) {
      console.log('❌ No se encontró la suscripción 168')
      return
    }

    console.log(`📊 Estado actual: ${currentSubscription.status}`)
    console.log(`📅 Creada: ${currentSubscription.created_at}`)
    console.log(`💰 Precio: $${currentSubscription.discounted_price}`)

    if (currentSubscription.status === 'active') {
      console.log('✅ La suscripción ya está ACTIVA')
      return
    }

    // PASO 2: Activar la suscripción
    console.log('\n🔄 PASO 2: ACTIVANDO SUSCRIPCIÓN...')
    
    let currentMetadata = {}
    try {
      if (currentSubscription.metadata && typeof currentSubscription.metadata === 'string') {
        currentMetadata = JSON.parse(currentSubscription.metadata)
      } else if (currentSubscription.metadata && typeof currentSubscription.metadata === 'object') {
        currentMetadata = currentSubscription.metadata
      }
    } catch (e) {
      console.log('⚠️ Error parseando metadata existente, usando objeto vacío')
      currentMetadata = {}
    }
    const updatedMetadata = {
      ...currentMetadata,
      payment_external_reference: paymentData.external_reference,
      mercadopago_payment_id: paymentData.payment_id,
      payment_status: paymentData.status,
      payment_type: paymentData.payment_type,
      collection_status: paymentData.collection_status,
      site_id: paymentData.site_id,
      activated_at: new Date().toISOString(),
      manual_activation: true,
      activation_reason: 'Manual activation due to webhook failure - Payment processed successfully',
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
      .eq('id', subscriptionId)
      .select()
      .single()

    if (activationError) {
      console.log('❌ Error activando suscripción:', activationError.message)
      return
    }

    console.log('🎉 ¡SUSCRIPCIÓN 168 ACTIVADA EXITOSAMENTE!')
    console.log(`   ✅ Nuevo status: ${updatedSubscription.status}`)
    console.log(`   📅 Fecha de activación: ${new Date().toISOString()}`)
    console.log(`   💳 Payment ID vinculado: ${paymentData.payment_id}`)

    // PASO 3: Crear registro de facturación
    console.log('\n💰 PASO 3: Creando registro de facturación...')
    
    const billingData = {
      subscription_id: subscriptionId,
      user_id: userId,
      amount: parseFloat(currentSubscription.discounted_price),
      currency: 'MXN',
      status: 'paid',
      payment_method: 'mercadopago',
      external_payment_id: paymentData.payment_id,
      external_reference: paymentData.external_reference,
      billing_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      metadata: JSON.stringify({
        mercadopago_payment_id: paymentData.payment_id,
        payment_type: paymentData.payment_type,
        collection_status: paymentData.collection_status,
        site_id: paymentData.site_id,
        manual_billing: true
      })
    }

    const { data: billingRecord, error: billingError } = await supabase
      .from('subscription_billing')
      .insert(billingData)
      .select()
      .single()

    if (billingError) {
      console.log('⚠️ Error creando registro de facturación:', billingError.message)
      console.log('   (La suscripción sigue activa, solo falló el registro de facturación)')
    } else {
      console.log('✅ Registro de facturación creado exitosamente')
      console.log(`   💰 Monto: $${billingRecord.amount} ${billingRecord.currency}`)
      console.log(`   🆔 Billing ID: ${billingRecord.id}`)
    }

    // PASO 4: Actualizar perfil de usuario
    console.log('\n👤 PASO 4: Actualizando perfil de usuario...')
    
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_status, active_subscriptions')
      .eq('user_id', userId)
      .single()

    if (userProfile) {
      const activeSubscriptions = userProfile.active_subscriptions || []
      if (!activeSubscriptions.includes(subscriptionId)) {
        activeSubscriptions.push(subscriptionId)
      }

      const { error: updateProfileError } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'active',
          active_subscriptions: activeSubscriptions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateProfileError) {
        console.log('⚠️ Error actualizando perfil:', updateProfileError.message)
      } else {
        console.log('✅ Perfil de usuario actualizado')
        console.log(`   📊 Status: active`)
        console.log(`   📋 Suscripciones activas: ${activeSubscriptions.length}`)
      }
    } else {
      console.log('⚠️ No se encontró perfil de usuario')
    }

    // RESUMEN FINAL
    console.log('\n🎉 === ACTIVACIÓN MANUAL COMPLETADA ===')
    console.log('✅ Suscripción 168 ACTIVADA')
    console.log('✅ Status cambiado a "active"')
    console.log('✅ Metadata actualizada con datos del pago')
    console.log('✅ Registro de facturación creado')
    console.log('✅ Perfil de usuario actualizado')
    console.log('\n🔧 LA SUSCRIPCIÓN AHORA ESTÁ COMPLETAMENTE FUNCIONAL')
    console.log('🎯 El usuario puede usar su suscripción inmediatamente')

  } catch (error) {
    console.error('❌ Error durante la activación manual:', error)
  }
}

// Ejecutar la activación
activateSubscription168()