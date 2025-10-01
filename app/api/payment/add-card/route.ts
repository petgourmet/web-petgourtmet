import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getMercadoPagoAccessToken, isTestMode } from '@/lib/mercadopago-config'

// Configuración de MercadoPago
const MP_ACCESS_TOKEN = getMercadoPagoAccessToken()
const IS_TEST_MODE = isTestMode()

export async function POST(request: NextRequest) {
  try {
    const { cardNumber, expiryDate, cvv, cardholderName, userId, email } = await request.json()

    // Validar datos de entrada
    if (!cardNumber || !expiryDate || !cvv || !cardholderName || !userId) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Validar formato de tarjeta
    const cleanCardNumber = cardNumber.replace(/\s/g, "")
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      return NextResponse.json({ error: "Número de tarjeta inválido" }, { status: 400 })
    }

    // Validar fecha de expiración
    const [month, year] = expiryDate.split("/")
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      return NextResponse.json({ error: "Fecha de expiración inválida" }, { status: 400 })
    }

    // Validar CVV
    if (!/^\d{3,4}$/.test(cvv)) {
      return NextResponse.json({ error: "CVV inválido" }, { status: 400 })
    }

    // Crear cliente de Supabase para el servidor
    const cookieStore = cookies()
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      },
    )

    // Determinar la marca de la tarjeta
    const getCardBrand = (number: string) => {
      const firstDigit = number.charAt(0)
      const firstTwoDigits = number.substring(0, 2)
      const firstFourDigits = number.substring(0, 4)

      if (firstDigit === "4") return "visa"
      if (["51", "52", "53", "54", "55"].includes(firstTwoDigits)) return "mastercard"
      if (["34", "37"].includes(firstTwoDigits)) return "amex"
      if (firstFourDigits >= "6011" && firstFourDigits <= "6011") return "discover"
      return "unknown"
    }

    const cardBrand = getCardBrand(cleanCardNumber)
    const lastFourDigits = cleanCardNumber.slice(-4)

    let paymentToken: string
    let cardId: string

    if (IS_TEST_MODE) {
      // Modo de prueba - simular tokenización
      console.log("🧪 MODO PRUEBA: Simulando tokenización de tarjeta")
      paymentToken = `test_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      cardId = `test_card_${Date.now()}`
    } else {
      // Modo producción - usar MercadoPago real
      try {
        if (!MP_ACCESS_TOKEN) {
          throw new Error("Token de acceso de MercadoPago no configurado")
        }

        const tokenResponse = await fetch("https://api.mercadopago.com/v1/card_tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            card_number: cleanCardNumber,
            expiration_month: Number.parseInt(month),
            expiration_year: Number.parseInt(`20${year}`),
            security_code: cvv,
            cardholder: {
              name: cardholderName,
              identification: {
                type: "DNI", // Ajustar según el país
                number: "12345678", // En producción, solicitar este dato
              },
            },
          }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          console.error("Error de MercadoPago:", errorData)
          return NextResponse.json({ error: "Error al procesar la tarjeta" }, { status: 400 })
        }

        const tokenData = await tokenResponse.json()
        paymentToken = tokenData.id

        // Crear customer en MercadoPago para futuras transacciones
        const customerResponse = await fetch("https://api.mercadopago.com/v1/customers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            email: email,
            first_name: cardholderName.split(" ")[0],
            last_name: cardholderName.split(" ").slice(1).join(" "),
          }),
        })

        const customerData = await customerResponse.json()

        // Asociar tarjeta al customer
        const cardResponse = await fetch(`https://api.mercadopago.com/v1/customers/${customerData.id}/cards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            token: paymentToken,
          }),
        })

        const cardData = await cardResponse.json()
        cardId = cardData.id
      } catch (error: any) {
        console.error("Error al tokenizar tarjeta con MercadoPago:", error)
        return NextResponse.json({ error: error.message || "Error al procesar la tarjeta" }, { status: 500 })
      }
    }

    // Verificar si es la primera tarjeta del usuario
    const { data: existingCards } = await supabaseServer
      .from("user_payment_methods")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)

    const isFirstCard = !existingCards || existingCards.length === 0

    // Guardar en la base de datos
    const { data, error } = await supabaseServer
      .from("user_payment_methods")
      .insert({
        user_id: userId,
        payment_token: paymentToken,
        card_id: cardId,
        card_brand: cardBrand,
        card_last_four: lastFourDigits,
        card_exp_month: Number.parseInt(month),
        card_exp_year: Number.parseInt(`20${year}`),
        cardholder_name: cardholderName,
        is_default: isFirstCard,
        is_active: true,
        is_test: IS_TEST_MODE,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error al guardar tarjeta:", error)
      return NextResponse.json({ error: "Error al guardar la tarjeta" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      testMode: IS_TEST_MODE,
      card: {
        id: data.id,
        brand: cardBrand,
        lastFour: lastFourDigits,
        isDefault: isFirstCard,
      },
    })
  } catch (error: any) {
    console.error("Error en add-card API:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
