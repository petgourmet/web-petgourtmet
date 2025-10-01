import { type NextRequest, NextResponse } from "next/server"
import { getMercadoPagoPublicKey, isTestMode } from "@/lib/mercadopago-config"

export async function GET(request: NextRequest) {
  try {
    // Obtener la clave pública según el modo configurado (producción o pruebas)
    const publicKey = getMercadoPagoPublicKey()
    const testMode = isTestMode()

    return NextResponse.json({
      publicKey,
      configured: true,
      testMode,
      environment: testMode ? 'sandbox' : 'production'
    })
  } catch (error) {
    console.error("Error al obtener configuración de MercadoPago:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}
