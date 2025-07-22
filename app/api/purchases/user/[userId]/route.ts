// app/api/purchases/user/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PurchaseItem {
  id: string | number
  order_number: string
  total: number
  payment_status: string
  created_at: string
  items: any[]
  customer_data?: any
  shipping_status?: string
  tracking_number?: string
  estimated_delivery?: string
  subscription_info?: any
}

// GET - Obtener historial de compras de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params
    const url = new URL(request.url)
    const email = url.searchParams.get('email')

    // Obtener todas las órdenes del usuario
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (email) {
      query = query.or(`user_id.eq.${userId},customer_name.ilike.%${email}%`)
    } else {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) throw error

    // Procesar órdenes
    const processedPurchases: PurchaseItem[] = (data || []).map(order => {
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
      
      // Detectar si tiene suscripciones
      const hasSubscription = orderData?.items?.some((item: any) => 
        item.isSubscription || item.subscription
      )
      
      return {
        id: order.id,
        order_number: orderData?.order_number || `PG-${order.id}`,
        total: order.total,
        payment_status: order.payment_status,
        created_at: order.created_at,
        items: orderData?.items || [],
        customer_data: orderData?.customer_data || {},
        shipping_status: order.shipping_status || 'pending',
        tracking_number: order.tracking_number || undefined,
        estimated_delivery: order.estimated_delivery || undefined,
        subscription_info: hasSubscription ? {
          isSubscription: true,
          frequency: orderData?.frequency || 'monthly'
        } : undefined
      }
    })

    return NextResponse.json({
      success: true,
      purchases: processedPurchases
    })

  } catch (error) {
    console.error('❌ Error obteniendo historial de compras:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
