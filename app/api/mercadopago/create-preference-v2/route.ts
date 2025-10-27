import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, customerData, externalReference, backUrls } = body

    console.log("Received order data:", JSON.stringify(body, null, 2))

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
    const total = subtotal
    
    // Crear la orden en Supabase con campos mínimos y seguros
    const supabase = await createClient()
    
    // Generar número de orden único
    const orderNumber = `PG${Date.now()}`
    
    // Crear orden con campos básicos que sabemos que existen
    const orderData = {
      id: externalReference,
      status: 'pending',
      payment_status: 'pending',
      total: total,
      notes: JSON.stringify({
        order_number: orderNumber,
        customer_name: `${customerData.firstName} ${customerData.lastName}`,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        customer_address: customerData.address,
        form_data: customerData,
        items: items,
        subtotal: subtotal,
        created_at: new Date().toISOString()
      })
    }

    console.log("Attempting to create order with data:", JSON.stringify(orderData, null, 2))

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

    console.log("Order created successfully:", createdOrder)

    // Verificar si estamos en modo de prueba
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

    if (isTestMode) {
      console.log("Test mode enabled, returning mock response")
      // En modo de prueba, devolver una respuesta simulada
      return NextResponse.json({
        success: true,
        preferenceId: `test_preference_${Date.now()}`,
        initPoint: backUrls.success,
        orderId: externalReference
      })
    }

    // Obtener el token de acceso de Mercado Pago
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
        success: `${backUrls.success}?order_id=${externalReference}&order_number=${orderNumber}&payment_id={{payment_id}}`,
        failure: `${backUrls.failure || '/error-pago'}?order_id=${externalReference}&order_number=${orderNumber}&error={{error}}`,
        pending: `${backUrls.pending || '/pago-pendiente'}?order_id=${externalReference}&order_number=${orderNumber}&payment_id={{payment_id}}`
      },
      auto_return: "approved",
      external_reference: externalReference,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'}/api/mercadopago/webhook`,
      // Configuración de métodos de pago
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        installments: 12,
        default_installments: 1
      }
    }

    console.log("Creating MercadoPago preference:", JSON.stringify(preference, null, 2))

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
    console.log("MercadoPago preference created:", data)

    // Actualizar el pedido con el ID de preferencia
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        notes: JSON.stringify({
          ...JSON.parse(orderData.notes),
          mercadopago_preference_id: data.id
        })
      })
      .eq("id", externalReference)

    if (updateError) {
      console.error("Error updating order with preference ID:", updateError)
      // No fallar por esto
    }

    return NextResponse.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      orderId: externalReference
    })

  } catch (error) {
    console.error("Error in create-preference route:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
