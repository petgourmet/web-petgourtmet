import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    console.log("=== DEBUG CREATE PREFERENCE TEST ===")
    
    // Datos de prueba similares a los que recibiríamos en producción
    const testData = {
      items: [
        {
          id: "test-product-1",
          title: "Plan Personalizado para Mascota",
          description: "Plan nutricional personalizado",
          picture_url: "https://res.cloudinary.com/petgourmet/image/upload/v1234567890/products/default.jpg",
          quantity: 1,
          unit_price: 599.00
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
        },
        frequency: "monthly"
      },
      externalReference: `test_ref_${Date.now()}`,
      backUrls: {
        success: "https://petgourmet.com.mx/gracias-por-tu-compra",
        failure: "https://petgourmet.com.mx/error-pago",
        pending: "https://petgourmet.com.mx/pago-pendiente"
      }
    }

    console.log("Test data prepared:", JSON.stringify(testData, null, 2))

    // Calcular el total
    const subtotal = testData.items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const total = subtotal
    
    console.log(`Calculated total: ${total}`)

    // Crear cliente de Supabase
    const supabase = await createClient()
    console.log("Supabase client created")

    // Generar número de orden único
    const orderNumber = `PG${Date.now()}`
    console.log(`Generated order number: ${orderNumber}`)
    
    // Preparar datos para almacenamiento
    const formDataForStorage = {
      order_number: orderNumber,
      customer_data: {
        firstName: testData.customerData.firstName,
        lastName: testData.customerData.lastName,
        email: testData.customerData.email,
        phone: testData.customerData.phone,
        address: testData.customerData.address
      },
      items: testData.items,
      subtotal: subtotal,
      frequency: testData.customerData.frequency || 'none',
      created_at: new Date().toISOString()
    }

    console.log("Form data for storage prepared:", JSON.stringify(formDataForStorage, null, 2))

    // Preparar datos de la orden para insertar
    const orderData = {
      status: 'pending',
      payment_status: 'pending',
      total: total,
      user_id: null,
      customer_name: `${testData.customerData.firstName} ${testData.customerData.lastName}`,
      customer_phone: testData.customerData.phone,
      shipping_address: JSON.stringify(formDataForStorage),
      payment_intent_id: testData.externalReference
    }

    console.log("Order data prepared for insertion:", JSON.stringify(orderData, null, 2))

    // Verificar la estructura de la tabla orders
    const { data: tableInfo, error: tableError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error("Error checking table structure:", tableError)
      return NextResponse.json({ 
        error: "Error checking table structure",
        details: tableError
      }, { status: 500 })
    }

    console.log("Table structure check passed, sample row:", tableInfo?.[0] || "No existing rows")

    // Intentar insertar la orden
    console.log("Attempting to insert order...")
    const { error: orderError, data: createdOrder } = await supabase
      .from('orders')
      .insert(orderData)
      .select()

    if (orderError) {
      console.error('ERROR INSERTING ORDER:', orderError)
      return NextResponse.json({ 
        error: 'Error creating order', 
        details: orderError,
        attemptedData: orderData,
        step: 'order_insertion'
      }, { status: 500 })
    }

    console.log("Order created successfully:", createdOrder)
    const orderId = createdOrder[0].id

    // Verificar que la orden se creó correctamente
    const { data: verifyOrder, error: verifyError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (verifyError) {
      console.error('Error verifying created order:', verifyError)
      return NextResponse.json({ 
        error: 'Error verifying order creation', 
        details: verifyError,
        orderId: orderId,
        step: 'order_verification'
      }, { status: 500 })
    }

    console.log("Order verification successful:", verifyOrder)

    // Verificar configuración de MercadoPago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

    console.log("MercadoPago config check:")
    console.log("- Access token exists:", !!mercadoPagoAccessToken)
    console.log("- Access token length:", mercadoPagoAccessToken?.length || 0)
    console.log("- Test mode:", isTestMode)
    console.log("- App URL:", process.env.NEXT_PUBLIC_APP_URL)

    if (isTestMode) {
      console.log("Test mode is enabled, returning mock response")
      return NextResponse.json({
        success: true,
        debug: true,
        testMode: true,
        preferenceId: `test_preference_${Date.now()}`,
        initPoint: testData.backUrls.success,
        orderId: orderId,
        orderData: verifyOrder,
        message: "Test mode - no real MercadoPago preference created"
      })
    }

    if (!mercadoPagoAccessToken) {
      return NextResponse.json({ 
        error: "MercadoPago access token not configured",
        step: 'mercadopago_config_check'
      }, { status: 500 })
    }

    // Preparar preferencia de MercadoPago
    const preference = {
      items: testData.items.map((item: any) => ({
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
        name: testData.customerData.firstName,
        surname: testData.customerData.lastName,
        email: testData.customerData.email,
        phone: {
          number: testData.customerData.phone,
        },
        address: {
          street_name: testData.customerData.address.street_name,
          street_number: testData.customerData.address.street_number,
          zip_code: testData.customerData.address.zip_code,
        },
      },
      back_urls: {
        success: `${testData.backUrls.success}?order_id=${orderId}&order_number=${orderNumber}&payment_id={{payment_id}}`,
        failure: `${testData.backUrls.failure}?order_id=${orderId}&order_number=${orderNumber}&error={{error}}`,
        pending: `${testData.backUrls.pending}?order_id=${orderId}&order_number=${orderNumber}&payment_id={{payment_id}}`
      },
      auto_return: "approved",
      external_reference: orderId.toString(),
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mercadopago/webhook`,
    }

    console.log("MercadoPago preference prepared:", JSON.stringify(preference, null, 2))

    // Intentar crear la preferencia en MercadoPago
    console.log("Calling MercadoPago API...")
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    })

    console.log("MercadoPago API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("MercadoPago API error:", errorData)
      return NextResponse.json({
        error: "Failed to create MercadoPago preference",
        details: errorData,
        step: 'mercadopago_api_call',
        preference: preference
      }, { status: response.status })
    }

    const mpData = await response.json()
    console.log("MercadoPago preference created successfully:", mpData)

    // Actualizar orden con ID de preferencia
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_intent_id: `${mpData.id}|${testData.externalReference}`
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error updating order with preference ID:", updateError)
    } else {
      console.log("Order updated with preference ID successfully")
    }

    return NextResponse.json({
      success: true,
      debug: true,
      preferenceId: mpData.id,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
      orderId: orderId,
      orderNumber: orderNumber,
      externalReference: testData.externalReference,
      orderData: verifyOrder,
      mpResponse: mpData,
      message: "Debug test completed successfully"
    })

  } catch (error) {
    console.error("ERROR in debug create preference:", error)
    return NextResponse.json({ 
      error: "Internal server error in debug endpoint", 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
