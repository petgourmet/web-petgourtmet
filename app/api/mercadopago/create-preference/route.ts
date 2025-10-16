import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { 
  validateCompleteCheckout, 
  validateMercadoPagoPreference,
  sanitizeCustomerData,
  logValidationErrors,
  checkRateLimit,
  type CustomerData,
  type CartItem
} from "@/lib/checkout-validators"

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
    let customerData, items, externalReference, backUrls, userId, metadata
    
    if (body.orderData) {
      // Formato nuevo con orderData
      const { orderData } = body
      customerData = orderData.customer_data
      items = orderData.items
      externalReference = body.externalReference
      backUrls = body.backUrls
      userId = body.userId
      metadata = body.metadata
    } else {
      // Formato del frontend actual
      customerData = body.customerData
      items = body.items
      externalReference = body.externalReference
      backUrls = body.backUrls
      userId = body.userId
      metadata = body.metadata
    }
    
    console.log("Extracted data:", { customerData, items, externalReference, backUrls, userId, metadata })

    // Rate limiting básico
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(clientIP, 10, 60000)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json({ error: "Demasiadas solicitudes, intenta más tarde" }, { status: 429 })
    }

    // Validar datos usando validadores robustos
    console.log("Validating data with robust validators...")
    
    // Convertir items a formato esperado
    const cartItems: CartItem[] = items.map((item: any) => ({
      id: item.id,
      name: item.title || item.name,
      price: item.unit_price || item.price,
      quantity: item.quantity,
      isSubscription: item.isSubscription || false,
      size: item.size,
      image: item.picture_url || item.image
    }))
    
    // Sanitizar datos del cliente
    const sanitizedCustomerData = sanitizeCustomerData(customerData as CustomerData)
    
    // Validar checkout completo
    const validation = validateCompleteCheckout(sanitizedCustomerData, cartItems)
    
    if (!validation.isValid) {
      console.error('❌ VALIDATION FAILED:')
      console.error('Original customerData:', JSON.stringify(customerData, null, 2))
      console.error('Sanitized customerData:', JSON.stringify(sanitizedCustomerData, null, 2))
      console.error('Cart items:', JSON.stringify(cartItems, null, 2))
      console.error('Validation errors:', validation.errors)
      logValidationErrors('create-preference API', validation)
      return NextResponse.json({ 
        error: "Datos de validación incorrectos", 
        details: validation.errors,
        receivedData: {
          customerData: sanitizedCustomerData,
          items: cartItems
        }
      }, { status: 400 })
    }
    
    // Log advertencias si las hay
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('⚠️ Advertencias de validación:', validation.warnings)
    }
    
    console.log("All validations passed")

    // Calcular el total de la orden incluyendo envío
    console.log("Calculating order total...")
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const shipping = subtotal > 1000 ? 0 : 100.0  // Envío gratis por compras mayores a $1000
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
      subtotal: subtotal, // Agregar el subtotal
      shipping_cost: shipping, // Agregar el costo de envío
      user_id: userId || null, // Usar el userId si está disponible
      customer_name: `${customerData.firstName} ${customerData.lastName}`,
      customer_email: customerData.email, // Guardar el email del cliente
      customer_phone: customerData.phone,
      shipping_address: JSON.stringify(formDataForStorage), // Usar para almacenar todos los datos
      payment_intent_id: null // Se actualizará después de crear la preferencia
    }
    
    if (userId) {
      console.log(`✅ User ID provided: ${userId}, will be assigned to order`)
    } else {
      console.log(`ℹ️ No user ID provided, order will be created without user assignment`)
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

    // Auto-asignar user_id basado en el email del cliente
    console.log("🔄 Attempting to auto-assign user_id based on customer email...")
    try {
      const autoAssignResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/orders/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: orderId })
      })
      
      if (autoAssignResponse.ok) {
        const autoAssignResult = await autoAssignResponse.json()
        if (autoAssignResult.success) {
          console.log(`✅ Order ${orderId} auto-assigned to user ${autoAssignResult.userId} (${autoAssignResult.email})`)
        } else {
          console.log(`ℹ️ Order ${orderId} not auto-assigned: ${autoAssignResult.message}`)
        }
      } else {
        console.log(`⚠️ Auto-assign API call failed with status ${autoAssignResponse.status}`)
      }
    } catch (autoAssignError) {
      console.log(`⚠️ Auto-assign failed (non-critical):`, autoAssignError)
      // No fallar la creación de la orden por esto
    }

    // Verificar si estamos en modo de prueba
    // NOTA: Para suscripciones, SIEMPRE crear la preferencia real en MercadoPago
    const isSubscription = body.metadata?.is_subscription === true
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true" && !isSubscription
    console.log("Test mode check:", isTestMode, "| Is subscription:", isSubscription)
    
    if (isSubscription) {
      console.log("🔔 SUSCRIPCIÓN DETECTADA: El modo test será ignorado para crear preferencia real en MercadoPago")
    }

    // Generar URLs de retorno
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'
    const defaultBackUrls = {
      success: `${baseUrl}/processing-payment`,
      failure: `${baseUrl}/error-pago`,
      pending: `${baseUrl}/pago-pendiente`
    }
    
    // Usar las URLs del frontend si están disponibles, sino usar las por defecto
    const finalBackUrls = backUrls || defaultBackUrls

    if (isTestMode) {
      // En modo de prueba, devolver una respuesta simulada (solo para pagos normales, NO suscripciones)
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
    
    // Validar que las URLs de retorno estén definidas
    if (!finalBackUrls.success) {
      console.error("back_urls.success is required when using auto_return")
      return NextResponse.json({ 
        error: "URL de éxito requerida",
        step: 'back_urls_validation'
      }, { status: 400 })
    }

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
        success: finalBackUrls.success,
        failure: finalBackUrls.failure || finalBackUrls.success,
        pending: finalBackUrls.pending || finalBackUrls.success
      },
      auto_return: "approved", // ✅ Agregar auto_return para mostrar botón "Volver al sitio"
      binary_mode: false, // Usar el checkout estándar de MercadoPago
      external_reference: externalReference || orderId.toString(), // Usar external_reference si está disponible
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'}/api/mercadopago/webhook`,
      statement_descriptor: "PETGOURMET",
      expires: false,
      ...(metadata && { metadata }) // Agregar metadata si está disponible (para suscripciones)
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

    // NO enviar email de confirmación aquí - solo cuando el pago sea confirmado
    // El email se enviará desde el webhook cuando el pago sea aprobado
    console.log('Order created successfully, email will be sent when payment is confirmed via webhook')
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
