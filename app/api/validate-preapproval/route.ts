import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import MercadoPagoService from "@/lib/mercadopago-service"

export async function POST(request: NextRequest) {
  try {
    const { preapproval_id, user_id } = await request.json()

    if (!preapproval_id || !user_id) {
      return NextResponse.json(
        { error: "preapproval_id y user_id son requeridos" },
        { status: 400 }
      )
    }

    // Inicializar servicio de MercadoPago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: "Token de MercadoPago no configurado" },
        { status: 500 }
      )
    }

    const mpService = new MercadoPagoService(accessToken)

    // Obtener información de la suscripción desde MercadoPago
    const subscriptionInfo = await mpService.getSubscription(preapproval_id)

    if (!subscriptionInfo || subscriptionInfo.status !== "authorized") {
      return NextResponse.json(
        { error: "Suscripción no encontrada o no autorizada" },
        { status: 404 }
      )
    }

    // Buscar suscripción pendiente que coincida con el preapproval_id
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from("pending_subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "pending")
      .eq("mercadopago_subscription_id", preapproval_id)

    if (pendingError || !pendingSubscriptions || pendingSubscriptions.length === 0) {
      return NextResponse.json(
        { error: "No se encontró suscripción pendiente" },
        { status: 404 }
      )
    }

    const pendingSubscription = pendingSubscriptions[0]

    // Calcular próxima fecha de facturación
    const nextBillingDate = calculateNextBillingDate(pendingSubscription.subscription_type)

    // Crear suscripción activa
    const { data: newSubscription, error: createError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user_id,
        subscription_type: pendingSubscription.subscription_type,
        status: "active",
        mercadopago_subscription_id: preapproval_id,
        external_reference: subscriptionInfo.external_reference || preapproval_id,
        next_billing_date: nextBillingDate,
        last_billing_date: new Date().toISOString(),
        product_id: pendingSubscription.cart_items?.[0]?.id || null,
        product_name: pendingSubscription.cart_items?.[0]?.name || "Producto",
        discounted_price: pendingSubscription.cart_items?.[0]?.price || 0,
        frequency: getFrequencyFromType(pendingSubscription.subscription_type),
        frequency_type: "months",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creando suscripción activa:", createError)
      return NextResponse.json(
        { error: "Error al activar suscripción" },
        { status: 500 }
      )
    }

    // Marcar suscripción pendiente como procesada
    await supabase
      .from("pending_subscriptions")
      .update({ status: "processed" })
      .eq("id", pendingSubscription.id)

    // Actualizar perfil del usuario
    await supabase
      .from("profiles")
      .update({ 
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", user_id)

    return NextResponse.json({
      success: true,
      subscription: newSubscription,
      message: "Suscripción activada exitosamente"
    })

  } catch (error) {
    console.error("Error validando preapproval:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

function calculateNextBillingDate(subscriptionType: string): string {
  const now = new Date()
  
  switch (subscriptionType) {
    case "weekly":
      now.setDate(now.getDate() + 7)
      break
    case "biweekly":
      now.setDate(now.getDate() + 14)
      break
    case "monthly":
      now.setMonth(now.getMonth() + 1)
      break
    case "quarterly":
      now.setMonth(now.getMonth() + 3)
      break
    case "annual":
      now.setFullYear(now.getFullYear() + 1)
      break
    default:
      now.setMonth(now.getMonth() + 1) // Default mensual
  }
  
  return now.toISOString()
}

function getFrequencyFromType(subscriptionType: string): string {
  switch (subscriptionType) {
    case "weekly": return "1"
    case "biweekly": return "2"
    case "monthly": return "1"
    case "quarterly": return "3"
    case "annual": return "12"
    default: return "1"
  }
}