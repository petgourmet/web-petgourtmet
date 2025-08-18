import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      planId = 'test-plan', 
      amount = 2500, 
      userEmail = 'test@petgourmet.com',
      frequency = 'monthly'
    } = body
    
    const supabase = createClient()
    
    // Crear suscripción de prueba
    const subscriptionId = uuidv4()
    const testSubscription = {
      id: subscriptionId,
      user_email: userEmail,
      plan_id: planId,
      plan_name: 'Plan de Prueba',
      amount: amount,
      frequency: frequency,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'mercadopago',
      next_billing_date: getNextBillingDate(frequency),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Insertar suscripción en la base de datos
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(testSubscription)
    
    if (subscriptionError) {
      console.error('Error creating test subscription:', subscriptionError)
      return NextResponse.json(
        { error: 'Error al crear suscripción de prueba', details: subscriptionError.message },
        { status: 500 }
      )
    }
    
    // Crear orden inicial para la suscripción
    const orderId = uuidv4()
    const testOrder = {
      id: orderId,
      user_email: userEmail,
      subscription_id: subscriptionId,
      total_amount: amount,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'mercadopago',
      items: [
        {
          subscription_id: subscriptionId,
          name: `Suscripción ${frequency === 'monthly' ? 'Mensual' : 'Anual'} - Plan de Prueba`,
          price: amount,
          quantity: 1
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
    
    if (orderError) {
      console.error('Error creating subscription order:', orderError)
      return NextResponse.json(
        { error: 'Error al crear orden de suscripción', details: orderError.message },
        { status: 500 }
      )
    }
    
    // Simular activación de suscripción después de 3 segundos
    setTimeout(async () => {
      try {
        // Actualizar suscripción como activa
        const { error: updateSubError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'paid',
            payment_id: `test_sub_payment_${Date.now()}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId)
        
        if (updateSubError) {
          console.error('Error updating test subscription:', updateSubError)
        }
        
        // Actualizar orden como pagada
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            payment_id: `test_sub_payment_${Date.now()}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
        
        if (updateOrderError) {
          console.error('Error updating subscription order:', updateOrderError)
        }
        
        // Registrar webhook simulado
        await supabase
          .from('webhook_logs')
          .insert({
            event_type: 'subscription.authorized',
            payment_id: `test_sub_payment_${Date.now()}`,
            subscription_id: subscriptionId,
            order_id: orderId,
            status: 'processed',
            raw_data: {
              action: 'subscription.authorized',
              api_version: 'v1',
              data: {
                id: `test_sub_payment_${Date.now()}`,
                preapproval_id: subscriptionId
              },
              date_created: new Date().toISOString(),
              id: Date.now(),
              live_mode: false,
              type: 'subscription',
              user_id: 'test_user'
            },
            created_at: new Date().toISOString()
          })
      } catch (error) {
        console.error('Error in simulated subscription webhook:', error)
      }
    }, 3000)
    
    return NextResponse.json({
      success: true,
      message: 'Suscripción de prueba creada exitosamente',
      subscriptionId,
      orderId,
      amount,
      frequency,
      userEmail,
      nextBillingDate: testSubscription.next_billing_date,
      note: 'La suscripción se activará automáticamente en 3 segundos'
    })
    
  } catch (error) {
    console.error('Error simulating subscription:', error)
    return NextResponse.json(
      { error: 'Error al simular suscripción' },
      { status: 500 }
    )
  }
}

function getNextBillingDate(frequency: string): string {
  const now = new Date()
  if (frequency === 'monthly') {
    now.setMonth(now.getMonth() + 1)
  } else if (frequency === 'yearly') {
    now.setFullYear(now.getFullYear() + 1)
  }
  return now.toISOString()
}