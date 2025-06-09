import { type NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// Configurar Cloudinary con las variables correctas
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    // Verificar que Cloudinary esté configurado
    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      !process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Variables de Cloudinary faltantes:", {
        cloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        apiKey: !!process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        apiSecret: !!process.env.CLOUDINARY_API_SECRET,
      })
      return NextResponse.json(
        { error: "Cloudinary no está configurado correctamente. Faltan variables de entorno." },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "general"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    console.log("Subiendo archivo:", {
      nombre: file.name,
      tipo: file.type,
      tamaño: `${(file.size / 1024).toFixed(2)}KB`,
      carpeta: folder,
    })

    // Convertir el archivo a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Subir a Cloudinary usando upload_stream
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `petgourmet/${folder}`,
            resource_type: "auto",
            quality: "auto",
            fetch_format: "auto",
            transformation: [
              { width: 1200, height: 1200, crop: "limit" }, // Limitar tamaño máximo
              { quality: "auto:good" }, // Optimización automática
            ],
          },
          (error, result) => {
            if (error) {
              console.error("Error de Cloudinary:", error)
              reject(error)
            } else {
              resolve(result)
            }
          },
        )
        .end(buffer)
    })

    console.log("Imagen subida exitosamente a Cloudinary:", {
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
    })

    return NextResponse.json({
      secure_url: (result as any).secure_url,
      public_id: (result as any).public_id,
      width: (result as any).width,
      height: (result as any).height,
    })
  } catch (error: any) {
    console.error("Error al subir imagen a Cloudinary:", error)
    return NextResponse.json({ error: `Error al subir imagen: ${error.message}` }, { status: 500 })
  }
}
