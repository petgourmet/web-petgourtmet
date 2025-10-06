/**
 * Script de prueba para la nueva API de Preapproval
 * 
 * Este script verifica que:
 * 1. La API acepta los parámetros correctamente
 * 2. Llama a MercadoPago con el external_reference en el body
 * 3. Actualiza la suscripción con preapproval_id e init_point
 * 4. Retorna el init_point para redirección
 * 
 * Uso: npx ts-node scripts/test-preapproval-api.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  message: string
  data?: any
}

const results: TestResult[] = []

function addResult(name: string, status: 'pass' | 'fail' | 'skip', message: string, data?: any) {
  results.push({ name, status, message, data })
  const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️'
  console.log(`${emoji} ${name}: ${message}`)
  if (data) {
    console.log('   Datos:', JSON.stringify(data, null, 2))
  }
}

async function testPreapprovalAPI() {
  console.log('🚀 Iniciando pruebas de API de Preapproval...\n')

  // Test 1: Verificar que existe una suscripción de prueba
  console.log('📋 Test 1: Buscar suscripción de prueba')
  const { data: testSub, error: subError } = await supabase
    .from('unified_subscriptions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (subError || !testSub) {
    addResult('Buscar suscripción', 'fail', 'No se encontró suscripción de prueba', { error: subError })
    console.log('\n⚠️  Para ejecutar estas pruebas, necesitas una suscripción pendiente en la base de datos')
    console.log('   Puedes crear una desde la UI o ejecutar:')
    console.log('   INSERT INTO unified_subscriptions (user_id, product_id, status, external_reference, ...)')
    return
  }

  addResult('Buscar suscripción', 'pass', `Encontrada suscripción ID: ${testSub.id}`, {
    id: testSub.id,
    external_reference: testSub.external_reference,
    status: testSub.status,
    product_name: testSub.product_name
  })

  // Test 2: Llamar a la API con datos de prueba
  console.log('\n📋 Test 2: Llamar API de Preapproval')
  
  const requestBody = {
    external_reference: testSub.external_reference,
    subscription_id: testSub.id,
    payer_email: 'test@petgourmet.com',
    payer_first_name: 'Test',
    payer_last_name: 'User',
    transaction_amount: testSub.transaction_amount || 29990,
    reason: `Suscripción Test - ${testSub.product_name}`,
    frequency: testSub.frequency || 1,
    frequency_type: testSub.frequency_type || 'months'
  }

  console.log('   Enviando request:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch('http://localhost:3000/api/mercadopago/create-subscription-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const responseData = await response.json()

    if (!response.ok) {
      addResult('API Preapproval', 'fail', `Error ${response.status}: ${responseData.error}`, responseData)
      console.log('\n⚠️  La API retornó un error. Verifica:')
      console.log('   1. El servidor está corriendo (npm run dev)')
      console.log('   2. Las variables de entorno están configuradas')
      console.log('   3. El token de MercadoPago es válido')
      return
    }

    addResult('API Preapproval', 'pass', 'API respondió correctamente', {
      preapproval_id: responseData.preapproval_id,
      external_reference: responseData.external_reference,
      init_point: responseData.init_point?.substring(0, 50) + '...'
    })

    // Test 3: Verificar que se actualizó la suscripción
    console.log('\n📋 Test 3: Verificar actualización en DB')
    const { data: updatedSub, error: updateError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', testSub.id)
      .single()

    if (updateError || !updatedSub) {
      addResult('Verificar DB', 'fail', 'Error al leer suscripción actualizada', { error: updateError })
      return
    }

    const hasPreapprovalId = !!updatedSub.mercadopago_preapproval_id
    const hasInitPoint = !!updatedSub.mercadopago_init_point

    if (!hasPreapprovalId || !hasInitPoint) {
      addResult('Verificar DB', 'fail', 'Suscripción no fue actualizada correctamente', {
        hasPreapprovalId,
        hasInitPoint
      })
      return
    }

    addResult('Verificar DB', 'pass', 'Suscripción actualizada con preapproval_id e init_point', {
      preapproval_id: updatedSub.mercadopago_preapproval_id,
      init_point: updatedSub.mercadopago_init_point?.substring(0, 50) + '...',
      updated_at: updatedSub.updated_at
    })

    // Test 4: Verificar que external_reference coincide
    console.log('\n📋 Test 4: Verificar external_reference')
    const externalRefMatch = responseData.external_reference === testSub.external_reference

    if (!externalRefMatch) {
      addResult('Verificar external_reference', 'fail', 'External reference no coincide', {
        expected: testSub.external_reference,
        received: responseData.external_reference
      })
      return
    }

    addResult('Verificar external_reference', 'pass', 'External reference coincide correctamente', {
      external_reference: testSub.external_reference
    })

    // Test 5: Verificar formato del init_point
    console.log('\n📋 Test 5: Verificar formato de init_point')
    const initPointValid = responseData.init_point.startsWith('https://www.mercadopago.com')

    if (!initPointValid) {
      addResult('Verificar init_point', 'fail', 'Init point no tiene formato válido', {
        init_point: responseData.init_point
      })
      return
    }

    addResult('Verificar init_point', 'pass', 'Init point es URL válida de MercadoPago', {
      init_point: responseData.init_point.substring(0, 50) + '...'
    })

  } catch (error: any) {
    addResult('API Preapproval', 'fail', `Error de conexión: ${error.message}`, { error: error.toString() })
    console.log('\n⚠️  No se pudo conectar con la API. Verifica:')
    console.log('   1. El servidor está corriendo: npm run dev')
    console.log('   2. El puerto 3000 está disponible')
    return
  }

  // Resumen final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE PRUEBAS')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length

  console.log(`✅ Pasadas: ${passed}`)
  console.log(`❌ Fallidas: ${failed}`)
  console.log(`⏭️  Omitidas: ${skipped}`)
  console.log(`📝 Total: ${results.length}`)

  if (failed === 0) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!')
    console.log('✨ La API de Preapproval está funcionando correctamente')
    console.log('✨ El external_reference se está enviando en el body')
    console.log('✨ La suscripción se actualiza correctamente en la DB')
    console.log('\n🚀 Próximos pasos:')
    console.log('   1. Hacer commit de los cambios')
    console.log('   2. Push a GitHub/Vercel')
    console.log('   3. Probar en producción con una suscripción real')
  } else {
    console.log('\n❌ ALGUNAS PRUEBAS FALLARON')
    console.log('⚠️  Revisa los errores arriba antes de hacer deploy')
  }
}

// Ejecutar pruebas
testPreapprovalAPI().catch(error => {
  console.error('❌ Error ejecutando pruebas:', error)
  process.exit(1)
})
