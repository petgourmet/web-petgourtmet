// app/api/mercadopago/test-preference-full/route.ts

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Test preference request (full):', body)
    
    // Verificar que tenemos el token de acceso
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoAccessToken) {
      return NextResponse.json({ error: "Access token not configured" }, { status: 500 })
    }

    // URLs válidas para pruebas (usando httpbin.org que siempre responde 200)
    const validUrls = {
      success: "https://httpbin.org/status/200",
      failure: "https://httpbin.org/status/400", 
      pending: "https://httpbin.org/status/202"
    }

    // Configuración con URLs válidas
    const preference = {
      items: [
        {
          id: "test-item-1",
          title: "Producto de Prueba PetGourmet",
          description: "Producto de prueba para validar MercadoPago",
          quantity: 1,
          currency_id: "MXN",
          unit_price: 100
        }
      ],
      back_urls: validUrls,
      auto_return: "approved",
      external_reference: `test-${Date.now()}`,
      notification_url: "https://httpbin.org/post"
    }

    console.log('Sending preference to MercadoPago:', JSON.stringify(preference, null, 2))

    // Llamar a la API de MercadoPago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    })

    const responseText = await response.text()
    console.log('MercadoPago response status:', response.status)
    console.log('MercadoPago response:', responseText)

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        errorData = { message: responseText }
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create preference", 
          details: errorData,
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = JSON.parse(responseText)
    
    return NextResponse.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
      fullResponse: data,
      message: "Preference created with valid URLs"
    })

  } catch (error) {
    console.error('Error in test-preference-full:', error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
