// Script para validar que los registros de suscripción tengan todos los campos necesarios
const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Campos requeridos para una suscripción completa
const REQUIRED_FIELDS = [
  'user_id',
  'external_reference',
  'product_id',
  'product_name',
  'base_price',
  'customer_data',
  'cart_items',
  'subscription_type',
  'status'
]

// Campos opcionales pero importantes
const IMPORTANT_FIELDS = [
  'mercadopago_subscription_id',
  'payer_email',
  'next_billing_date',
  'metadata'
]

async function validateSubscriptionFields() {
  try {
    console.log('🔍 Validando campos de suscripciones...')
    
    // Obtener todas las suscripciones
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error obteniendo suscripciones:', error)
      return
    }
    
    console.log(`📊 Total de suscripciones encontradas: ${subscriptions.length}`)
    
    let completeCount = 0
    let incompleteCount = 0
    const incompleteSubscriptions = []
    
    subscriptions.forEach((subscription, index) => {
      const missingFields = []
      const emptyFields = []
      
      // Verificar campos requeridos
      REQUIRED_FIELDS.forEach(field => {
        if (!subscription[field]) {
          missingFields.push(field)
        } else if (field === 'base_price' && (parseFloat(subscription[field]) <= 0)) {
          emptyFields.push(`${field} (valor inválido: ${subscription[field]})`)
        } else if (field === 'customer_data' || field === 'cart_items') {
          try {
            const parsed = typeof subscription[field] === 'string' 
              ? JSON.parse(subscription[field]) 
              : subscription[field]
            if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
              emptyFields.push(`${field} (vacío o inválido)`)
            }
          } catch (e) {
            emptyFields.push(`${field} (JSON inválido)`)
          }
        }
      })
      
      const isComplete = missingFields.length === 0 && emptyFields.length === 0
      
      if (isComplete) {
        completeCount++
      } else {
        incompleteCount++
        incompleteSubscriptions.push({
          id: subscription.id,
          external_reference: subscription.external_reference,
          user_id: subscription.user_id,
          status: subscription.status,
          created_at: subscription.created_at,
          missingFields,
          emptyFields
        })
      }
      
      // Mostrar progreso cada 10 registros
      if ((index + 1) % 10 === 0) {
        console.log(`📈 Procesados: ${index + 1}/${subscriptions.length}`)
      }
    })
    
    // Mostrar resumen
    console.log('\n📋 RESUMEN DE VALIDACIÓN:')
    console.log(`✅ Suscripciones completas: ${completeCount}`)
    console.log(`❌ Suscripciones incompletas: ${incompleteCount}`)
    console.log(`📊 Porcentaje de completitud: ${((completeCount / subscriptions.length) * 100).toFixed(2)}%`)
    
    // Mostrar detalles de suscripciones incompletas
    if (incompleteSubscriptions.length > 0) {
      console.log('\n🔍 SUSCRIPCIONES INCOMPLETAS:')
      incompleteSubscriptions.slice(0, 10).forEach((sub, index) => {
        console.log(`\n${index + 1}. ID: ${sub.id}`)
        console.log(`   External Reference: ${sub.external_reference}`)
        console.log(`   User ID: ${sub.user_id}`)
        console.log(`   Status: ${sub.status}`)
        console.log(`   Created: ${sub.created_at}`)
        if (sub.missingFields.length > 0) {
          console.log(`   Campos faltantes: ${sub.missingFields.join(', ')}`)
        }
        if (sub.emptyFields.length > 0) {
          console.log(`   Campos vacíos/inválidos: ${sub.emptyFields.join(', ')}`)
        }
      })
      
      if (incompleteSubscriptions.length > 10) {
        console.log(`\n... y ${incompleteSubscriptions.length - 10} más`)
      }
    }
    
    // Verificar duplicados por external_reference
    console.log('\n🔍 Verificando duplicados por external_reference...')
    const externalRefs = {}
    const duplicates = []
    
    subscriptions.forEach(sub => {
      if (sub.external_reference) {
        if (externalRefs[sub.external_reference]) {
          externalRefs[sub.external_reference].push(sub)
        } else {
          externalRefs[sub.external_reference] = [sub]
        }
      }
    })
    
    Object.entries(externalRefs).forEach(([ref, subs]) => {
      if (subs.length > 1) {
        duplicates.push({ external_reference: ref, count: subs.length, subscriptions: subs })
      }
    })
    
    if (duplicates.length > 0) {
      console.log(`❌ Se encontraron ${duplicates.length} external_references duplicados:`)
      duplicates.slice(0, 5).forEach((dup, index) => {
        console.log(`\n${index + 1}. External Reference: ${dup.external_reference} (${dup.count} registros)`)
        dup.subscriptions.forEach((sub, subIndex) => {
          console.log(`   ${subIndex + 1}. ID: ${sub.id}, Status: ${sub.status}, Created: ${sub.created_at}`)
        })
      })
    } else {
      console.log('✅ No se encontraron duplicados por external_reference')
    }
    
    console.log('\n✅ Validación completada')
    
  } catch (error) {
    console.error('❌ Error durante la validación:', error)
  }
}

// Ejecutar validación
validateSubscriptionFields()