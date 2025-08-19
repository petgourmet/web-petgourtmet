import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

    if (!publicKey) {
      return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 500 })
    }

    // Retornar solo un script de inicialización sin exponer la clave
    const initScript = `
      if (typeof MercadoPago !== 'undefined') {
        const mp = new MercadoPago('${publicKey}', {
          locale: 'es-MX'
        });
        window.mercadoPagoInstance = mp;
      }
    `

    return NextResponse.json({
      success: true,
      initScript,
    })
  } catch (error) {
    console.error("Error al inicializar MercadoPago SDK:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
