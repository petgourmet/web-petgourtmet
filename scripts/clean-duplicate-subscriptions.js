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

async function cleanDuplicateSubscriptions() {
  try {
    console.log('🔍 Buscando suscripciones duplicadas...')
    
    // Obtener todas las suscripciones activas y pendientes
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error obteniendo suscripciones:', error)
      return
    }
    
    console.log(`📊 Total de suscripciones encontradas: ${subscriptions.length}`)
    
    // Agrupar por user_id y product_id
    const groupedByUser = {}
    const duplicatesToRemove = []
    
    subscriptions.forEach(sub => {
      const key = `${sub.user_id}_${sub.product_id || 'no_product'}`
      
      if (!groupedByUser[key]) {
        groupedByUser[key] = []
      }
      groupedByUser[key].push(sub)
    })
    
    // Identificar duplicados
    Object.keys(groupedByUser).forEach(key => {
      const userSubs = groupedByUser[key]
      
      if (userSubs.length > 1) {
        console.log(`\n🔍 Usuario con ${userSubs.length} suscripciones duplicadas:`, key)
        
        // Ordenar por prioridad: active > pending, y por fecha más reciente
        userSubs.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1
          if (b.status === 'active' && a.status !== 'active') return 1
          return new Date(b.created_at) - new Date(a.created_at)
        })
        
        // Mantener la primera (más prioritaria), marcar el resto para eliminación
        const toKeep = userSubs[0]
        const toRemove = userSubs.slice(1)
        
        console.log(`  ✅ Mantener: ID ${toKeep.id} (${toKeep.status}) - ${toKeep.created_at}`)
        
        toRemove.forEach(sub => {
          console.log(`  ❌ Eliminar: ID ${sub.id} (${sub.status}) - ${sub.created_at}`)
          duplicatesToRemove.push(sub.id)
        })
      }
    })
    
    if (duplicatesToRemove.length === 0) {
      console.log('\n✅ No se encontraron suscripciones duplicadas')
      return
    }
    
    console.log(`\n🗑️  Total de duplicados a eliminar: ${duplicatesToRemove.length}`)
    
    // Confirmar antes de eliminar
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => {
      rl.question('¿Deseas proceder con la eliminación? (y/N): ', resolve)
    })
    rl.close()
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operación cancelada')
      return
    }
    
    // Eliminar duplicados
    console.log('\n🗑️  Eliminando suscripciones duplicadas...')
    
    const { error: deleteError } = await supabase
      .from('unified_subscriptions')
      .delete()
      .in('id', duplicatesToRemove)
    
    if (deleteError) {
      console.error('❌ Error eliminando duplicados:', deleteError)
      return
    }
    
    console.log(`✅ Se eliminaron ${duplicatesToRemove.length} suscripciones duplicadas`)
    
    // Verificar suscripción específica mencionada
    const specificRef = 'dff577706d8644b6ab5bbbab1c3acfcf'
    const { data: specificSub } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', specificRef)
      .single()
    
    if (specificSub) {
      console.log(`\n🔍 Suscripción específica (${specificRef}):`, {
        id: specificSub.id,
        status: specificSub.status,
        user_id: specificSub.user_id,
        created_at: specificSub.created_at
      })
    } else {
      console.log(`\n❌ No se encontró la suscripción específica: ${specificRef}`)
    }
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error)
  }
}

// Ejecutar el script
cleanDuplicateSubscriptions()
  .then(() => {
    console.log('\n✅ Proceso completado')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })