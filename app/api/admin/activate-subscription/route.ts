import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"

// Endpoint para activar manualmente una suscripción pending con datos completos
// SOLO PARA USO DE ADMINISTRADOR EN CASOS CRÍTICOS
export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Cliente admin de Supabase no configurado" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get("id")
    const confirmActivate = searchParams.get("confirm")

    if (!subscriptionId) {
      return NextResponse.json({ error: "Se requiere el ID de la suscripción" }, { status: 400 })
    }

    if (confirmActivate !== "true") {
      return NextResponse.json({ error: "Se requiere confirmación explícita para activar" }, { status: 400 })
    }

    // Obtener la suscripción actual
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from("unified_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 })
    }

    // Verificar que es un registro completo
    const isComplete = subscription.customer_data && 
                      subscription.cart_items && 
                      subscription.product_id && 
                      subscription.base_price

    if (!isComplete) {
      return NextResponse.json({ 
        error: "Esta suscripción no tiene datos completos y no puede ser activada",
        subscription: {
          id: subscription.id,
          has_customer_data: !!subscription.customer_data,
          has_cart_items: !!subscription.cart_items,
          has_product_id: !!subscription.product_id,
          has_base_price: !!subscription.base_price
        }
      }, { status: 400 })
    }

    // Verificar que está en estado pending
    if (subscription.status !== 'pending') {
      return NextResponse.json({ 
        error: `La suscripción ya está en estado '${subscription.status}' y no puede ser activada`,
        current_status: subscription.status
      }, { status: 400 })
    }

    // Activar la suscripción
    const now = new Date().toISOString()
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    const updateData: any = {
      status: 'active',
      updated_at: now,
      last_billing_date: now,
      next_billing_date: nextBillingDate.toISOString()
    }

    // Solo actualizar mercadopago_subscription_id si no existe
    if (!subscription.mercadopago_subscription_id && subscription.external_reference) {
      updateData.mercadopago_subscription_id = subscription.external_reference
    }

    const { error: updateError } = await supabaseAdmin
      .from("unified_subscriptions")
      .update(updateData)
      .eq("id", subscriptionId)

    if (updateError) {
      console.error("Error al activar suscripción:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Obtener la suscripción actualizada
    const { data: updatedSubscription, error: getError } = await supabaseAdmin
      .from("unified_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single()

    if (getError || !updatedSubscription) {
      console.error("Error al obtener suscripción actualizada:", getError)
      return NextResponse.json({ error: "Error al obtener datos actualizados" }, { status: 500 })
    }

    console.log(`✅ Suscripción activada manualmente: ID ${subscriptionId}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Suscripción activada exitosamente`,
      activated_subscription: {
        id: updatedSubscription.id,
        user_id: updatedSubscription.user_id,
        status: updatedSubscription.status,
        external_reference: updatedSubscription.external_reference,
        mercadopago_subscription_id: updatedSubscription.mercadopago_subscription_id,
        product_name: updatedSubscription.product_name,
        base_price: updatedSubscription.base_price,
        last_billing_date: updatedSubscription.last_billing_date,
        next_billing_date: updatedSubscription.next_billing_date
      }
    })
  } catch (error: any) {
    console.error("Error en la API de activación de suscripción:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Endpoint GET para verificar datos de una suscripción antes de activar
export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Cliente admin de Supabase no configurado" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get("id")

    if (!subscriptionId) {
      return NextResponse.json({ error: "Se requiere el ID de la suscripción" }, { status: 400 })
    }

    const { data: subscription, error } = await supabaseAdmin
      .from("unified_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single()

    if (error || !subscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 })
    }

    // Analizar completitud de datos
    const analysis = {
      id: subscription.id,
      user_id: subscription.user_id,
      status: subscription.status,
      external_reference: subscription.external_reference,
      mercadopago_subscription_id: subscription.mercadopago_subscription_id,
      product_name: subscription.product_name,
      base_price: subscription.base_price,
      completeness: {
        has_customer_data: !!subscription.customer_data,
        has_cart_items: !!subscription.cart_items,
        has_product_id: !!subscription.product_id,
        has_base_price: !!subscription.base_price,
        has_product_name: !!subscription.product_name,
        has_transaction_amount: !!subscription.transaction_amount
      },
      is_complete: !!(subscription.customer_data && 
                     subscription.cart_items && 
                     subscription.product_id && 
                     subscription.base_price),
      can_be_activated: subscription.status === 'pending' && 
                       !!(subscription.customer_data && 
                         subscription.cart_items && 
                         subscription.product_id && 
                         subscription.base_price)
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error("Error en la API de análisis de activación:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}