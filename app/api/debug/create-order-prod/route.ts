import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log("🚀 === PRODUCTION ORDER CREATION DEBUG ===")
    console.log("Request URL:", request.url)
    console.log("Request method:", request.method)
    console.log("User-Agent:", request.headers.get('user-agent'))
    console.log("Environment:", process.env.NODE_ENV)
    
    // Step 1: Parse request body
    let body
    try {
      body = await request.json()
      console.log("✅ Request body parsed successfully")
      console.log("Body keys:", Object.keys(body))
      console.log("Items count:", body.items?.length || 0)
      console.log("Customer data keys:", Object.keys(body.customerData || {}))
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError)
      return NextResponse.json({
        success: false,
        error: "Failed to parse request body",
        details: parseError instanceof Error ? parseError.message : String(parseError),
        step: "request_parsing"
      }, { status: 400 })
    }

    const { items, customerData, externalReference, backUrls } = body

    // Step 2: Validate required data
    console.log("🔍 Validating request data...")
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ Invalid items data")
      return NextResponse.json({ 
        error: "Items son requeridos", 
        step: "validation_items",
        received: { items: items }
      }, { status: 400 })
    }

    if (!customerData || !customerData.email) {
      console.error("❌ Invalid customer data")
      return NextResponse.json({ 
        error: "Datos del cliente son requeridos", 
        step: "validation_customer",
        received: { customerData: customerData }
      }, { status: 400 })
    }

    if (!backUrls || !backUrls.success) {
      console.error("❌ Invalid back URLs")
      return NextResponse.json({ 
        error: "URLs de retorno son requeridas", 
        step: "validation_urls",
        received: { backUrls: backUrls }
      }, { status: 400 })
    }

    console.log("✅ Request validation passed")

    // Step 3: Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const total = subtotal
    console.log(`💰 Calculated totals - Subtotal: ${subtotal}, Total: ${total}`)

    // Step 4: Initialize Supabase
    console.log("🔗 Connecting to Supabase...")
    let supabase
    try {
      supabase = await createClient()
      console.log("✅ Supabase client created")
    } catch (supabaseError) {
      console.error("❌ Failed to create Supabase client:", supabaseError)
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
        step: "supabase_connection"
      }, { status: 500 })
    }

    // Step 5: Prepare order data
    console.log("📋 Preparing order data...")
    const orderNumber = `PG${Date.now()}`
    
    const formDataForStorage = {
      order_number: orderNumber,
      customer_data: {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address
      },
      items: items,
      subtotal: subtotal,
      frequency: customerData.frequency || 'none',
      created_at: new Date().toISOString(),
      source: 'production_create_preference',
      debug: true
    }

    const orderData = {
      status: 'pending',
      payment_status: 'pending',
      total: total,
      user_id: null,
      customer_name: `${customerData.firstName} ${customerData.lastName}`,
      customer_phone: customerData.phone,
      shipping_address: JSON.stringify(formDataForStorage),
      payment_intent_id: externalReference
    }

    console.log("📄 Order data prepared:")
    console.log("- Customer name:", orderData.customer_name)
    console.log("- Total:", orderData.total)
    console.log("- Shipping address length:", orderData.shipping_address.length)

    // Step 6: Insert order
    console.log("💾 Inserting order into database...")
    let insertResult
    try {
      insertResult = await supabase
        .from('orders')
        .insert(orderData)
        .select()

      if (insertResult.error) {
        console.error("❌ Database insert error:", insertResult.error)
        return NextResponse.json({
          success: false,
          error: "Failed to create order in database",
          details: insertResult.error,
          orderData: orderData,
          step: "database_insert"
        }, { status: 500 })
      }

      console.log("✅ Order inserted successfully:", insertResult.data[0])
    } catch (insertError) {
      console.error("❌ Unexpected insert error:", insertError)
      return NextResponse.json({
        success: false,
        error: "Unexpected database error",
        details: insertError instanceof Error ? insertError.message : String(insertError),
        step: "database_insert"
      }, { status: 500 })
    }

    const orderId = insertResult.data[0].id
    console.log(`✅ Order created with ID: ${orderId}`)

    // Step 7: Check if test mode
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
    console.log(`🧪 Test mode: ${isTestMode}`)

    if (isTestMode) {
      console.log("🧪 Returning test response")
      return NextResponse.json({
        success: true,
        preferenceId: `test_preference_${Date.now()}`,
        initPoint: backUrls.success,
        orderId: orderId,
        externalReference: externalReference,
        testMode: true,
        processingTime: Date.now() - startTime
      })
    }

    // Step 8: MercadoPago integration
    console.log("💳 Proceeding with MercadoPago integration...")
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    
    if (!mercadoPagoAccessToken) {
      console.error("❌ MercadoPago access token not configured")
      return NextResponse.json({ 
        error: "MercadoPago access token not configured", 
        step: "mercadopago_config" 
      }, { status: 500 })
    }

    console.log("✅ MercadoPago token available")

    // Continue with MercadoPago preference creation...
    const preference = {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        picture_url: item.picture_url,
        category_id: "pet_food",
        quantity: item.quantity,
        currency_id: "MXN",
        unit_price: item.unit_price,
      })),
      payer: {
        name: customerData.firstName,
        surname: customerData.lastName,
        email: customerData.email,
        phone: {
          number: customerData.phone,
        },
        address: {
          street_name: customerData.address.street_name,
          street_number: customerData.address.street_number,
          zip_code: customerData.address.zip_code,
        },
      },
      back_urls: {
        success: `${backUrls.success}?order_id=${orderId}&order_number=${orderNumber}&payment_id={{payment_id}}`,
        failure: `${backUrls.failure || '/error-pago'}?order_id=${orderId}&order_number=${orderNumber}&error={{error}}`,
        pending: `${backUrls.pending || '/pago-pendiente'}?order_id=${orderId}&order_number=${orderNumber}&payment_id={{payment_id}}`
      },
      auto_return: "approved",
      external_reference: orderId.toString(),
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'}/api/mercadopago/webhook`,
    }

    console.log("💳 Creating MercadoPago preference...")
    console.log("Notification URL:", preference.notification_url)

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("❌ MercadoPago API error:", errorData)
      return NextResponse.json({
        error: "Failed to create MercadoPago preference",
        details: errorData,
        step: "mercadopago_api"
      }, { status: response.status })
    }

    const data = await response.json()
    console.log("✅ MercadoPago preference created:", data.id)

    // Update order with preference ID
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_intent_id: `${data.id}|${externalReference}` 
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("⚠️ Warning: Failed to update order with preference ID:", updateError)
    }

    console.log(`🎉 Success! Processing time: ${Date.now() - startTime}ms`)

    return NextResponse.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      orderId: orderId,
      externalReference: externalReference,
      processingTime: Date.now() - startTime
    })

  } catch (error) {
    console.error("💥 Unexpected error in production order creation:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      step: "unexpected_error",
      processingTime: Date.now() - startTime
    }, { status: 500 })
  }
}
