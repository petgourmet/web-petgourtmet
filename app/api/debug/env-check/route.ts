import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `env_vars_${Date.now()}`
  
  try {
    console.log(`=== ENVIRONMENT VARIABLES CHECK [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    
    // Verificar cada variable de entorno crítica
    const criticalEnvVars = {
      NEXT_PUBLIC_SUPABASE_URL: {
        value: process.env.NEXT_PUBLIC_SUPABASE_URL,
        status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
        preview: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 50) + "..." : "N/A"
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
        status: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
        preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 30) + "..." : "N/A"
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        value: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
        status: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
        preview: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 30) + "..." : "N/A"
      },
      MERCADOPAGO_ACCESS_TOKEN: {
        value: process.env.MERCADOPAGO_ACCESS_TOKEN ? "SET" : "MISSING",
        status: process.env.MERCADOPAGO_ACCESS_TOKEN ? "SET" : "MISSING",
        preview: process.env.MERCADOPAGO_ACCESS_TOKEN ? process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 30) + "..." : "N/A"
      },
      NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: {
        value: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
        status: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? "SET" : "MISSING",
        preview: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "N/A"
      }
    }
    
    console.log("Critical environment variables check:", criticalEnvVars)
    
    // Verificar si todas las variables críticas están presentes
    const missingVars = Object.entries(criticalEnvVars)
      .filter(([_, config]) => config.status === "MISSING")
      .map(([key, _]) => key)
    
    if (missingVars.length > 0) {
      console.error("❌ Missing critical environment variables:", missingVars)
      return NextResponse.json({
        success: false,
        debugId,
        timestamp,
        error: "Missing critical environment variables",
        missing_variables: missingVars,
        all_variables: criticalEnvVars
      }, { status: 500 })
    }
    
    // Test de importación de módulos críticos
    console.log("Testing critical module imports...")
    const moduleTests: Record<string, string> = {}
    
    try {
      await import("@supabase/ssr")
      moduleTests["@supabase/ssr"] = "SUCCESS"
      console.log("✅ @supabase/ssr import successful")
    } catch (error) {
      moduleTests["@supabase/ssr"] = `FAILED: ${error instanceof Error ? error.message : String(error)}`
      console.error("❌ @supabase/ssr import failed:", error)
    }
    
    try {
      await import("next/headers")
      moduleTests["next/headers"] = "SUCCESS"
      console.log("✅ next/headers import successful")
    } catch (error) {
      moduleTests["next/headers"] = `FAILED: ${error instanceof Error ? error.message : String(error)}`
      console.error("❌ next/headers import failed:", error)
    }
    
    console.log(`=== ENVIRONMENT VARIABLES CHECK COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: true,
      debugId,
      timestamp,
      message: "Environment variables check completed successfully",
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL
      },
      critical_variables: criticalEnvVars,
      module_imports: moduleTests,
      summary: {
        total_critical_vars: Object.keys(criticalEnvVars).length,
        missing_vars: missingVars.length,
        all_vars_present: missingVars.length === 0
      }
    })
    
  } catch (error) {
    console.error("❌ ENVIRONMENT VARIABLES CHECK FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "Environment variables check failed",
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
    message: "Environment Variables Check",
    description: "Checks if all critical environment variables are properly set",
    timestamp: new Date().toISOString()
  })
}
