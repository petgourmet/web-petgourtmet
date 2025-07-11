import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const timestamp = new Date().toISOString()
  const debugId = `full_diagnostic_${Date.now()}`
  
  try {
    console.log(`=== FULL PRODUCTION DIAGNOSTIC [${debugId}] ===`)
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'https://petgourmet.mx'
    const results: {
      diagnostic_id: string;
      timestamp: string;
      environment: string;
      base_url: string;
      tests: Record<string, any>;
      summary?: {
        total_tests: number;
        successful_tests: number;
        failed_tests: number;
        overall_status: string;
      };
    } = {
      diagnostic_id: debugId,
      timestamp,
      environment: process.env.NODE_ENV || 'unknown',
      base_url: baseUrl,
      tests: {}
    }
    
    console.log("Running comprehensive production diagnostics...")
    
    // 1. Test basic order insertion
    console.log("1. Testing basic order insertion...")
    try {
      const orderTestResponse = await fetch(`${baseUrl}/api/debug/simple-order-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const orderTestResult = await orderTestResponse.json()
      results.tests.order_insertion = {
        status: orderTestResponse.ok ? 'SUCCESS' : 'FAILED',
        details: orderTestResult
      }
      console.log(`Order insertion test: ${orderTestResponse.ok ? '✅' : '❌'}`)
    } catch (error) {
      results.tests.order_insertion = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      }
      console.log(`Order insertion test: ❌ Error - ${error}`)
    }
    
    // 2. Test MercadoPago flow
    console.log("2. Testing MercadoPago flow simulation...")
    try {
      const mpFlowResponse = await fetch(`${baseUrl}/api/debug/mercadopago-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const mpFlowResult = await mpFlowResponse.json()
      results.tests.mercadopago_flow = {
        status: mpFlowResponse.ok ? 'SUCCESS' : 'FAILED',
        details: mpFlowResult
      }
      console.log(`MercadoPago flow test: ${mpFlowResponse.ok ? '✅' : '❌'}`)
    } catch (error) {
      results.tests.mercadopago_flow = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      }
      console.log(`MercadoPago flow test: ❌ Error - ${error}`)
    }
    
    // 3. Test live endpoint
    console.log("3. Testing live MercadoPago endpoint...")
    try {
      const liveTestResponse = await fetch(`${baseUrl}/api/debug/test-live-endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const liveTestResult = await liveTestResponse.json()
      results.tests.live_endpoint = {
        status: liveTestResponse.ok ? 'SUCCESS' : 'FAILED',
        details: liveTestResult
      }
      console.log(`Live endpoint test: ${liveTestResponse.ok ? '✅' : '❌'}`)
    } catch (error) {
      results.tests.live_endpoint = {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error)
      }
      console.log(`Live endpoint test: ❌ Error - ${error}`)
    }
    
    // 4. Environment check
    console.log("4. Checking environment variables...")
    results.tests.environment_check = {
      status: 'INFO',
      details: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL ? 'Set' : 'Not set',
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? 'Set' : 'Not set',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
        MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Set' : 'Not set',
        NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? 'Set' : 'Not set'
      }
    }
    
    // 5. Summary
    const successCount = Object.values(results.tests).filter(test => test.status === 'SUCCESS').length
    const totalTests = Object.keys(results.tests).length - 1 // Exclude environment_check
    const allTestsPassed = successCount === totalTests
    
    results.summary = {
      total_tests: totalTests,
      successful_tests: successCount,
      failed_tests: totalTests - successCount,
      overall_status: allTestsPassed ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED'
    }
    
    console.log(`=== DIAGNOSTIC SUMMARY [${debugId}] ===`)
    console.log(`Tests passed: ${successCount}/${totalTests}`)
    console.log(`Overall status: ${allTestsPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`)
    console.log(`=== FULL PRODUCTION DIAGNOSTIC COMPLETED [${debugId}] ===`)
    
    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed 
        ? "All production diagnostic tests passed successfully" 
        : "Some production diagnostic tests failed",
      ...results
    }, { 
      status: allTestsPassed ? 200 : 500 
    })
    
  } catch (error) {
    console.error("❌ FULL PRODUCTION DIAGNOSTIC FAILED:", error)
    return NextResponse.json({
      success: false,
      diagnostic_id: debugId,
      timestamp,
      error: "Full production diagnostic failed",
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
    message: "Full Production Diagnostic Suite",
    description: "Runs all diagnostic tests to identify production issues",
    available_tests: [
      "Order insertion test",
      "MercadoPago flow simulation",
      "Live endpoint test",
      "Environment variables check"
    ],
    endpoints: {
      post: "/api/debug/full-diagnostic",
      method: "POST",
      purpose: "Run comprehensive production diagnostic tests"
    },
    individual_tests: {
      order_test: "/api/debug/simple-order-test",
      mercadopago_flow: "/api/debug/mercadopago-flow",
      live_endpoint: "/api/debug/test-live-endpoint"
    },
    timestamp: new Date().toISOString()
  })
}
