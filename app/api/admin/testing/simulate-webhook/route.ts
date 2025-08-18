import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verificar autenticación de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si es admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { type } = await request.json()

    if (!type) {
      return NextResponse.json({ error: 'Tipo de webhook requerido' }, { status: 400 })
    }

    // Generar datos de prueba según el tipo
    let webhookData: any = {}
    let eventType = type
    let status = 'success'
    let errorMessage = null

    switch (type) {
      case 'payment.created':
        webhookData = {
          id: `test_payment_${Date.now()}`,
          status: 'approved',
          status_detail: 'accredited',
          payment_method_id: 'visa',
          payment_type_id: 'credit_card',
          transaction_amount: 1500,
          currency_id: 'ARS',
          payer: {
            email: 'test@petgourmet.com',
            identification: {
              type: 'DNI',
              number: '12345678'
            }
          },
          external_reference: `order_test_${Date.now()}`,
          date_created: new Date().toISOString(),
          date_approved: new Date().toISOString()
        }
        break

      case 'subscription.created':
        webhookData = {
          id: `test_subscription_${Date.now()}`,
          status: 'authorized',
          payer_id: 123456789,
          payer_email: 'test@petgourmet.com',
          external_reference: `subscription_test_${Date.now()}`,
          reason: 'Suscripción PetGourmet Premium',
          init_point: 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=test',
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: 2500,
            currency_id: 'ARS'
          },
          date_created: new Date().toISOString()
        }
        break

      case 'payment.failed':
        status = 'failed'
        errorMessage = 'Tarjeta rechazada por fondos insuficientes'
        webhookData = {
          id: `test_payment_failed_${Date.now()}`,
          status: 'rejected',
          status_detail: 'cc_rejected_insufficient_amount',
          payment_method_id: 'visa',
          payment_type_id: 'credit_card',
          transaction_amount: 1500,
          currency_id: 'ARS',
          payer: {
            email: 'test@petgourmet.com'
          },
          external_reference: `order_test_failed_${Date.now()}`,
          date_created: new Date().toISOString()
        }
        break

      default:
        return NextResponse.json({ error: 'Tipo de webhook no soportado' }, { status: 400 })
    }

    // Simular tiempo de procesamiento
    const processingTime = Math.floor(Math.random() * 500) + 100 // 100-600ms
    await new Promise(resolve => setTimeout(resolve, processingTime))

    // Registrar el webhook simulado en la base de datos
    const { data: webhookLog, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        event_type: eventType,
        source: 'manual',
        payload: webhookData,
        status: status,
        error_message: errorMessage,
        processing_time: processingTime,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging webhook:', logError)
      return NextResponse.json({ error: 'Error al registrar webhook' }, { status: 500 })
    }

    // Si es un webhook de pago exitoso, crear/actualizar la orden correspondiente
    if (type === 'payment.created' && status === 'success') {
      const orderReference = webhookData.external_reference
      
      // Buscar si existe una orden con esta referencia
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('reference', orderReference)
        .single()

      if (!existingOrder) {
        // Crear una orden de prueba
        await supabase
          .from('orders')
          .insert({
            reference: orderReference,
            user_id: user.id,
            total_amount: webhookData.transaction_amount,
            status: 'completed',
            payment_status: 'paid',
            payment_method: 'credit_card',
            payment_id: webhookData.id,
            items: [{
              product_id: 'test-product',
              name: 'Producto de Prueba',
              quantity: 1,
              price: webhookData.transaction_amount
            }],
            created_at: new Date().toISOString()
          })
      } else {
        // Actualizar orden existente
        await supabase
          .from('orders')
          .update({
            status: 'completed',
            payment_status: 'paid',
            payment_id: webhookData.id,
            updated_at: new Date().toISOString()
          })
          .eq('reference', orderReference)
      }
    }

    // Si es un webhook de suscripción, crear/actualizar la suscripción
    if (type === 'subscription.created' && status === 'success') {
      const subscriptionReference = webhookData.external_reference
      
      await supabase
        .from('subscriptions')
        .upsert({
          reference: subscriptionReference,
          user_id: user.id,
          plan_id: 'premium',
          status: 'active',
          amount: webhookData.auto_recurring.transaction_amount,
          frequency: 'monthly',
          mercadopago_subscription_id: webhookData.id,
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
    }

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhookLog.id,
        type: eventType,
        status: status,
        data: webhookData,
        processingTime: processingTime
      }
    })

  } catch (error) {
    console.error('Error simulating webhook:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}