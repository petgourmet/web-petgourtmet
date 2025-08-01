// Script para analizar la orden 90 y generar informe
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 Verificando configuración...')
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ No configurado')
console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Configurado' : '❌ No configurado')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  console.log('\n💡 Asegúrate de que el archivo .env.local contenga:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase')
  console.log('SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeOrder90() {
  console.log('\n🔍 INFORME: Análisis de la Orden 90')
  console.log('=' .repeat(50))
  
  try {
    // 1. Obtener datos de la orden 90
    console.log('\n1. DATOS DE LA ORDEN 90:')
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', 90)
      .single()
    
    if (orderError || !order) {
      console.error('❌ Error obteniendo orden 90:', orderError)
      return
    }
    
    console.log('📋 Orden encontrada:')
    console.log('  - ID:', order.id)
    console.log('  - Cliente:', order.customer_name)
    console.log('  - Teléfono:', order.customer_phone)
    console.log('  - Estado:', order.status)
    console.log('  - Estado de pago:', order.payment_status)
    console.log('  - Total:', order.total)
    console.log('  - Método de pago:', order.payment_method)
    console.log('  - Payment ID:', order.payment_intent_id)
    console.log('  - MercadoPago Payment ID:', order.mercadopago_payment_id)
    console.log('  - Fecha creación:', order.created_at)
    console.log('  - Fecha confirmación:', order.confirmed_at)
    
    // 2. Analizar datos del shipping_address (contiene los items)
    console.log('\n2. ANÁLISIS DE ITEMS:')
    if (order.shipping_address) {
      try {
        const orderData = JSON.parse(order.shipping_address)
        console.log('📦 Items en la orden:')
        
        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach((item, index) => {
            console.log(`  Item ${index + 1}:`)
            console.log(`    - ID: ${item.id}`)
            console.log(`    - Nombre: ${item.name}`)
            console.log(`    - Descripción: ${item.description}`)
            console.log(`    - Cantidad: ${item.quantity}`)
            console.log(`    - Precio unitario: $${item.unit_price}`)
            console.log(`    - Precio total: $${item.price}`)
            
            // Verificar si es suscripción
            const isSubscription = item.description?.includes('Suscripción') || 
                                 item.description?.includes('suscripción')
            console.log(`    - ¿Es suscripción?: ${isSubscription ? '✅ SÍ' : '❌ NO'}`)
          })
        }
        
        console.log('\n📧 Datos del cliente:')
        if (orderData.customer_data) {
          console.log('  - Nombre:', orderData.customer_data.firstName, orderData.customer_data.lastName)
          console.log('  - Email:', orderData.customer_data.email)
          console.log('  - Teléfono:', orderData.customer_data.phone)
        }
        
      } catch (parseError) {
        console.error('❌ Error parseando shipping_address:', parseError)
      }
    } else {
      console.log('⚠️ No hay datos de shipping_address')
    }
    
    // 3. Verificar si existe en user_subscriptions
    console.log('\n3. VERIFICACIÓN EN TABLA user_subscriptions:')
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .or(`external_reference.eq.90,external_reference.like.%90%`)
    
    if (subError) {
      console.error('❌ Error consultando suscripciones:', subError)
    } else if (subscriptions && subscriptions.length > 0) {
      console.log('✅ Suscripciones encontradas:')
      subscriptions.forEach(sub => {
        console.log(`  - ID: ${sub.id}`)
        console.log(`  - Producto: ${sub.product_name}`)
        console.log(`  - Estado: ${sub.status}`)
        console.log(`  - Referencia externa: ${sub.external_reference}`)
      })
    } else {
      console.log('❌ NO se encontraron suscripciones para la orden 90')
    }
    
    // 4. Verificar historial de facturación
    console.log('\n4. VERIFICACIÓN EN HISTORIAL DE FACTURACIÓN:')
    const { data: billing, error: billError } = await supabase
      .from('subscription_billing_history')
      .select('*')
      .or(`mercadopago_payment_id.eq.${order.mercadopago_payment_id},mercadopago_payment_id.eq.${order.payment_intent_id}`)
    
    if (billError) {
      console.error('❌ Error consultando historial de facturación:', billError)
    } else if (billing && billing.length > 0) {
      console.log('✅ Registros de facturación encontrados:')
      billing.forEach(bill => {
        console.log(`  - ID: ${bill.id}`)
        console.log(`  - Suscripción ID: ${bill.subscription_id}`)
        console.log(`  - Monto: $${bill.amount}`)
        console.log(`  - Estado: ${bill.status}`)
      })
    } else {
      console.log('❌ NO se encontraron registros de facturación')
    }
    
    // 5. Buscar usuario por email
    console.log('\n5. VERIFICACIÓN DE USUARIO:')
    if (order.shipping_address) {
      try {
        const orderData = JSON.parse(order.shipping_address)
        if (orderData.customer_data?.email) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', orderData.customer_data.email)
            .single()
          
          if (profileError) {
            console.log('⚠️ Usuario no encontrado en profiles:', orderData.customer_data.email)
          } else {
            console.log('✅ Usuario encontrado:')
            console.log(`  - ID: ${profile.auth_users_id}`)
            console.log(`  - Email: ${profile.email}`)
            console.log(`  - Nombre: ${profile.first_name} ${profile.last_name}`)
          }
        }
      } catch (e) {
        console.log('⚠️ No se pudo extraer email del cliente')
      }
    }
    
    // 6. Diagnóstico y recomendaciones
    console.log('\n6. DIAGNÓSTICO Y CAUSAS DEL PROBLEMA:')
    console.log('=' .repeat(50))
    
    // Analizar por qué no se guardó como suscripción
    let hasSubscriptionItems = false
    if (order.shipping_address) {
      try {
        const orderData = JSON.parse(order.shipping_address)
        hasSubscriptionItems = orderData.items?.some(item => 
          item.description?.includes('Suscripción') || 
          item.description?.includes('suscripción')
        )
      } catch (e) {}
    }
    
    if (hasSubscriptionItems) {
      console.log('🔍 PROBLEMA IDENTIFICADO:')
      console.log('  ✅ La orden SÍ contiene items de suscripción')
      console.log('  ❌ Pero NO se creó registro en user_subscriptions')
      console.log('  ❌ NO se creó historial de facturación')
      
      console.log('\n🚨 CAUSAS POSIBLES:')
      console.log('  1. El webhook de MercadoPago no procesó correctamente la orden')
      console.log('  2. La función updateSubscriptionBilling falló')
      console.log('  3. No se detectó como suscripción en el flujo de pago')
      console.log('  4. Error en la lógica de identificación de suscripciones')
      
      console.log('\n💡 SOLUCIONES RECOMENDADAS:')
      console.log('  1. Ejecutar script de corrección para crear la suscripción manualmente')
      console.log('  2. Revisar logs del webhook para esta orden específica')
      console.log('  3. Verificar configuración de MercadoPago')
      console.log('  4. Implementar validación adicional en el checkout')
    } else {
      console.log('⚠️ La orden NO contiene items de suscripción identificables')
    }
    
    // 7. Estado actual del pago
    console.log('\n7. ESTADO ACTUAL DEL PAGO:')
    console.log('=' .repeat(30))
    console.log(`  - Estado de la orden: ${order.status}`)
    console.log(`  - Estado del pago: ${order.payment_status}`)
    console.log(`  - ¿Pago completado?: ${order.payment_status === 'paid' ? '✅ SÍ' : '❌ NO'}`)
    console.log(`  - ¿Orden confirmada?: ${order.confirmed_at ? '✅ SÍ' : '❌ NO'}`)
    
    if (order.payment_status !== 'paid') {
      console.log('\n🚨 PROBLEMA ADICIONAL:')
      console.log('  - El pago NO está marcado como completado')
      console.log('  - Esto indica que el webhook no actualizó el estado correctamente')
    }
    
  } catch (error) {
    console.error('💥 Error en el análisis:', error)
  }
}

// Ejecutar análisis
analyzeOrder90().then(() => {
  console.log('\n🏁 Análisis completado')
  process.exit(0)
}).catch(error => {
  console.error('💥 Error fatal:', error)
  process.exit(1)
})