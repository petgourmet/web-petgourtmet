/**
 * Script de prueba integral para validar que todos los campos críticos
 * se guarden correctamente en unified_subscriptions
 * 
 * Campos críticos a validar:
 * - product_name, product_image, transaction_amount
 * - base_price, discounted_price, discount_percentage
 * - size, product_id, processed_at
 * - cart_items, customer_data
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Cargar variables de entorno desde .env
function loadEnvVariables() {
  try {
    const envPath = path.join(__dirname, '..', '.env')
    const envContent = fs.readFileSync(envPath, 'utf8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim()
        }
      }
    })
    
    return envVars
  } catch (error) {
    console.error('Error leyendo archivo .env:', error.message)
    return {}
  }
}

const envVars = loadEnvVariables()

// Configuración de Supabase
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Variables de entorno de Supabase no configuradas')
  console.log('Necesitas configurar:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Campos críticos que deben estar presentes
const CRITICAL_FIELDS = [
  'product_name',
  'product_image', 
  'transaction_amount',
  'base_price',
  'discounted_price',
  'discount_percentage',
  'size',
  'product_id',
  'processed_at',
  'cart_items',
  'customer_data'
]

/**
 * Valida que una suscripción tenga todos los campos críticos
 */
function validateSubscriptionFields(subscription, subscriptionSource) {
  const results = {
    valid: true,
    missing: [],
    empty: [],
    present: []
  }

  CRITICAL_FIELDS.forEach(field => {
    if (!(field in subscription)) {
      results.missing.push(field)
      results.valid = false
    } else if (subscription[field] === null || subscription[field] === undefined || subscription[field] === '') {
      results.empty.push(field)
      results.valid = false
    } else {
      results.present.push(field)
    }
  })

  return {
    ...results,
    subscriptionId: subscription.id,
    subscriptionSource,
    status: subscription.status,
    externalReference: subscription.external_reference
  }
}

/**
 * Obtiene suscripciones de diferentes fuentes para validar
 */
async function getSubscriptionsToTest() {
  console.log('🔍 Obteniendo suscripciones para validar...')
  
  try {
    // Obtener suscripciones recientes de diferentes estados
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      throw new Error(`Error obteniendo suscripciones: ${error.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️  No se encontraron suscripciones para validar')
      return []
    }

    console.log(`✅ Encontradas ${subscriptions.length} suscripciones para validar`)
    return subscriptions
  } catch (error) {
    console.error('❌ Error obteniendo suscripciones:', error.message)
    return []
  }
}

/**
 * Genera reporte detallado de validación
 */
function generateValidationReport(validationResults) {
  console.log('\n📊 REPORTE DE VALIDACIÓN DE CAMPOS CRÍTICOS')
  console.log('=' .repeat(60))
  
  const totalSubscriptions = validationResults.length
  const validSubscriptions = validationResults.filter(r => r.valid).length
  const invalidSubscriptions = totalSubscriptions - validSubscriptions
  
  console.log(`\n📈 RESUMEN GENERAL:`)
  console.log(`   Total suscripciones analizadas: ${totalSubscriptions}`)
  console.log(`   ✅ Válidas (todos los campos): ${validSubscriptions}`)
  console.log(`   ❌ Inválidas (campos faltantes): ${invalidSubscriptions}`)
  console.log(`   📊 Porcentaje de éxito: ${((validSubscriptions / totalSubscriptions) * 100).toFixed(1)}%`)

  if (invalidSubscriptions > 0) {
    console.log('\n❌ SUSCRIPCIONES CON PROBLEMAS:')
    console.log('-'.repeat(40))
    
    validationResults
      .filter(r => !r.valid)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. Suscripción ID: ${result.subscriptionId}`)
        console.log(`   Estado: ${result.status}`)
        console.log(`   External Reference: ${result.externalReference || 'N/A'}`)
        
        if (result.missing.length > 0) {
          console.log(`   🚫 Campos faltantes: ${result.missing.join(', ')}`)
        }
        
        if (result.empty.length > 0) {
          console.log(`   📭 Campos vacíos: ${result.empty.join(', ')}`)
        }
        
        console.log(`   ✅ Campos presentes: ${result.present.join(', ')}`)
      })
  }

  // Análisis por campo
  console.log('\n📋 ANÁLISIS POR CAMPO:')
  console.log('-'.repeat(40))
  
  const fieldStats = {}
  CRITICAL_FIELDS.forEach(field => {
    const present = validationResults.filter(r => r.present.includes(field)).length
    const missing = validationResults.filter(r => r.missing.includes(field)).length
    const empty = validationResults.filter(r => r.empty.includes(field)).length
    
    fieldStats[field] = { present, missing, empty }
    
    const successRate = ((present / totalSubscriptions) * 100).toFixed(1)
    const status = successRate === '100.0' ? '✅' : '❌'
    
    console.log(`${status} ${field}: ${successRate}% (${present}/${totalSubscriptions})`)
    if (missing > 0) console.log(`     🚫 Faltantes: ${missing}`)
    if (empty > 0) console.log(`     📭 Vacíos: ${empty}`)
  })

  return {
    totalSubscriptions,
    validSubscriptions,
    invalidSubscriptions,
    successRate: (validSubscriptions / totalSubscriptions) * 100,
    fieldStats
  }
}

