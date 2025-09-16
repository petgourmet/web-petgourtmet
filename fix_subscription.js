const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixSubscription() {
  const externalRef = 'subscription_PG-717522_1757974717522'
  
  console.log(`🔧 Reparando suscripción con external_reference: ${externalRef}`)
  
  try {
    // 1. Buscar la suscripción pendiente
    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('external_reference', externalRef)
      .single()
    
    if (pendingError || !pendingData) {
      console.error('❌ No se encontró la suscripción pendiente:', pendingError?.message)
      return
    }
    
    console.log('✅ Suscripción pendiente encontrada:', {
      id: pendingData.id,
      user_id: pendingData.user_id,
      status: pendingData.status,
      subscription_type: pendingData.subscription_type
    })
    
    // 2. Extraer información del carrito
    const cartItems = pendingData.cart_items
    const firstItem = cartItems[0]
    
    if (!firstItem) {
      console.error('❌ No se encontraron items en el carrito')
      return
    }
    
    console.log('📦 Item del carrito:', {
      product_id: firstItem.product_id,
      product_name: firstItem.product_name,
      price: firstItem.price,
      size: firstItem.size,
      subscriptionType: firstItem.subscriptionType
    })
    
    // 3. Crear suscripción activa
    const subscriptionData = {
      user_id: pendingData.user_id,
      product_id: firstItem.product_id,
      product_name: firstItem.product_name,
      subscription_type: pendingData.subscription_type,
      status: 'active',
      quantity: firstItem.quantity || 1,
      size: firstItem.size,
      base_price: firstItem.price,
      discounted_price: firstItem.price,
      external_reference: externalRef,
      mercadopago_subscription_id: 'MANUAL_FIX_' + Date.now(), // ID temporal
      next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 días
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('🚀 Creando suscripción activa...')
    const { data: newSubscription, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error creando suscripción activa:', insertError.message)
      return
    }
    
    console.log('✅ Suscripción activa creada:', {
      id: newSubscription.id,
      status: newSubscription.status,
      next_billing_date: newSubscription.next_billing_date
    })
    
    // 4. Actualizar suscripción pendiente
    console.log('📝 Actualizando suscripción pendiente...')
    const { error: updateError } = await supabase
      .from('pending_subscriptions')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mercadopago_subscription_id: subscriptionData.mercadopago_subscription_id
      })
      .eq('id', pendingData.id)
    
    if (updateError) {
      console.error('❌ Error actualizando suscripción pendiente:', updateError.message)
      return
    }
    
    console.log('✅ Suscripción pendiente actualizada')
    
    // 5. Actualizar perfil del usuario
    console.log('👤 Actualizando perfil del usuario...')
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingData.user_id)
    
    if (profileError) {
      console.error('⚠️ Error actualizando perfil (no crítico):', profileError.message)
    } else {
      console.log('✅ Perfil del usuario actualizado')
    }
    
    // 6. Nota: El correo de confirmación se enviará por separado
    console.log('📧 Nota: Correo de confirmación pendiente (se enviará por separado)')
    
    console.log('\n🎉 ¡Suscripción reparada exitosamente!')
    console.log('📊 Resumen:')
    console.log(`   - Suscripción ID: ${newSubscription.id}`)
    console.log(`   - Usuario ID: ${pendingData.user_id}`)
    console.log(`   - Estado: ${newSubscription.status}`)
    console.log(`   - Próximo pago: ${newSubscription.next_billing_date}`)
    console.log(`   - Producto: ${firstItem.product_name} (${firstItem.size})`)
    
  } catch (error) {
    console.error('💥 Error general:', error.message)
    console.error(error.stack)
  }
}

// Ejecutar la reparación
fixSubscription().then(() => {
  console.log('\n✨ Proceso completado')
  process.exit(0)
}).catch(error => {
  console.error('💥 Error fatal:', error.message)
  process.exit(1)
})