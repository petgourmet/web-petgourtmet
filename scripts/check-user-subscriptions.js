const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://kwhubfkvpvrlawpylopc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3aHViZmt2cHZybGF3cHlsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkzOTU3MCwiZXhwIjoyMDYxNTE1NTcwfQ.3j4Gafz94NEixrTv55xAVmiemOKnIOdxsUBgqOvWGAI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserSubscriptions() {
  const userId = '2f4ec8c0-0e58-486d-9c11-a652368f7c19'
  const productId = 73

  console.log('🔍 Verificando suscripciones para:')
  console.log(`   Usuario: ${userId}`)
  console.log(`   Producto: ${productId}`)
  console.log('')

  try {
    // Buscar todas las suscripciones del usuario para este producto
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error consultando suscripciones:', error)
      return
    }

    console.log(`📊 Total de suscripciones encontradas: ${subscriptions.length}`)
    console.log('')

    if (subscriptions.length === 0) {
      console.log('✅ No se encontraron suscripciones para este usuario y producto')
      return
    }

    // Mostrar detalles de cada suscripción
    subscriptions.forEach((sub, index) => {
      console.log(`📋 Suscripción ${index + 1}:`)
      console.log(`   ID: ${sub.id}`)
      console.log(`   Estado: ${sub.status}`)
      console.log(`   Tipo: ${sub.subscription_type}`)
      console.log(`   External Reference: ${sub.external_reference}`)
      console.log(`   Creada: ${new Date(sub.created_at).toLocaleString()}`)
      console.log(`   Actualizada: ${new Date(sub.updated_at).toLocaleString()}`)
      console.log(`   Precio: $${sub.transaction_amount || sub.discounted_price || sub.base_price || 'N/A'}`)
      
      if (sub.next_billing_date) {
        console.log(`   Próxima facturación: ${new Date(sub.next_billing_date).toLocaleString()}`)
      }
      
      if (sub.cancelled_at) {
        console.log(`   Cancelada: ${new Date(sub.cancelled_at).toLocaleString()}`)
      }
      
      console.log('')
    })

    // Verificar suscripciones activas
    const activeSubs = subscriptions.filter(sub => 
      ['active', 'pending', 'processing'].includes(sub.status)
    )

    console.log(`🔥 Suscripciones activas/pendientes: ${activeSubs.length}`)
    
    if (activeSubs.length > 0) {
      console.log('⚠️  PROBLEMA DETECTADO: El usuario tiene suscripciones activas/pendientes')
      console.log('   Esto explica por qué se rechaza la creación de nuevas suscripciones')
      console.log('')
      
      activeSubs.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID ${sub.id} - Estado: ${sub.status} - Creada: ${new Date(sub.created_at).toLocaleString()}`)
      })
    } else {
      console.log('✅ No hay suscripciones activas que bloqueen la creación de nuevas')
    }

    // Verificar suscripciones recientes (últimos 10 minutos)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentSubs = subscriptions.filter(sub => 
      new Date(sub.created_at) > tenMinutesAgo
    )

    if (recentSubs.length > 0) {
      console.log('')
      console.log(`⏰ Suscripciones creadas en los últimos 10 minutos: ${recentSubs.length}`)
      recentSubs.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID ${sub.id} - Estado: ${sub.status} - ${new Date(sub.created_at).toLocaleString()}`)
      })
    }

  } catch (error) {
    console.error('❌ Error ejecutando consulta:', error)
  }
}

// Ejecutar la verificación
checkUserSubscriptions()
  .then(() => {
    console.log('')
    console.log('✅ Verificación completada')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error en la verificación:', error)
    process.exit(1)
  })