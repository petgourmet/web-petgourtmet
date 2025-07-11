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
    
    // Crear la orden en Supabase con todos los datos del formulario
    const supabase = await createClient()
    
    const orderData = {
      id: externalReference,
      items: items,
      subtotal: subtotal,
      total: total,
      status: 'pending',
      payment_status: 'pending',
      // Datos del cliente del formulario
      customer_name: `${customerData.firstName} ${customerData.lastName}`,
      customer_email: customerData.email,
      customer_phone: customerData.phone,
      // Dirección de envío
      shipping_address: {
        street_name: customerData.address.street_name,
        street_number: customerData.address.street_number,
        zip_code: customerData.address.zip_code,
        city: customerData.address.city,
        state: customerData.address.state,
        country: customerData.address.country,
        full_address: `${customerData.address.street_name} ${customerData.address.street_number}, ${customerData.address.city}, ${customerData.address.state} ${customerData.address.zip_code}, ${customerData.address.country}`
      },
      // Datos completos del formulario para referencia
      form_data: customerData
    }

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderData)

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json({ error: 'Error creando la orden', details: orderError }, { status: 500 })
    }

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
        success: backUrls.success,
        failure: backUrls.failure || backUrls.success,
        pending: backUrls.pending || backUrls.success
      },
      auto_return: "approved",
      external_reference: externalReference,
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

    // Actualizar el pedido con el ID de preferencia si tenemos una referencia externa
    if (externalReference) {
      const supabase = await createClient()
      const { error: updateError } = await supabase
        .from("orders")
        .update({ mercadopago_preference_id: data.id })
        .eq("id", externalReference)

      if (updateError) {
        console.error("Error updating order with preference ID:", updateError)
      }
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
