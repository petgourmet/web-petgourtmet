const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Función para generar external_reference estandarizado
function generateStandardExternalReference(userId, planId) {
  const hash = crypto.randomBytes(4).toString('hex')
  return `SUB-${userId}-${planId}-${hash}`
}

// Función para extraer información del external_reference actual
function parseExternalReference(externalRef) {
  if (!externalRef) return null
  
  // Formato estándar: SUB-{userId}-{planId}-{hash8}
  const standardMatch = externalRef.match(/^SUB-([^-]+)-([^-]+)-([a-f0-9]{8})$/)
  if (standardMatch) {
    return {
      format: 'standard',
      userId: standardMatch[1],
      planId: standardMatch[2],
      hash: standardMatch[3]
    }
  }
  
  // Formato con UUID completo: SUB-{uuid}-{planId}-{hash8}
  const uuidMatch = externalRef.match(/^SUB-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([^-]+)-([a-f0-9]{8})$/)
  if (uuidMatch) {
    return {
      format: 'uuid',
      userId: uuidMatch[1],
      planId: uuidMatch[2],
      hash: uuidMatch[3]
    }
  }
  
  // Formato con timestamp: SUB-{userId}-default-{timestamp}
  const timestampMatch = externalRef.match(/^SUB-([^-]+)-default-(\d+)$/)
  if (timestampMatch) {
    return {
      format: 'timestamp',
      userId: timestampMatch[1],
      planId: 'default',
      timestamp: timestampMatch[2]
    }
  }
  
  // Formato de test
  if (externalRef.includes('test')) {
    return {
      format: 'test',
      original: externalRef
    }
  }
  
  return {
    format: 'unknown',
    original: externalRef
  }
}

async function analyzeExternalReferences() {
  console.log('🔍 Analizando external_reference en suscripciones...\n')
  
  try {
    // Obtener todas las suscripciones
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('id, user_id, product_id, external_reference, status, created_at, subscription_type')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error al obtener suscripciones:', error)
      return
    }
    
    console.log(`📊 Total de suscripciones: ${subscriptions.length}\n`)
    
    const formatStats = {
      standard: 0,
      uuid: 0,
      timestamp: 0,
      test: 0,
      unknown: 0,
      null: 0
    }
    
    const problematicRefs = []
    
    subscriptions.forEach(sub => {
      if (!sub.external_reference) {
        formatStats.null++
        problematicRefs.push({
          id: sub.id,
          issue: 'null_reference',
          current: null,
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          status: sub.status
        })
        return
      }
      
      const parsed = parseExternalReference(sub.external_reference)
      formatStats[parsed.format]++
      
      if (parsed.format !== 'standard') {
        problematicRefs.push({
          id: sub.id,
          issue: `format_${parsed.format}`,
          current: sub.external_reference,
          parsed,
          user_id: sub.user_id,
          product_id: sub.product_id,
          subscription_type: sub.subscription_type,
          status: sub.status
        })
      }
    })
    
    console.log('📈 Estadísticas de formatos:')
    Object.entries(formatStats).forEach(([format, count]) => {
      const percentage = ((count / subscriptions.length) * 100).toFixed(1)
      console.log(`  ${format}: ${count} (${percentage}%)`)
    })
    
    console.log(`\n⚠️  Referencias problemáticas: ${problematicRefs.length}`)
    
    if (problematicRefs.length > 0) {
      console.log('\n🔧 Referencias que necesitan corrección:')
      problematicRefs.slice(0, 10).forEach(ref => {
        console.log(`  ID: ${ref.id}`)
        console.log(`    Issue: ${ref.issue}`)
        console.log(`    Current: ${ref.current}`)
        console.log(`    User ID: ${ref.user_id}`)
        console.log(`    Product ID: ${ref.product_id}`)
        console.log(`    Subscription Type: ${ref.subscription_type}`)
        console.log(`    Status: ${ref.status}`)
        
        if (ref.user_id && (ref.product_id || ref.subscription_type)) {
          const planId = ref.product_id || ref.subscription_type
          const suggested = generateStandardExternalReference(ref.user_id, planId)
          console.log(`    Suggested: ${suggested}`)
        }
        console.log('')
      })
      
      if (problematicRefs.length > 10) {
        console.log(`    ... y ${problematicRefs.length - 10} más`)
      }
    }
    
    return {
      total: subscriptions.length,
      formatStats,
      problematicRefs
    }
    
  } catch (error) {
    console.error('❌ Error en análisis:', error)
  }
}

