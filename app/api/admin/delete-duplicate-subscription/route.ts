import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

// Endpoint para eliminar registros duplicados incompletos de suscripciones
// SOLO PARA USO DE ADMINISTRADOR EN CASOS CRÍTICOS
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get("id")
    const confirmDelete = searchParams.get("confirm")

    if (!subscriptionId) {
      return NextResponse.json({ error: "Se requiere el ID de la suscripción" }, { status: 400 })
    }

    if (confirmDelete !== "true") {
      return NextResponse.json({ error: "Se requiere confirmación explícita para eliminar" }, { status: 400 })
    }

    // Usar cliente de Supabase

    // Primero verificar que la suscripción existe y obtener sus datos
    const { data: subscription, error: fetchError } = await supabase
      .from("unified_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 })
    }

    // Verificar que es un registro incompleto (sin datos críticos)
    const isIncomplete = !subscription.customer_data || 
                        !subscription.cart_items || 
                        !subscription.product_id || 
                        !subscription.base_price

    if (!isIncomplete) {
      return NextResponse.json({ 
        error: "Esta suscripción tiene datos completos y no puede ser eliminada con este endpoint",
        subscription: {
          id: subscription.id,
          has_customer_data: !!subscription.customer_data,
          has_cart_items: !!subscription.cart_items,
          has_product_id: !!subscription.product_id,
          has_base_price: !!subscription.base_price
        }
      }, { status: 400 })
    }

    // Eliminar permanentemente el registro incompleto
    const { error: deleteError } = await supabase
      .from("unified_subscriptions")
      .delete()
      .eq("id", subscriptionId)

    if (deleteError) {
      console.error("Error al eliminar suscripción duplicada:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log(`✅ Registro duplicado incompleto eliminado: ID ${subscriptionId}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Registro duplicado incompleto eliminado exitosamente`,
      deleted_subscription: {
        id: subscription.id,
        user_id: subscription.user_id,
        status: subscription.status,
        external_reference: subscription.external_reference,
        mercadopago_subscription_id: subscription.mercadopago_subscription_id
      }
    })
  } catch (error: any) {
    console.error("Error en la API de eliminación de duplicados:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Endpoint GET para verificar datos de una suscripción antes de eliminar
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get("id")

    if (!subscriptionId) {
      return NextResponse.json({ error: "Se requiere el ID de la suscripción" }, { status: 400 })
    }

    // Usar cliente de Supabase

    const { data: subscription, error } = await supabase
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
      can_be_deleted: !(subscription.customer_data && 
                       subscription.cart_items && 
                       subscription.product_id && 
                       subscription.base_price)
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error("Error en la API de análisis de suscripción:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}