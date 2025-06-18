import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== API UPLOAD IMAGE ===")

    // Usar el cloud name correcto
    const cloudName = "dn7unepxa" // Tu cloud name correcto
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    console.log("Cloud Name:", cloudName)
    console.log("API Key:", apiKey ? "✅ Configurado" : "❌ Faltante")
    console.log("API Secret:", apiSecret ? "✅ Configurado" : "❌ Faltante")

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "Credenciales de Cloudinary no configuradas" }, { status: 500 })
    }

    // Obtener el archivo del FormData
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "general"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    console.log("Archivo recibido:", file.name, file.type, `${(file.size / 1024).toFixed(2)}KB`)

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generar timestamp y signature para autenticación
    const timestamp = Math.round(new Date().getTime() / 1000)
    const paramsToSign = {
      timestamp: timestamp,
      folder: `petgourmet/${folder}`,
      transformation: "c_limit,w_1200,h_1200,q_auto",
    }

    // Crear string para firmar
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`)
      .join("&")

    const stringToSign = `${sortedParams}${apiSecret}`

    // Generar signature usando Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(stringToSign)
    const hashBuffer = await crypto.subtle.digest("SHA-1", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    console.log("Signature generada:", signature.substring(0, 10) + "...")

    // Crear FormData para Cloudinary
    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append("file", new Blob([buffer], { type: file.type }))
    cloudinaryFormData.append("api_key", apiKey)
    cloudinaryFormData.append("timestamp", timestamp.toString())
    cloudinaryFormData.append("signature", signature)
    cloudinaryFormData.append("folder", `petgourmet/${folder}`)
    cloudinaryFormData.append("transformation", "c_limit,w_1200,h_1200,q_auto")

    console.log("Enviando a Cloudinary con cloud name:", cloudName)

    // Enviar a Cloudinary con el cloud name correcto
    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryFormData,
    })

    console.log("Respuesta de Cloudinary:", cloudinaryResponse.status)

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text()
      console.error("Error de Cloudinary:", errorText)
      return NextResponse.json({ error: `Error de Cloudinary: ${errorText}` }, { status: 400 })
    }

    const result = await cloudinaryResponse.json()
    console.log("Upload exitoso:", result.secure_url)

    return NextResponse.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    })
  } catch (error: any) {
    console.error("Error en API route:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
