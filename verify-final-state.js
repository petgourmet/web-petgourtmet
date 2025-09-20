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

async function verifyFinalState() {
  try {
    console.log('🔍 Verificando estado final de las suscripciones...')
    
    const userId = 'aefdfc64-cc93-4219-8ca5-a614a9e7bb84'
    
    // Verificar todas las suscripciones del usuario
    const { data: allSubs, error: allError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ Error obteniendo suscripciones:', allError)
      return
    }
    
    console.log(`\n📊 Total de suscripciones para el usuario: ${allSubs.length}`)
    
    // Mostrar detalles de cada suscripción
    allSubs.forEach((sub, index) => {
      console.log(`\n${index + 1}. Suscripción ID ${sub.id}:`)
      console.log('   Status:', sub.status)
      console.log('   Product Name:', sub.product_name)
      console.log('   Base Price:', sub.base_price)
      console.log('   Product ID:', sub.product_id)
      console.log('   Customer Data:', !!sub.customer_data)
      console.log('   Cart Items:', !!sub.cart_items)
      console.log('   External Reference:', sub.external_reference)
      console.log('   Created At:', sub.created_at)
      console.log('   Updated At:', sub.updated_at)
    })
    
    // Verificar suscripciones activas
    const activeSubs = allSubs.filter(sub => sub.status === 'active')
    console.log(`\n✅ Suscripciones activas: ${activeSubs.length}`)
    
    if (activeSubs.length === 1) {
      const activeSub = activeSubs[0]
      console.log('\n🎉 VERIFICACIÓN EXITOSA:')
      console.log('- Solo existe 1 suscripción activa')
      console.log('- ID:', activeSub.id)
      console.log('- Producto:', activeSub.product_name)
      console.log('- Precio:', activeSub.base_price)
      console.log('- Datos completos:', {
        customer_data: !!activeSub.customer_data,
        cart_items: !!activeSub.cart_items,
        product_id: !!activeSub.product_id,
        external_reference: !!activeSub.external_reference
      })
      
      // Verificar que es el registro correcto (ID 40)
      if (activeSub.id === 40) {
        console.log('✅ Confirmado: Es el registro ID 40 (el completo)')
      } else {
        console.log('⚠️ Advertencia: No es el registro ID 40 esperado')
      }
      
    } else if (activeSubs.length === 0) {
      console.log('❌ ERROR: No hay suscripciones activas')
    } else {
      console.log('❌ ERROR: Hay múltiples suscripciones activas')
      activeSubs.forEach(sub => {
        console.log(`   - ID ${sub.id}: ${sub.product_name} (${sub.base_price})`)
      })
    }
    
    // Verificar que no existe el registro ID 41
    const { data: deletedCheck } = await supabase
      .from('unified_subscriptions')
      .select('id')
      .eq('id', 41)
    
    if (!deletedCheck || deletedCheck.length === 0) {
      console.log('\n✅ Confirmado: Registro ID 41 eliminado correctamente')
    } else {
      console.log('\n❌ ERROR: Registro ID 41 aún existe')
    }
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error)
  }
}

// Ejecutar la verificación
verifyFinalState()
  .then(() => {
    console.log('\n🏁 Verificación completada')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error ejecutando verificación:', error)
    process.exit(1)
  })