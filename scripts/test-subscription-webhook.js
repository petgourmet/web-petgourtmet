const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSubscriptionWebhook() {
  try {
    console.log('🔍 Verificando estado actual de suscripciones...')
    
    // Buscar la suscripción específica mencionada
    const specificRef = 'dff577706d8644b6ab5bbbab1c3acfcf'
    const { data: specificSub, error: specificError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', specificRef)
      .single()
    
    if (specificError && specificError.code !== 'PGRST116') {
      console.error('❌ Error buscando suscripción específica:', specificError)
      return
    }
    
    if (specificSub) {
      console.log(`\n📋 Suscripción específica encontrada (${specificRef}):`, {
        id: specificSub.id,
        status: specificSub.status,
        user_id: specificSub.user_id,
        mercadopago_subscription_id: specificSub.mercadopago_subscription_id,
        is_active: specificSub.is_active,
        created_at: specificSub.created_at,
        updated_at: specificSub.updated_at
      })
      
      if (specificSub.status === 'active') {
        console.log('✅ La suscripción ya está activa')
      } else {
        console.log('⚠️  La suscripción NO está activa, simulando webhook...')
        await simulateWebhook(specificSub)
      }
    } else {
      console.log(`\n❌ No se encontró la suscripción específica: ${specificRef}`)
      
      // Mostrar todas las suscripciones para debug
      const { data: allSubs } = await supabase
        .from('unified_subscriptions')
        .select('id, external_reference, status, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('\n📋 Últimas 10 suscripciones en la base de datos:')
      allSubs?.forEach(sub => {
        console.log(`  - ID: ${sub.id}, Ref: ${sub.external_reference}, Status: ${sub.status}, User: ${sub.user_id}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error)
  }
}

async function simulateWebhook(subscription) {
  try {
    console.log('\n🔄 Simulando webhook de activación...')
    
    // Simular datos del webhook de MercadoPago
    const webhookData = {
      id: subscription.mercadopago_subscription_id || 'MP-SUB-123456789',
      status: 'authorized',
      external_reference: subscription.external_reference,
      payer_email: subscription.customer_data?.email || 'test@example.com',
      next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 días
      date_created: new Date().toISOString()
    }
    
    console.log('📤 Datos del webhook simulado:', webhookData)
    
    // Actualizar la suscripción a activa (sin is_active que no existe)
    const updateData = {
      status: 'active',
      mercadopago_subscription_id: webhookData.id,
      payer_email: webhookData.payer_email,
      next_billing_date: webhookData.next_payment_date,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscription.id)
    
    if (updateError) {
      console.error('❌ Error actualizando suscripción:', updateError)
      return
    }
    
    // Actualizar perfil del usuario
    if (subscription.user_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          has_active_subscription: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.user_id)
      
      if (profileError) {
        console.error('⚠️  Error actualizando perfil:', profileError)
      } else {
        console.log('✅ Perfil de usuario actualizado')
      }
    }
    
    console.log('✅ Suscripción activada exitosamente')
    
    // Verificar el resultado
    const { data: updatedSub } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscription.id)
      .single()
    
    if (updatedSub) {
      console.log('\n📋 Estado final de la suscripción:', {
        id: updatedSub.id,
        status: updatedSub.status,
        is_active: updatedSub.is_active,
        mercadopago_subscription_id: updatedSub.mercadopago_subscription_id,
        next_billing_date: updatedSub.next_billing_date,
        updated_at: updatedSub.updated_at
      })
    }
    
  } catch (error) {
    console.error('❌ Error simulando webhook:', error)
  }
}

// Ejecutar el script
testSubscriptionWebhook()
  .then(() => {
    console.log('\n✅ Proceso completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })