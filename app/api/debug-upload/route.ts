import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Debug upload endpoint funcionando",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })
}

export async function POST(request: NextRequest) {
  console.log("[Debug Upload] Iniciando debug...")

  try {
    // Log completo de la request
    const contentType = request.headers.get("content-type")
    const allHeaders = Object.fromEntries(request.headers.entries())

    console.log("[Debug Upload] Request info:", {
      method: request.method,
      url: request.url,
      contentType,
      headers: allHeaders,
    })

    // Intentar parsear como FormData
    try {
      const formData = await request.formData()
      const entries = Object.fromEntries(formData.entries())

      console.log("[Debug Upload] FormData parseado exitosamente:", {
        keys: Object.keys(entries),
        fileInfo:
          entries.file instanceof File
            ? {
                name: (entries.file as File).name,
                size: (entries.file as File).size,
                type: (entries.file as File).type,
              }
            : "No es un archivo",
      })

      return NextResponse.json({
        success: true,
        message: "FormData parseado correctamente",
        data: {
          keys: Object.keys(entries),
          fileInfo:
            entries.file instanceof File
              ? {
                  name: (entries.file as File).name,
                  size: (entries.file as File).size,
                  type: (entries.file as File).type,
                }
              : "No es un archivo",
        },
        headers: allHeaders,
      })
    } catch (parseError: any) {
      console.error("[Debug Upload] Error al parsear FormData:", parseError)

      return NextResponse.json(
        {
          success: false,
          error: "Error al parsear FormData",
          details: parseError.message,
          headers: allHeaders,
          contentType,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("[Debug Upload] Error general:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error general",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
