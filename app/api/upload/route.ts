import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Crear cliente de Supabase con permisos de administrador
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request: NextRequest) {
  try {
    // Verificar que la solicitud sea multipart/form-data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const bucket = formData.get("bucket") as string
    const path = formData.get("path") as string

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    if (!bucket) {
      return NextResponse.json({ error: "No se especificó el bucket" }, { status: 400 })
    }

    // Verificar si el bucket existe
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

    if (bucketsError) {
      console.error("Error al listar buckets:", bucketsError)
      return NextResponse.json({ error: "Error al verificar buckets" }, { status: 500 })
    }

    // Si el bucket no existe, crearlo
    if (!buckets.some((b) => b.name === bucket)) {
      console.log(`Bucket '${bucket}' no encontrado. Creando...`)
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
        public: true,
      })

      if (createError) {
        console.error(`Error al crear bucket '${bucket}':`, createError)
        return NextResponse.json({ error: `Error al crear bucket: ${createError.message}` }, { status: 500 })
      }
      console.log(`Bucket '${bucket}' creado exitosamente`)
    }

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Generar un nombre de archivo único
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = path ? `${path}/${timestamp}_${file.name}` : `${timestamp}_${file.name}`

    // Subir el archivo
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (error) {
      console.error("Error al subir archivo:", error)
      return NextResponse.json({ error: `Error al subir archivo: ${error.message}` }, { status: 500 })
    }

    // Obtener la URL pública del archivo
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    })
  } catch (error: any) {
    console.error("Error inesperado:", error)
    return NextResponse.json({ error: `Error inesperado: ${error.message}` }, { status: 500 })
  }
}
