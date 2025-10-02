/**
 * Script para activar manualmente la suscripción ID 129
 * Suscripción del usuario: 2f4ec8c0-0e58-486d-9c11-a652368f7c19
 * External Reference: SUB-2f4ec8c0-0e58-486d-9c11-a652368f7c19-73-f4da54de
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function activateSubscription129() {
  console.log('🚀 Iniciando activación manual de suscripción ID 129...')
  
  try {
    // 1. Verificar que la suscripción existe y está pendiente
    console.log('\n1️⃣ Verificando suscripción ID 129...')
    const { data: subscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 129)
      .single()
    
    if (fetchError) {
      console.error('❌ Error obteniendo suscripción:', fetchError.message)
      return
    }
    
    if (!subscription) {
      console.error('❌ Suscripción ID 129 no encontrada')
      return
    }
    
    console.log('✅ Suscripción encontrada:')
    console.log(`   ID: ${subscription.id}`)
    console.log(`   User ID: ${subscription.user_id}`)
    console.log(`   Status: ${subscription.status}`)
    console.log(`   External Reference: ${subscription.external_reference}`)
    const customerData = typeof subscription.customer_data === 'string' 
      ? JSON.parse(subscription.customer_data) 
      : subscription.customer_data
    console.log(`   Email: ${customerData.email}`)
    console.log(`   Producto: ${subscription.product_name}`)
    console.log(`   Precio: $${subscription.discounted_price} ${subscription.currency_id}`)
    
    if (subscription.status === 'active') {
      console.log('✅ La suscripción ya está activa')
      return
    }
    
    // 2. Activar la suscripción
    console.log('\n2️⃣ Activando suscripción...')
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        // Simular datos de MercadoPago para completar la activación
        mercadopago_subscription_id: `mp_sub_manual_${Date.now()}`,
        preapproval_plan_id: `plan_manual_${Date.now()}`,
        // Calcular próxima fecha de facturación (1 mes desde ahora)
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', 129)
    
    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError.message)
      return
    }
    
    console.log('✅ Suscripción activada exitosamente')
    
    // 3. Crear registro de facturación inicial
    console.log('\n3️⃣ Creando registro de facturación inicial...')
    const { error: billingError } = await supabase
      .from('billing_history')
      .insert({
        subscription_id: 129,
        user_id: subscription.user_id,
        amount: parseFloat(subscription.discounted_price),
        currency: subscription.currency_id,
        status: 'paid',
        payment_method: 'mercadopago',
        external_reference: subscription.external_reference,
        mp_payment_id: `payment_manual_${Date.now()}`,
        billing_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          activation_type: 'manual',
          activated_by: 'script',
          original_status: subscription.status,
          activation_timestamp: new Date().toISOString()
        }
      })
    
    if (billingError) {
      console.warn('⚠️ Error creando registro de facturación:', billingError.message)
    } else {
      console.log('✅ Registro de facturación creado')
    }
    
    // 4. Verificar activación
    console.log('\n4️⃣ Verificando activación...')
    const { data: updatedSubscription, error: verifyError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 129)
      .single()
    
    if (verifyError) {
      console.error('❌ Error verificando activación:', verifyError.message)
      return
    }
    
    console.log('✅ Verificación completada:')
    console.log(`   Status: ${updatedSubscription.status}`)
    console.log(`   MercadoPago ID: ${updatedSubscription.mercadopago_subscription_id}`)
    console.log(`   Próxima facturación: ${updatedSubscription.next_billing_date}`)
    console.log(`   Última sincronización: ${updatedSubscription.last_sync_at}`)
    
    console.log('\n🎉 ¡Suscripción ID 129 activada exitosamente!')
    console.log('\n📋 Resumen:')
    console.log(`   • Usuario: ${subscription.user_id}`)
    console.log(`   • Email: ${customerData.email}`)
    console.log(`   • Producto: ${subscription.product_name} (${subscription.size})`)
    console.log(`   • Precio: $${subscription.discounted_price} ${subscription.currency_id}`)
    console.log(`   • Tipo: ${subscription.subscription_type}`)
    console.log(`   • Estado: pending → active`)
    
  } catch (error) {
    console.error('❌ Error en activación manual:', error.message)
  }
}

// Ejecutar activación
activateSubscription129().then(() => {
  console.log('\n✅ Script completado')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando script:', error.message)
  process.exit(1)
})