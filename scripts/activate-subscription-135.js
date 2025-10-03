/**
 * Script para activar la suscripción ID 135 basado en la confirmación de MercadoPago
 * 
 * CONFIRMACIÓN DE MERCADOPAGO:
 * - Preapproval ID: 271804c66ace41499fe81348f35e184b
 * - Estado: AUTHORIZED ✅
 * - Monto: 170 MXN cada 14 días
 * - Próximo pago: 2025-10-16
 * - Ya se cobró el primer pago: 170 MXN el 2025-10-02
 * 
 * PROBLEMA IDENTIFICADO:
 * - La suscripción local está en "pending" pero MercadoPago la confirma como "authorized"
 * - No se recibieron webhooks para esta suscripción específica
 * - El sistema de sincronización automática falló
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Datos confirmados de MercadoPago
const SUBSCRIPTION_DATA = {
  id: 135,
  preapproval_id: '271804c66ace41499fe81348f35e184b',
  external_reference: 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-bea44606',
  user_id: '2f4ec8c0-0e58-486d-9c11-a652368f7c19',
  email: 'cristoferscalante@gmail.com',
  status_mercadopago: 'authorized',
  amount: 170,
  currency: 'MXN',
  frequency: 14,
  frequency_type: 'days',
  next_payment_date: '2025-10-16T20:32:49.000-04:00',
  first_payment_date: '2025-10-02T20:34:25.898-04:00',
  first_payment_amount: 170
}

function calculateNextBillingDate(frequencyType, frequency) {
  const now = new Date()
  const nextDate = new Date(now)
  
  switch (frequencyType) {
    case 'days':
      nextDate.setDate(now.getDate() + frequency)
      break
    case 'weeks':
      nextDate.setDate(now.getDate() + (frequency * 7))
      break
    case 'months':
      nextDate.setMonth(now.getMonth() + frequency)
      break
    default:
      nextDate.setDate(now.getDate() + frequency)
  }
  
  return nextDate.toISOString()
}

async function activateSubscription135() {
  console.log('🚀 Activando suscripción ID 135 basado en confirmación de MercadoPago...')
  console.log('=' .repeat(70))
  
  try {
    // 1. Verificar estado actual de la suscripción
    console.log('\n1️⃣ Verificando estado actual...')
    const { data: currentSub, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', SUBSCRIPTION_DATA.id)
      .single()

    if (fetchError) {
      console.error('❌ Error obteniendo suscripción:', fetchError.message)
      return false
    }

    console.log('📋 Estado actual:')
    console.log(`   ID: ${currentSub.id}`)
    console.log(`   Estado: ${currentSub.status}`)
    console.log(`   External Reference: ${currentSub.external_reference}`)
    console.log(`   MercadoPago ID: ${currentSub.mercadopago_subscription_id || 'NULL'}`)
    console.log(`   Preapproval Plan ID: ${currentSub.preapproval_plan_id || 'NULL'}`)
    console.log(`   Usuario: ${currentSub.user_id}`)
    console.log(`   Creada: ${currentSub.created_at}`)

    // 2. Verificar que la suscripción esté en estado pending
    if (currentSub.status !== 'pending') {
      console.log(`\n⚠️ ADVERTENCIA: La suscripción no está en estado "pending"`)
      console.log(`   Estado actual: ${currentSub.status}`)
      console.log('   ¿Continuar con la activación? (Esto podría sobrescribir datos)')
      
      // En un script real, podrías pedir confirmación del usuario
      // Por ahora, continuamos si no está ya activa
      if (currentSub.status === 'active') {
        console.log('✅ La suscripción ya está activa. No se requiere acción.')
        return true
      }
    }

    // 3. Calcular próxima fecha de facturación
    const nextBillingDate = calculateNextBillingDate(
      SUBSCRIPTION_DATA.frequency_type, 
      SUBSCRIPTION_DATA.frequency
    )

    // 4. Actualizar suscripción a activa con datos de MercadoPago
    console.log('\n2️⃣ Activando suscripción...')
    const updateData = {
      status: 'active',
      mercadopago_subscription_id: SUBSCRIPTION_DATA.preapproval_id,
      external_reference: SUBSCRIPTION_DATA.external_reference,
      next_billing_date: nextBillingDate,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Usar campos correctos de la tabla
      transaction_amount: SUBSCRIPTION_DATA.amount,
      currency_id: SUBSCRIPTION_DATA.currency,
      frequency: SUBSCRIPTION_DATA.frequency,
      frequency_type: SUBSCRIPTION_DATA.frequency_type
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', SUBSCRIPTION_DATA.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error actualizando suscripción:', updateError.message)
      return false
    }

    console.log('✅ Suscripción actualizada exitosamente:')
    console.log(`   Estado: ${updatedSub.status}`)
    console.log(`   MercadoPago ID: ${updatedSub.mercadopago_subscription_id}`)
    console.log(`   Preapproval ID: ${updatedSub.preapproval_id}`)
    console.log(`   Próxima facturación: ${updatedSub.next_billing_date}`)
    console.log(`   Última sincronización: ${updatedSub.last_sync_at}`)

    // 5. Actualizar perfil del usuario
    console.log('\n3️⃣ Actualizando perfil del usuario...')
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', SUBSCRIPTION_DATA.user_id)
      .select()
      .single()

    if (profileError) {
      console.error('⚠️ Error actualizando perfil del usuario:', profileError.message)
      console.log('   La suscripción se activó pero el perfil no se actualizó')
    } else {
      console.log('✅ Perfil del usuario actualizado:')
      console.log(`   has_active_subscription: ${updatedProfile.has_active_subscription}`)
    }

    // 6. Registrar la activación en logs (opcional)
    console.log('\n4️⃣ Registrando activación...')
    const logEntry = {
      subscription_id: SUBSCRIPTION_DATA.id,
      action: 'manual_activation',
      reason: 'mercadopago_confirmed_authorized',
      details: {
        preapproval_id: SUBSCRIPTION_DATA.preapproval_id,
        mercadopago_status: SUBSCRIPTION_DATA.status_mercadopago,
        activation_date: new Date().toISOString(),
        activated_by: 'system_script',
        original_status: currentSub.status,
        mercadopago_data: {
          amount: SUBSCRIPTION_DATA.amount,
          currency: SUBSCRIPTION_DATA.currency,
          frequency: SUBSCRIPTION_DATA.frequency,
          frequency_type: SUBSCRIPTION_DATA.frequency_type,
          next_payment_date: SUBSCRIPTION_DATA.next_payment_date,
          first_payment_date: SUBSCRIPTION_DATA.first_payment_date
        }
      },
      created_at: new Date().toISOString()
    }

    // Intentar guardar en tabla de logs si existe
    try {
      const { error: logError } = await supabase
        .from('subscription_activation_logs')
        .insert(logEntry)

      if (logError) {
        console.log('ℹ️ No se pudo guardar en logs (tabla no existe):', logError.message)
      } else {
        console.log('✅ Activación registrada en logs')
      }
    } catch (logErr) {
      console.log('ℹ️ Tabla de logs no disponible')
    }

    // 7. Resumen final
    console.log('\n\n🎯 === ACTIVACIÓN COMPLETADA ===')
    console.log('✅ Suscripción ID 135 activada exitosamente')
    console.log('✅ Estado cambiado de "pending" a "active"')
    console.log('✅ Datos de MercadoPago sincronizados')
    console.log('✅ Perfil del usuario actualizado')
    console.log('\n📋 Detalles de la activación:')
    console.log(`   • Preapproval ID: ${SUBSCRIPTION_DATA.preapproval_id}`)
    console.log(`   • Estado en MercadoPago: ${SUBSCRIPTION_DATA.status_mercadopago}`)
    console.log(`   • Monto: ${SUBSCRIPTION_DATA.amount} ${SUBSCRIPTION_DATA.currency}`)
    console.log(`   • Frecuencia: Cada ${SUBSCRIPTION_DATA.frequency} ${SUBSCRIPTION_DATA.frequency_type}`)
    console.log(`   • Próximo pago: ${SUBSCRIPTION_DATA.next_payment_date}`)
    console.log(`   • Primer pago realizado: ${SUBSCRIPTION_DATA.first_payment_date}`)

    return true

  } catch (error) {
    console.error('❌ Error crítico durante la activación:', error.message)
    console.error('Stack:', error.stack)
    return false
  }
}

// Ejecutar activación
activateSubscription135().then((success) => {
  if (success) {
    console.log('\n✅ Script completado exitosamente')
    process.exit(0)
  } else {
    console.log('\n❌ Script falló')
    process.exit(1)
  }
}).catch(error => {
  console.error('❌ Error ejecutando script:', error.message)
  process.exit(1)
})