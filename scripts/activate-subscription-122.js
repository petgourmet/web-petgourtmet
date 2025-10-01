const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key'

console.log('🔧 Configuración Supabase:', {
  url: supabaseUrl,
  hasServiceKey: !!supabaseServiceKey
})

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function activateSubscription122() {
  try {
    console.log('🚀 Iniciando activación manual de suscripción ID 122...')
    
    // 1. Obtener la suscripción actual
    const { data: subscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 122)
      .single()
    
    if (fetchError) {
      console.error('❌ Error obteniendo suscripción:', fetchError)
      return
    }
    
    if (!subscription) {
      console.error('❌ No se encontró la suscripción ID 122')
      return
    }
    
    console.log('📋 Suscripción encontrada:', {
      id: subscription.id,
      status: subscription.status,
      external_reference: subscription.external_reference,
      user_id: subscription.user_id,
      product_name: subscription.product_name,
      transaction_amount: subscription.transaction_amount
    })
    
    // 2. Verificar si ya está activa
    if (subscription.status === 'active') {
      console.log('✅ La suscripción ya está activa')
      return
    }
    
    // 3. Activar la suscripción
    const now = new Date().toISOString()
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1) // Próximo mes
    
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        updated_at: now,
        last_billing_date: now,
        next_billing_date: nextBillingDate.toISOString(),
        charges_made: 1 // Primera carga
      })
      .eq('id', 122)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Error actualizando suscripción:', updateError)
      return
    }
    
    console.log('✅ Suscripción activada exitosamente:', {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      last_billing_date: updatedSubscription.last_billing_date,
      next_billing_date: updatedSubscription.next_billing_date
    })
    
    // 4. Actualizar el perfil del usuario para marcar como suscriptor
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_subscriber: true,
        subscription_status: 'active',
        updated_at: now
      })
      .eq('id', subscription.user_id)
    
    if (profileError) {
      console.warn('⚠️ Error actualizando perfil de usuario:', profileError)
    } else {
      console.log('✅ Perfil de usuario actualizado como suscriptor')
    }
    
    // 5. Crear registro de facturación
    const { error: billingError } = await supabase
      .from('billing_history')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        amount: parseFloat(subscription.transaction_amount || subscription.discounted_price || subscription.base_price),
        currency: 'MXN',
        status: 'paid',
        payment_method: 'mercadopago',
        external_reference: subscription.external_reference,
        billing_date: now,
        description: `Activación manual - ${subscription.product_name}`,
        created_at: now
      })
    
    if (billingError) {
      console.warn('⚠️ Error creando registro de facturación:', billingError)
    } else {
      console.log('✅ Registro de facturación creado')
    }
    
    console.log('🎉 ¡Suscripción ID 122 activada exitosamente!')
    console.log('El usuario ahora puede ver su suscripción activa en /suscripcion')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
activateSubscription122()