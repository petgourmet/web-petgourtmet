import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function POST(request: Request) {
  console.log("=== CREATE PREFERENCE ENDPOINT CALLED ===")
  console.log("Request URL:", request.url)
  console.log("Request method:", request.method)
  console.log("Request headers:", Object.fromEntries(request.headers.entries()))
  
  try {
    console.log("Parsing request body...")
    const body = await request.json()
    console.log("Request body parsed successfully:", JSON.stringify(body, null, 2))
    
    // Manejar ambos formatos: el nuevo (orderData) y el frontend actual (items, customerData directo)
    let customerData, items, externalReference, backUrls
    
    if (body.orderData) {
      // Formato nuevo con orderData
      const { orderData } = body
      customerData = orderData.customer_data
      items = orderData.items
      externalReference = body.externalReference
      backUrls = body.backUrls
    } else {
      // Formato del frontend actual
      customerData = body.customerData
      items = body.items
      externalReference = body.externalReference
      backUrls = body.backUrls
    }
    
    console.log("Extracted data:", { customerData, items, externalReference, backUrls })

    // Validar datos requeridos
    console.log("Validating required data...")
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log("Validation failed: Items are required")
      return NextResponse.json({ error: "Items son requeridos" }, { status: 400 })
    }

    if (!customerData || !customerData.email) {
      console.log("Validation failed: Customer data is required")
      return NextResponse.json({ error: "Datos del cliente son requeridos" }, { status: 400 })
    }
    
    console.log("All validations passed")

    // Calcular el total de la orden incluyendo envío
    console.log("Calculating order total...")
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const shipping = subtotal > 500 ? 0 : 99.0  // Envío gratis por compras mayores a $500
    const taxes = 0  // Los impuestos ya están incluidos en el precio del producto
    const total = subtotal + shipping
    console.log(`Calculated subtotal: ${subtotal}, shipping: ${shipping}, taxes: ${taxes}, total: ${total}`)
    
    // Crear la orden en Supabase con los datos disponibles
    console.log("Creating Supabase service client...")
    const supabase = createServiceClient()
    console.log("Supabase service client created successfully")
    
    // Generar número de orden único
    const orderNumber = `PG${Date.now()}`
    console.log(`Generated order number: ${orderNumber}`)
    
    // Crear orden con la estructura real de la tabla
    console.log("Preparing form data for storage...")
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
      shipping_cost: shipping,
      taxes: taxes,
      total: total,
      frequency: 'none', // Default value
      created_at: new Date().toISOString()
    }
    console.log("Form data prepared:", JSON.stringify(formDataForStorage, null, 2))

    console.log("Preparing order data for database insertion...")
    const orderDataForDB = {
      // No incluir ID, que es autoincremental
      status: 'pending',
      payment_status: 'pending',
      total: total,
      user_id: null, // Se puede actualizar si hay usuario autenticado
      customer_name: `${customerData.firstName} ${customerData.lastName}`,
      customer_phone: customerData.phone,
      shipping_address: JSON.stringify(formDataForStorage), // Usar para almacenar todos los datos
      payment_intent_id: null // Se actualizará después de crear la preferencia
    }

    console.log("Order data prepared for insertion:", JSON.stringify(orderDataForDB, null, 2))

    console.log("Attempting to insert order into database...")
    const { error: orderError, data: createdOrder } = await supabase
      .from('orders')
      .insert(orderDataForDB)
      .select()

    if (orderError) {
      console.error('ERROR CREATING ORDER:', orderError)
      console.error('Order error details:', JSON.stringify(orderError, null, 2))
      console.error('Attempted order data:', JSON.stringify(orderDataForDB, null, 2))
      return NextResponse.json({ 
        error: 'Error creando la orden', 
        details: orderError,
        attemptedData: orderDataForDB,
        step: 'database_insertion'
      }, { status: 500 })
    }

    if (!createdOrder || createdOrder.length === 0) {
      console.error('No order data returned from insert operation')
      return NextResponse.json({ 
        error: 'No order data returned from database', 
        step: 'database_insertion_no_data'
      }, { status: 500 })
    }

    const orderId = createdOrder[0].id
    console.log("Order created successfully with ID:", orderId)
    console.log("Created order data:", JSON.stringify(createdOrder[0], null, 2))

    // Verificar si estamos en modo de prueba
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
    console.log("Test mode check:", isTestMode)

    // Generar URLs de retorno
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'
    const defaultBackUrls = {
      success: `${baseUrl}/gracias-por-tu-compra`,
      failure: `${baseUrl}/error-pago`,
      pending: `${baseUrl}/pago-pendiente`
    }
    
    // Usar las URLs del frontend si están disponibles, sino usar las por defecto
    const finalBackUrls = backUrls || defaultBackUrls

    if (isTestMode) {
      // En modo de prueba, devolver una respuesta simulada
      console.log("Test mode enabled, returning mock response")
      return NextResponse.json({
        success: true,
        preferenceId: `test_preference_${Date.now()}`,
        initPoint: finalBackUrls.success,
        orderId: orderId,
        testMode: true
      })
    }

    // Verificar que tenemos el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    console.log("MercadoPago token check:", !!mercadoPagoAccessToken)
    console.log("MercadoPago token length:", mercadoPagoAccessToken?.length || 0)
    
    if (!mercadoPagoAccessToken) {
      console.error("Mercado Pago access token not configured")
      return NextResponse.json({ 
        error: "Mercado Pago access token not configured",
        step: 'mercadopago_config'
      }, { status: 500 })
    }

    // Crear la preferencia en Mercado Pago
    console.log("Preparing MercadoPago preference...")
    
    // Preparar los ítems de productos
    const productItems = items.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description || "Producto Pet Gourmet",
      picture_url: item.picture_url,
      category_id: "pet_food",
      quantity: item.quantity,
      currency_id: "MXN",
      unit_price: Math.round(item.unit_price * 100) / 100, // Asegurar 2 decimales
    }))

    // Validar que todos los precios sean válidos
    for (const item of productItems) {
      if (!item.unit_price || item.unit_price <= 0) {
        console.error("Invalid item price:", item)
        return NextResponse.json({ 
          error: "Precio de producto inválido",
          step: 'price_validation'
        }, { status: 400 })
      }
    }

    // Agregar envío como ítem separado solo si no es gratis
    const additionalItems = []
    if (shipping > 0) {
      additionalItems.push({
        id: "shipping",
        title: "Envío a domicilio",
        description: "Costo de envío",
        category_id: "shipping",
        quantity: 1,
        currency_id: "MXN",
        unit_price: Math.round(shipping * 100) / 100, // Asegurar 2 decimales
      })
    }

    // No agregar impuestos ya que están incluidos en el precio del producto

    // Combinar todos los ítems
    const allItems = [...productItems, ...additionalItems]
    console.log("All items for MercadoPago:", JSON.stringify(allItems, null, 2))
    
    const preference = {
      items: allItems,
      payer: {
        name: customerData.firstName,
        surname: customerData.lastName,
        email: customerData.email,
        phone: {
          number: customerData.phone,
        },
        address: {
          street_name: customerData.address.street_name || "N/A",
          street_number: customerData.address.street_number || "0",
          zip_code: customerData.address.zip_code || "00000",
        },
      },
      back_urls: {
        success: `${finalBackUrls.success}?order_id=${orderId}&order_number=${orderNumber}&payment_id={{payment_id}}`,
        failure: `${finalBackUrls.failure || '/error-pago'}?order_id=${orderId}&order_number=${orderNumber}&error={{error}}`,
        pending: `${finalBackUrls.pending || '/pago-pendiente'}?order_id=${orderId}&order_number=${orderNumber}&payment_id={{payment_id}}`
      },
      auto_return: "approved",
      external_reference: orderId.toString(), // Usar el ID real de la orden
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'}/api/webhooks/mercadopago`,
      statement_descriptor: "PETGOURMET",
      expires: false,
    }
    
    console.log("MercadoPago preference prepared:", JSON.stringify(preference, null, 2))

    // Llamar a la API de Mercado Pago
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
    console.log("MercadoPago API response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error creating Mercado Pago preference:", errorData)
      return NextResponse.json(
        { 
          error: "Failed to create Mercado Pago preference", 
          details: errorData,
          step: 'mercadopago_api_call',
          preference: preference
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("MercadoPago preference created successfully:", data)

    // Actualizar el pedido con el ID de preferencia
    console.log("Updating order with preference ID...")
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_intent_id: data.id // Guardar el ID de la preferencia de MercadoPago
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error updating order with preference ID:", updateError)
      // No fallar por esto, pero loggearlo
    } else {
      console.log("Order updated with preference ID successfully")
    }

    console.log("=== CREATE PREFERENCE COMPLETED SUCCESSFULLY ===")
    return NextResponse.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      orderId: orderId,
      orderNumber: orderNumber,
      externalReference: orderId.toString()
    })
  } catch (error) {
    console.error("=== ERROR IN CREATE-PREFERENCE ROUTE ===")
    console.error("Error type:", typeof error)
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    console.error("Full error object:", error)
    
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error),
      step: 'unexpected_error'
    }, { status: 500 })
  }
}
