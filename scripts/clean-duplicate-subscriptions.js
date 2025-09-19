/**
 * Script para limpiar suscripciones duplicadas
 * Este script identifica y cancela suscripciones duplicadas pendientes
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanDuplicateSubscriptions() {
  console.log('🔍 Iniciando limpieza de suscripciones duplicadas...')
  
  try {
    // 1. Buscar todas las suscripciones agrupadas por usuario y producto
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('id, user_id, product_id, status, created_at, mercadopago_subscription_id')
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: true })
    
    if (error) {
      throw error
    }
    
    console.log(`📊 Encontradas ${subscriptions.length} suscripciones activas/pendientes`)
    
    // 2. Agrupar por usuario y producto
    const groupedSubscriptions = {}
    
    subscriptions.forEach(sub => {
      const key = `${sub.user_id}-${sub.product_id}`
      if (!groupedSubscriptions[key]) {
        groupedSubscriptions[key] = []
      }
      groupedSubscriptions[key].push(sub)
    })
    
    let duplicatesFound = 0
    let duplicatesCancelled = 0
    
    // 3. Procesar cada grupo
    for (const [key, subs] of Object.entries(groupedSubscriptions)) {
      if (subs.length > 1) {
        duplicatesFound += subs.length - 1
        console.log(`\n🔍 Duplicados encontrados para ${key}:`, subs.length)
        
        // Ordenar por prioridad: active > pending, y por fecha de creación
        subs.sort((a, b) => {
          // Priorizar activas sobre pendientes
          if (a.status === 'active' && b.status === 'pending') return -1
          if (a.status === 'pending' && b.status === 'active') return 1
          
          // Si tienen el mismo estado, priorizar la más antigua
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
        
        const keepSubscription = subs[0]
        const duplicatesToCancel = subs.slice(1)
        
        console.log(`✅ Mantener: ${keepSubscription.id} (${keepSubscription.status})`)
        
        // Cancelar duplicados
        for (const duplicate of duplicatesToCancel) {
          console.log(`❌ Cancelar: ${duplicate.id} (${duplicate.status})`)
          
          const { error: updateError } = await supabase
            .from('unified_subscriptions')
            .update({
              status: 'duplicate_cancelled',
              updated_at: new Date().toISOString(),
              cancellation_reason: 'Duplicate subscription detected during cleanup - user already has subscription for this product'
            })
            .eq('id', duplicate.id)
          
          if (updateError) {
            console.error(`❌ Error cancelando ${duplicate.id}:`, updateError.message)
          } else {
            duplicatesCancelled++
            console.log(`✅ Cancelada suscripción duplicada: ${duplicate.id}`)
          }
        }
      }
    }
    
    console.log(`\n📊 Resumen de limpieza:`)
    console.log(`   - Duplicados encontrados: ${duplicatesFound}`)
    console.log(`   - Duplicados cancelados: ${duplicatesCancelled}`)
    console.log(`   - Errores: ${duplicatesFound - duplicatesCancelled}`)
    
    if (duplicatesCancelled > 0) {
      console.log('\n✅ Limpieza completada exitosamente')
    } else {
      console.log('\n✨ No se encontraron duplicados para limpiar')
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message)
    process.exit(1)
  }
}

// Ejecutar el script
if (require.main === module) {
  cleanDuplicateSubscriptions()
    .then(() => {
      console.log('\n🎉 Script completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error)
      process.exit(1)
    })
}

module.exports = { cleanDuplicateSubscriptions }