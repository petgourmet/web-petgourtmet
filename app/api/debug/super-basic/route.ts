import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test súper básico
    const basicInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      vercel_url: process.env.VERCEL_URL || 'not set',
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_mp_token: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      supabase_url_preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...' || 'not set'
    }
    
    return NextResponse.json({
      success: true,
      message: "Super basic check working",
      info: basicInfo
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST() {
  return GET() // Same response for both GET and POST
}
