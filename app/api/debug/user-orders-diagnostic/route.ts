import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const userId = searchParams.get('userId')

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Se requiere email o userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const results: any = {
      email,
      userId,
      tables: {}
    }

    // 1. Verificar tabla orders
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (ordersError) {
        results.tables.orders = { error: ordersError.message }
      } else {
        const filteredOrders = ordersData?.filter(order => {
          if (userId && order.user_id === userId) return true
          
          try {
            if (order.shipping_address) {
              const parsedShipping = JSON.parse(order.shipping_address)
              const customerEmail = parsedShipping.customer_data?.email
              return customerEmail === email
            }
          } catch (e) {
            return order.user_email === email || order.customer_email === email
          }
          return false
        }) || []

        results.tables.orders = {
          total: ordersData?.length || 0,
          filtered: filteredOrders.length,
          sample: filteredOrders.slice(0, 3).map(order => {
            let customerInfo = null
            try {
              if (order.shipping_address) {
                const parsedShipping = JSON.parse(order.shipping_address)
                customerInfo = parsedShipping.customer_data
              }
            } catch (e) {
              customerInfo = null
            }

            return {
              id: order.id,
              user_id: order.user_id,
              total: order.total,
              status: order.status,
              payment_status: order.payment_status,
              customer_email: customerInfo?.email || order.user_email,
              customer_name: customerInfo?.firstName || order.customer_name,
              created_at: order.created_at,
              has_shipping_address: !!order.shipping_address
            }
          })
        }
      }
    } catch (error) {
      results.tables.orders = { error: `Exception: ${error}` }
    }

    // 2. Verificar user_subscriptions
    if (userId) {
      try {
        const { data: subsData, error: subsError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            products (
              id,
              name,
              price
            )
          `)
          .eq('user_id', userId)

        results.tables.user_subscriptions = {
          error: subsError?.message,
          count: subsData?.length || 0,
          sample: subsData?.slice(0, 2) || []
        }
      } catch (error) {
        results.tables.user_subscriptions = { error: `Exception: ${error}` }
      }

      // 3. Verificar subscription_billing_history
      try {
        const { data: billingData, error: billingError } = await supabase
          .from('subscription_billing_history')
          .select('*')
          .eq('user_id', userId)
          .limit(5)

        results.tables.subscription_billing_history = {
          error: billingError?.message,
          count: billingData?.length || 0,
          sample: billingData || []
        }
      } catch (error) {
        results.tables.subscription_billing_history = { error: `Exception: ${error}` }
      }
    }

    // 4. Verificar order_items
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products (
            name,
            price
          )
        `)
        .limit(10)

      results.tables.order_items = {
        error: itemsError?.message,
        count: itemsData?.length || 0,
        sample: itemsData?.slice(0, 3) || []
      }
    } catch (error) {
      results.tables.order_items = { error: `Exception: ${error}` }
    }

    return NextResponse.json(results)

  } catch (error) {
    return NextResponse.json(
      { error: `Error general: ${error}` },
      { status: 500 }
    )
  }
}
