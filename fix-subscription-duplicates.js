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

async function fixSubscriptionDuplicates() {
  try {
    console.log('🔧 Iniciando corrección de duplicados de suscripción...')
    
    // PASO 1: Verificar que ambos registros existen
    const { data: subscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .in('id', [40, 41])
      .order('id')
    
    if (fetchError) {
      console.error('❌ Error obteniendo suscripciones:', fetchError)
      return
    }
    
    if (!subscriptions || subscriptions.length !== 2) {
      console.error('❌ No se encontraron ambos registros (ID 40 y 41)')
      return
    }
    
    const sub40 = subscriptions.find(s => s.id === 40)
    const sub41 = subscriptions.find(s => s.id === 41)
    
    console.log('\n📋 Estado actual:')
    console.log('ID 40 (completo):', {
      status: sub40.status,
      product_name: sub40.product_name,
      base_price: sub40.base_price,
      customer_data: !!sub40.customer_data,
      cart_items: !!sub40.cart_items,
      product_id: sub40.product_id
    })
    
    console.log('ID 41 (incompleto):', {
      status: sub41.status,
      product_name: sub41.product_name,
      base_price: sub41.base_price,
      customer_data: !!sub41.customer_data,
      cart_items: !!sub41.cart_items,
      product_id: sub41.product_id
    })
    
    // PASO 2: Eliminar el registro ID 41 (incompleto)
    console.log('\n🗑️ Eliminando registro ID 41 (incompleto)...')
    const { error: deleteError } = await supabase
      .from('unified_subscriptions')
      .delete()
      .eq('id', 41)
    
    if (deleteError) {
      console.error('❌ Error eliminando registro ID 41:', deleteError)
      return
    }
    
    console.log('✅ Registro ID 41 eliminado exitosamente')
    
    // PASO 3: Activar el registro ID 40 (completo)
    console.log('\n🔄 Activando registro ID 40 (completo)...')
    const { error: activateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', 40)
    
    if (activateError) {
      console.error('❌ Error activando registro ID 40:', activateError)
      return
    }
    
    console.log('✅ Registro ID 40 activado exitosamente')
    
    // PASO 4: Verificar el resultado final
    console.log('\n🔍 Verificando resultado final...')
    const { data: finalSub, error: finalError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', 40)
      .single()
    
    if (finalError) {
      console.error('❌ Error verificando resultado:', finalError)
      return
    }
    
    console.log('\n🎉 CORRECCIÓN COMPLETADA:')
    console.log('Registro único activo:', {
      id: finalSub.id,
      status: finalSub.status,
      product_name: finalSub.product_name,
      base_price: finalSub.base_price,
      user_id: finalSub.user_id,
      external_reference: finalSub.external_reference,
      updated_at: finalSub.updated_at
    })
    
    // Verificar que ID 41 ya no existe
    const { data: deletedCheck } = await supabase
      .from('unified_subscriptions')
      .select('id')
      .eq('id', 41)
    
    if (!deletedCheck || deletedCheck.length === 0) {
      console.log('✅ Confirmado: Registro ID 41 eliminado correctamente')
    } else {
      console.log('⚠️ Advertencia: Registro ID 41 aún existe')
    }
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error)
  }
}

// Ejecutar la corrección
fixSubscriptionDuplicates()
  .then(() => {
    console.log('\n🏁 Script completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error ejecutando script:', error)
    process.exit(1)
  })