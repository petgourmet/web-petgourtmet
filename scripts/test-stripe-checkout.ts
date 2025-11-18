/**
 * Script para probar la creación de sesiones de Stripe Checkout
 * Ejecutar con: pnpm tsx scripts/test-stripe-checkout.ts
 */

import 'dotenv/config'
import { stripe, stripeConfig } from '../lib/stripe/config'

async function testStripeCheckout() {
  console.log('🧪 Probando creación de sesión de Stripe Checkout...\n')

  try {
    // Primero, obtener o crear un producto de prueba
    console.log('📦 Buscando productos disponibles...')
    const products = await stripe.products.list({ active: true, limit: 1 })
    
    let priceId: string
    
    if (products.data.length === 0) {
      console.log('⚠️  No hay productos, creando uno de prueba...')
      
      const testProduct = await stripe.products.create({
        name: 'Producto de Prueba - PetGourmet',
        description: 'Producto para testing',
      })
      
      const testPrice = await stripe.prices.create({
        product: testProduct.id,
        unit_amount: 50000, // $500 MXN
        currency: stripeConfig.currency,
      })
      
      priceId = testPrice.id
      console.log(`✅ Producto de prueba creado con precio: ${priceId}\n`)
    } else {
      // Obtener el precio del primer producto
      const prices = await stripe.prices.list({
        product: products.data[0].id,
        active: true,
        limit: 1,
      })
      
      if (prices.data.length === 0) {
        throw new Error('El producto no tiene precios configurados')
      }
      
      priceId = prices.data[0].id
      console.log(`✅ Usando precio existente: ${priceId}\n`)
    }

    // Crear sesión de checkout
    console.log('💳 Creando sesión de Stripe Checkout...')
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${stripeConfig.successUrl.oneTime}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeConfig.cancelUrl,
      metadata: {
        test: 'true',
        created_by: 'test-script',
      },
    })

    console.log('✅ Sesión de checkout creada exitosamente!\n')
    console.log('📋 Detalles de la sesión:')
    console.log(`   - Session ID: ${session.id}`)
    console.log(`   - Status: ${session.status}`)
    console.log(`   - Amount: ${session.amount_total ? session.amount_total/100 : 0} ${session.currency?.toUpperCase()}`)
    console.log(`   - Expira: ${new Date(session.expires_at * 1000).toLocaleString()}\n`)
    
    console.log('🔗 URL de pago (válida por 24 horas):')
    console.log(`   ${session.url}\n`)
    
    console.log('💡 Tip: Puedes abrir esta URL en tu navegador para probar el flujo de pago')
    console.log('   Tarjetas de prueba: https://docs.stripe.com/testing#cards\n')
    
    // Tarjetas de prueba útiles
    console.log('💳 Tarjetas de prueba útiles:')
    console.log('   ✅ Éxito: 4242 4242 4242 4242')
    console.log('   ❌ Declinada: 4000 0000 0000 0002')
    console.log('   🔐 3D Secure: 4000 0027 6000 3184')
    console.log('   📅 Cualquier fecha futura y cualquier CVC\n')

  } catch (error: any) {
    console.error('❌ Error al crear sesión de checkout:', error.message)
    if (error.type) {
      console.error(`   Tipo: ${error.type}`)
    }
    process.exit(1)
  }
}

// Ejecutar prueba
testStripeCheckout().catch(error => {
  console.error('💥 Error inesperado:', error)
  process.exit(1)
})
