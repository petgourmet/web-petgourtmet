import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Obtener métricas de órdenes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status, payment_status, created_at')
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
    }
    
    // Obtener métricas de suscripciones
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('unified_subscriptions')
      .select('status, created_at')
    
    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
    }
    
    // Obtener webhooks recientes
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhook_logs')
      .select('created_at, event_type')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError)
    }
    
    // Calcular métricas
    const totalOrders = orders?.length || 0
    const totalSubscriptions = subscriptions?.length || 0
    const successfulPayments = orders?.filter(o => o.payment_status === 'paid').length || 0
    const failedPayments = orders?.filter(o => o.payment_status === 'failed').length || 0
    const webhooksReceived = webhooks?.length || 0
    const lastWebhook = webhooks?.[0]?.created_at
    
    return NextResponse.json({
      totalOrders,
      totalSubscriptions,
      successfulPayments,
      failedPayments,
      webhooksReceived,
      lastWebhook
    })
    
  } catch (error) {
    console.error('Error getting metrics:', error)
    return NextResponse.json(
      { error: 'Error al obtener métricas' },
      { status: 500 }
    )
  }
}