/**
 * Función principal de validación
 */
async function runValidation() {
  console.log('🚀 INICIANDO VALIDACIÓN DE CAMPOS CRÍTICOS EN SUSCRIPCIONES')
  console.log('=' .repeat(70))
  
  try {
    // Obtener suscripciones para validar
    const subscriptions = await getSubscriptionsToTest()
    
    if (subscriptions.length === 0) {
      console.log('⚠️  No hay suscripciones para validar')
      return
    }

    // Validar cada suscripción
    console.log('\n🔍 Validando campos críticos...')
    const validationResults = subscriptions.map(subscription => {
      return validateSubscriptionFields(subscription, 'database')
    })

    // Generar reporte
    const report = generateValidationReport(validationResults)
    
    // Conclusiones y recomendaciones
    console.log('\n🎯 CONCLUSIONES Y RECOMENDACIONES:')
    console.log('-'.repeat(50))
    
    if (report.successRate === 100) {
      console.log('🎉 ¡EXCELENTE! Todas las suscripciones tienen todos los campos críticos')
      console.log('✅ El sistema está guardando correctamente todos los datos necesarios')
    } else if (report.successRate >= 80) {
      console.log('⚠️  BUENO: La mayoría de suscripciones tienen los campos críticos')
      console.log('🔧 Revisar y corregir los casos problemáticos identificados')
    } else {
      console.log('❌ CRÍTICO: Muchas suscripciones tienen campos faltantes')
      console.log('🚨 ACCIÓN REQUERIDA: Revisar urgentemente el flujo de creación de suscripciones')
    }
    
    console.log('\n📝 PRÓXIMOS PASOS:')
    if (report.invalidSubscriptions > 0) {
      console.log('1. Revisar las funciones de creación de suscripciones identificadas como problemáticas')
      console.log('2. Implementar correcciones para asegurar que todos los campos se guarden')
      console.log('3. Ejecutar este script nuevamente para validar las correcciones')
      console.log('4. Considerar migración de datos para suscripciones existentes con campos faltantes')
    } else {
      console.log('1. Mantener monitoreo regular de la integridad de datos')
      console.log('2. Incluir este script en el proceso de CI/CD para validación continua')
    }
    
  } catch (error) {
    console.error('❌ Error durante la validación:', error.message)
    process.exit(1)
  }
}

// Ejecutar validación si el script se ejecuta directamente
if (require.main === module) {
  runValidation()
    .then(() => {
      console.log('\n✅ Validación completada')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error.message)
      process.exit(1)
    })
}

module.exports = {
  runValidation,
  validateSubscriptionFields,
  CRITICAL_FIELDS
}