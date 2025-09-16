// app/api/admin/payment-stats/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PaymentStats {
  total_payments: number
  validated_payments: number
  pending_validation: number
  failed_payments: number
  total_amount: number
  validated_amount: number
  subscription_payments: number
  order_payments: number
  monthly_revenue: number
  weekly_revenue: number
  daily_revenue: number
  top_products: Array<{
    product_name: string
    total_sales: number
    total_amount: number
  }>
  payment_methods: Array<{
    method: string
    count: number
    amount: number
  }>
  recent_activity: Array<{
    date: string
    payments_count: number
    total_amount: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    console.log('🔍 Obteniendo estadísticas de pagos...')

    // 1. Obtener pagos de suscripciones
    const { data: subscriptionPayments, error: subError } = await supabase
      .from('subscription_billing_history')
      .select(`
        *,
        subscriptions!inner (
          id,
          product_id,
          products (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (subError) {
      console.error('❌ Error obteniendo pagos de suscripciones:', subError)
    }

    // 2. Obtener órdenes con pagos
    const { data: orderPayments, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          products (
            name
          )
        )
      `)
      .not('mercadopago_payment_id', 'is', null)
      .order('created_at', { ascending: false })

    if (orderError) {
      console.error('❌ Error obteniendo órdenes:', orderError)
    }

    // Procesar datos de suscripciones
    const processedSubPayments = (subscriptionPayments || []).map(payment => ({
      id: `sub_${payment.id}`,
      amount: payment.amount || 0,
      status: payment.status || 'pending',
      mercadopago_status: payment.payment_details?.status || payment.status,
      payment_method: payment.payment_method || 'subscription',
      created_at: payment.billing_date || payment.created_at,
      type: 'subscription',
      product_name: payment.subscriptions?.products?.name || 'Suscripción'
    }))

    // Procesar datos de órdenes
    const processedOrderPayments = (orderPayments || []).map(order => ({
      id: `order_${order.id}`,
      amount: order.total || 0,
      status: order.payment_status || 'pending',
      mercadopago_status: order.payment_status,
      payment_method: order.payment_type || 'card',
      created_at: order.created_at,
      type: 'order',
      product_name: order.order_items?.[0]?.products?.name || 'Orden de compra'
    }))

    // Combinar todos los pagos
    const allPayments = [...processedSubPayments, ...processedOrderPayments]

    // Calcular estadísticas básicas
    const totalPayments = allPayments.length
    const validatedPayments = allPayments.filter(p => 
      p.status === 'approved' || p.status === 'paid' || p.mercadopago_status === 'approved'
    ).length
    const pendingValidation = allPayments.filter(p => 
      p.status === 'pending' || p.status === 'in_process'
    ).length
    const failedPayments = allPayments.filter(p => 
      p.status === 'rejected' || p.status === 'cancelled' || p.status === 'failed'
    ).length
    const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0)
    const validatedAmount = allPayments
      .filter(p => p.status === 'approved' || p.status === 'paid' || p.mercadopago_status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0)

    const subscriptionPaymentsCount = processedSubPayments.length
    const orderPaymentsCount = processedOrderPayments.length

    // Calcular ingresos por período
    const monthlyRevenue = allPayments
      .filter(p => {
        const paymentDate = new Date(p.created_at)
        return paymentDate >= oneMonthAgo && (p.status === 'approved' || p.status === 'paid')
      })
      .reduce((sum, p) => sum + p.amount, 0)

    const weeklyRevenue = allPayments
      .filter(p => {
        const paymentDate = new Date(p.created_at)
        return paymentDate >= oneWeekAgo && (p.status === 'approved' || p.status === 'paid')
      })
      .reduce((sum, p) => sum + p.amount, 0)

    const dailyRevenue = allPayments
      .filter(p => {
        const paymentDate = new Date(p.created_at)
        return paymentDate >= oneDayAgo && (p.status === 'approved' || p.status === 'paid')
      })
      .reduce((sum, p) => sum + p.amount, 0)

    // Top productos
    const productSales = allPayments
      .filter(p => p.status === 'approved' || p.status === 'paid')
      .reduce((acc, payment) => {
        const productName = payment.product_name
        if (!acc[productName]) {
          acc[productName] = { total_sales: 0, total_amount: 0 }
        }
        acc[productName].total_sales += 1
        acc[productName].total_amount += payment.amount
        return acc
      }, {} as Record<string, { total_sales: number; total_amount: number }>)

    const topProducts = Object.entries(productSales)
      .map(([product_name, data]) => ({
        product_name,
        total_sales: data.total_sales,
        total_amount: data.total_amount
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5)

    // Métodos de pago
    const paymentMethodStats = allPayments
      .filter(p => p.status === 'approved' || p.status === 'paid')
      .reduce((acc, payment) => {
        const method = payment.payment_method
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 }
        }
        acc[method].count += 1
        acc[method].amount += payment.amount
        return acc
      }, {} as Record<string, { count: number; amount: number }>)

    const paymentMethods = Object.entries(paymentMethodStats)
      .map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount)

    // Actividad reciente (últimos 7 días)
    const recentActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayPayments = allPayments.filter(p => {
        const paymentDate = new Date(p.created_at)
        return paymentDate.toISOString().split('T')[0] === dateStr &&
               (p.status === 'approved' || p.status === 'paid')
      })
      
      recentActivity.push({
        date: dateStr,
        payments_count: dayPayments.length,
        total_amount: dayPayments.reduce((sum, p) => sum + p.amount, 0)
      })
    }

    const stats: PaymentStats = {
      total_payments: totalPayments,
      validated_payments: validatedPayments,
      pending_validation: pendingValidation,
      failed_payments: failedPayments,
      total_amount: totalAmount,
      validated_amount: validatedAmount,
      subscription_payments: subscriptionPaymentsCount,
      order_payments: orderPaymentsCount,
      monthly_revenue: monthlyRevenue,
      weekly_revenue: weeklyRevenue,
      daily_revenue: dailyRevenue,
      top_products: topProducts,
      payment_methods: paymentMethods,
      recent_activity: recentActivity
    }

    console.log('✅ Estadísticas de pagos calculadas:', {
      total_payments: totalPayments,
      validated_payments: validatedPayments,
      total_amount: totalAmount.toFixed(2)
    })

    return NextResponse.json({
      success: true,
      stats,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error obteniendo estadísticas de pagos:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// Endpoint para obtener estadísticas en tiempo real
export async function POST(request: NextRequest) {
  try {
    const { period = '7d' } = await request.json()
    const supabase = await createClient()
    
    let startDate: Date
    const now = new Date()
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Obtener pagos del período específico
    const { data: recentSubscriptionPayments } = await supabase
      .from('subscription_billing_history')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'approved')

    const { data: recentOrderPayments } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .eq('payment_status', 'paid')
      .not('mercadopago_payment_id', 'is', null)

    const totalRecentPayments = (recentSubscriptionPayments?.length || 0) + (recentOrderPayments?.length || 0)
    const totalRecentAmount = 
      (recentSubscriptionPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0) +
      (recentOrderPayments?.reduce((sum, p) => sum + (p.total || 0), 0) || 0)

    return NextResponse.json({
      success: true,
      period,
      stats: {
        payments_count: totalRecentPayments,
        total_amount: totalRecentAmount,
        subscription_payments: recentSubscriptionPayments?.length || 0,
        order_payments: recentOrderPayments?.length || 0
      },
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error obteniendo estadísticas por período:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}