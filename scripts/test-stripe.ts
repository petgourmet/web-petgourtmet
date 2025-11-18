/**
 * Script de prueba para verificar la configuración de Stripe
 * Ejecutar con: pnpm tsx scripts/test-stripe.ts
 */

import 'dotenv/config'
import { stripe, stripeConfig, validateStripeConfig } from '../lib/stripe/config'

async function testStripeConnection() {
  console.log('🧪 Iniciando pruebas de Stripe...\n')

  // 1. Validar configuración
  console.log('📋 Validando configuración...')
  const validation = validateStripeConfig()
  
  if (!validation.isValid) {
    console.error('❌ Errores de configuración:')
    validation.errors.forEach(error => console.error(`  - ${error}`))
    process.exit(1)
  }
  
  console.log('✅ Configuración válida')
  console.log(`   - Currency: ${stripeConfig.currency}`)
  console.log(`   - Success URL: ${stripeConfig.successUrl.oneTime}`)
  console.log(`   - Cancel URL: ${stripeConfig.cancelUrl}\n`)

  // 2. Verificar conexión con Stripe API
  console.log('🔌 Verificando conexión con Stripe API...')
  try {
    const balance = await stripe.balance.retrieve()
    console.log('✅ Conexión exitosa con Stripe')
    console.log(`   - Balance disponible: ${balance.available.map(b => `${b.amount/100} ${b.currency.toUpperCase()}`).join(', ')}`)
    console.log(`   - Balance pendiente: ${balance.pending.map(b => `${b.amount/100} ${b.currency.toUpperCase()}`).join(', ')}\n`)
  } catch (error: any) {
    console.error('❌ Error al conectar con Stripe:', error.message)
    process.exit(1)
  }

  // 3. Listar productos (si existen)
  console.log('📦 Listando productos en Stripe...')
  try {
    const products = await stripe.products.list({ limit: 5 })
    console.log(`✅ ${products.data.length} producto(s) encontrado(s)`)
    products.data.forEach(product => {
      console.log(`   - ${product.name} (${product.id}) - ${product.active ? 'Activo' : 'Inactivo'}`)
    })
    console.log()
  } catch (error: any) {
    console.error('❌ Error al listar productos:', error.message)
  }

  // 4. Listar precios (si existen)
  console.log('💰 Listando precios en Stripe...')
  try {
    const prices = await stripe.prices.list({ limit: 5 })
    console.log(`✅ ${prices.data.length} precio(s) encontrado(s)`)
    prices.data.forEach(price => {
      const amount = price.unit_amount ? `${price.unit_amount/100} ${price.currency.toUpperCase()}` : 'N/A'
      const interval = price.recurring ? `/${price.recurring.interval}` : ' (único)'
      console.log(`   - ${price.id}: ${amount}${interval}`)
    })
    console.log()
  } catch (error: any) {
    console.error('❌ Error al listar precios:', error.message)
  }

  // 5. Listar clientes (si existen)
  console.log('👥 Listando clientes en Stripe...')
  try {
    const customers = await stripe.customers.list({ limit: 5 })
    console.log(`✅ ${customers.data.length} cliente(s) encontrado(s)`)
    customers.data.forEach(customer => {
      console.log(`   - ${customer.email || 'Sin email'} (${customer.id})`)
    })
    console.log()
  } catch (error: any) {
    console.error('❌ Error al listar clientes:', error.message)
  }

  // 6. Verificar webhook secret
  console.log('🔐 Verificando Webhook Secret...')
  if (stripeConfig.webhookSecret) {
    console.log('✅ Webhook secret configurado')
    console.log(`   - Secret: ${stripeConfig.webhookSecret.substring(0, 15)}...\n`)
  } else {
    console.warn('⚠️  Webhook secret no configurado (opcional para desarrollo)\n')
  }

  console.log('✨ Todas las pruebas completadas exitosamente!\n')
  console.log('📝 Siguiente paso: Crear productos y precios de prueba si no existen')
  console.log('   Dashboard: https://dashboard.stripe.com/test/products\n')
}

// Ejecutar pruebas
testStripeConnection().catch(error => {
  console.error('💥 Error inesperado:', error)
  process.exit(1)
})
