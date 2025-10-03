/**
 * ACTIVACIÓN URGENTE - Suscripción ID 144
 * Usuario: cristoferscalante@gmail.com
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Datos de la suscripción
const SUBSCRIPTION_ID = 144
const EXTERNAL_REFERENCE = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
const USER_EMAIL = 'cristoferscalante@gmail.com'
const USER_ID = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'

async function activateSubscription144() {
  console.log('🚨 === ACTIVACIÓN URGENTE - SUSCRIPCIÓN 144 ===')
  console.log(`📋 Suscripción ID: ${SUBSCRIPTION_ID}`)
  console.log(`📋 External Reference: ${EXTERNAL_REFERENCE}`)
  console.log(`📧 Email: ${USER_EMAIL}`)
  console.log(`👤 User ID: ${USER_ID}`)
  console.log('=' .repeat(70))

  try {
    // PASO 1: Verificar estado actual
    console.log('\n🔍 PASO 1: Verificando estado actual...')
    
    const { data: currentSubscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', SUBSCRIPTION_ID)
      .single()

    if (fetchError) {
      console.error('❌ Error obteniendo suscripción:', fetchError.message)
      throw fetchError
    }

    if (!currentSubscription) {
      console.error('❌ No se encontró la suscripción ID 144')
      throw new Error('Suscripción no encontrada')
    }

    console.log('📊 Estado actual:')
    console.log(`   ID: ${currentSubscription.id}`)
    console.log(`   Estado: ${currentSubscription.status}`)
    console.log(`   Usuario: ${currentSubscription.user_id}`)
    console.log(`   External Reference: ${currentSubscription.external_reference}`)
    console.log(`   Producto: ${currentSubscription.product_id}`)
    console.log(`   Creada: ${currentSubscription.created_at}`)

    // PASO 2: Verificar si ya está activa
    if (currentSubscription.status === 'active') {
      console.log('✅ La suscripción ya está activa')
      return {
        success: true,
        message: 'Suscripción ya estaba activa',
        subscription: currentSubscription
      }
    }

    // PASO 3: Verificar duplicados
    console.log('\n🔍 PASO 3: Verificando duplicados...')
    
    const { data: existingActive, error: duplicateError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('product_id', currentSubscription.product_id)
      .eq('status', 'active')

    if (duplicateError) {
      console.error('❌ Error verificando duplicados:', duplicateError.message)
      throw duplicateError
    }

    if (existingActive && existingActive.length > 0) {
      console.log('⚠️ DUPLICACIÓN DETECTADA: Ya existe suscripción activa')
      existingActive.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID: ${sub.id} | Estado: ${sub.status} | Creada: ${sub.created_at}`)
      })
      
      // En lugar de fallar, vamos a cancelar las duplicadas y activar la nueva
      console.log('🔄 Cancelando suscripciones duplicadas...')
      
      for (const duplicateSub of existingActive) {
        const { error: cancelError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reason: `Cancelada automáticamente por duplicación - Nueva suscripción ${SUBSCRIPTION_ID}`
          })
          .eq('id', duplicateSub.id)

        if (cancelError) {
          console.warn(`⚠️ Error cancelando suscripción ${duplicateSub.id}:`, cancelError.message)
        } else {
          console.log(`✅ Suscripción ${duplicateSub.id} cancelada`)
        }
      }
    } else {
      console.log('✅ No se encontraron duplicados')
    }

    // PASO 4: Activar la suscripción
    console.log('\n🔄 PASO 4: Activando suscripción...')
    
    const activationData = {
      status: 'active',
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      start_date: new Date().toISOString(),
      metadata: {
        ...currentSubscription.metadata,
        activation_method: 'urgent_manual_activation',
        activation_timestamp: new Date().toISOString(),
        activated_by: 'system_admin',
        reason: 'Activación urgente por problema de sincronización automática'
      }
    }

    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(activationData)
      .eq('id', SUBSCRIPTION_ID)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError.message)
      throw updateError
    }

    console.log('✅ SUSCRIPCIÓN ACTIVADA EXITOSAMENTE')
    console.log('📊 Datos actualizados:')
    console.log(`   ID: ${updatedSubscription.id}`)
    console.log(`   Estado: ${updatedSubscription.status}`)
    console.log(`   Iniciada: ${updatedSubscription.start_date}`)
    console.log(`   Actualizada: ${updatedSubscription.updated_at}`)

    // PASO 5: Registrar evento
    console.log('\n📝 PASO 5: Registrando evento...')
    
    const { error: logError } = await supabase
      .from('subscription_events')
      .insert({
        subscription_id: SUBSCRIPTION_ID,
        user_id: USER_ID,
        event_type: 'urgent_activation',
        event_data: {
          method: 'urgent_manual_activation',
          external_reference: EXTERNAL_REFERENCE,
          timestamp: new Date().toISOString(),
          previous_status: 'pending',
          new_status: 'active',
          reason: 'Activación urgente por problema de sincronización'
        },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.warn('⚠️ Error registrando evento:', logError.message)
    } else {
      console.log('✅ Evento registrado')
    }

    return {
      success: true,
      message: 'Suscripción activada exitosamente',
      subscription: updatedSubscription
    }

  } catch (error) {
    console.error('❌ Error en la activación:', error.message)
    throw error
  }
}

// Ejecutar activación
async function main() {
  try {
    console.log('🚨 INICIANDO ACTIVACIÓN URGENTE DE SUSCRIPCIÓN 144')
    console.log('📅 Fecha:', new Date().toLocaleString())
    console.log('=' .repeat(80))
    
    const result = await activateSubscription144()
    
    console.log('\n\n🎯 === RESULTADO DE LA ACTIVACIÓN ===')
    console.log('=' .repeat(60))
    
    if (result.success) {
      console.log('✅ ACTIVACIÓN EXITOSA')
      console.log('📋 La suscripción ID 144 ha sido activada')
      console.log('👤 El usuario cristoferscalante@gmail.com ahora tiene acceso')
      console.log('🔄 La página /suscripcion debería cargar correctamente')
    } else {
      console.log('❌ ACTIVACIÓN FALLIDA')
    }
    
    console.log('\n🎯 PRÓXIMOS PASOS:')
    console.log('1. Verificar acceso del usuario en /suscripcion')
    console.log('2. Implementar sistema automático para evitar futuros problemas')
    console.log('3. Monitorear que no haya más suscripciones pendientes')
    
  } catch (error) {
    console.error('❌ Error crítico:', error.message)
    process.exit(1)
  }
}

main().then(() => {
  console.log('\n✅ Activación completada')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando activación:', error.message)
  process.exit(1)
})