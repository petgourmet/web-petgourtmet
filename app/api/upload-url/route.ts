import { NextResponse } from "next/server"

// Esta ruta genera URLs firmadas para subir imágenes directamente a Cloudinary
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") || "products"

  try {
    // Generar una URL temporal para subir directamente a Cloudinary
    const timestamp = Math.round(new Date().getTime() / 1000)
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default"

    // Devolver la URL y los parámetros necesarios para la subida
    return NextResponse.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      uploadPreset,
      folder,
      timestamp,
    })
  } catch (error: any) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
