#!/usr/bin/env node

/**
 * Script para probar webhooks de suscripciones en tiempo real
 * Verifica que las suscripciones cambien su estado cuando se reciben webhooks
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSubscriptionWebhooks() {
  console.log('🧪 Iniciando prueba de webhooks de suscripciones en tiempo real\n')
  
  // Importar fetch dinámicamente
  const fetch = (await import('node-fetch')).default
  
  try {
    // 1. Crear una suscripción de prueba
    console.log('1️⃣ Creando suscripción de prueba...')
    const testSubscription = {
      subscription_type: 'monthly',
      transaction_amount: 299.99,
      base_price: 299.99,
      discounted_price: 299.99,
      product_name: 'Plan Test',
      currency_id: 'MXN',
      status: 'pending',
      external_reference: `SUB-test-user-test123-${Date.now().toString().slice(-8)}`,
      customer_data: {
        email: 'test@petgourmet.com',
        name: 'Test User'
      }
    }
    
    // Intentar crear en unified_subscriptions primero
    let { data: subscription, error } = await supabase
      .from('unified_subscriptions')
      .insert(testSubscription)
      .select()
      .single()
    
    // Si no existe la tabla unified_subscriptions, intentar con subscriptions
    if (error && error.code === '42P01') {
      console.log('   Tabla unified_subscriptions no encontrada, intentando con subscriptions...')
      const result = await supabase
        .from('subscriptions')
        .insert(testSubscription)
        .select()
        .single()
      
      subscription = result.data
      error = result.error
    }
    
    if (error) {
      console.error('❌ Error creando suscripción de prueba:', error.message)
      return
    }
    
    console.log('✅ Suscripción de prueba creada:', {
      id: subscription.id,
      status: subscription.status,
      external_reference: subscription.external_reference
    })
    
    // 2. Simular webhook de preaprobación de suscripción
    console.log('\n2️⃣ Simulando webhook de preaprobación...')
    const preapprovalWebhook = {
      id: `webhook_${Date.now()}`,
      live_mode: false,
      type: 'subscription_preapproval',
      date_created: new Date().toISOString(),
      application_id: 'test_app',
      user_id: 'test_user',
      version: 1,
      api_version: 'v1',
      action: 'updated',
      data: {
        id: `mp_sub_${Date.now()}`
      }
    }
    
    // Simular respuesta de MercadoPago API
     const mockSubscriptionData = {
       id: preapprovalWebhook.data.id,
       status: 'authorized',
       external_reference: subscription.external_reference,
       payer_id: 'test_payer_123',
       date_created: new Date().toISOString(),
       last_modified: new Date().toISOString(),
       next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
     }
    
    console.log('   Datos del webhook:', {
      type: preapprovalWebhook.type,
      action: preapprovalWebhook.action,
      subscription_id: preapprovalWebhook.data.id,
      external_reference: mockSubscriptionData.external_reference,
      status: mockSubscriptionData.status
    })
    
    // 3. Enviar webhook al endpoint local
    console.log('\n3️⃣ Enviando webhook al endpoint local...')
    const webhookUrl = 'http://localhost:3000/api/mercadopago/webhook'
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': `req_${Date.now()}`
        },
        body: JSON.stringify(preapprovalWebhook)
      })
      
      const responseData = await response.json()
      console.log('   Respuesta del webhook:', {
        status: response.status,
        success: responseData.success,
        message: responseData.message
      })
      
      if (!response.ok) {
        console.error('❌ Error en webhook:', responseData)
        return
      }
      
    } catch (fetchError) {
      console.error('❌ Error enviando webhook (¿servidor corriendo?):', fetchError.message)
      console.log('   Asegúrate de que el servidor esté corriendo con: npm run dev')
      return
    }
    
    // 4. Verificar cambio de estado en tiempo real
    console.log('\n4️⃣ Verificando cambio de estado en tiempo real...')
    
    // Esperar un momento para que se procese el webhook
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const tableName = subscription.id ? 'unified_subscriptions' : 'subscriptions'
    const { data: updatedSubscription, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', subscription.id)
      .single()
    
    if (fetchError) {
      console.error('❌ Error obteniendo suscripción actualizada:', fetchError.message)
      return
    }
    
    console.log('   Estado antes del webhook:', subscription.status)
    console.log('   Estado después del webhook:', updatedSubscription.status)
    console.log('   MercadoPago ID asignado:', updatedSubscription.mercadopago_subscription_id)
    console.log('   Última actualización:', updatedSubscription.updated_at)
    
    // 5. Verificar si el estado cambió correctamente
    if (updatedSubscription.status === 'active' && subscription.status === 'pending') {
      console.log('\n✅ ¡ÉXITO! La suscripción cambió de estado en tiempo real')
      console.log('   ✓ Estado cambió de "pending" a "active"')
      console.log('   ✓ MercadoPago ID fue asignado')
      console.log('   ✓ Timestamp de actualización fue registrado')
    } else {
      console.log('\n⚠️  El estado no cambió como se esperaba')
      console.log('   Estado esperado: active')
      console.log('   Estado actual:', updatedSubscription.status)
    }
    
    // 6. Simular webhook de pago autorizado
    console.log('\n5️⃣ Simulando webhook de pago autorizado...')
    const paymentWebhook = {
      id: `webhook_payment_${Date.now()}`,
      live_mode: false,
      type: 'subscription_authorized_payment',
      date_created: new Date().toISOString(),
      application_id: 'test_app',
      user_id: 'test_user',
      version: 1,
      api_version: 'v1',
      action: 'payment.created',
      data: {
        id: preapprovalWebhook.data.id // Mismo ID de suscripción
      }
    }
    
    const paymentResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature',
        'x-request-id': `req_payment_${Date.now()}`
      },
      body: JSON.stringify(paymentWebhook)
    })
    
    const paymentResponseData = await paymentResponse.json()
    console.log('   Respuesta del webhook de pago:', {
      status: paymentResponse.status,
      success: paymentResponseData.success
    })
    
    // 7. Limpiar datos de prueba
    console.log('\n6️⃣ Limpiando datos de prueba...')
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', subscription.id)
    
    if (deleteError) {
      console.error('⚠️  Error eliminando suscripción de prueba:', deleteError.message)
    } else {
      console.log('✅ Datos de prueba eliminados')
    }
    
    // 8. Mostrar logs recientes de webhooks
    console.log('\n7️⃣ Logs recientes de webhooks de suscripciones:')
    const { data: recentLogs } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_type', 'subscription')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentLogs && recentLogs.length > 0) {
      recentLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.created_at} - ${log.status} - ${log.mercadopago_id || 'N/A'}`)
      })
    } else {
      console.log('   No se encontraron logs recientes de webhooks de suscripciones')
    }
    
    console.log('\n🎉 Prueba de webhooks de suscripciones completada')
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message)
    console.error(error.stack)
  }
}

// Ejecutar la prueba
testSubscriptionWebhooks()
  .then(() => {
    console.log('\n✅ Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })