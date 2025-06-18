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
      return NextResponse.json({ error: "Public ID es requerido" }, { status: 400 })
    }

    console.log("Eliminando imagen:", publicId)

    // Eliminar usando Cloudinary SDK
    const result = await cloudinary.uploader.destroy(publicId)

    console.log("Resultado de eliminación:", result)

    return NextResponse.json({
      success: result.result === "ok",
      result: result.result,
    })
  } catch (error: any) {
    console.error("Error al eliminar imagen:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
