const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const externalReference = '8ee90c1d78554c9faa3c0531fcbaaeb7'

async function testActivateSubscription() {
  console.log('🔍 Buscando suscripción con external_reference:', externalReference)
  
  try {
    // 1. Buscar suscripción por external_reference
    const { data: subscriptions, error: searchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
    
    if (searchError) {
      console.error('❌ Error buscando suscripción:', searchError)
      return
    }
    
    console.log('📋 Suscripciones encontradas:', subscriptions?.length || 0)
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('❌ No se encontró suscripción con external_reference:', externalReference)
      
      // Buscar todas las suscripciones pendientes para debug
      const { data: allPending } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'pending')
      
      console.log('📋 Todas las suscripciones pendientes:', allPending)
      return
    }
    
    const subscription = subscriptions[0]
    console.log('✅ Suscripción encontrada:', {
      id: subscription.id,
      status: subscription.status,
      user_id: subscription.user_id,
      external_reference: subscription.external_reference,
      product_name: subscription.product_name,
      created_at: subscription.created_at
    })
    
    if (subscription.status === 'active') {
      console.log('✅ La suscripción ya está activa')
      
      // Verificar el perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', subscription.user_id)
        .single()
      
      console.log('👤 Perfil del usuario:', {
        id: profile?.id,
        email: profile?.email,
        has_active_subscription: profile?.has_active_subscription
      })
      
      return
    }
    
    // 2. Activar la suscripción
    console.log('🔧 Activando suscripción...')
    
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        next_billing_date: nextBillingDate.toISOString(),
        last_billing_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Error activando suscripción:', updateError)
      return
    }
    
    console.log('✅ Suscripción activada exitosamente:', updatedSubscription)
    
    // 3. Actualizar perfil del usuario
    console.log('👤 Actualizando perfil del usuario...')
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.user_id)
    
    if (profileError) {
      console.error('❌ Error actualizando perfil:', profileError)
    } else {
      console.log('✅ Perfil actualizado exitosamente')
    }
    
    // 4. Enviar email de confirmación
    console.log('📧 Enviando email de confirmación...')
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', subscription.user_id)
        .single()
      
      if (profile?.email) {
        const response = await fetch('http://localhost:3000/api/subscriptions/send-thank-you-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: profile.email,
            name: profile.full_name || profile.email
          })
        })
        
        const result = await response.json()
        
        if (response.ok) {
          console.log('✅ Email enviado exitosamente')
        } else {
          console.error('❌ Error enviando email:', result.error)
        }
      }
    } catch (emailError) {
      console.error('❌ Error enviando email:', emailError)
    }
    
    console.log('🎉 Proceso completado exitosamente')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testActivateSubscription()