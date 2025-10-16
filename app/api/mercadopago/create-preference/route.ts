import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { logger, LogCategory } from "@/lib/logger"
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
  logger.info(LogCategory.PAYMENT, 'Create preference endpoint called', {
    url: request.url,
    method: request.method
  })
  
  try {
    const body = await request.json()
    logger.info(LogCategory.PAYMENT, 'Request body parsed successfully')
    
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

    // Rate limiting básico
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(clientIP, 10, 60000)) {
      logger.warn(LogCategory.PAYMENT, 'Rate limit exceeded', { clientIP })
      return NextResponse.json({ error: "Demasiadas solicitudes, intenta más tarde" }, { status: 429 })
    }

    // Validar datos usando validadores robustos
    logger.info(LogCategory.PAYMENT, 'Validating data with robust validators')
    
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
      logger.error(LogCategory.PAYMENT, 'Validation failed', undefined, {
        errors: validation.errors,
        customerData: sanitizedCustomerData,
        cartItems
      })
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
      logger.warn(LogCategory.PAYMENT, 'Validation warnings', { warnings: validation.warnings })
    }
    
    logger.info(LogCategory.PAYMENT, 'All validations passed')

    // Calcular el total de la orden incluyendo envío
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const shipping = subtotal > 1000 ? 0 : 100.0  // Envío gratis por compras mayores a $1000
    const taxes = 0  // Los impuestos ya están incluidos en el precio del producto
    const total = subtotal + shipping
    
    logger.info(LogCategory.PAYMENT, 'Order total calculated', {
      subtotal,
      shipping,
      taxes,
      total
    })
    
    // Crear la orden en Supabase con los datos disponibles
    const supabase = createServiceClient()
    
    // Generar número de orden único
    const orderNumber = `PG${Date.now()}`
    logger.info(LogCategory.PAYMENT, 'Generated order number', { orderNumber })
    
    // Crear orden con la estructura real de la tabla
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
      logger.info(LogCategory.PAYMENT, 'User ID provided for order assignment', { userId })
    } else {
      logger.info(LogCategory.PAYMENT, 'No user ID provided, order will be created without user assignment')
    }

    const { error: orderError, data: createdOrder } = await supabase
      .from('orders')
      .insert(orderDataForDB)
      .select()

    if (orderError) {
      logger.error(LogCategory.PAYMENT, 'Error creating order', orderError.message, {
        orderError,
        attemptedData: orderDataForDB
      })
      return NextResponse.json({ 
        error: 'Error creando la orden', 
        details: orderError,
        attemptedData: orderDataForDB,
        step: 'database_insertion'
      }, { status: 500 })
    }

    if (!createdOrder || createdOrder.length === 0) {
      logger.error(LogCategory.PAYMENT, 'No order data returned from insert operation')
      return NextResponse.json({ 
        error: 'No order data returned from database', 
        step: 'database_insertion_no_data'
      }, { status: 500 })
    }

    const orderId = createdOrder[0].id
    logger.info(LogCategory.PAYMENT, 'Order created successfully', {
      orderId,
      orderNumber
    })

    // Auto-asignar user_id basado en el email del cliente
    logger.info(LogCategory.PAYMENT, 'Attempting to auto-assign user_id based on customer email')
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
          logger.info(LogCategory.PAYMENT, 'Order auto-assigned to user', {
            orderId,
            userId: autoAssignResult.userId,
            email: autoAssignResult.email
          })
        } else {
          logger.info(LogCategory.PAYMENT, 'Order not auto-assigned', {
            orderId,
            message: autoAssignResult.message
          })
        }
      } else {
        logger.warn(LogCategory.PAYMENT, 'Auto-assign API call failed', {
          status: autoAssignResponse.status
        })
      }
    } catch (autoAssignError) {
      logger.warn(LogCategory.PAYMENT, 'Auto-assign failed (non-critical)', autoAssignError.message)
      // No fallar la creación de la orden por esto
    }

    // Verificar si estamos en modo de prueba
    // NOTA: Para suscripciones, SIEMPRE crear la preferencia real en MercadoPago
    const isSubscription = body.metadata?.is_subscription === true
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true" && !isSubscription
    
    logger.info(LogCategory.PAYMENT, 'Test mode and subscription check', {
      isTestMode,
      isSubscription
    })
    
    if (isSubscription) {
      logger.info(LogCategory.SUBSCRIPTION, 'Subscription detected: test mode will be ignored to create real MercadoPago preference')
    }

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
      // En modo de prueba, devolver una respuesta simulada (solo para pagos normales, NO suscripciones)
      logger.info(LogCategory.PAYMENT, 'Test mode enabled, returning mock response')
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
    
    if (!mercadoPagoAccessToken) {
      logger.error(LogCategory.PAYMENT, 'MercadoPago access token not configured')
      return NextResponse.json({ 
        error: "Mercado Pago access token not configured",
        step: 'mercadopago_config'
      }, { status: 500 })
    }

    // Crear la preferencia en Mercado Pago
    logger.info(LogCategory.PAYMENT, 'Preparing MercadoPago preference')
    
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
        logger.error(LogCategory.PAYMENT, 'Invalid item price', undefined, { item })
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
    
    // Validar que las URLs de retorno estén definidas
    if (!finalBackUrls.success) {
      logger.error(LogCategory.PAYMENT, 'back_urls.success is required when using auto_return')
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
      // auto_return: "approved", // ❌ Temporalmente removido para evitar error "auto_return invalid"
      binary_mode: false, // Usar el checkout estándar de MercadoPago
      external_reference: externalReference || orderId.toString(), // Usar external_reference si está disponible
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'}/api/mercadopago/webhook`,
      statement_descriptor: "PETGOURMET",
      expires: false,
      ...(metadata && { metadata }) // Agregar metadata si está disponible (para suscripciones)
    }

    // Llamar a la API de Mercado Pago
    logger.info(LogCategory.PAYMENT, 'Calling MercadoPago API to create preference')
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
      logger.error(LogCategory.PAYMENT, 'Error creating MercadoPago preference', undefined, {
        status: response.status,
        errorData,
        preference
      })
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
    logger.info(LogCategory.PAYMENT, 'MercadoPago preference created successfully', {
      preferenceId: data.id,
      initPoint: data.init_point
    })

    // Actualizar el pedido con el ID de preferencia
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_intent_id: data.id // Guardar el ID de la preferencia de MercadoPago
      })
      .eq("id", orderId)

    if (updateError) {
      logger.error(LogCategory.PAYMENT, 'Error updating order with preference ID', updateError.message)
      // No fallar por esto, pero loggearlo
    } else {
      logger.info(LogCategory.PAYMENT, 'Order updated with preference ID successfully', {
        orderId,
        preferenceId: data.id
      })

    // NO enviar email de confirmación aquí - solo cuando el pago sea confirmado
    // El email se enviará desde el webhook cuando el pago sea aprobado
    logger.info(LogCategory.PAYMENT, 'Order created successfully, email will be sent when payment is confirmed via webhook')
    }

    logger.info(LogCategory.PAYMENT, 'Create preference completed successfully', {
      orderId,
      preferenceId: data.id,
      orderNumber
    })
    
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
    logger.error(LogCategory.PAYMENT, 'Unexpected error in create-preference route', error instanceof Error ? error.message : String(error), {
      errorType: typeof error,
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error),
      step: 'unexpected_error'
    }, { status: 500 })
  }
}
