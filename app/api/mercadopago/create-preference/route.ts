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

    // Verificar si estamos en modo de prueba
    const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

    if (isTestMode) {
      // En modo de prueba, devolver una respuesta simulada
      return NextResponse.json({
        success: true,
        preferenceId: `test_preference_${Date.now()}`,
        initPoint: backUrls.success,
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
      back_urls: backUrls,
      auto_return: "approved",
      external_reference: externalReference,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/webhook`,
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
    })
  } catch (error) {
    console.error("Error in create-preference route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
