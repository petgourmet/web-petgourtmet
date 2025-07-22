// app/api/billing-history/user/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BillingHistoryItem {
  id: string | number
  billing_date: string
  amount: number
  status: string
  order_number: string
  items: any[]
  customer_data?: any
  payment_method?: string
  invoice_url?: string | null
}

// GET - Obtener historial de facturación de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params
    const url = new URL(request.url)
    const email = url.searchParams.get('email')

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: 'Se requiere userId o email' },
        { status: 400 }
      )
    }

    const allBillingHistory: BillingHistoryItem[] = []

    // 1. Obtener órdenes principales desde la tabla 'orders' (esto es lo que se ve en admin)
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!ordersError && ordersData) {
        const processedOrders = ordersData
          .filter(order => {
            // Filtrar por usuario basado en shipping_address o email
            try {
              if (order.shipping_address) {
                const parsedShipping = JSON.parse(order.shipping_address)
                const customerEmail = parsedShipping.customer_data?.email
                return customerEmail === email || order.user_id === userId
              }
              return order.user_id === userId || order.user_email === email
            } catch (e) {
              return order.user_id === userId || order.user_email === email
            }
          })
          .map(order => {
            let customerInfo = null
            let orderItems = []
            
            try {
              if (order.shipping_address) {
                const parsedShipping = JSON.parse(order.shipping_address)
                customerInfo = parsedShipping.customer_data
                orderItems = parsedShipping.items || []
              }
            } catch (e) {
              console.log('Error parsing shipping_address:', e)
            }

            return {
              id: `order_${order.id}`,
              billing_date: order.created_at,
              amount: order.total || 0,
              status: order.payment_status || order.status || 'unknown',
              order_number: customerInfo?.orderNumber || `#PG${order.id}`,
              payment_method: 'online_payment',
              invoice_url: null,
              customer_data: {
                full_name: customerInfo?.firstName && customerInfo?.lastName 
                  ? `${customerInfo.firstName} ${customerInfo.lastName}`
                  : order.customer_name || 'Cliente',
                email: customerInfo?.email || order.user_email || email || 'unknown@email.com',
                phone: customerInfo?.phone || order.customer_phone
              },
              items: orderItems.map((item: any) => ({
                id: item.id || Math.random().toString(),
                name: item.name || item.product_name || 'Producto',
                product: item,
                quantity: item.quantity || 1,
                price: item.price || 0,
                description: `Orden - ${item.name || item.product_name || 'Producto'}`
              }))
            }
          })
        
        allBillingHistory.push(...processedOrders)
      }
    } catch (error) {
      console.log('Error fetching orders:', error)
    }

    // 2. Obtener historial de facturación desde subscription_billing_history
    try {
      const { data: billingData, error: billingError } = await supabase
        .from('subscription_billing_history')
        .select(`
          *,
          user_subscriptions!inner (
            id,
            product_id,
            products (
              id,
              name,
              image,
              price
            )
          )
        `)
        .eq('user_id', userId)
        .order('billing_date', { ascending: false })
        .limit(30)

      if (!billingError && billingData) {
        const processedBilling = billingData.map(record => ({
          id: `billing_${record.id}`,
          billing_date: record.billing_date || record.created_at,
          amount: record.amount || 0,
          status: record.status || 'completed',
          order_number: `SUB-${record.subscription_id}-${record.id}`,
          payment_method: record.payment_provider || 'subscription',
          invoice_url: null,
          customer_data: {
            full_name: 'Cliente Suscripción',
            email: email || 'unknown@email.com'
          },
          items: record.user_subscriptions?.products ? [{
            id: record.user_subscriptions.id,
            name: record.user_subscriptions.products.name,
            product: record.user_subscriptions.products,
            quantity: 1,
            price: record.amount || 0,
            description: `Suscripción - ${record.user_subscriptions.products.name}`
          }] : []
        }))
        allBillingHistory.push(...processedBilling)
      }
    } catch (error) {
      console.log('Error fetching subscription_billing_history:', error)
    }

    // 2. Obtener pagos de suscripciones desde subscription_payments
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('subscription_payments')
        .select(`
          *,
          user_subscriptions!inner (
            id,
            user_id,
            product_id,
            products (
              id,
              name,
              image,
              price
            )
          )
        `)
        .eq('user_subscriptions.user_id', userId)
        .order('payment_date', { ascending: false })
        .limit(30)

      if (!paymentsError && paymentsData) {
        const processedPayments = paymentsData.map(payment => ({
          id: `payment_${payment.id}`,
          billing_date: payment.payment_date || payment.created_at,
          amount: payment.amount || 0,
          status: payment.status || 'completed',
          order_number: `PAY-${payment.mercadopago_payment_id || payment.id}`,
          payment_method: 'MercadoPago',
          invoice_url: null,
          customer_data: {
            full_name: 'Cliente MercadoPago',
            email: email || 'unknown@email.com'
          },
          items: payment.user_subscriptions?.products ? [{
            id: payment.user_subscriptions.id,
            name: payment.user_subscriptions.products.name,
            product: payment.user_subscriptions.products,
            quantity: 1,
            price: payment.amount || 0,
            description: `Pago Suscripción - ${payment.user_subscriptions.products.name}`
          }] : []
        }))
        allBillingHistory.push(...processedPayments)
      }
    } catch (error) {
      console.log('Error fetching subscription_payments:', error)
    }

    // 3. Obtener items de órdenes directas desde order_items (como fallback)
    try {
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price
          )
        `)
        .order('id', { ascending: false })
        .limit(20)

      if (!orderItemsError && orderItemsData) {
        const processedOrders = orderItemsData.map(item => ({
          id: `order_${item.id}`,
          billing_date: new Date().toISOString(),
          amount: (item.price || 0) * (item.quantity || 1),
          status: 'completed',
          order_number: `ORD-${item.id}`,
          payment_method: 'direct_purchase',
          invoice_url: null,
          customer_data: {
            full_name: 'Cliente Directo',
            email: email || 'unknown@email.com'
          },
          items: [{
            id: item.id,
            name: item.products?.name || item.product_name || 'Producto',
            product: item.products,
            quantity: item.quantity || 1,
            price: item.price || 0,
            description: `Compra directa - ${item.products?.name || item.product_name || 'Producto'}`
          }]
        }))
        allBillingHistory.push(...processedOrders)
      }
    } catch (error) {
      console.log('Error fetching order_items:', error)
    }

    // Ordenar por fecha descendente y eliminar duplicados
    const sortedHistory = allBillingHistory
      .sort((a, b) => new Date(b.billing_date).getTime() - new Date(a.billing_date).getTime())
      .filter((item, index, self) => index === self.findIndex(i => i.id === item.id))
      .slice(0, 50)

    return NextResponse.json({
      success: true,
      billingHistory: sortedHistory,
      total: sortedHistory.length,
      message: `Encontrados ${sortedHistory.length} registros de facturación`
    })

  } catch (error) {
    console.error('Error in billing history API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
