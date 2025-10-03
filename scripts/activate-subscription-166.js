#!/usr/bin/env node

/**
 * Script URGENTE para activar la suscripción ID 166 que está en pending
 * a pesar de que el pago fue procesado exitosamente en Mercado Pago
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function activateSubscription166() {
  console.log('🚨 ACTIVACIÓN URGENTE DE SUSCRIPCIÓN 166')
  console.log('================================================================================')
  
  const subscriptionId = 166
  const userId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  const externalReference = 'SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de'
  
  console.log('📋 DATOS DE LA SUSCRIPCIÓN:')
  console.log(`   - ID: ${subscriptionId}`)
  console.log(`   - User ID: ${userId}`)
  console.log(`   - External Reference: ${externalReference}`)
  console.log(`   - Email: cristoferscalante@gmail.com`)
  
  console.log('\n💳 DATOS DEL PAGO EXITOSO:')
  console.log('   - Collection ID: 128488428512')
  console.log('   - Payment ID: 128488428512')
  console.log('   - External Reference: 45321cfb460f4267ab42f48b25065022')
  console.log('   - Status: approved')

  try {
    console.log('\n1️⃣ VERIFICANDO ESTADO ACTUAL DE LA SUSCRIPCIÓN')
    console.log('--------------------------------------------------')
    
    const { data: currentSub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (fetchError) {
      console.error('❌ Error obteniendo suscripción:', fetchError.message)
      return
    }

    console.log(`📊 Estado actual: ${currentSub.status}`)
    console.log(`📅 Creada: ${currentSub.created_at}`)
    console.log(`📅 Actualizada: ${currentSub.updated_at}`)

    if (currentSub.status === 'active') {
      console.log('✅ La suscripción ya está activa')
      return
    }

    console.log('\n2️⃣ ACTIVANDO SUSCRIPCIÓN INMEDIATAMENTE')
    console.log('--------------------------------------------------')
    
    const updateData = {
      status: 'active',
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      // Agregar datos del pago exitoso
      mercadopago_subscription_id: '128488428512',
      charges_made: 1,
      last_billing_date: new Date().toISOString(),
      metadata: JSON.stringify({
        ...JSON.parse(currentSub.metadata || '{}'),
        payment_confirmed: true,
        collection_id: '128488428512',
        payment_id: '128488428512',
        payment_external_reference: '45321cfb460f4267ab42f48b25065022',
        activated_manually: true,
        activation_timestamp: new Date().toISOString(),
        activation_reason: 'Manual activation - payment was successful but webhook failed'
      })
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError.message)
      return
    }

    console.log('✅ SUSCRIPCIÓN ACTIVADA EXITOSAMENTE')
    console.log(`📊 Nuevo estado: ${updatedSub.status}`)
    console.log(`📅 Actualizada: ${updatedSub.updated_at}`)
    console.log(`🔄 Última sincronización: ${updatedSub.last_sync_at}`)

    console.log('\n3️⃣ REGISTRANDO LOG DE ACTIVACIÓN')
    console.log('--------------------------------------------------')
    
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'manual_activation',
        status: 'success',
        data: JSON.stringify({
          subscription_id: subscriptionId,
          user_id: userId,
          external_reference: externalReference,
          collection_id: '128488428512',
          payment_id: '128488428512',
          payment_external_reference: '45321cfb460f4267ab42f48b25065022',
          action: 'subscription_activated_manually',
          reason: 'Payment was successful but automatic webhook activation failed'
        }),
        processed_at: new Date().toISOString(),
        trigger: 'manual_activation_script'
      })

    if (logError) {
      console.warn('⚠️ Error registrando log:', logError.message)
    } else {
      console.log('✅ Log de activación registrado')
    }

    console.log('\n🎉 ACTIVACIÓN COMPLETADA')
    console.log('================================================================================')
    console.log('✅ La suscripción 166 ha sido activada exitosamente')
    console.log('✅ El usuario cristoferscalante@gmail.com ya puede usar su suscripción')
    console.log('✅ Se registró el log de activación manual')
    console.log('\n💡 PRÓXIMOS PASOS:')
    console.log('   1. Verificar que el usuario vea la suscripción como activa')
    console.log('   2. Diagnosticar por qué falló el webhook automático')
    console.log('   3. Implementar correctivos para evitar futuros problemas')

  } catch (error) {
    console.error('💥 Error crítico:', error.message)
    console.error(error.stack)
  }
}

// Ejecutar activación inmediata
activateSubscription166().catch(console.error)