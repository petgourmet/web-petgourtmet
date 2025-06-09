import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const config = {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseServiceKey?.length || 0,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "No configurada",
      keyPreview: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...` : "No configurada",
    }

    console.log("[Debug Upload] Configuración:", config)

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        status: "error",
        message: "Variables de entorno faltantes",
        config,
      })
    }

    // Test de conexión
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets()

      if (error) {
        return NextResponse.json({
          status: "connection_error",
          message: "Error al conectar con Supabase",
          error: error.message,
          config,
        })
      }

      return NextResponse.json({
        status: "success",
        message: "Configuración correcta",
        bucketsCount: buckets?.length || 0,
        buckets: buckets?.map((b) => b.name) || [],
        config,
      })
    } catch (connectionError: any) {
      return NextResponse.json({
        status: "connection_error",
        message: "Error de conexión",
        error: connectionError.message,
        config,
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      status: "unexpected_error",
      message: "Error inesperado",
      error: error.message,
    })
  }
}
