import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `mp_flow_${Date.now()}`
  
  try {
    console.log(`=== MERCADOPAGO FLOW EVALUATION [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    
    // Verificar variables de entorno críticas
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? `SET (${process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 15)}...)` : "MISSING",
      NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? "SET" : "MISSING",
      NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT: process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT
    }
    
    console.log("Environment check:", envCheck)
    
    // Determinar la URL base correcta
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   `https://${process.env.VERCEL_URL}` || 
                   'https://petgourmet.mx'
    
    console.log("Using base URL:", baseUrl)
    
    // Test 1: Verificar conexión a Supabase
    console.log("1. Testing Supabase connection...")
    const supabase = await createClient()
    
    const { data: connectionTest, error: connectionError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    if (connectionError) {
      console.error("❌ Supabase connection failed:", connectionError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Supabase connection failed",
        details: connectionError
      }, { status: 500 })
    }
    
    console.log("✅ Supabase connection successful")
    
    // Test 2: Probar inserción de orden básica
    console.log("2. Testing basic order insertion...")
    const basicOrderData = {
      status: 'pending',
      payment_status: 'pending',
      total: 599.00,
      customer_name: `MP_TEST_${debugId}`,
      customer_phone: '5555555555',
      shipping_address: JSON.stringify({
        order_number: `MP_${Date.now()}`,
        debug_info: {
          test_id: debugId,
          timestamp,
          purpose: 'mercadopago_flow_evaluation'
        },
        customer_data: {
          firstName: 'TestMP',
          lastName: 'Flow',
          email: 'test-mp@petgourmet.mx',
          phone: '5555555555',
          address: {
            street_name: 'Av Test MercadoPago',
            street_number: '100',
            zip_code: '01000',
            city: 'Ciudad de México',
            state: 'CDMX'
          }
        },
        items: [{
          id: 'mp-flow-test',
          title: 'Test MercadoPago Flow',
          quantity: 1,
          unit_price: 599.00
        }],
        subtotal: 599.00,
        frequency: 'none',
        created_at: timestamp
      }),
      payment_intent_id: null
    }
    
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert(basicOrderData)
      .select()
      .single()
    
    if (insertError) {
      console.error("❌ Order insertion failed:", insertError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Order insertion failed",
        details: insertError,
        attempted_data: basicOrderData,
        environment_check: envCheck
      }, { status: 500 })
    }
    
    console.log("✅ Order insertion successful:", insertedOrder)
    
    // Test 3: Verificar configuración de MercadoPago
    console.log("3. Testing MercadoPago configuration...")
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error("❌ MercadoPago access token missing")
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "MercadoPago access token not configured",
        environment_check: envCheck
      }, { status: 500 })
    }
    
    // Test 4: Crear preferencia de MercadoPago (simulación)
    console.log("4. Testing MercadoPago preference creation...")
    const preferenceData = {
      items: [{
        id: 'mp-flow-test',
        title: 'Test MercadoPago Flow',
        quantity: 1,
        unit_price: 599.00,
        currency_id: "MXN"
      }],
      payer: {
        name: 'TestMP',
        surname: 'Flow',
        email: 'test-mp@petgourmet.mx',
        phone: {
          number: '5555555555'
        },
        address: {
          street_name: 'Av Test MercadoPago',
          street_number: 100,
          zip_code: '01000'
        }
      },
      back_urls: {
        success: `${baseUrl}/gracias-por-tu-compra?order_id=${insertedOrder.id}`,
        failure: `${baseUrl}/error-pago?order_id=${insertedOrder.id}`,
        pending: `${baseUrl}/pago-pendiente?order_id=${insertedOrder.id}`
      },
      auto_return: "approved",
      external_reference: insertedOrder.id.toString(),
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
      statement_descriptor: "PETGOURMET"
    }
    
    console.log("MercadoPago preference data:", JSON.stringify(preferenceData, null, 2))
    
    // Test 5: Llamada real a MercadoPago API
    console.log("5. Making real call to MercadoPago API...")
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceData),
    })
    
    const mpResponseData = await mpResponse.json()
    console.log("MercadoPago API response status:", mpResponse.status)
    console.log("MercadoPago API response:", mpResponseData)
    
    if (!mpResponse.ok) {
      console.error("❌ MercadoPago API call failed:", mpResponseData)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "MercadoPago API call failed",
        details: mpResponseData,
        mp_request: preferenceData,
        environment_check: envCheck
      }, { status: 500 })
    }
    
    console.log("✅ MercadoPago preference created successfully")
    
    // Test 6: Actualizar orden con preference_id
    console.log("6. Updating order with preference_id...")
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_intent_id: mpResponseData.id })
      .eq('id', insertedOrder.id)
    
    if (updateError) {
      console.error("❌ Order update failed:", updateError)
    } else {
      console.log("✅ Order updated with preference_id")
    }
    
    // Test 7: Verificar orden final
    console.log("7. Verifying final order state...")
    const { data: finalOrder, error: verifyError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', insertedOrder.id)
      .single()
    
    // Test 8: Limpiar orden de prueba
    console.log("8. Cleaning up test order...")
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', insertedOrder.id)
    
    if (deleteError) {
      console.error("⚠️ Cleanup failed:", deleteError)
    } else {
      console.log("✅ Cleanup successful")
    }
    
    console.log(`=== MERCADOPAGO FLOW EVALUATION COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "MercadoPago flow evaluation completed successfully",
      evaluation_results: {
        supabase_connection: "✅ Success",
        order_insertion: "✅ Success",
        mp_config_check: "✅ Success",
        mp_api_call: "✅ Success",
        order_update: updateError ? "❌ Failed" : "✅ Success",
        cleanup: deleteError ? "⚠️ Warning" : "✅ Success"
      },
      environment_analysis: {
        base_url_used: baseUrl,
        environment_vars: envCheck,
        mp_token_format: process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('APP_USR-') ? 'Valid' : 'Invalid'
      },
      mercadopago_response: {
        preference_id: mpResponseData.id,
        init_point: mpResponseData.init_point,
        sandbox_init_point: mpResponseData.sandbox_init_point
      },
      order_flow: {
        order_id: insertedOrder.id,
        order_created: true,
        preference_created: true,
        order_updated: !updateError,
        final_state: finalOrder
      }
    })
    
  } catch (error) {
    console.error("❌ MERCADOPAGO FLOW EVALUATION FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "MercadoPago flow evaluation failed",
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "MercadoPago Flow Evaluation",
    description: "Complete evaluation of the MercadoPago payment flow",
    usage: "POST to run complete MercadoPago flow evaluation",
    timestamp: new Date().toISOString()
  })
}
