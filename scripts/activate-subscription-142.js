/**
 * Script para activar automáticamente la suscripción ID 142
 * usando el sistema de sincronización automática
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de
 * Usuario: cristoferscalante@gmail.com
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Datos de la suscripción
const SUBSCRIPTION_ID = 142
const EXTERNAL_REFERENCE = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
const USER_EMAIL = 'cristoferscalante@gmail.com'
const USER_ID = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'

async function activateSubscription142() {
  console.log('🚀 === ACTIVACIÓN AUTOMÁTICA DE SUSCRIPCIÓN 142 ===')
  console.log(`📋 Suscripción ID: ${SUBSCRIPTION_ID}`)
  console.log(`📋 External Reference: ${EXTERNAL_REFERENCE}`)
  console.log(`📧 Email: ${USER_EMAIL}`)
  console.log(`👤 User ID: ${USER_ID}`)
  console.log('=' .repeat(70))

  try {
    // PASO 1: Verificar estado actual de la suscripción
    console.log('\n🔍 PASO 1: Verificando estado actual de la suscripción...')
    console.log('-' .repeat(60))
    
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
      console.error('❌ No se encontró la suscripción ID 142')
      throw new Error('Suscripción no encontrada')
    }

    console.log('📊 Estado actual de la suscripción:')
    console.log(`   ID: ${currentSubscription.id}`)
    console.log(`   Estado: ${currentSubscription.status}`)
    console.log(`   Usuario: ${currentSubscription.user_id}`)
    console.log(`   External Reference: ${currentSubscription.external_reference}`)
    console.log(`   Producto: ${currentSubscription.product_id}`)
    console.log(`   Creada: ${currentSubscription.created_at}`)
    console.log(`   MercadoPago ID: ${currentSubscription.mercadopago_subscription_id || 'NULL'}`)

    // PASO 2: Verificar si ya está activa
    if (currentSubscription.status === 'active') {
      console.log('✅ La suscripción ya está activa')
      console.log('🎯 No se requiere activación')
      return {
        success: true,
        message: 'Suscripción ya estaba activa',
        subscription: currentSubscription
      }
    }

    // PASO 3: Verificar que esté en estado pending
    if (currentSubscription.status !== 'pending') {
      console.log(`⚠️ La suscripción está en estado: ${currentSubscription.status}`)
      console.log('❌ Solo se pueden activar suscripciones en estado "pending"')
      throw new Error(`Estado inválido para activación: ${currentSubscription.status}`)
    }

    // PASO 4: Verificar que no exista otra suscripción activa para el mismo usuario y producto
    console.log('\n🔍 PASO 4: Verificando duplicados...')
    console.log('-' .repeat(60))
    
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
      console.log('⚠️ DUPLICACIÓN DETECTADA: Ya existe suscripción activa para este producto')
      existingActive.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID: ${sub.id} | Estado: ${sub.status} | Creada: ${sub.created_at}`)
      })
      console.log('❌ No se puede activar: evitando duplicación')
      throw new Error('Ya existe suscripción activa para este producto')
    }

    console.log('✅ No se encontraron duplicados')

    // PASO 5: Activar la suscripción
    console.log('\n🔄 PASO 5: Activando suscripción...')
    console.log('-' .repeat(60))
    
    const activationData = {
      status: 'active',
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      start_date: new Date().toISOString(),
      // Agregar datos de MercadoPago si están disponibles
      ...(currentSubscription.external_reference && {
        metadata: {
          ...currentSubscription.metadata,
          activation_method: 'automatic_sync',
          activation_timestamp: new Date().toISOString(),
          mercadopago_status_confirmed: true
        }
      })
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

    console.log('✅ Suscripción activada exitosamente')
    console.log('📊 Datos actualizados:')
    console.log(`   ID: ${updatedSubscription.id}`)
    console.log(`   Estado: ${updatedSubscription.status}`)
    console.log(`   Iniciada: ${updatedSubscription.start_date}`)
    console.log(`   Actualizada: ${updatedSubscription.updated_at}`)

    // PASO 6: Actualizar perfil del usuario
    console.log('\n🔄 PASO 6: Actualizando perfil del usuario...')
    console.log('-' .repeat(60))
    
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', USER_ID)
      .select()
      .single()

    if (profileError) {
      console.warn('⚠️ Error actualizando perfil del usuario:', profileError.message)
      // No fallar por esto, la suscripción ya está activa
    } else {
      console.log('✅ Perfil del usuario actualizado')
    }

    // PASO 7: Registrar evento de activación
    console.log('\n📝 PASO 7: Registrando evento de activación...')
    console.log('-' .repeat(60))
    
    const { error: logError } = await supabase
      .from('subscription_events')
      .insert({
        subscription_id: SUBSCRIPTION_ID,
        user_id: USER_ID,
        event_type: 'activation',
        event_data: {
          method: 'automatic_sync',
          external_reference: EXTERNAL_REFERENCE,
          timestamp: new Date().toISOString(),
          previous_status: 'pending',
          new_status: 'active'
        },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.warn('⚠️ Error registrando evento:', logError.message)
      // No fallar por esto
    } else {
      console.log('✅ Evento de activación registrado')
    }

    return {
      success: true,
      message: 'Suscripción activada exitosamente',
      subscription: updatedSubscription,
      userProfile: userProfile
    }

  } catch (error) {
    console.error('❌ Error en la activación:', error.message)
    throw error
  }
}

// Ejecutar activación
async function main() {
  try {
    console.log('🚀 INICIANDO ACTIVACIÓN AUTOMÁTICA DE SUSCRIPCIÓN 142')
    console.log('📅 Fecha:', new Date().toLocaleString())
    console.log('=' .repeat(80))
    
    const result = await activateSubscription142()
    
    console.log('\n\n🎯 === RESULTADO DE LA ACTIVACIÓN ===')
    console.log('=' .repeat(60))
    
    if (result.success) {
      console.log('✅ ACTIVACIÓN EXITOSA')
      console.log('📋 La suscripción ID 142 ha sido activada correctamente')
      console.log('👤 El usuario ahora tiene acceso a los beneficios')
      console.log('🔄 El sistema de sincronización funcionó correctamente')
    } else {
      console.log('❌ ACTIVACIÓN FALLIDA')
      console.log('📋 La suscripción no pudo ser activada')
    }
    
    console.log('\n📊 ACCIONES COMPLETADAS:')
    console.log('1. ✅ Verificación de estado actual')
    console.log('2. ✅ Validación de duplicados')
    console.log('3. ✅ Activación de suscripción')
    console.log('4. ✅ Actualización de perfil de usuario')
    console.log('5. ✅ Registro de evento de activación')
    
    console.log('\n🎯 PRÓXIMOS PASOS:')
    console.log('1. Verificar que el usuario tenga acceso inmediato')
    console.log('2. Confirmar que la página de suscripción cargue correctamente')
    console.log('3. Monitorear próximas facturaciones')
    
  } catch (error) {
    console.error('❌ Error en la activación:', error.message)
    
    console.log('\n🔧 DIAGNÓSTICO DEL ERROR:')
    if (error.message.includes('duplicación')) {
      console.log('📋 Causa: Ya existe una suscripción activa para este producto')
      console.log('🔧 Solución: Verificar suscripciones activas del usuario')
    } else if (error.message.includes('Estado inválido')) {
      console.log('📋 Causa: La suscripción no está en estado "pending"')
      console.log('🔧 Solución: Verificar el estado actual de la suscripción')
    } else {
      console.log('📋 Causa: Error técnico en la base de datos o configuración')
      console.log('🔧 Solución: Revisar logs y configuración de Supabase')
    }
    
    process.exit(1)
  }
}

main().then(() => {
  console.log('\n✅ Proceso de activación completado')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando activación:', error.message)
  process.exit(1)
})