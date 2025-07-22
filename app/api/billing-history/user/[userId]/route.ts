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

    // Obtener órdenes completadas como historial de facturación
    let query = supabase
      .from("orders")
      .select("*")
      .in("payment_status", ["completed", "processing"])
      .order("created_at", { ascending: false })
      .limit(20)

    if (email) {
      query = query.or(`user_id.eq.${userId},customer_name.ilike.%${email}%`)
    } else {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) throw error

    // Procesar los datos para el historial de facturación
    const processedBilling: BillingHistoryItem[] = (data || []).map(order => {
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
      
      return {
        id: order.id,
        billing_date: order.created_at,
        amount: order.total,
        status: order.payment_status,
        order_number: orderData?.order_number || `PG-${order.id}`,
        items: orderData?.items || [],
        customer_data: orderData?.customer_data || {}
      }
    })

    return NextResponse.json({
      success: true,
      billingHistory: processedBilling
    })

  } catch (error) {
    console.error('❌ Error obteniendo historial de facturación:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
