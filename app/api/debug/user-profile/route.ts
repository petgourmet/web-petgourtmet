import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    // Para este debug, vamos a usar un email de prueba desde query params
    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ 
        error: "Email requerido como query parameter",
        example: "/api/debug/user-profile?email=test@example.com"
      }, { status: 400 })
    }

    // Obtener perfil por email (si existe tabla profiles)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single()

    // Obtener órdenes del usuario
    const { data: allOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching orders:", ordersError)
    }

    // Filtrar órdenes del usuario actual
    const userOrders = (allOrders || []).filter((order: any) => {
      // Verificar por email en shipping_address
      if (order.shipping_address) {
        try {
          const orderData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
          
          return orderData?.customer_data?.email?.toLowerCase() === email.toLowerCase()
        } catch (e) {
          return false
        }
      }
      
      return false
    })

    // Procesar datos de órdenes para estadísticas
    const processedOrders = userOrders.map((order: any) => {
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
        ...order,
        orderData,
        customer_name: orderData?.customer_data?.full_name || orderData?.customer_data?.name || email || "Cliente",
        items: orderData?.items || [],
        customer_data: orderData?.customer_data || {}
      }
    })

    // Separar por tipo
    const subscriptionOrders = processedOrders.filter((order: any) => 
      order.items.some((item: any) => item.isSubscription || item.subscription)
    )

    const completedOrders = processedOrders.filter((order: any) => 
      order.payment_status === "completed"
    )

    // Estadísticas
    const stats = {
      totalOrders: processedOrders.length,
      completedOrders: completedOrders.length,
      subscriptionOrders: subscriptionOrders.length,
      pendingOrders: processedOrders.filter((order: any) => order.payment_status === "pending").length,
      totalSpent: completedOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)
    }

    return NextResponse.json({
      searchEmail: email,
      profile: profile || null,
      profileError: profileError ? profileError.message : null,
      orders: processedOrders.slice(0, 5), // Solo las primeras 5 para el debug
      subscriptions: subscriptionOrders.slice(0, 3),
      stats,
      debug: {
        allOrdersCount: allOrders?.length || 0,
        userOrdersCount: userOrders.length,
        filterCriteria: {
          email: email
        }
      }
    })

  } catch (error) {
    console.error("Error in user profile debug:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
