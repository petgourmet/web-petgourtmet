import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Solo verificar que las configuraciones estén presentes sin exponer valores
    const publicKeyConfigured = !!process.env.MERCADOPAGO_PUBLIC_KEY
    const accessTokenConfigured = !!process.env.MERCADOPAGO_ACCESS_TOKEN
    const appUrlConfigured = !!process.env.NEXT_PUBLIC_APP_URL

    return NextResponse.json({
      publicKeyConfigured,
      accessTokenConfigured,
      appUrlConfigured,
      configured: publicKeyConfigured && accessTokenConfigured && appUrlConfigured,
    })
  } catch (error) {
    console.error("Error al verificar configuración de MercadoPago:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
