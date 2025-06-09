import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[Upload API] Iniciando proceso de carga...")

  try {
    // Verificar variables de entorno primero
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("[Upload API] Verificando configuración:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseServiceKey?.length || 0,
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Upload API] Variables de entorno faltantes")
      return NextResponse.json(
        {
          error: "Configuración del servidor incompleta",
          details: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey,
          },
        },
        { status: 500 },
      )
    }

    // Importar Supabase dinámicamente para evitar errores de inicialización
    const { createClient } = await import("@supabase/supabase-js")

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[Upload API] Cliente Supabase creado")

    // Log de headers para debugging
    const contentType = request.headers.get("content-type")
    const allHeaders = Object.fromEntries(request.headers.entries())
    console.log("[Upload API] Headers recibidos:", {
      contentType,
      allHeaders,
    })

    // Intentar parsear FormData sin validación previa del content-type
    let formData: FormData
    try {
      formData = await request.formData()
      console.log("[Upload API] FormData parseado correctamente")

      // Log de los campos del FormData
      const formDataEntries = Object.fromEntries(formData.entries())
      console.log("[Upload API] Campos en FormData:", Object.keys(formDataEntries))
    } catch (parseError: any) {
      console.error("[Upload API] Error al parsear FormData:", parseError)
      return NextResponse.json(
        {
          error: "Error al procesar los datos del formulario",
          details: parseError.message,
          contentType: contentType,
        },
        { status: 400 },
      )
    }

    const file = formData.get("file") as File
    const bucket = formData.get("bucket") as string
    const path = (formData.get("path") as string) || ""

    console.log("[Upload API] Datos extraídos:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      bucket,
      path,
    })

    if (!file) {
      return NextResponse.json(
        {
          error: "No se proporcionó ningún archivo",
          details: "El campo 'file' es requerido",
        },
        { status: 400 },
      )
    }

    if (!bucket) {
      return NextResponse.json(
        {
          error: "No se especificó el bucket",
          details: "El campo 'bucket' es requerido",
        },
        { status: 400 },
      )
    }

    // Validar que el archivo es realmente un archivo
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "El objeto proporcionado no es un archivo válido",
          details: `Tipo recibido: ${typeof file}`,
        },
        { status: 400 },
      )
    }

    // Test de conexión con Supabase
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

      if (bucketsError) {
        console.error("[Upload API] Error al conectar con Supabase:", bucketsError)
        return NextResponse.json(
          {
            error: "Error de conexión con el almacenamiento",
            details: bucketsError.message,
          },
          { status: 500 },
        )
      }

      console.log("[Upload API] Conexión con Supabase exitosa, buckets encontrados:", buckets?.length || 0)

      // Crear bucket si no existe
      if (!buckets.some((b) => b.name === bucket)) {
        console.log(`[Upload API] Creando bucket '${bucket}'...`)
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
        })

        if (createError) {
          console.error(`[Upload API] Error al crear bucket:`, createError)
          return NextResponse.json(
            {
              error: `Error al crear bucket: ${createError.message}`,
              details: createError,
            },
            { status: 500 },
          )
        }
      }
    } catch (connectionError: any) {
      console.error("[Upload API] Error de conexión:", connectionError)
      return NextResponse.json(
        {
          error: "Error de conexión con la base de datos",
          details: connectionError.message,
        },
        { status: 500 },
      )
    }

    // Procesar archivo
    let arrayBuffer: ArrayBuffer
    try {
      arrayBuffer = await file.arrayBuffer()
      console.log("[Upload API] Archivo convertido a ArrayBuffer:", arrayBuffer.byteLength, "bytes")
    } catch (bufferError: any) {
      console.error("[Upload API] Error al procesar archivo:", bufferError)
      return NextResponse.json(
        {
          error: "Error al procesar el archivo",
          details: bufferError.message,
        },
        { status: 400 },
      )
    }

    const buffer = new Uint8Array(arrayBuffer)
    const timestamp = Date.now()
    const fileName = path ? `${path}/${timestamp}_${file.name}` : `${timestamp}_${file.name}`

    console.log(`[Upload API] Subiendo archivo: ${fileName}`)

    // Subir archivo
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(fileName, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

    if (error) {
      console.error("[Upload API] Error al subir archivo:", error)
      return NextResponse.json(
        {
          error: `Error al subir archivo: ${error.message}`,
          details: error,
        },
        { status: 500 },
      )
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName)

    console.log(`[Upload API] Archivo subido exitosamente:`, {
      path: data.path,
      publicUrl,
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    })
  } catch (error: any) {
    console.error("[Upload API] Error inesperado:", error)

    // Asegurar que siempre devolvemos JSON
    return NextResponse.json(
      {
        error: "Error inesperado del servidor",
        details: error.message || "Error desconocido",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
