import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Obtener información del entorno
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      testMode: process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      hasMercadoPagoToken: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      mercadoPagoTokenLength: process.env.MERCADOPAGO_ACCESS_TOKEN?.length || 0,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
    
    // Verificar conexión a Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .limit(1)
    
    // Obtener las últimas órdenes
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Verificar la estructura de la tabla
    const { data: tableStructure, error: structureError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envInfo,
      supabase: {
        connectionTest: connectionError ? { error: connectionError } : { success: true, data: testConnection },
        recentOrders: ordersError ? { error: ordersError } : { data: recentOrders },
        tableStructure: structureError ? { error: structureError } : { 
          sampleRow: tableStructure?.[0] || null,
          fields: tableStructure?.[0] ? Object.keys(tableStructure[0]) : []
        }
      },
      endpoints: [
        "/api/debug/simple-order-test",
        "/api/debug/create-preference-test",
        "/api/mercadopago/create-preference"
      ]
    })
  } catch (error) {
    return NextResponse.json({
      error: "Failed to get system status",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === "test-order-flow") {
      // Probar el flujo completo de creación de orden
      const testData = {
        items: [
          {
            id: "test-product-1",
            title: "Plan Personalizado Test",
            description: "Plan de prueba",
            picture_url: "https://example.com/image.jpg",
            quantity: 1,
            unit_price: 299.00
          }
        ],
        customerData: {
          firstName: "Test",
          lastName: "User", 
          email: "test@example.com",
          phone: "5551234567",
          address: {
            street_name: "Calle Test",
            street_number: "123",
            zip_code: "12345"
          }
        },
        externalReference: `test_${Date.now()}`,
        backUrls: {
          success: "https://petgourmet.com.mx/gracias-por-tu-compra",
          failure: "https://petgourmet.com.mx/error-pago",
          pending: "https://petgourmet.com.mx/pago-pendiente"
        }
      }
      
      // Llamar al endpoint real
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'}/api/mercadopago/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      })
      
      const result = await response.json()
      
      return NextResponse.json({
        testData,
        response: {
          status: response.status,
          statusText: response.statusText,
          data: result
        }
      })
    }
    
    return NextResponse.json({
      error: "Unknown action",
      validActions: ["test-order-flow"]
    }, { status: 400 })
    
  } catch (error) {
    return NextResponse.json({
      error: "Failed to execute action",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
