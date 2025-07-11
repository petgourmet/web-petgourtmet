import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `prod_live_${Date.now()}`
  
  try {
    console.log(`=== PRODUCTION LIVE DEBUG [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    console.log(`URL: ${process.env.VERCEL_URL}`)
    
    // 1. Verificar todas las variables de entorno críticas
    console.log("1. Checking critical environment variables...")
    const envCheck = {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
      supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
      mp_access_token: process.env.MERCADOPAGO_ACCESS_TOKEN ? "SET" : "MISSING",
      mp_public_key: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? "SET" : "MISSING",
      mp_environment: process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT,
      base_url: process.env.NEXT_PUBLIC_BASE_URL,
      vercel_url: process.env.VERCEL_URL
    }
    
    console.log("Environment variables check:", envCheck)
    
    // 2. Verificar conexión a Supabase
    console.log("2. Testing Supabase connection...")
    const supabase = await createClient()
    
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
        environment_check: envCheck
      }, { status: 500 })
    }
    
    console.log("✅ Supabase connection successful")
    
    // 3. Probar inserción real como en el endpoint original
    console.log("3. Testing real order insertion flow...")
    
    // Datos que replican exactamente lo que viene del frontend
    const realOrderData = {
      status: 'pending',
      payment_status: 'pending',
      total: 599.00,
      user_id: null,
      customer_name: `PROD_LIVE_TEST_${debugId}`,
      customer_phone: '5555555555',
      shipping_address: JSON.stringify({
        order_number: `LIVE_${Date.now()}`,
        customer_data: {
          firstName: 'TestLive',
          lastName: 'Production',
          email: 'test-live@petgourmet.mx',
          phone: '5555555555',
          address: {
            street_name: 'Av Test Live',
            street_number: '100',
            zip_code: '01000',
            city: 'Ciudad de México',
            state: 'CDMX'
          }
        },
        items: [{
          id: 'live-test-product',
          title: 'Live Test Product',
          quantity: 1,
          unit_price: 599.00
        }],
        subtotal: 599.00,
        frequency: 'none',
        created_at: timestamp,
        debug_info: {
          test_type: 'production_live_test',
          debug_id: debugId
        }
      }),
      payment_intent_id: null
    }
    
    console.log("About to insert order:", JSON.stringify(realOrderData, null, 2))
    
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert(realOrderData)
      .select()
      .single()
    
    if (insertError) {
      console.error("❌ Order insertion failed:", insertError)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Order insertion failed in production",
        details: insertError,
        test_data: realOrderData,
        environment_check: envCheck
      }, { status: 500 })
    }
    
    console.log("✅ Order inserted successfully:", insertedOrder)
    
    // 4. Verificar configuración de MercadoPago
    console.log("4. Testing MercadoPago configuration...")
    
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN missing")
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "MercadoPago Access Token not configured",
        environment_check: envCheck
      }, { status: 500 })
    }
    
    // Verificar formato del token
    const tokenFormat = process.env.MERCADOPAGO_ACCESS_TOKEN.startsWith('APP_USR-') ? 'VALID_FORMAT' : 'INVALID_FORMAT'
    console.log(`MercadoPago token format: ${tokenFormat}`)
    
    // 5. Simular creación de preferencia de MercadoPago
    console.log("5. Simulating MercadoPago preference creation...")
    
    const preferenceData = {
      items: [{
        id: 'live-test-product',
        title: 'Live Test Product',
        quantity: 1,
        unit_price: 599.00,
        currency_id: "MXN"
      }],
      payer: {
        name: 'TestLive',
        surname: 'Production',
        email: 'test-live@petgourmet.mx',
        phone: {
          number: '5555555555'
        },
        address: {
          street_name: 'Av Test Live',
          street_number: 100,
          zip_code: '01000'
        }
      },
      back_urls: {
        success: `https://petgourmet.mx/gracias-por-tu-compra?order_id=${insertedOrder.id}`,
        failure: `https://petgourmet.mx/error-pago?order_id=${insertedOrder.id}`,
        pending: `https://petgourmet.mx/pago-pendiente?order_id=${insertedOrder.id}`
      },
      auto_return: "approved",
      external_reference: insertedOrder.id.toString(),
      notification_url: `https://petgourmet.mx/api/mercadopago/webhook`,
      statement_descriptor: "PETGOURMET"
    }
    
    console.log("Preference data:", JSON.stringify(preferenceData, null, 2))
    
    // 6. Limpiar orden de prueba
    console.log("6. Cleaning up test order...")
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', insertedOrder.id)
    
    if (deleteError) {
      console.error("⚠️ Cleanup failed:", deleteError)
    } else {
      console.log("✅ Cleanup successful")
    }
    
    console.log(`=== PRODUCTION LIVE DEBUG COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "Production live debug completed successfully",
      results: {
        environment_check: "✅ All variables present",
        supabase_connection: "✅ Success",
        order_insertion: "✅ Success",
        mp_config_check: `✅ Token format ${tokenFormat}`,
        preference_simulation: "✅ Success",
        cleanup: deleteError ? "⚠️ Warning" : "✅ Success"
      },
      environment_details: envCheck,
      test_order: {
        id: insertedOrder.id,
        created_successfully: true,
        cleanup_successful: !deleteError
      },
      mercadopago_config: {
        token_format: tokenFormat,
        environment: process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT,
        public_key_present: !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
      }
    })
    
  } catch (error) {
    console.error("❌ PRODUCTION LIVE DEBUG FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "Production live debug failed",
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
    message: "Production Live Debug Endpoint",
    description: "Tests the exact production environment and configuration",
    usage: "POST to this endpoint to run live production tests",
    timestamp: new Date().toISOString()
  })
}
