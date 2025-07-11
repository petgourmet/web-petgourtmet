import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `prod_debug_${Date.now()}`
  
  try {
    console.log(`=== PRODUCTION DEBUG TEST [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    console.log(`Vercel URL: ${process.env.VERCEL_URL || 'Not set'}`)
    
    const supabase = await createClient()
    
    // 1. Verificar conexión a Supabase
    console.log("1. Testing Supabase connection...")
    const { data: connectionTest, error: connectionError } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .limit(1)
    
    if (connectionError) {
      console.error("❌ Supabase connection failed:", connectionError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Supabase connection failed",
        details: connectionError,
        step: "connection_test"
      }, { status: 500 })
    }
    
    console.log("✅ Supabase connection successful")
    
    // 2. Verificar estructura de tabla
    console.log("2. Checking table structure...")
    const { data: tableStructure, error: structureError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    if (structureError) {
      console.error("❌ Table structure check failed:", structureError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Table structure check failed",
        details: structureError,
        step: "structure_check"
      }, { status: 500 })
    }
    
    console.log("✅ Table structure check successful")
    console.log("Sample record:", tableStructure?.[0] || "No records found")
    
    // 3. Datos de prueba para producción (más realistas)
    const productionTestData = {
      status: 'pending',
      payment_status: 'pending',
      total: 599.00,
      user_id: null,
      customer_name: `PROD_TEST_${debugId}`,
      customer_phone: '5555555555',
      shipping_address: JSON.stringify({
        debug_info: {
          test_id: debugId,
          timestamp,
          environment: process.env.NODE_ENV,
          purpose: 'production_debugging'
        },
        order_number: `TEST_${Date.now()}`,
        customer_data: {
          firstName: 'TestProd',
          lastName: 'User',
          email: 'test-prod@petgourmet.com',
          phone: '5555555555',
          address: {
            street_name: 'Av Test Producción',
            street_number: '100',
            zip_code: '01000',
            city: 'Ciudad de México',
            state: 'CDMX'
          }
        },
        items: [{
          id: 'prod-test-item',
          title: 'Producto Test Producción',
          quantity: 1,
          unit_price: 599.00
        }],
        subtotal: 599.00,
        frequency: 'none',
        created_at: timestamp,
        production_test: true
      }),
      payment_intent_id: `prod_test_${Date.now()}`
    }

    console.log("3. Preparing production test data...")
    console.log("Test order data:", JSON.stringify(productionTestData, null, 2))

    
    // 4. Intentar insertar la orden de prueba
    console.log("4. Attempting to insert production test order...")
    const { data: insertResult, error: insertError } = await supabase
      .from('orders')
      .insert(productionTestData)
      .select()
    
    if (insertError) {
      console.error("❌ Production order insertion failed:", insertError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Production order insertion failed",
        details: insertError,
        testData: productionTestData,
        step: "order_insertion"
      }, { status: 500 })
    }

    
    console.log("✅ Production order insertion successful:", insertResult)

    // 5. Verificar que se insertó correctamente
    const orderId = insertResult[0].id
    console.log("5. Verifying inserted order...")
    const { data: verifyOrder, error: verifyError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (verifyError) {
      console.error("❌ Order verification failed:", verifyError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Order verification failed",
        details: verifyError,
        orderId,
        step: "order_verification"
      }, { status: 500 })
    }

    console.log("✅ Order verification successful")
    
    // 6. Test de parseo del shipping_address
    console.log("6. Testing shipping_address parsing...")
    let parsedShippingAddress
    try {
      parsedShippingAddress = JSON.parse(verifyOrder.shipping_address)
      console.log("✅ Shipping address parsing successful")
    } catch (parseError) {
      console.error("❌ Shipping address parsing failed:", parseError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Shipping address parsing failed",
        details: parseError,
        rawShippingAddress: verifyOrder.shipping_address,
        step: "address_parsing"
      }, { status: 500 })
    }
    
    // 7. Limpiar orden de prueba
    console.log("7. Cleaning up test order...")
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
    
    if (deleteError) {
      console.error("⚠️ Test order cleanup failed:", deleteError)
      // No retornamos error aquí, solo advertencia
    } else {
      console.log("✅ Test order cleaned up successfully")
    }
    
    console.log(`=== PRODUCTION DEBUG TEST COMPLETED [${debugId}] ===`)

    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "Production debug test completed successfully",
      results: {
        supabase_connection: "✅ Success",
        table_structure: "✅ Success",
        order_insertion: "✅ Success",
        order_verification: "✅ Success",
        address_parsing: "✅ Success",
        cleanup: deleteError ? "⚠️ Warning" : "✅ Success"
      },
      production_environment: {
        node_env: process.env.NODE_ENV,
        vercel_url: process.env.VERCEL_URL,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
        supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"
      },
      inserted_order: {
        id: orderId,
        status: verifyOrder.status,
        total: verifyOrder.total,
        payment_status: verifyOrder.payment_status,
        customer_name: verifyOrder.customer_name,
        parsed_address: parsedShippingAddress
      }
    })

  } catch (error) {
    console.error("❌ PRODUCTION DEBUG TEST FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "Production debug test failed",
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      environment: {
        node_env: process.env.NODE_ENV,
        vercel_url: process.env.VERCEL_URL
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Production Debug Test Endpoint",
    description: "Use POST method to run production debugging tests",
    endpoints: {
      post: "/api/debug/simple-order-test",
      method: "POST",
      purpose: "Test order creation in production environment"
    },
    timestamp: new Date().toISOString()
  })
}
