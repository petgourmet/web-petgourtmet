import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("Testing frontend flow format...")
    
    // Simular los datos exactos que envía el frontend
    const frontendData = {
      items: [
        {
          id: "plan-atun-45-test",
          title: "Plan de Atún Test", 
          description: "Plan personalizado de atún para tu mascota - Test",
          picture_url: "https://res.cloudinary.com/your-cloud/image/upload/v1/plan-atun.jpg",
          quantity: 1,
          unit_price: 45.00
        }
      ],
      customerData: {
        firstName: "Cristofer",
        lastName: "Escalante", 
        email: "cristoferscalante@gmail.com",
        phone: "3229836494",
        address: {
          street_name: "carrera36#50-40 carrera36#50-40",
          street_number: "0",
          zip_code: "170004",
          city: "manizales",
          state: "Caldas",
          country: "México"
        }
      },
      externalReference: `test_frontend_${Date.now()}`,
      backUrls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gracias-por-tu-compra`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/error-pago`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pago-pendiente`
      }
    }
    
    console.log("Frontend data prepared:", JSON.stringify(frontendData, null, 2))
    
    // Llamar al endpoint real con el formato del frontend
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mercadopago/create-preference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(frontendData)
    })
    
    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { rawResponse: responseText }
    }
    
    const result = {
      testData: frontendData,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      },
      timestamp: new Date().toISOString()
    }
    
    console.log("Test result:", JSON.stringify(result, null, 2))
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error("Error in frontend flow test:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Frontend flow test endpoint",
    description: "Use POST to test the frontend checkout flow format",
    usage: "POST /api/debug/test-frontend-flow"
  })
}
