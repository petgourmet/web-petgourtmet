import { type NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const { publicId } = await request.json()

    if (!publicId) {
      return NextResponse.json({ error: "No se proporcionó public_id" }, { status: 400 })
    }

    // Eliminar imagen de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)

    console.log("Imagen eliminada de Cloudinary:", result)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error("Error al eliminar imagen de Cloudinary:", error)
    return NextResponse.json({ error: `Error al eliminar imagen: ${error.message}` }, { status: 500 })
  }
}
