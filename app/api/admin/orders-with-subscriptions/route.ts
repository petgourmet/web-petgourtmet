// app/api/admin/orders-with-subscriptions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Obtener todas las órdenes que contengan items de suscripción
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items!inner (
          id,
          product_name,
          quantity,
          price,
          is_subscription
        )
      `)
      .eq('order_items.is_subscription', true)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('❌ Error obteniendo órdenes con suscripciones:', ordersError)
      return NextResponse.json(
        { error: 'Error obteniendo órdenes' },
        { status: 500 }
      )
    }

    // Obtener suscripciones activas relacionadas
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .in('status', ['pending', 'authorized'])

    if (subsError) {
      console.error('⚠️ Error obteniendo suscripciones:', subsError)
    }

    // Procesar órdenes para extraer información de suscripción
    const processedOrders = orders.map(order => {
      let orderData = null
      if (order.shipping_address) {
        try {
          orderData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
        } catch (e) {
          console.error('Error parsing shipping_address:', e)
        }
      }

      // Buscar suscripción relacionada
      const relatedSubscription = subscriptions?.find(sub => 
        sub.external_reference?.includes(order.id.toString()) ||
        orderData?.order_number === sub.external_reference
      )

      return {
        ...order,
        orderData,
        customer_name: orderData?.customer_data?.full_name || orderData?.customer_data?.name || order.customer_name,
        customer_email: orderData?.customer_data?.email || order.customer_email,
        subscription_items: order.order_items?.filter((item: any) => item.is_subscription) || [],
        related_subscription: relatedSubscription,
        subscription_status: relatedSubscription?.status || 'no_subscription',
        next_payment_date: relatedSubscription?.next_payment_date
      }
    })

    // Estadísticas
    const stats = {
      total_orders_with_subscriptions: processedOrders.length,
      active_subscriptions: subscriptions?.filter(sub => sub.status === 'authorized')?.length || 0,
      pending_subscriptions: subscriptions?.filter(sub => sub.status === 'pending')?.length || 0,
      total_subscription_revenue: processedOrders.reduce((sum, order) => {
        const subscriptionItems = order.subscription_items || []
        const subscriptionTotal = subscriptionItems.reduce((itemSum: number, item: any) => 
          itemSum + (item.price * item.quantity), 0)
        return sum + subscriptionTotal
      }, 0)
    }

    console.log('✅ Órdenes con suscripciones obtenidas:', {
      count: processedOrders.length,
      stats
    })

    return NextResponse.json({
      success: true,
      orders: processedOrders,
      stats,
      subscriptions: subscriptions || []
    })

  } catch (error) {
    console.error('❌ Error en orders-with-subscriptions:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
