/**
 * ACTIVACIÓN MANUAL DE SUSCRIPCIÓN PENDIENTE
 * 
 * Script para activar la suscripción pendiente (ID 117) y sincronizar
 * el external_reference con el valor enviado por el webhook de MercadoPago
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuración de Supabase con service role key para acceso completo
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Datos del webhook y suscripción pendiente
const WEBHOOK_EXTERNAL_REFERENCE = '2c938084726fca8a01726fd4f4b80331'
const PENDING_SUBSCRIPTION_ID = 117
const USER_ID = 'aefdfc64-cc93-4219-8ca5-a614a9e7bb84'
const PRODUCT_ID = 73

async function activatePendingSubscription() {
  console.log('🚀 Iniciando activación manual de suscripción pendiente...')
  console.log(`📋 Suscripción ID: ${PENDING_SUBSCRIPTION_ID}`)
  console.log(`👤 Usuario ID: ${USER_ID}`)
  console.log(`📦 Producto ID: ${PRODUCT_ID}`)
  console.log(`🔗 External Reference del webhook: ${WEBHOOK_EXTERNAL_REFERENCE}`)
  
  try {
    // PASO 1: Verificar que la suscripción existe y está pendiente
    console.log('\n🔍 PASO 1: Verificando suscripción pendiente...')
    
    const { data: pendingSubscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .single()
    
    if (fetchError) {
      console.error('❌ Error obteniendo suscripción:', fetchError)
      return false
    }
    
    if (!pendingSubscription) {
      console.error('❌ No se encontró la suscripción con ID:', PENDING_SUBSCRIPTION_ID)
      return false
    }
    
    console.log('✅ Suscripción encontrada:')
    console.table({
      id: pendingSubscription.id,
      user_id: pendingSubscription.user_id,
      status: pendingSubscription.status,
      external_reference: pendingSubscription.external_reference,
      product_id: pendingSubscription.product_id,
      created_at: pendingSubscription.created_at
    })
    
    if (pendingSubscription.status !== 'pending') {
      console.warn(`⚠️ La suscripción no está pendiente (status: ${pendingSubscription.status})`)
      return false
    }
    
    // PASO 2: Verificar que no existe otra suscripción activa para el mismo usuario/producto
    console.log('\n🔍 PASO 2: Verificando duplicados...')
    
    const { data: activeSubscriptions, error: duplicateError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('product_id', PRODUCT_ID)
      .eq('status', 'active')
    
    if (duplicateError) {
      console.error('❌ Error verificando duplicados:', duplicateError)
      return false
    }
    
    if (activeSubscriptions && activeSubscriptions.length > 0) {
      console.error('❌ Ya existe una suscripción activa para este usuario/producto:')
      console.table(activeSubscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        external_reference: sub.external_reference,
        created_at: sub.created_at
      })))
      return false
    }
    
    console.log('✅ No se encontraron duplicados')
    
    // PASO 3: Activar la suscripción
    console.log('\n🚀 PASO 3: Activando suscripción...')
    
    const now = new Date().toISOString()
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1) // Próximo mes
    
    const updateData = {
      status: 'active',
      external_reference: WEBHOOK_EXTERNAL_REFERENCE, // Sincronizar con MercadoPago
      activated_at: now,
      updated_at: now,
      last_billing_date: now,
      next_billing_date: nextBillingDate.toISOString(),
      // Guardar la referencia original en metadata para trazabilidad
      metadata: {
        ...pendingSubscription.metadata,
        original_external_reference: pendingSubscription.external_reference,
        activated_by: 'manual_script',
        activation_reason: 'webhook_sync_fix',
        webhook_external_reference: WEBHOOK_EXTERNAL_REFERENCE,
        activation_timestamp: now
      }
    }
    
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError)
      return false
    }
    
    console.log('✅ Suscripción activada exitosamente:')
    console.table({
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      external_reference: updatedSubscription.external_reference,
      activated_at: updatedSubscription.activated_at,
      next_billing_date: updatedSubscription.next_billing_date
    })
    
    // PASO 4: Crear registro de facturación
    console.log('\n💰 PASO 4: Creando registro de facturación...')
    
    const billingData = {
      subscription_id: PENDING_SUBSCRIPTION_ID,
      user_id: USER_ID,
      amount: updatedSubscription.amount || 0,
      status: 'paid',
      payment_method: 'mercadopago',
      external_reference: WEBHOOK_EXTERNAL_REFERENCE,
      transaction_date: now,
      created_at: now,
      metadata: {
        activation_type: 'manual_script',
        webhook_sync: true,
        original_external_reference: pendingSubscription.external_reference
      }
    }
    
    const { data: billingRecord, error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert(billingData)
      .select()
      .single()
    
    if (billingError) {
      console.warn('⚠️ Error creando registro de facturación (no crítico):', billingError)
    } else {
      console.log('✅ Registro de facturación creado:', billingRecord.id)
    }
    
    // PASO 5: Verificación final
    console.log('\n🔍 PASO 5: Verificación final...')
    
    const { data: finalSubscription, error: finalError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', PENDING_SUBSCRIPTION_ID)
      .single()
    
    if (finalError) {
      console.error('❌ Error en verificación final:', finalError)
      return false
    }
    
    console.log('✅ ACTIVACIÓN COMPLETADA EXITOSAMENTE')
    console.log('\n📋 RESUMEN FINAL:')
    console.table({
      'Suscripción ID': finalSubscription.id,
      'Usuario ID': finalSubscription.user_id,
      'Estado': finalSubscription.status,
      'External Reference': finalSubscription.external_reference,
      'Activada en': finalSubscription.activated_at,
      'Próxima facturación': finalSubscription.next_billing_date
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Error fatal durante la activación:', error)
    return false
  }
}

// Ejecutar la activación
activatePendingSubscription()
  .then((success) => {
    if (success) {
      console.log('\n🎉 ¡SUSCRIPCIÓN ACTIVADA EXITOSAMENTE!')
      console.log('✅ El usuario ahora tiene acceso a su suscripción')
      console.log('✅ El external_reference está sincronizado con MercadoPago')
    } else {
      console.log('\n❌ La activación falló. Revisa los errores arriba.')
    }
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })