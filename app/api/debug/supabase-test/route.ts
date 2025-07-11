import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `supabase_test_${Date.now()}`
  
  try {
    console.log(`=== SUPABASE CONNECTION TEST [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    
    // Paso 1: Verificar importación de dependencias
    console.log("1. Testing imports...")
    let importResults: Record<string, string> = {}
    
    try {
      const { createServerClient } = await import("@supabase/ssr")
      importResults["@supabase/ssr"] = "SUCCESS"
    } catch (error) {
      importResults["@supabase/ssr"] = `FAILED: ${error instanceof Error ? error.message : String(error)}`
    }
    
    try {
      const { cookies } = await import("next/headers")
      importResults["next/headers"] = "SUCCESS"
    } catch (error) {
      importResults["next/headers"] = `FAILED: ${error instanceof Error ? error.message : String(error)}`
    }
    
    console.log("Import results:", importResults)
    
    // Paso 2: Verificar variables de entorno
    console.log("2. Checking environment variables...")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined")
    }
    
    if (!supabaseKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
    }
    
    console.log("Environment variables OK")
    
    // Paso 3: Probar cookies()
    console.log("3. Testing cookies...")
    let cookieTest: Record<string, any> = {}
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      cookieTest = {
        status: "SUCCESS",
        cookieCount: cookieStore.getAll().length
      }
    } catch (error) {
      cookieTest = {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error)
      }
    }
    
    console.log("Cookie test:", cookieTest)
    
    // Paso 4: Probar creación del cliente Supabase
    console.log("4. Testing Supabase client creation...")
    let clientTest: Record<string, any> = {}
    try {
      const { createServerClient } = await import("@supabase/ssr")
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      
      const client = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
              } catch {
                // Ignore if called from Server Component
              }
            },
          },
        }
      )
      
      clientTest = {
        status: "SUCCESS",
        clientCreated: !!client
      }
    } catch (error) {
      clientTest = {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }
    
    console.log("Client test:", clientTest)
    
    // Paso 5: Probar query simple
    console.log("5. Testing simple query...")
    let queryTest: Record<string, any> = {}
    try {
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('orders')
        .select('count(*)')
        .limit(1)
      
      if (error) {
        queryTest = {
          status: "QUERY_ERROR",
          error: error.message,
          details: error
        }
      } else {
        queryTest = {
          status: "SUCCESS",
          result: data
        }
      }
    } catch (error) {
      queryTest = {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }
    
    console.log("Query test:", queryTest)
    console.log(`=== SUPABASE CONNECTION TEST COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: queryTest.status === "SUCCESS",
      debugId,
      timestamp,
      message: "Supabase connection test completed",
      test_results: {
        imports: importResults,
        environment_vars: {
          supabase_url: supabaseUrl ? "SET" : "MISSING",
          supabase_key: supabaseKey ? "SET" : "MISSING"
        },
        cookie_test: cookieTest,
        client_creation: clientTest,
        query_test: queryTest
      }
    })
    
  } catch (error) {
    console.error("❌ SUPABASE CONNECTION TEST FAILED:", error)
    return NextResponse.json({
      success: false,
      debugId,
      timestamp,
      error: "Supabase connection test failed",
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
    message: "Supabase Connection Test",
    description: "Tests each step of Supabase connection creation",
    timestamp: new Date().toISOString()
  })
}
