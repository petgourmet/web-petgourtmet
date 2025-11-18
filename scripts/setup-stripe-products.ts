/**
 * Script para crear productos y precios de prueba en Stripe
 * Ejecutar con: pnpm tsx scripts/setup-stripe-products.ts
 */

import 'dotenv/config'
import { stripe, stripeConfig } from '../lib/stripe/config'

async function setupStripeProducts() {
  console.log('🛒 Configurando productos de prueba en Stripe...\n')

  try {
    // 1. Producto de suscripción mensual
    console.log('📦 Creando producto: Plan Premium Mensual')
    const monthlyProduct = await stripe.products.create({
      name: 'Plan Premium Mensual - PetGourmet',
      description: 'Suscripción mensual al plan premium con comida personalizada para tu mascota',
      images: ['https://petgourmet.mx/images/plan-premium.jpg'],
      metadata: {
        type: 'subscription',
        interval: 'monthly',
      },
    })
    console.log(`✅ Producto creado: ${monthlyProduct.id}`)

    const monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 79900, // $799 MXN
      currency: stripeConfig.currency,
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan_type: 'premium',
      },
    })
    console.log(`💰 Precio creado: ${monthlyPrice.id} - $799 MXN/mes\n`)

    // 2. Producto de suscripción anual (con descuento)
    console.log('📦 Creando producto: Plan Premium Anual')
    const yearlyProduct = await stripe.products.create({
      name: 'Plan Premium Anual - PetGourmet',
      description: 'Suscripción anual al plan premium con comida personalizada para tu mascota (ahorro del 20%)',
      images: ['https://petgourmet.mx/images/plan-premium.jpg'],
      metadata: {
        type: 'subscription',
        interval: 'yearly',
      },
    })
    console.log(`✅ Producto creado: ${yearlyProduct.id}`)

    const yearlyPrice = await stripe.prices.create({
      product: yearlyProduct.id,
      unit_amount: 767000, // $7,670 MXN (ahorro de ~20%)
      currency: stripeConfig.currency,
      recurring: {
        interval: 'year',
      },
      metadata: {
        plan_type: 'premium',
        discount: '20',
      },
    })
    console.log(`💰 Precio creado: ${yearlyPrice.id} - $7,670 MXN/año\n`)

    // 3. Producto individual (compra única)
    console.log('📦 Creando producto: Comida Premium Individual')
    const oneTimeProduct = await stripe.products.create({
      name: 'Comida Premium Individual - PetGourmet',
      description: 'Bolsa de comida premium personalizada para tu mascota (compra única)',
      images: ['https://petgourmet.mx/images/product-bag.jpg'],
      metadata: {
        type: 'one_time',
        weight: '3kg',
      },
    })
    console.log(`✅ Producto creado: ${oneTimeProduct.id}`)

    const oneTimePrice = await stripe.prices.create({
      product: oneTimeProduct.id,
      unit_amount: 49900, // $499 MXN
      currency: stripeConfig.currency,
      metadata: {
        product_type: 'food_bag',
      },
    })
    console.log(`💰 Precio creado: ${oneTimePrice.id} - $499 MXN\n`)

    // 4. Producto de snack (compra única)
    console.log('📦 Creando producto: Snacks Premium')
    const snackProduct = await stripe.products.create({
      name: 'Snacks Premium - PetGourmet',
      description: 'Pack de snacks saludables para premiar a tu mascota',
      images: ['https://petgourmet.mx/images/snacks.jpg'],
      metadata: {
        type: 'one_time',
        category: 'snacks',
      },
    })
    console.log(`✅ Producto creado: ${snackProduct.id}`)

    const snackPrice = await stripe.prices.create({
      product: snackProduct.id,
      unit_amount: 19900, // $199 MXN
      currency: stripeConfig.currency,
      metadata: {
        product_type: 'snacks',
      },
    })
    console.log(`💰 Precio creado: ${snackPrice.id} - $199 MXN\n`)

    // Resumen
    console.log('✨ Productos y precios creados exitosamente!\n')
    console.log('📋 Resumen:')
    console.log('   1. Plan Premium Mensual - $799 MXN/mes')
    console.log('   2. Plan Premium Anual - $7,670 MXN/año')
    console.log('   3. Comida Premium Individual - $499 MXN')
    console.log('   4. Snacks Premium - $199 MXN\n')
    
    console.log('🔗 IDs de precios para usar en tu código:')
    console.log(`   Monthly: ${monthlyPrice.id}`)
    console.log(`   Yearly: ${yearlyPrice.id}`)
    console.log(`   One-time: ${oneTimePrice.id}`)
    console.log(`   Snacks: ${snackPrice.id}\n`)
    
    console.log('📊 Ver en dashboard: https://dashboard.stripe.com/test/products\n')

  } catch (error: any) {
    console.error('❌ Error al crear productos:', error.message)
    process.exit(1)
  }
}

// Ejecutar setup
setupStripeProducts().catch(error => {
  console.error('💥 Error inesperado:', error)
  process.exit(1)
})
