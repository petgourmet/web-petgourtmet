require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno faltantes')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSubscription() {
  console.log('🔍 Verificando suscripción ID: 278\n')
  
  // Obtener la suscripción
  const { data: subscription, error } = await supabase
    .from('unified_subscriptions')
    .select('*')
    .eq('id', 278)
    .single()
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  if (!subscription) {
    console.log('❌ Suscripción no encontrada')
    return
  }
  
  console.log('📦 Suscripción encontrada:')
  console.log('- ID:', subscription.id)
  console.log('- User ID:', subscription.user_id)
  console.log('- Customer Email:', subscription.customer_email)
  console.log('- Customer Name:', subscription.customer_name)
  console.log('- Product ID:', subscription.product_id)
  console.log('- Status:', subscription.status)
  console.log('- Stripe Subscription ID:', subscription.stripe_subscription_id)
  console.log('- Current Period Start:', subscription.current_period_start)
  console.log('- Current Period End:', subscription.current_period_end)
  console.log('- Created At:', subscription.created_at)
  
  // Obtener el usuario que está logueado
  console.log('\n🔐 Verificando usuario autenticado...')
  console.log('Por favor, copia el user_id de tu sesión actual.')
  console.log('Para obtenerlo, ve a http://localhost:3000/perfil y abre la consola del navegador (F12).')
  console.log('Luego ejecuta: JSON.parse(localStorage.getItem("supabase.auth.token"))?.currentSession?.user?.id')
}

checkSubscription()
