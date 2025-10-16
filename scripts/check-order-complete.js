#!/usr/bin/env node

/**
 * Script para verificar estructura completa de la orden
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables de entorno de Supabase requeridas no encontradas')
  process.exit(1)
}

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.error('❌ MERCADOPAGO_ACCESS_TOKEN no configurado')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkOrder(orderId) {
  console.log(`🔍 Verificando orden ${orderId}...`)
  
  try {
    // 1. Buscar la orden
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Orden no encontrada:', orderError?.message)
      return
    }

    console.log('\n✅ Orden encontrada:')
    console.log({
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
      mercadopago_preference_id: order.mercadopago_preference_id,
      mercadopago_payment_id: order.mercadopago_payment_id
    })

    // 2. Si tiene preference_id, consultar MercadoPago
    if (order.mercadopago_preference_id) {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

      try {
        // Obtener preference
        const response = await fetch(`https://api.mercadopago.com/checkout/preferences/${order.mercadopago_preference_id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (response.ok) {
          const preference = await response.json()
          console.log('✅ Preference en MercadoPago:')
          console.log({
            id: preference.id,
            external_reference: preference.external_reference,
            init_point: preference.init_point
          })

          // Buscar pagos
          const extRef = preference.external_reference || orderId
          
          const searchResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${extRef}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })

          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            console.log(`\n✅ Pagos encontrados: ${searchData.results?.length || 0}`)
            
            if (searchData.results && searchData.results.length > 0) {
              searchData.results.forEach(payment => {
                console.log(`\n💳 Payment ID: ${payment.id}`)
                console.log(`   Status: ${payment.status}`)
                console.log(`   Status Detail: ${payment.status_detail}`)
                console.log(`   Amount: ${payment.transaction_amount}`)
                console.log(`   Date: ${payment.date_created}`)
              })
            }
          }
        } else {
          console.log(`❌ Preference no encontrada: ${response.status}`)
        }
      } catch (error) {
        console.error('❌ Error:', error.message)
      }
    }
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

const orderId = process.argv[2] || '208'
checkOrder(orderId)
