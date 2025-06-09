import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Devolver la clave pública de MercadoPago para uso en el cliente
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

    if (!publicKey) {
      return NextResponse.json({ error: "Clave pública de MercadoPago no configurada" }, { status: 500 })
    }

    return NextResponse.json({
      publicKey,
      configured: true,
    })
  } catch (error) {
    console.error("Error al obtener configuración de MercadoPago:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
