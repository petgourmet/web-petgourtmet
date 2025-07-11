import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, customerData, externalReference, backUrls } = body

    // Validar datos requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items son requeridos" }, { status: 400 })
    }

    if (!customerData || !customerData.email) {
      return NextResponse.json({ error: "Datos del cliente son requeridos" }, { status: 400 })
    }

    if (!backUrls || !backUrls.success) {
      return NextResponse.json({ error: "URLs de retorno son requeridas" }, { status: 400 })
    }

    // Calcular el total de la orden
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0)
    const total = subtotal // Por ahora sin impuestos ni envío
    
    // Crear la orden en Supabase con los datos disponibles
    const supabase = await createClient()
    
    // Generar número de orden único
    const orderNumber = `PG${Date.now()}`
    
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
      frequency: customerData.frequency || 'none',
      created_at: new Date().toISOString()
    }

    const orderData = {
      // No incluir ID, que es autoincremental
      status: 'pending',
      payment_status: 'pending',
      total: total,
      user_id: null, // Se puede actualizar si hay usuario autenticado
      customer_name: `${customerData.firstName} ${customerData.lastName}`,
      customer_phone: customerData.phone,
      shipping_address: JSON.stringify(formDataForStorage), // Usar para almacenar todos los datos
      payment_intent_id: externalReference // Usar para rastrear la orden
    }

    console.log("Creating order with data:", JSON.stringify(orderData, null, 2))

    const { error: orderError, data: createdOrder } = await supabase
      .from('orders')
      .insert(orderData)
      .select()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json({ 
        error: 'Error creando la orden', 
        details: orderError,
        attemptedData: orderData
      }, { status: 500 })
    }

    const orderId = createdOrder[0].id
    console.log("Order created successfully with ID:", orderId)

    // Verificar si estamos en modo de prueba
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

    if (isTestMode) {
      // En modo de prueba, devolver una respuesta simulada
      return NextResponse.json({
        success: true,
        preferenceId: `test_preference_${Date.now()}`,
        initPoint: backUrls.success,
        orderId: externalReference
      })
    }

    // Verificar que tenemos el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      console.error("Mercado Pago access token not configured")
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

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
      external_reference: orderId.toString(), // Usar el ID real de la orden
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mercadopago/webhook`,
    }

    // Llamar a la API de Mercado Pago
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
      console.error("Error creating Mercado Pago preference:", errorData)
      return NextResponse.json(
        { error: "Failed to create Mercado Pago preference", details: errorData },
        { status: response.status },
      )
    }

    const data = await response.json()

    // Actualizar el pedido con el ID de preferencia
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        payment_intent_id: `${data.id}|${externalReference}` // Guardar ambos IDs
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("Error updating order with preference ID:", updateError)
      // No fallar por esto
    }

    return NextResponse.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      orderId: orderId,
      externalReference: externalReference
    })
  } catch (error) {
    console.error("Error in create-preference route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
