/**
 * Script para probar si OXXO está disponible en Stripe
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

async function testOXXO() {
  console.log('🔍 Verificando disponibilidad de OXXO...\n')

  try {
    // Intentar crear una sesión de checkout con OXXO
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'oxxo'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Producto de Prueba',
            },
            unit_amount: 50000, // $500 MXN
          },
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      customer_email: 'test@example.com',
      billing_address_collection: 'auto',
      payment_method_options: {
        oxxo: {
          expires_after_days: 3,
        },
      },
    })

    console.log('✅ OXXO está habilitado correctamente!')
    console.log('\n📋 Detalles de la sesión:')
    console.log('Session ID:', session.id)
    console.log('URL:', session.url)
    console.log('Payment Method Types:', session.payment_method_types)
    console.log('\n✅ Puedes usar este enlace para probar:')
    console.log(session.url)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    
    if (error.code === 'parameter_invalid_empty') {
      console.log('\n⚠️ OXXO no está disponible en modo test.')
      console.log('Necesitas activarlo en modo producción.')
    } else if (error.message.includes('oxxo')) {
      console.log('\n⚠️ OXXO no está habilitado en tu cuenta.')
      console.log('Actívalo en: https://dashboard.stripe.com/settings/payment_methods')
    } else {
      console.log('\n❌ Error desconocido:', error)
    }
  }
}

testOXXO()
