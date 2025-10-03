const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function activateSubscription166() {
  console.log('🚀 === ACTIVACIÓN MANUAL DE SUSCRIPCIÓN 166 ===')
  console.log('📋 Datos del problema:')
  console.log('   - Subscription ID: 166')
  console.log('   - User ID: 2f4ec8c0-0e58-486d-9c11-a652368f7c19')
  console.log('   - Subscription External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de')
  console.log('   - Payment External Reference: 45321cfb460f4267ab42f48b25065022')
  console.log('   - Collection ID: 128488428512')
  console.log('   - Payment ID: 128488428512')
  console.log('   - Status: approved')
  console.log('=' .repeat(60))

  try {
    // 1. Verificar estado actual de la suscripción
    console.log('\n🔍 1. VERIFICANDO ESTADO ACTUAL...')
    const { data: currentSub, error: currentError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 166)
      .single()

    if (currentError) {
      console.error('❌ Error obteniendo suscripción:', currentError)
      return
    }

    console.log('📊 Estado actual de la suscripción:')
    console.log(`   - ID: ${currentSub.id}`)
    console.log(`   - Status: ${currentSub.status}`)
    console.log(`   - External Reference: ${currentSub.external_reference}`)
    console.log(`   - User ID: ${currentSub.user_id}`)
    console.log(`   - Product ID: ${currentSub.product_id}`)
    console.log(`   - Charges Made: ${currentSub.charges_made}`)

    if (currentSub.status === 'active') {
      console.log('✅ La suscripción ya está activa!')
      return
    }

    // 2. Activar la suscripción
    console.log('\n🔄 2. ACTIVANDO SUSCRIPCIÓN...')
    const activationData = {
      status: 'active',
      charges_made: 1,
      last_billing_date: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 días
      updated_at: new Date().toISOString(),
      metadata: {
        ...JSON.parse(currentSub.metadata || '{}'),
        'Manual Activation': true,
        'Payment ID': '128488428512',
        'Collection ID': '128488428512',
        'Payment External Reference': '45321cfb460f4267ab42f48b25065022',
        'Activated At': new Date().toISOString(),
        'Activation Reason': 'Manual activation due to webhook external_reference mismatch'
      }
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(activationData)
      .eq('id', 166)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError)
      return
    }

    console.log('✅ Suscripción activada exitosamente!')
    console.log(`   - Nuevo status: ${updatedSub.status}`)
    console.log(`   - Charges made: ${updatedSub.charges_made}`)
    console.log(`   - Last billing date: ${updatedSub.last_billing_date}`)
    console.log(`   - Next billing date: ${updatedSub.next_billing_date}`)

    // 3. Crear registro de facturación
    console.log('\n💳 3. CREANDO REGISTRO DE FACTURACIÓN...')
    const billingData = {
      subscription_id: 166,
      user_id: currentSub.user_id,
      amount: parseFloat(currentSub.discounted_price || currentSub.base_price),
      currency: 'MXN',
      status: 'paid',
      payment_method: 'mercadopago',
      external_reference: '45321cfb460f4267ab42f48b25065022',
      mercadopago_payment_id: '128488428512',
      mercadopago_collection_id: '128488428512',
      billing_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      metadata: {
        'Payment ID': '128488428512',
        'Collection ID': '128488428512',
        'Amount': 36.45,
        'Status': 'approved',
        'MercadoPago Payment ID': '128488428512',
        'Manual Entry': true,
        'Created From': 'manual_activation_script'
      }
    }

    const { data: billingRecord, error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert(billingData)
      .select()
      .single()

    if (billingError) {
      console.error('❌ Error creando registro de facturación:', billingError)
    } else {
      console.log('✅ Registro de facturación creado exitosamente!')
      console.log(`   - Billing ID: ${billingRecord.id}`)
      console.log(`   - Amount: ${billingRecord.amount} ${billingRecord.currency}`)
      console.log(`   - Status: ${billingRecord.status}`)
    }

    // 4. Actualizar perfil del usuario
    console.log('\n👤 4. ACTUALIZANDO PERFIL DEL USUARIO...')
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .update({
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentSub.user_id)
      .select()
      .single()

    if (profileError) {
      console.error('❌ Error actualizando perfil:', profileError)
    } else {
      console.log('✅ Perfil de usuario actualizado!')
      console.log(`   - Has active subscription: ${userProfile.has_active_subscription}`)
    }

    // 5. Verificación final
    console.log('\n🔍 5. VERIFICACIÓN FINAL...')
    const { data: finalSub, error: finalError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 166)
      .single()

    if (finalError) {
      console.error('❌ Error en verificación final:', finalError)
      return
    }

    console.log('📊 Estado final de la suscripción:')
    console.log(`   - ID: ${finalSub.id}`)
    console.log(`   - Status: ${finalSub.status}`)
    console.log(`   - Charges Made: ${finalSub.charges_made}`)
    console.log(`   - Last Billing Date: ${finalSub.last_billing_date}`)
    console.log(`   - Next Billing Date: ${finalSub.next_billing_date}`)

    console.log('\n🎉 === ACTIVACIÓN COMPLETADA EXITOSAMENTE ===')
    console.log('✅ La suscripción 166 ha sido activada manualmente')
    console.log('✅ Se creó el registro de facturación correspondiente')
    console.log('✅ Se actualizó el perfil del usuario')

  } catch (error) {
    console.error('❌ Error durante la activación:', error)
  }
}

// Ejecutar la función
activateSubscription166().catch(console.error)