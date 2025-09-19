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

async function removeSpecificDuplicates() {
  try {
    console.log('🔍 Analizando suscripciones duplicadas específicas...')
    
    const userId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
    
    // Obtener las suscripciones del usuario
    const { data: userSubs, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error obteniendo suscripciones:', error)
      return
    }
    
    console.log(`📊 Suscripciones encontradas para el usuario: ${userSubs.length}`)
    
    userSubs.forEach((sub, index) => {
      console.log(`\n${index + 1}. Suscripción ID: ${sub.id}`, {
        status: sub.status,
        subscription_type: sub.subscription_type,
        external_reference: sub.external_reference,
        product_name: sub.product_name,
        product_id: sub.product_id,
        mercadopago_subscription_id: sub.mercadopago_subscription_id,
        created_at: sub.created_at,
        has_customer_data: !!sub.customer_data,
        has_cart_items: !!sub.cart_items
      })
    })
    
    // Análisis de duplicados
    console.log('\n🔍 Análisis de duplicados:')
    
    // ID 38: Suscripción weekly con datos completos
    // ID 39: Suscripción monthly con datos incompletos
    
    const sub38 = userSubs.find(s => s.id === 38)
    const sub39 = userSubs.find(s => s.id === 39)
    
    if (!sub38 || !sub39) {
      console.log('❌ No se encontraron las suscripciones específicas (ID 38 y 39)')
      return
    }
    
    console.log('\n📋 Comparación:')
    console.log('ID 38 (weekly):', {
      tiene_customer_data: !!sub38.customer_data,
      tiene_cart_items: !!sub38.cart_items,
      product_name: sub38.product_name,
      status: sub38.status
    })
    
    console.log('ID 39 (monthly):', {
      tiene_customer_data: !!sub39.customer_data,
      tiene_cart_items: !!sub39.cart_items,
      product_name: sub39.product_name,
      status: sub39.status
    })
    
    // Decisión: Mantener ID 38 (tiene datos completos), eliminar ID 39
    console.log('\n💡 Decisión:')
    console.log('✅ Mantener ID 38 (weekly) - Tiene datos completos de customer_data y cart_items')
    console.log('❌ Eliminar ID 39 (monthly) - Datos incompletos, parece ser un duplicado incorrecto')
    
    // Confirmar eliminación
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => {
      rl.question('¿Deseas eliminar la suscripción ID 39 (duplicado incompleto)? (y/N): ', resolve)
    })
    rl.close()
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operación cancelada')
      return
    }
    
    // Eliminar suscripción duplicada (ID 39)
    console.log('\n🗑️  Eliminando suscripción duplicada ID 39...')
    
    const { error: deleteError } = await supabase
      .from('unified_subscriptions')
      .delete()
      .eq('id', 39)
    
    if (deleteError) {
      console.error('❌ Error eliminando suscripción:', deleteError)
      return
    }
    
    console.log('✅ Suscripción duplicada eliminada exitosamente')
    
    // Ahora activar la suscripción restante (ID 38) si está pendiente
    if (sub38.status === 'pending') {
      console.log('\n🔄 Activando suscripción restante (ID 38)...')
      
      const { error: activateError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: 'active',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', 38)
      
      if (activateError) {
        console.error('❌ Error activando suscripción:', activateError)
      } else {
        console.log('✅ Suscripción activada exitosamente')
        
        // Actualizar perfil del usuario
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            has_active_subscription: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        
        if (!profileError) {
          console.log('✅ Perfil de usuario actualizado')
        }
      }
    }
    
    // Verificar resultado final
    const { data: finalSubs } = await supabase
      .from('unified_subscriptions')
      .select('id, status, subscription_type, product_name')
      .eq('user_id', userId)
    
    console.log('\n📋 Estado final:')
    finalSubs?.forEach(sub => {
      console.log(`  - ID ${sub.id}: ${sub.status} (${sub.subscription_type}) - ${sub.product_name}`)
    })
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error)
  }
}

// Ejecutar el script
removeSpecificDuplicates()
  .then(() => {
    console.log('\n✅ Proceso completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })