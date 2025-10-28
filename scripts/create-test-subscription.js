/**
 * Script para crear una suscripción de prueba directamente en la base de datos
 * Ejecutar con: node scripts/create-test-subscription.js
 */

// Este script necesita las variables de entorno de Supabase
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

async function createTestSubscription() {
  // Crear cliente de Supabase con service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno de Supabase')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Obtener el user_id de cristoferscalante@gmail.com
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', 'cristoferscalante@gmail.com')
    .single()

  if (profileError || !profile) {
    console.error('❌ Error: No se encontró el perfil del usuario')
    console.error(profileError)
    process.exit(1)
  }

  console.log('✅ Usuario encontrado:', profile.email, '(', profile.id, ')')

  // Crear una suscripción de prueba
  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const testSubscription = {
    user_id: profile.id,
    product_id: 92, // Pastel de cumpleaños Clásico Pollo
    subscription_type: 'monthly',
    status: 'active',
    discount_percentage: 10,
    frequency: 1,
    next_billing_date: nextMonth.toISOString(),
    stripe_subscription_id: `test_sub_${Date.now()}`,
    stripe_customer_id: `test_cus_${Date.now()}`,
    stripe_price_id: 'test_price_monthly',
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  }

  console.log('📝 Creando suscripción de prueba...')
  console.log('User ID:', testSubscription.user_id)
  console.log('Product ID:', testSubscription.product_id, '(Pastel de cumpleaños)')
  console.log('Tipo:', testSubscription.subscription_type)
  console.log('Descuento:', testSubscription.discount_percentage + '%')

  const { data, error } = await supabase
    .from('unified_subscriptions')
    .insert(testSubscription)
    .select()
    .single()

  if (error) {
    console.error('❌ Error al crear suscripción:', error)
    process.exit(1)
  }

  console.log('\n✅ ¡Suscripción de prueba creada exitosamente!')
  console.log('ID:', data.id)
  console.log('Stripe Subscription ID:', data.stripe_subscription_id)
  console.log('Estado:', data.status)
  console.log('\n🔍 Verifica en:')
  console.log('  - http://localhost:3000/perfil (pestaña Suscripciones)')
  console.log('  - http://localhost:3000/admin/subscription-orders')
  
  process.exit(0)
}

createTestSubscription()
