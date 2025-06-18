import { NextResponse } from "next/server"

export async function POST() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Variables de Cloudinary no configuradas" }, { status: 400 })
    }

    // Crear un upload preset unsigned
    const presetData = {
      name: "petgourmet_unsigned",
      unsigned: true,
      folder: "petgourmet",
      transformation: [
        {
          width: 1200,
          height: 1200,
          crop: "limit",
          quality: "auto",
          format: "auto",
        },
      ],
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      max_file_size: 2097152, // 2MB
    }

    // Crear el preset usando la API de Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload_presets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
      },
      body: JSON.stringify(presetData),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Error al crear preset:", error)

      // Si el preset ya existe, está bien
      if (error.error?.message?.includes("already exists")) {
        return NextResponse.json({
          success: true,
          message: "Upload preset ya existe",
          preset: "petgourmet_unsigned",
        })
      }

      throw new Error(error.error?.message || "Error al crear upload preset")
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: "Upload preset creado exitosamente",
      preset: result.name,
    })
  } catch (error: any) {
    console.error("Error al configurar Cloudinary:", error)
    return NextResponse.json(
      {
        error: error.message,
        fallback: "Usando ml_default como respaldo",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

    if (!cloudName) {
      return NextResponse.json({ error: "CLOUDINARY_CLOUD_NAME no configurado" }, { status: 400 })
    }

    return NextResponse.json({
      cloudName,
      configured: true,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      message: "Cloudinary configurado correctamente",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
