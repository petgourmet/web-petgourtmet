/**
 * Test End-to-End de Stripe
 * Ejecuta todas las pruebas en secuencia
 * Ejecutar con: pnpm tsx scripts/test-e2e-stripe.ts
 */

import 'dotenv/config'
import { stripe, stripeConfig, validateStripeConfig } from '../lib/stripe/config'

async function runE2ETests() {
  console.log('🚀 Iniciando pruebas End-to-End de Stripe\n')
  console.log('═'.repeat(60))
  console.log('\n')

  let allTestsPassed = true
  const results: Array<{ test: string; passed: boolean; message: string }> = []

  // TEST 1: Configuración
  console.log('TEST 1: Validación de Configuración')
  console.log('─'.repeat(60))
  try {
    const validation = validateStripeConfig()
    if (validation.isValid) {
      console.log('✅ PASÓ: Configuración válida\n')
      results.push({ test: 'Configuración', passed: true, message: 'Todas las variables configuradas' })
    } else {
      console.log('❌ FALLÓ: Errores en configuración')
      validation.errors.forEach(err => console.log(`   - ${err}`))
      console.log()
      results.push({ test: 'Configuración', passed: false, message: validation.errors.join(', ') })
      allTestsPassed = false
    }
  } catch (error: any) {
    console.log(`❌ FALLÓ: ${error.message}\n`)
    results.push({ test: 'Configuración', passed: false, message: error.message })
    allTestsPassed = false
  }

  // TEST 2: Conexión con API
  console.log('TEST 2: Conexión con Stripe API')
  console.log('─'.repeat(60))
  try {
    const balance = await stripe.balance.retrieve()
    console.log(`✅ PASÓ: Conexión exitosa`)
    console.log(`   Balance: ${balance.available.map(b => `${b.amount/100} ${b.currency.toUpperCase()}`).join(', ')}\n`)
    results.push({ test: 'Conexión API', passed: true, message: 'Conectado exitosamente' })
  } catch (error: any) {
    console.log(`❌ FALLÓ: ${error.message}\n`)
    results.push({ test: 'Conexión API', passed: false, message: error.message })
    allTestsPassed = false
  }

  // TEST 3: Crear Cliente de Prueba
  console.log('TEST 3: Crear Cliente de Prueba')
  console.log('─'.repeat(60))
  let testCustomerId: string | undefined
  try {
    const customer = await stripe.customers.create({
      email: 'test-e2e@petgourmet.test',
      name: 'Test E2E Customer',
      metadata: {
        test: 'e2e',
        created_at: new Date().toISOString(),
      },
    })
    testCustomerId = customer.id
    console.log(`✅ PASÓ: Cliente creado`)
    console.log(`   ID: ${customer.id}`)
    console.log(`   Email: ${customer.email}\n`)
    results.push({ test: 'Crear Cliente', passed: true, message: `Cliente ${customer.id}` })
  } catch (error: any) {
    console.log(`❌ FALLÓ: ${error.message}\n`)
    results.push({ test: 'Crear Cliente', passed: false, message: error.message })
    allTestsPassed = false
  }

  // TEST 4: Crear Producto de Prueba
  console.log('TEST 4: Crear Producto de Prueba')
  console.log('─'.repeat(60))
  let testPriceId: string | undefined
  try {
    const product = await stripe.products.create({
      name: 'Test E2E Product',
      description: 'Producto para testing E2E',
      metadata: {
        test: 'e2e',
      },
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 10000, // $100 MXN
      currency: stripeConfig.currency,
      metadata: {
        test: 'e2e',
      },
    })

    testPriceId = price.id
    console.log(`✅ PASÓ: Producto y precio creados`)
    console.log(`   Producto ID: ${product.id}`)
    console.log(`   Precio ID: ${price.id}`)
    console.log(`   Monto: $100 MXN\n`)
    results.push({ test: 'Crear Producto', passed: true, message: `Producto ${product.id}` })
  } catch (error: any) {
    console.log(`❌ FALLÓ: ${error.message}\n`)
    results.push({ test: 'Crear Producto', passed: false, message: error.message })
    allTestsPassed = false
  }

  // TEST 5: Crear Sesión de Checkout
  console.log('TEST 5: Crear Sesión de Checkout')
  console.log('─'.repeat(60))
  let sessionId: string | undefined
  if (testPriceId) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer: testCustomerId,
        line_items: [
          {
            price: testPriceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${stripeConfig.successUrl.oneTime}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: stripeConfig.cancelUrl,
        metadata: {
          test: 'e2e',
        },
      })

      sessionId = session.id
      console.log(`✅ PASÓ: Sesión de checkout creada`)
      console.log(`   Session ID: ${session.id}`)
      console.log(`   Status: ${session.status}`)
      console.log(`   URL: ${session.url}\n`)
      results.push({ test: 'Crear Checkout', passed: true, message: `Sesión ${session.id}` })
    } catch (error: any) {
      console.log(`❌ FALLÓ: ${error.message}\n`)
      results.push({ test: 'Crear Checkout', passed: false, message: error.message })
      allTestsPassed = false
    }
  } else {
    console.log(`⏭️  SALTADO: No hay precio de prueba\n`)
    results.push({ test: 'Crear Checkout', passed: false, message: 'Sin precio de prueba' })
  }

  // TEST 6: Recuperar Sesión
  console.log('TEST 6: Recuperar Información de Sesión')
  console.log('─'.repeat(60))
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      console.log(`✅ PASÓ: Sesión recuperada`)
      console.log(`   Payment Status: ${session.payment_status}`)
      console.log(`   Amount Total: ${session.amount_total ? session.amount_total/100 : 0} ${session.currency?.toUpperCase()}\n`)
      results.push({ test: 'Recuperar Sesión', passed: true, message: 'Sesión recuperada' })
    } catch (error: any) {
      console.log(`❌ FALLÓ: ${error.message}\n`)
      results.push({ test: 'Recuperar Sesión', passed: false, message: error.message })
      allTestsPassed = false
    }
  } else {
    console.log(`⏭️  SALTADO: No hay sesión de prueba\n`)
    results.push({ test: 'Recuperar Sesión', passed: false, message: 'Sin sesión de prueba' })
  }

  // LIMPIEZA: Eliminar datos de prueba
  console.log('LIMPIEZA: Eliminando datos de prueba')
  console.log('─'.repeat(60))
  if (testCustomerId) {
    try {
      await stripe.customers.del(testCustomerId)
      console.log(`✅ Cliente de prueba eliminado: ${testCustomerId}`)
    } catch (error: any) {
      console.log(`⚠️  No se pudo eliminar cliente: ${error.message}`)
    }
  }
  console.log('ℹ️  Nota: Productos y precios deben eliminarse manualmente desde el dashboard')
  console.log()

  // RESUMEN
  console.log('═'.repeat(60))
  console.log('📊 RESUMEN DE PRUEBAS')
  console.log('═'.repeat(60))
  console.log()

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} Test ${index + 1}: ${result.test}`)
    console.log(`   ${result.message}`)
  })

  console.log()
  console.log('─'.repeat(60))
  
  const passedTests = results.filter(r => r.passed).length
  const totalTests = results.length
  const percentage = Math.round((passedTests / totalTests) * 100)

  console.log(`Resultado: ${passedTests}/${totalTests} pruebas pasaron (${percentage}%)`)
  console.log()

  if (allTestsPassed) {
    console.log('🎉 ÉXITO: Todas las pruebas pasaron!')
    console.log('✨ Stripe está completamente configurado y funcionando')
    console.log()
    console.log('Próximos pasos:')
    console.log('1. Ejecutar: pnpm stripe:setup (crear productos reales)')
    console.log('2. Probar checkout en navegador: pnpm stripe:checkout')
    console.log('3. Revisar dashboard: https://dashboard.stripe.com/test')
    console.log()
  } else {
    console.log('⚠️  ADVERTENCIA: Algunas pruebas fallaron')
    console.log('Por favor revisa los errores arriba y corrige la configuración')
    console.log()
    process.exit(1)
  }
}

// Ejecutar pruebas E2E
runE2ETests().catch(error => {
  console.error('💥 Error inesperado:', error)
  process.exit(1)
})
