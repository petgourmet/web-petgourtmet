import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Verificar estado de Supabase
    let supabaseStatus = 'healthy'
    try {
      const { data, error } = await supabase.from('products').select('count').limit(1)
      if (error) supabaseStatus = 'error'
    } catch (error) {
      supabaseStatus = 'error'
    }

    // Verificar estado de MercadoPago
    let mercadopagoStatus = 'healthy'
    try {
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payment_methods', {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      })
      if (!mpResponse.ok) mercadopagoStatus = 'error'
    } catch (error) {
      mercadopagoStatus = 'error'
    }

    // Verificar estado del servicio de email
    let emailStatus = 'healthy'
    if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
      emailStatus = 'warning'
    }

    // Verificar estado de webhooks
    let webhooksStatus = 'healthy'
    try {
      const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`, {
        method: 'GET'
      })
      if (!webhookResponse.ok && webhookResponse.status !== 405) {
        webhooksStatus = 'error'
      }
    } catch (error) {
      webhooksStatus = 'error'
    }

    // Obtener métricas del sistema
    const metrics = await getSystemMetrics(supabase)

    return NextResponse.json({
      status: {
        supabase: supabaseStatus,
        mercadopago: mercadopagoStatus,
        email: emailStatus,
        webhooks: webhooksStatus
      },
      metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error checking system status:', error)
    return NextResponse.json(
      { error: 'Error al verificar el estado del sistema' },
      { status: 500 }
    )
  }
}

async function getSystemMetrics(supabase: any) {
  try {
    // Obtener total de órdenes
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
    
    const totalOrders = ordersData?.length || 0
    const successfulPayments = ordersData?.filter((order: any) => 
      order.payment_status === 'approved' || order.payment_status === 'paid'
    ).length || 0
    const failedPayments = ordersData?.filter((order: any) => 
      order.payment_status === 'rejected' || order.payment_status === 'cancelled'
    ).length || 0

    // Obtener suscripciones activas
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('unified_subscriptions')
      .select('id')
      .eq('status', 'active')
    
    const activeSubscriptions = subscriptionsData?.length || 0

    // Obtener webhooks recibidos (últimas 24 horas)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: webhooksData, error: webhooksError } = await supabase
      .from('webhook_logs')
      .select('id')
      .gte('created_at', yesterday.toISOString())
    
    const webhooksReceived = webhooksData?.length || 0

    // Calcular tiempo de respuesta promedio (simulado por ahora)
    const avgResponseTime = Math.floor(Math.random() * 200) + 50

    return {
      totalOrders,
      successfulPayments,
      failedPayments,
      activeSubscriptions,
      webhooksReceived,
      avgResponseTime
    }
  } catch (error) {
    console.error('Error getting system metrics:', error)
    return {
      totalOrders: 0,
      successfulPayments: 0,
      failedPayments: 0,
      activeSubscriptions: 0,
      webhooksReceived: 0,
      avgResponseTime: 0
    }
  }
}