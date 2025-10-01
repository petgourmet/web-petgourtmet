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

async function debugExternalReferenceMismatch() {
  console.log('🔍 === ANÁLISIS DE DESAJUSTE EN EXTERNAL_REFERENCE ===\n')
  
  try {
    // 1. Obtener todas las suscripciones pendientes
    console.log('1️⃣ Analizando suscripciones pendientes...')
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('id, external_reference, user_id, product_id, status, created_at, metadata')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (pendingError) {
      console.error('❌ Error obteniendo suscripciones pendientes:', pendingError.message)
      return
    }
    
    console.log(`📊 Suscripciones pendientes encontradas: ${pendingSubscriptions?.length || 0}`)
    
    if (pendingSubscriptions && pendingSubscriptions.length > 0) {
      console.log('\n📋 Análisis de formatos de external_reference:')
      
      pendingSubscriptions.forEach((sub, index) => {
        console.log(`\n   ${index + 1}. ID: ${sub.id}`)
        console.log(`      External Reference: ${sub.external_reference}`)
        console.log(`      User ID: ${sub.user_id}`)
        console.log(`      Product ID: ${sub.product_id}`)
        console.log(`      Creado: ${new Date(sub.created_at).toLocaleString()}`)
        
        // Analizar formato
        const ref = sub.external_reference
        if (ref) {
          const parts = ref.split('-')
          console.log(`      Partes del reference: ${parts.length} partes`)
          console.log(`      Formato: ${parts.join(' | ')}`)
          
          // Verificar si sigue el formato esperado SUB-{userId}-{planId}-{hash8}
          const expectedPattern = /^SUB-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\w+-[a-f0-9]{8}$/i
          const isValidFormat = expectedPattern.test(ref)
          console.log(`      ✅ Formato válido: ${isValidFormat ? 'SÍ' : 'NO'}`)
          
          if (!isValidFormat) {
            console.log(`      ⚠️  PROBLEMA: Formato no coincide con patrón esperado`)
            
            // Intentar identificar el problema
            if (!ref.startsWith('SUB-')) {
              console.log(`      🔍 No comienza con 'SUB-'`)
            } else if (parts.length < 4) {
              console.log(`      🔍 Muy pocas partes (${parts.length}, esperadas: mínimo 4)`)
            } else {
              const userId = parts.slice(1, 6).join('-')
              const planId = parts.slice(6, -1).join('-')
              const hash = parts[parts.length - 1]
              
              console.log(`      🔍 User ID extraído: ${userId}`)
              console.log(`      🔍 Plan ID extraído: ${planId}`)
              console.log(`      🔍 Hash extraído: ${hash} (longitud: ${hash?.length})`)
              
              if (hash?.length !== 8) {
                console.log(`      ❌ Hash incorrecto (esperado: 8 caracteres)`)
              }
            }
          }
        } else {
          console.log(`      ❌ External reference es NULL`)
        }
      })
    }
    
    // 2. Obtener logs de webhook recientes
    console.log('\n\n2️⃣ Analizando logs de webhook recientes...')
    const { data: webhookLogs, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (webhookError) {
      console.error('❌ Error obteniendo logs de webhook:', webhookError.message)
    } else if (webhookLogs && webhookLogs.length > 0) {
      console.log(`📊 Logs de webhook encontrados: ${webhookLogs.length}`)
      
      webhookLogs.forEach((log, index) => {
        console.log(`\n   ${index + 1}. Webhook ID: ${log.id}`)
        console.log(`      Tipo: ${log.webhook_type || 'N/A'}`)
        console.log(`      Estado: ${log.status}`)
        console.log(`      Fecha: ${new Date(log.created_at).toLocaleString()}`)
        
        if (log.webhook_data) {
          try {
            const webhookData = typeof log.webhook_data === 'string' 
              ? JSON.parse(log.webhook_data) 
              : log.webhook_data
            
            if (webhookData.external_reference) {
              console.log(`      External Reference del webhook: ${webhookData.external_reference}`)
              
              // Verificar si este external_reference existe en la BD
              console.log(`      🔍 Buscando en BD...`)
            }
          } catch (e) {
            console.log(`      ⚠️ Error parseando webhook_data`)
          }
        }
        
        if (log.error_message) {
          console.log(`      ❌ Error: ${log.error_message}`)
        }
      })
    }
    
    // 3. Simular búsqueda de webhook
    console.log('\n\n3️⃣ Simulando búsqueda de webhook...')
    
    if (pendingSubscriptions && pendingSubscriptions.length > 0) {
      const testSub = pendingSubscriptions[0]
      const testRef = testSub.external_reference
      
      console.log(`🧪 Probando búsqueda con: ${testRef}`)
      
      // Simular búsqueda exacta como lo hace el webhook
      const { data: foundSub, error: searchError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', testRef)
        .single()
      
      if (searchError) {
        console.log(`❌ Error en búsqueda: ${searchError.message}`)
        console.log(`🔍 Código de error: ${searchError.code}`)
      } else if (foundSub) {
        console.log(`✅ Suscripción encontrada: ${foundSub.id}`)
        console.log(`   Estado: ${foundSub.status}`)
      } else {
        console.log(`❌ Suscripción NO encontrada`)
      }
    }
    
    // 4. Recomendaciones
    console.log('\n\n🎯 === DIAGNÓSTICO Y RECOMENDACIONES ===')
    console.log('\n📋 Problemas identificados:')
    console.log('   1. Múltiples formatos de external_reference en el sistema')
    console.log('   2. Webhooks buscan por external_reference exacto')
    console.log('   3. Si el formato no coincide, la suscripción no se encuentra')
    console.log('   4. Resultado: suscripciones quedan en estado "pending"')
    
    console.log('\n🔧 Soluciones recomendadas:')
    console.log('   1. Estandarizar formato de external_reference en todo el sistema')
    console.log('   2. Implementar búsqueda robusta en webhooks (múltiples criterios)')
    console.log('   3. Agregar validación de formato antes de crear suscripciones')
    console.log('   4. Implementar migración para corregir referencias existentes')
    
  } catch (error) {
    console.error('❌ Error en análisis:', error.message)
  }
}

// Ejecutar análisis
debugExternalReferenceMismatch().then(() => {
  console.log('\n✅ Análisis completado')
  process.exit(0)
}).catch(error => {
  console.error('❌ Error ejecutando análisis:', error.message)
  process.exit(1)
})