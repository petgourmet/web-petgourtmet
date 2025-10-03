const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function activateSubscription166() {
  console.log('🚀 === ACTIVACIÓN DIRECTA DE SUSCRIPCIÓN 166 ===')
  console.log('📋 PROBLEMA IDENTIFICADO:')
  console.log('   - Suscripción External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de')
  console.log('   - Pago External Reference: 45321cfb460f4267ab42f48b25065022')
  console.log('   - El webhook no puede encontrar la suscripción por diferencia en external_reference')
  console.log('=' .repeat(80))

  try {
    // 1. Activar directamente por ID de suscripción
    console.log('\n🔄 1. ACTIVANDO SUSCRIPCIÓN DIRECTAMENTE POR ID...')
    
    const activationData = {
      status: 'active',
      charges_made: 1,
      last_billing_date: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      metadata: JSON.stringify({
        'Manual Activation': true,
        'Payment ID': '128488428512',
        'Collection ID': '128488428512',
        'Payment External Reference': '45321cfb460f4267ab42f48b25065022',
        'Activated At': new Date().toISOString(),
        'Activation Reason': 'Manual activation - external_reference mismatch resolved'
      })
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(activationData)
      .eq('id', 166)
      .select()

    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError)
      return
    }

    if (updatedSub && updatedSub.length > 0) {
      console.log('✅ Suscripción activada exitosamente!')
      console.log(`   - ID: ${updatedSub[0].id}`)
      console.log(`   - Status: ${updatedSub[0].status}`)
      console.log(`   - Charges made: ${updatedSub[0].charges_made}`)
    }

    // 2. Crear registro de facturación
    console.log('\n💳 2. CREANDO REGISTRO DE FACTURACIÓN...')
    const billingData = {
      subscription_id: 166,
      user_id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
      amount: 36.45,
      currency: 'MXN',
      status: 'paid',
      payment_method: 'mercadopago',
      external_reference: '45321cfb460f4267ab42f48b25065022',
      mercadopago_payment_id: '128488428512',
      mercadopago_collection_id: '128488428512',
      billing_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      metadata: JSON.stringify({
        'Payment ID': '128488428512',
        'Collection ID': '128488428512',
        'Amount': 36.45,
        'Status': 'approved',
        'MercadoPago Payment ID': '128488428512',
        'Manual Entry': true,
        'Created From': 'direct_activation_script'
      })
    }

    const { data: billingRecord, error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert(billingData)
      .select()

    if (billingError) {
      console.error('❌ Error creando registro de facturación:', billingError)
    } else if (billingRecord && billingRecord.length > 0) {
      console.log('✅ Registro de facturación creado!')
      console.log(`   - Billing ID: ${billingRecord[0].id}`)
      console.log(`   - Amount: ${billingRecord[0].amount} ${billingRecord[0].currency}`)
    }

    // 3. Actualizar perfil del usuario
    console.log('\n👤 3. ACTUALIZANDO PERFIL DEL USUARIO...')
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .update({
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', '2f4ec8c0-0e58-486d-9c11-a652368f7c19')
      .select()

    if (profileError) {
      console.error('❌ Error actualizando perfil:', profileError)
    } else if (userProfile && userProfile.length > 0) {
      console.log('✅ Perfil actualizado!')
      console.log(`   - Has active subscription: ${userProfile[0].has_active_subscription}`)
    }

    // 4. Verificación final
    console.log('\n🔍 4. VERIFICACIÓN FINAL...')
    const { data: finalCheck, error: checkError } = await supabase
      .from('unified_subscriptions')
      .select('id, status, charges_made, last_billing_date, next_billing_date')
      .eq('id', 166)

    if (checkError) {
      console.error('❌ Error en verificación:', checkError)
    } else if (finalCheck && finalCheck.length > 0) {
      const sub = finalCheck[0]
      console.log('📊 Estado final:')
      console.log(`   - ID: ${sub.id}`)
      console.log(`   - Status: ${sub.status}`)
      console.log(`   - Charges Made: ${sub.charges_made}`)
      console.log(`   - Last Billing: ${sub.last_billing_date}`)
      console.log(`   - Next Billing: ${sub.next_billing_date}`)
    }

    console.log('\n🎉 === ACTIVACIÓN COMPLETADA ===')
    console.log('✅ Suscripción 166 activada manualmente')
    console.log('✅ Problema de external_reference resuelto')

  } catch (error) {
    console.error('❌ Error durante la activación:', error)
  }
}

// Ejecutar
activateSubscription166().catch(console.error)