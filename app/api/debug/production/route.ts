import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("=== PRODUCTION DEBUG - ENVIRONMENT CHECK ===")
    
    // Verificar variables de entorno
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'SET' : 'MISSING',
      NEXT_PUBLIC_PAYMENT_TEST_MODE: process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    }

    console.log("Environment check:", envCheck)

    // Verificar conexión a Supabase
    const supabase = await createClient()
    
    // Test básico de conexión
    const { data: connectionTest, error: connectionError } = await supabase
      .from('orders')
      .select('count')
      .limit(1)

    if (connectionError) {
      console.error("Supabase connection error:", connectionError)
      return NextResponse.json({
        success: false,
        error: "Supabase connection failed",
        environment: envCheck,
        connectionError: connectionError
      }, { status: 500 })
    }

    // Verificar estructura de la tabla orders
    const { data: sampleOrder, error: structureError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)

    console.log("Table structure check:", sampleOrder?.[0] || "No orders found")

    return NextResponse.json({
      success: true,
      message: "Production environment check successful",
      environment: envCheck,
      supabaseConnection: "OK",
      tableStructure: sampleOrder?.[0] ? Object.keys(sampleOrder[0]) : "No orders to check structure",
      sampleOrder: sampleOrder?.[0] || null,
      timestamp: new Date().toISOString(),
      domain: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'localhost'
    })

  } catch (error) {
    console.error("Production debug error:", error)
    return NextResponse.json({
      success: false,
      error: "Production debug failed",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("=== PRODUCTION DEBUG - ORDER CREATION TEST ===")
    
    const body = await request.json()
    console.log("Received request body:", JSON.stringify(body, null, 2))

    const supabase = await createClient()

    // Test con datos reales del request o datos de prueba
    const testData = body.customerData ? {
      status: 'pending',
      payment_status: 'pending',
      total: parseFloat(body.total || 599),
      user_id: null,
      customer_name: `${body.customerData.firstName} ${body.customerData.lastName}`,
      customer_phone: body.customerData.phone || '',
      shipping_address: JSON.stringify({
        order_number: `PG${Date.now()}`,
        customer_data: body.customerData,
        items: body.items || [],
        subtotal: parseFloat(body.total || 599),
        frequency: body.customerData.frequency || 'none',
        created_at: new Date().toISOString(),
        source: 'production_debug'
      }),
      payment_intent_id: `debug_${Date.now()}`
    } : {
      status: 'pending',
      payment_status: 'pending',
      total: 599.00,
      user_id: null,
      customer_name: 'Debug Test User',
      customer_phone: '5551234567',
      shipping_address: JSON.stringify({
        order_number: `PG${Date.now()}`,
        customer_data: {
          firstName: 'Debug',
          lastName: 'User',
          email: 'debug@petgourmet.mx',
          phone: '5551234567',
          address: {
            street_name: 'Debug Street',
            street_number: '123',
            city: 'Test City',
            state: 'Test State',
            zip_code: '12345',
            country: 'México'
          }
        },
        items: [{
          id: 'debug-1',
          title: 'Debug Product',
          quantity: 1,
          unit_price: 599.00
        }],
        subtotal: 599.00,
        frequency: 'none',
        created_at: new Date().toISOString(),
        source: 'production_debug'
      }),
      payment_intent_id: `debug_${Date.now()}`
    }

    console.log("Test order data for production:", JSON.stringify(testData, null, 2))

    // Intentar insertar la orden
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert(testData)
      .select()

    if (insertError) {
      console.error("Production insert error:", insertError)
      return NextResponse.json({
        success: false,
        error: "Failed to insert order in production",
        details: insertError,
        testData: testData,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    console.log("Production order inserted successfully:", insertedOrder)

    return NextResponse.json({
      success: true,
      message: "Production order creation test successful",
      insertedOrder: insertedOrder[0],
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Production POST debug error:", error)
    return NextResponse.json({
      success: false,
      error: "Production POST debug failed",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
