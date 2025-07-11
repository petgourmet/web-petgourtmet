import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, customerData, externalReference, backUrls } = body

    console.log("=== DEBUG CREATE PREFERENCE ===")
    console.log("Environment:", process.env.NODE_ENV)
    console.log("URL:", request.url)
    console.log("Body received:", JSON.stringify(body, null, 2))

    // Validar datos requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log("❌ Error: Items missing or invalid")
      return NextResponse.json({ error: "Items son requeridos" }, { status: 400 })
    }

    if (!customerData || !customerData.email) {
      console.log("❌ Error: Customer data missing")
      return NextResponse.json({ error: "Datos del cliente son requeridos" }, { status: 400 })
    }

    if (!backUrls || !backUrls.success) {
      console.log("❌ Error: Back URLs missing")
      return NextResponse.json({ error: "URLs de retorno son requeridas" }, { status: 400 })
    }

    console.log("✅ Validation passed")

    // Calcular el total de la orden
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const total = subtotal
    
    console.log("💰 Total calculated:", total)

    // Crear la orden en Supabase
    console.log("🔗 Connecting to Supabase...")
    const supabase = await createClient()
    
    // Generar número de orden único
    const orderNumber = `PG${Date.now()}`
    console.log("📄 Order number:", orderNumber)

    // Crear estructura de datos mínima y segura
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
      created_at: new Date().toISOString()
    }

    console.log("📦 Form data prepared")

    // Intentar con datos muy básicos primero
    const basicOrderData = {
      status: 'pending',
      payment_status: 'pending',
      total: total
    }

    console.log("🚀 Attempting basic order creation...")
    const { data: basicOrder, error: basicError } = await supabase
      .from('orders')
      .insert(basicOrderData)
      .select()

    if (basicError) {
      console.error("❌ Basic order creation failed:", basicError)
      return NextResponse.json({ 
        error: 'Error creando orden básica', 
        details: basicError,
        step: 'basic_order_creation'
      }, { status: 500 })
    }

    console.log("✅ Basic order created:", basicOrder)
    const orderId = basicOrder[0].id

    // Ahora intentar actualizar con más datos
    console.log("🔄 Updating order with additional data...")
    const updateData = {
      customer_name: `${customerData.firstName} ${customerData.lastName}`,
      customer_phone: customerData.phone,
      shipping_address: JSON.stringify(formDataForStorage),
      payment_intent_id: externalReference
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      console.error("⚠️ Update failed, but basic order exists:", updateError)
      // No fallar completamente, tenemos una orden básica
    } else {
      console.log("✅ Order updated with full data")
    }

    // Verificar si estamos en modo de prueba
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
    console.log("🧪 Test mode:", isTestMode)

    if (isTestMode) {
      console.log("🎭 Returning test response")
      return NextResponse.json({
        success: true,
        preferenceId: `test_preference_${Date.now()}`,
        initPoint: backUrls.success,
        orderId: orderId,
        debug: true
      })
    }

    // Obtener el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      console.error("❌ Mercado Pago access token not configured")
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

    console.log("💳 Creating MercadoPago preference...")

    // Crear la preferencia en Mercado Pago
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
          street_name: customerData.address?.street_name || "",
          street_number: customerData.address?.street_number || "",
          zip_code: customerData.address?.zip_code || "",
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

    console.log("📤 Sending to MercadoPago API...")

    // Llamar a la API de Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    })

    const responseText = await response.text()
    console.log("📥 MercadoPago response status:", response.status)
    console.log("📥 MercadoPago response:", responseText)

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        errorData = { message: responseText }
      }
      
      console.error("❌ MercadoPago API error:", errorData)
      return NextResponse.json(
        { 
          error: "Failed to create Mercado Pago preference", 
          details: errorData,
          step: 'mercadopago_api'
        },
        { status: response.status }
      )
    }

    const data = JSON.parse(responseText)
    console.log("✅ MercadoPago preference created:", data.id)

    // Actualizar el pedido con el ID de preferencia
    const { error: mpUpdateError } = await supabase
      .from("orders")
      .update({ 
        payment_intent_id: `${data.id}|${externalReference}|${orderId}`
      })
      .eq("id", orderId)

    if (mpUpdateError) {
      console.error("⚠️ Error updating order with MP preference ID:", mpUpdateError)
      // No fallar por esto
    }

    console.log("✅ Process completed successfully")

    return NextResponse.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      orderId: orderId,
      externalReference: externalReference
    })

  } catch (error) {
    console.error("💥 Fatal error in create-preference route:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error),
      step: 'fatal_error'
    }, { status: 500 })
  }
}