async function fixExternalReferences(dryRun = true) {
  console.log(`\n${dryRun ? '🧪 MODO SIMULACIÓN' : '🔧 APLICANDO CORRECCIONES'}\n`)
  
  try {
    const analysis = await analyzeExternalReferences()
    if (!analysis || analysis.problematicRefs.length === 0) {
      console.log('✅ No hay referencias que corregir')
      return
    }
    
    console.log(`\n🔧 ${dryRun ? 'Simulando' : 'Aplicando'} correcciones...\n`)
    
    let fixed = 0
    let errors = 0
    
    for (const ref of analysis.problematicRefs) {
      try {
        let newExternalRef = null
        
        // Solo corregir si tenemos user_id y product_id/subscription_type válidos
        if (ref.user_id && (ref.product_id || ref.subscription_type) && ref.user_id !== 'guest') {
          const planId = ref.product_id || ref.subscription_type
          newExternalRef = generateStandardExternalReference(ref.user_id, planId)
          
          console.log(`${dryRun ? '📝' : '✅'} ID: ${ref.id}`)
          console.log(`    Actual: ${ref.current}`)
          console.log(`    Nuevo: ${newExternalRef}`)
          
          if (!dryRun) {
            const { error } = await supabase
              .from('unified_subscriptions')
              .update({ 
                external_reference: newExternalRef,
                updated_at: new Date().toISOString()
              })
              .eq('id', ref.id)
            
            if (error) {
              console.log(`    ❌ Error: ${error.message}`)
              errors++
            } else {
              console.log(`    ✅ Actualizado`)
              fixed++
            }
          } else {
            fixed++
          }
        } else {
          console.log(`⚠️  Saltando ID: ${ref.id} (datos insuficientes)`)
          console.log(`    User ID: ${ref.user_id}`)
          console.log(`    Product ID: ${ref.product_id}`)
          console.log(`    Subscription Type: ${ref.subscription_type}`)
        }
        
        console.log('')
        
      } catch (error) {
        console.error(`❌ Error procesando ${ref.id}:`, error.message)
        errors++
      }
    }
    
    console.log(`\n📊 Resumen:`)
    console.log(`  ${dryRun ? 'Simuladas' : 'Corregidas'}: ${fixed}`)
    console.log(`  Errores: ${errors}`)
    console.log(`  Total procesadas: ${analysis.problematicRefs.length}`)
    
  } catch (error) {
    console.error('❌ Error en corrección:', error)
  }
}

async function main() {
  console.log('🚀 Script de corrección de external_reference\n')
  
  const args = process.argv.slice(2)
  const command = args[0] || 'analyze'
  
  switch (command) {
    case 'analyze':
      await analyzeExternalReferences()
      break
      
    case 'fix-dry':
      await fixExternalReferences(true)
      break
      
    case 'fix-apply':
      console.log('⚠️  ATENCIÓN: Esto modificará la base de datos')
      console.log('Presiona Ctrl+C para cancelar o espera 5 segundos...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      await fixExternalReferences(false)
      break
      
    default:
      console.log('Comandos disponibles:')
      console.log('  analyze    - Analizar formatos actuales')
      console.log('  fix-dry    - Simular correcciones')
      console.log('  fix-apply  - Aplicar correcciones')
  }
}

main().catch(console.error)