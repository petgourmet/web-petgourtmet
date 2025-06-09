import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Verificar que las variables estén configuradas
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY

    if (!cloudName || !apiKey) {
      return NextResponse.json({ error: "Cloudinary no está configurado correctamente" }, { status: 500 })
    }

    return NextResponse.json({
      cloudName,
      apiKey,
      configured: true,
      message: "Cloudinary está configurado correctamente",
    })
  } catch (error: any) {
    console.error("Error al verificar configuración de Cloudinary:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}