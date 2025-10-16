// app/api/test-webhook/route.ts
// Endpoint para probar webhooks con datos reales de la base de datos

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Iniciando prueba de webhook...')
    
    // Crear cliente de Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar la suscripción más reciente con mercadopago_subscription_id
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .not('mercadopago_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !subscriptions || subscriptions.length === 0) {
      console.error('❌ No se encontraron suscripciones con mercadopago_subscription_id', error)
      return NextResponse.json({
        error: 'No se encontraron suscripciones para probar',
        details: error?.message
      }, { status: 404 })
    }

    const subscription = subscriptions[0]
    console.log('✅ Suscripción encontrada:', {
      id: subscription.id,
      mercadopago_subscription_id: subscription.mercadopago_subscription_id,
      status: subscription.status
    })

    // Preparar webhook simulado con datos reales
    const webhookPayload = {
      action: "updated",
      application_id: process.env.CLIENT_ID,
      data: {
        id: subscription.mercadopago_subscription_id
      },
      date_created: new Date().toISOString(),
      entity: "preapproval",
      id: subscription.mercadopago_subscription_id,
      type: "subscription_preapproval",
      version: 8
    }

    console.log('📤 Enviando webhook simulado:', webhookPayload)

    // Llamar al endpoint de webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature-development',
        'x-request-id': `test-${Date.now()}`
      },
      body: JSON.stringify(webhookPayload)
    })

    const responseData = await response.text()
    
    console.log('📥 Respuesta del webhook:', {
      status: response.status,
      statusText: response.statusText,
      body: responseData
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        mercadopago_subscription_id: subscription.mercadopago_subscription_id,
        status: subscription.status
      },
      webhook: {
        url: webhookUrl,
        payload: webhookPayload,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseData
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Error en prueba de webhook:', error)
    return NextResponse.json({
      error: 'Error en prueba de webhook',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
