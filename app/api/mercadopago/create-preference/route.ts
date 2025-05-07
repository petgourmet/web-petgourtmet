import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("API: Recibiendo solicitud para crear preferencia de pago")

    const body = await request.json()
    const { items, customerData } = body

    if (!items || items.length === 0) {
      console.error("API: No se proporcionaron items")
      return NextResponse.json({ error: "No se proporcionaron items" }, { status: 400 })
    }

    // Obtener el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      console.error("API: Token de acceso de Mercado Pago no configurado")
      return NextResponse.json({ error: "Token de acceso de Mercado Pago no configurado" }, { status: 500 })
    }

    // Usar la URL correcta de la aplicación
    const appUrl = "https://petgourmet.mx"

    // Crear la preferencia de pago con el formato exacto que espera Mercado Pago
    const preference = {
      items: items.map((item: any) => ({
        id: String(item.id),
        title: String(item.title || item.name),
        description: String(item.description || `${item.name} - ${item.size || "Standard"}`),
        picture_url: String(item.picture_url || item.image),
        category_id: "pet_food",
        quantity: Number(item.quantity),
        currency_id: "MXN", // Código de moneda para México
        unit_price: Number(item.unit_price || item.price),
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
          street_number: Number.parseInt(customerData.address.street_number) || 0,
          zip_code: customerData.address.zip_code,
        },
      },
      back_urls: {
        success: `${appUrl}/gracias-por-tu-compra`,
        failure: `${appUrl}/error-pago`,
        pending: `${appUrl}/pago-pendiente`,
      },
      auto_return: "approved",
      statement_descriptor: "Pet Gourmet",
      external_reference: `PETGOURMET-${Date.now()}`,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    }

    console.log("API: Enviando solicitud a Mercado Pago", JSON.stringify(preference, null, 2))

    // Llamar a la API de Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
      body: JSON.stringify(preference),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("API: Error al crear preferencia en Mercado Pago", responseData)
      return NextResponse.json(
        {
          error: `Error al crear preferencia en Mercado Pago: ${responseData.message || JSON.stringify(responseData)}`,
          details: responseData,
        },
        { status: response.status },
      )
    }

    console.log("API: Preferencia creada exitosamente", responseData)

    return NextResponse.json({
      preferenceId: responseData.id,
      initPoint: responseData.init_point,
      sandboxInitPoint: responseData.sandbox_init_point,
    })
  } catch (error) {
    console.error("API: Error en create-preference", error)
    return NextResponse.json(
      {
        error: `Error interno del servidor: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
