import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `basic_${Date.now()}`
  
  try {
    console.log(`=== BASIC ENVIRONMENT CHECK [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    
    // Solo verificar variables de entorno sin hacer llamadas externas
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `SET (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...)` : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
      MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? `SET (${process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 20)}...)` : "MISSING",
      NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? "SET" : "MISSING",
      NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT: process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL
    }
    
    console.log("Environment variables:", envCheck)
    
    // Verificar si es posible importar el cliente de Supabase
    let supabaseImportTest = "SUCCESS"
    try {
      const { createClient } = await import("@/lib/supabase/server")
      console.log("✅ Supabase import successful")
    } catch (importError) {
      supabaseImportTest = `FAILED: ${importError instanceof Error ? importError.message : String(importError)}`
      console.error("❌ Supabase import failed:", importError)
    }
    
    // Verificar estructura del request
    let requestBody = null
    try {
      requestBody = await request.json()
      console.log("Request body:", requestBody)
    } catch (bodyError) {
      console.log("No request body or invalid JSON")
    }
    
    console.log(`=== BASIC ENVIRONMENT CHECK COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "Basic environment check completed",
      environment: envCheck,
      supabase_import: supabaseImportTest,
      request_info: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: requestBody
      }
    })
    
  } catch (error) {
    console.error("❌ BASIC ENVIRONMENT CHECK FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "Basic environment check failed",
      details: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Basic Environment Check",
    description: "Ultra basic check that doesn't depend on external services",
    usage: "POST to this endpoint to check basic environment configuration",
    timestamp: new Date().toISOString()
  })
}
