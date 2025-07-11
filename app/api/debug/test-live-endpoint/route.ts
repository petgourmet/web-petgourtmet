import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `live_test_${Date.now()}`
  
  try {
    console.log(`=== LIVE MERCADOPAGO ENDPOINT TEST [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    
    // Datos de prueba controlados para enviar al endpoint real
    const testData = {
      orderData: {
        customer_data: {
          firstName: 'TestLive',
          lastName: 'User',
          email: 'test-live@petgourmet.com',
          phone: '5555555555',
          address: {
            street_name: 'Av Test Live',
            street_number: '100',
            zip_code: '01000',
            city: 'Ciudad de México',
            state: 'CDMX'
          }
        },
        items: [{
          id: 'live-test-item',
          title: 'Test Live Product',
          quantity: 1,
          unit_price: 599.00
        }],
        subtotal: 599.00,
        frequency: 'none'
      }
    }
    
    console.log("1. Test data prepared:", JSON.stringify(testData, null, 2))
    
    // Hacer la llamada al endpoint real de create-preference
    console.log("2. Making request to real MercadoPago endpoint...")
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const endpointUrl = `${baseUrl}/api/mercadopago/create-preference`
    
    console.log(`Calling endpoint: ${endpointUrl}`)
    
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const responseStatus = response.status
    const responseHeaders = Object.fromEntries(response.headers.entries())
    
    console.log(`Response status: ${responseStatus}`)
    console.log(`Response headers:`, responseHeaders)
    
    let responseBody
    try {
      responseBody = await response.json()
      console.log(`Response body:`, JSON.stringify(responseBody, null, 2))
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError)
      responseBody = await response.text()
      console.log(`Response body (text):`, responseBody)
    }
    
    const isSuccess = response.ok
    
    console.log(`Request result: ${isSuccess ? '✅ Success' : '❌ Failed'}`)
    
    if (!isSuccess) {
      console.error(`❌ MercadoPago endpoint failed with status ${responseStatus}`)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "MercadoPago endpoint returned error",
        test_results: {
          endpoint_url: endpointUrl,
          status_code: responseStatus,
          response_headers: responseHeaders,
          response_body: responseBody,
          test_data_sent: testData
        },
        environment: {
          node_env: process.env.NODE_ENV,
          base_url: baseUrl,
          vercel_url: process.env.VERCEL_URL
        }
      }, { status: 500 })
    }
    
    console.log("✅ MercadoPago endpoint test successful")
    console.log(`=== LIVE MERCADOPAGO ENDPOINT TEST COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "Live MercadoPago endpoint test completed successfully",
      test_results: {
        endpoint_url: endpointUrl,
        status_code: responseStatus,
        response_headers: responseHeaders,
        response_body: responseBody,
        test_data_sent: testData
      },
      environment: {
        node_env: process.env.NODE_ENV,
        base_url: baseUrl,
        vercel_url: process.env.VERCEL_URL
      }
    })
    
  } catch (error) {
    console.error("❌ LIVE MERCADOPAGO ENDPOINT TEST FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "Live MercadoPago endpoint test failed",
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      environment: {
        node_env: process.env.NODE_ENV,
        vercel_url: process.env.VERCEL_URL
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Live MercadoPago Endpoint Test",
    description: "Use POST method to test the real MercadoPago create-preference endpoint",
    endpoints: {
      post: "/api/debug/test-live-endpoint",
      method: "POST",
      purpose: "Test the actual MercadoPago endpoint with controlled data"
    },
    timestamp: new Date().toISOString()
  })
}
