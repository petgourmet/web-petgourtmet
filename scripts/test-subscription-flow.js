require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSubscriptionFlow() {
  console.log('🔍 === ANÁLISIS DEL FLUJO DE ACTIVACIÓN DE SUSCRIPCIONES ===\n')
  
  try {
    // 1. Verificar suscripciones pendientes
    console.log('1️⃣ Verificando suscripciones pendientes...')
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (pendingError) {
      console.error('❌ Error obteniendo suscripciones pendientes:', pendingError.message)
      return
    }
    
    console.log(`📊 Suscripciones pendientes encontradas: ${pendingSubscriptions.length}`)
    
    if (pendingSubscriptions.length > 0) {
      console.log('\n📋 Últimas suscripciones pendientes:')
      pendingSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ID: ${sub.id} | Usuario: ${sub.user_id} | Creada: ${new Date(sub.created_at).toLocaleString()}`)
        console.log(`      External Ref: ${sub.external_reference || 'N/A'}`)
        console.log(`      MP Sub ID: ${sub.mercadopago_subscription_id || 'N/A'}`)
        console.log(`      Producto: ${sub.product_name} | Precio: $${sub.transaction_amount || sub.base_price}`)
        console.log('')
      })
    }
    
    // 2. Verificar suscripciones activas recientes
    console.log('2️⃣ Verificando suscripciones activas recientes...')
    const { data: activeSubscriptions, error: activeError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('activated_at', { ascending: false })
      .limit(5)
    
    if (activeError) {
      console.error('❌ Error obteniendo suscripciones activas:', activeError.message)
    } else {
      console.log(`📊 Suscripciones activas recientes: ${activeSubscriptions.length}`)
      
      if (activeSubscriptions.length > 0) {
        console.log('\n✅ Últimas suscripciones activadas:')
        activeSubscriptions.forEach((sub, index) => {
          console.log(`   ${index + 1}. ID: ${sub.id} | Usuario: ${sub.user_id} | Activada: ${sub.activated_at ? new Date(sub.activated_at).toLocaleString() : 'N/A'}`)
          console.log(`      External Ref: ${sub.external_reference || 'N/A'}`)
          console.log(`      MP Sub ID: ${sub.mercadopago_subscription_id || 'N/A'}`)
          console.log('')
        })
      }
    }
    
    // 3. Analizar patrones de activación
    console.log('3️⃣ Analizando patrones de activación...')
    
    // Contar suscripciones por estado
    const { data: statusCounts, error: statusError } = await supabase
      .from('unified_subscriptions')
      .select('status')
    
    if (statusError) {
      console.error('❌ Error obteniendo conteos por estado:', statusError.message)
    } else {
      const counts = statusCounts.reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1
        return acc
      }, {})
      
      console.log('\n📊 Distribución por estado:')
      Object.entries(counts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })
    }
    
    // 4. Verificar suscripciones con external_reference pero sin activar
    console.log('\n4️⃣ Verificando suscripciones con external_reference pero sin activar...')
    const { data: unactivatedWithRef, error: unactivatedError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .not('external_reference', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (unactivatedError) {
      console.error('❌ Error obteniendo suscripciones no activadas:', unactivatedError.message)
    } else {
      console.log(`🔍 Suscripciones pendientes con external_reference: ${unactivatedWithRef.length}`)
      
      if (unactivatedWithRef.length > 0) {
        console.log('\n⚠️ Estas suscripciones deberían haberse activado automáticamente:')
        unactivatedWithRef.forEach((sub, index) => {
          console.log(`   ${index + 1}. ID: ${sub.id} | External Ref: ${sub.external_reference}`)
          console.log(`      Creada: ${new Date(sub.created_at).toLocaleString()}`)
          console.log(`      Tiempo sin activar: ${Math.round((Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60))} minutos`)
          console.log('')
        })
      }
    }
    
    // 5. Verificar logs de webhook (si existe la tabla)
    console.log('5️⃣ Verificando logs de webhook...')
    try {
      const { data: webhookLogs, error: webhookError } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (webhookError) {
        console.log('ℹ️ No se encontró tabla de webhook_logs o no hay datos')
      } else {
        console.log(`📊 Logs de webhook encontrados: ${webhookLogs.length}`)
        
        if (webhookLogs.length > 0) {
          console.log('\n📋 Últimos webhooks recibidos:')
          webhookLogs.forEach((log, index) => {
            console.log(`   ${index + 1}. Tipo: ${log.type || 'N/A'} | Estado: ${log.status || 'N/A'} | ${new Date(log.created_at).toLocaleString()}`)
          })
        }
      }
    } catch (webhookLogError) {
      console.log('ℹ️ Tabla webhook_logs no disponible')
    }
    
    // 6. Resumen y diagnóstico
    console.log('\n🔍 === DIAGNÓSTICO DEL PROBLEMA ===')
    
    const totalPending = pendingSubscriptions.length
    const pendingWithRef = unactivatedWithRef.length
    
    if (totalPending > 0) {
      console.log(`❌ PROBLEMA CONFIRMADO: ${totalPending} suscripciones pendientes`)
      
      if (pendingWithRef > 0) {
        console.log(`⚠️ CRÍTICO: ${pendingWithRef} suscripciones tienen external_reference pero no se activaron`)
        console.log('   Esto indica que:')
        console.log('   - Los webhooks no están llegando correctamente, O')
        console.log('   - El flujo de activación por URL no está funcionando, O')
        console.log('   - Hay un error en el procesamiento de activación')
      }
      
      console.log('\n🔧 ACCIONES RECOMENDADAS:')
      console.log('1. Verificar configuración de webhooks en Mercado Pago')
      console.log('2. Revisar logs del servidor para errores de webhook')
      console.log('3. Probar manualmente el endpoint /api/subscriptions/verify-return')
      console.log('4. Verificar que hasValidMercadoPagoParams funcione correctamente')
      console.log('5. Implementar activación manual para suscripciones pendientes')
    } else {
      console.log('✅ No se encontraron suscripciones pendientes recientes')
    }
    
  } catch (error) {
    console.error('❌ Error en el análisis:', error.message)
  }
}

// Ejecutar el análisis
testSubscriptionFlow().then(() => {
  console.log('\n✅ Análisis completado')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando análisis:', error.message)
  process.exit(1)
})