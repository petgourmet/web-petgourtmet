import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("API Debug: Creando preferencia de prueba")

    // Obtener el token de acceso de Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      console.error("API Debug: Token de acceso de Mercado Pago no configurado")
      return NextResponse.json({ error: "Token de acceso de Mercado Pago no configurado" }, { status: 500 })
    }

    // Obtener la URL base de la aplicación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Crear una preferencia de prueba simple
    const preference = {
      items: [
        {
          id: "test-item-1",
          title: "Producto de prueba",
          description: "Descripción del producto de prueba",
          picture_url: "https://www.mercadopago.com/org-img/MP3/home/logomp3.gif",
          category_id: "pet_food",
          quantity: 1,
          currency_id: "ARS", // Código de moneda para Argentina
          unit_price: 100,
        },
      ],
      payer: {
        name: "Juan",
        surname: "Perez",
        email: "test@test.com",
        phone: {
          number: "1234567890",
        },
        address: {
          street_name: "Calle Falsa",
          street_number: 123,
          zip_code: "1234",
        },
      },
      back_urls: {
        success: `${appUrl}/gracias-por-tu-compra`,
        failure: `${appUrl}/error-pago`,
        pending: `${appUrl}/pago-pendiente`,
      },
      auto_return: "approved",
      statement_descriptor: "Pet Gourmet Test",
      external_reference: `PETGOURMET-TEST-${Date.now()}`,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    }

    console.log("API Debug: Enviando solicitud a Mercado Pago", JSON.stringify(preference, null, 2))

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
      console.error("API Debug: Error al crear preferencia en Mercado Pago", responseData)
      return NextResponse.json(
        {
          error: `Error al crear preferencia en Mercado Pago: ${responseData.message || JSON.stringify(responseData)}`,
          details: responseData,
        },
        { status: response.status },
      )
    }

    console.log("API Debug: Preferencia creada exitosamente", responseData)

    return NextResponse.json({
      preferenceId: responseData.id,
      initPoint: responseData.init_point,
      sandboxInitPoint: responseData.sandbox_init_point,
      fullResponse: responseData,
    })
  } catch (error) {
    console.error("API Debug: Error en create-preference", error)
    return NextResponse.json(
      {
        error: `Error interno del servidor: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
