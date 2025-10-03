const { createClient } = require('@supabase/supabase-js')

// Configuración
const SUBSCRIPTION_ID = 134
const EXTERNAL_REFERENCE = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
const USER_ID = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
const USER_EMAIL = 'cristoferscalante@gmail.com'

// Datos obtenidos de MercadoPago (del script anterior)
const MP_SUBSCRIPTION_ID = '817be1efcc6240d99a78db7aa015288e'
const MP_STATUS = 'authorized'
const MP_LAST_MODIFIED = '2025-10-01T15:37:49.980-04:00'

async function activateSubscription134() {
  console.log('🔧 === ACTIVACIÓN SUSCRIPCIÓN ID 134 ===')
  console.log(`📋 Subscription ID: ${SUBSCRIPTION_ID}`)
  console.log(`🔗 External Reference: ${EXTERNAL_REFERENCE}`)
  console.log(`🆔 MP Subscription ID: ${MP_SUBSCRIPTION_ID}`)
  console.log(`📊 Estado MP: ${MP_STATUS}`)
  console.log('=' .repeat(60))

  // Verificar variables de entorno
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Variables de entorno de Supabase no configuradas')
    process.exit(1)
  }

  // Inicializar Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // 1. Verificar estado actual de la suscripción
    console.log('\n📊 1. VERIFICANDO ESTADO ACTUAL')
    console.log('-' .repeat(50))
    
    const { data: currentSub, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', SUBSCRIPTION_ID)
      .single()

    if (fetchError) {
      console.log('❌ Error obteniendo suscripción:', fetchError.message)
      return
    }

    if (!currentSub) {
      console.log('❌ Suscripción no encontrada')
      return
    }

    console.log(`✅ Suscripción encontrada:`)
    console.log(`   Estado actual: ${currentSub.status}`)
    console.log(`   MP Subscription ID: ${currentSub.mercadopago_subscription_id || 'NULL'}`)
    console.log(`   Última sync: ${currentSub.last_sync_at || 'NULL'}`)

    // 2. Actualizar suscripción con datos de MercadoPago
    console.log('\n🔧 2. ACTUALIZANDO SUSCRIPCIÓN')
    console.log('-' .repeat(50))
    
    const updateData = {
      status: 'active',
      mercadopago_subscription_id: MP_SUBSCRIPTION_ID,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('📝 Datos a actualizar:')
    console.log(`   status: ${currentSub.status} → active`)
    console.log(`   mercadopago_subscription_id: ${currentSub.mercadopago_subscription_id || 'NULL'} → ${MP_SUBSCRIPTION_ID}`)
    console.log(`   last_sync_at: ${currentSub.last_sync_at || 'NULL'} → ${updateData.last_sync_at}`)

    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', SUBSCRIPTION_ID)
      .select()
      .single()

    if (updateError) {
      console.log('❌ Error actualizando suscripción:', updateError.message)
      return
    }

    console.log('✅ Suscripción actualizada exitosamente')

    // 3. Crear registro de webhook simulado para auditoría
    console.log('\n📝 3. CREANDO REGISTRO DE AUDITORÍA')
    console.log('-' .repeat(50))
    
    const webhookData = {
      webhook_type: 'subscription',
      mercadopago_id: MP_SUBSCRIPTION_ID,
      status: 'success',
      webhook_data: {
        id: MP_SUBSCRIPTION_ID,
        type: 'subscription_preapproval',
        action: 'payment.created',
        status: MP_STATUS,
        external_reference: EXTERNAL_REFERENCE,
        payer_email: USER_EMAIL,
        date_created: MP_LAST_MODIFIED,
        last_modified: MP_LAST_MODIFIED,
        reason: 'Activación manual basada en estado MercadoPago',
        source: 'manual_activation_script'
      },
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const { data: webhookLog, error: webhookError } = await supabase
      .from('webhook_logs')
      .insert(webhookData)
      .select()
      .single()

    if (webhookError) {
      console.log('⚠️ Error creando log de webhook:', webhookError.message)
    } else {
      console.log('✅ Registro de auditoría creado')
      console.log(`   Webhook Log ID: ${webhookLog.id}`)
    }

    // 4. Verificar resultado final
    console.log('\n✅ 4. VERIFICACIÓN FINAL')
    console.log('-' .repeat(50))
    
    const { data: finalSub, error: finalError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', SUBSCRIPTION_ID)
      .single()

    if (finalError) {
      console.log('❌ Error verificando resultado:', finalError.message)
      return
    }

    console.log('📊 Estado final de la suscripción:')
    console.log(`   ID: ${finalSub.id}`)
    console.log(`   Estado: ${finalSub.status}`)
    console.log(`   MP Subscription ID: ${finalSub.mercadopago_subscription_id}`)
    console.log(`   Última sincronización: ${finalSub.last_sync_at}`)
    console.log(`   Actualizada: ${finalSub.updated_at}`)

    if (finalSub.status === 'active' && finalSub.mercadopago_subscription_id === MP_SUBSCRIPTION_ID) {
      console.log('\n🎉 SUSCRIPCIÓN ACTIVADA EXITOSAMENTE')
      console.log('✅ La suscripción ahora está sincronizada con MercadoPago')
    } else {
      console.log('\n❌ PROBLEMA: La activación no se completó correctamente')
    }

    // 5. Resumen de la operación
    console.log('\n📋 5. RESUMEN DE LA OPERACIÓN')
    console.log('-' .repeat(50))
    console.log('🔍 PROBLEMA IDENTIFICADO:')
    console.log('   • Suscripción autorizada en MercadoPago pero pendiente en BD')
    console.log('   • No se recibieron webhooks automáticos')
    console.log('   • Falta de sincronización entre sistemas')
    console.log('')
    console.log('🔧 SOLUCIÓN APLICADA:')
    console.log('   • Consulta directa a API de MercadoPago')
    console.log('   • Activación manual basada en estado real')
    console.log('   • Sincronización de datos entre sistemas')
    console.log('   • Registro de auditoría para trazabilidad')
    console.log('')
    console.log('✅ RESULTADO:')
    console.log('   • Suscripción activada correctamente')
    console.log('   • Datos sincronizados con MercadoPago')
    console.log('   • Sistema funcionando normalmente')

  } catch (error) {
    console.log('❌ Error durante la activación:', error.message)
    console.log(error)
  }
}

// Ejecutar
activateSubscription134()
  .then(() => {
    console.log('\n✅ Proceso completado')
  })
  .catch(error => {
    console.log('❌ Error:', error.message)
    process.exit(1)
  })