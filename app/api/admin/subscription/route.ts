import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const { userId, planId, status } = await request.json()

    // Verificar que se proporcionaron todos los campos necesarios
    if (!userId || !planId) {
      return NextResponse.json({ error: "Se requieren userId y planId" }, { status: 400 })
    }

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabase.from("profiles").select("id").eq("id", userId).single()

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Crear la suscripción
    const { data, error } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: userId,
          plan_id: planId,
          status: status || "active",
          start_date: new Date().toISOString(),
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días después
        },
      ])
      .select()

    if (error) {
      console.error("Error al crear suscripción:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error en la API de suscripción:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { subscriptionId, status } = await request.json()

    // Verificar que se proporcionaron todos los campos necesarios
    if (!subscriptionId || !status) {
      return NextResponse.json({ error: "Se requieren subscriptionId y status" }, { status: 400 })
    }

    // Actualizar el estado de la suscripción
    const { data, error } = await supabase
      .from("subscriptions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId)
      .select()

    if (error) {
      console.error("Error al actualizar suscripción:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error en la API de suscripción:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get("id")

    if (!subscriptionId) {
      return NextResponse.json({ error: "Se requiere el ID de la suscripción" }, { status: 400 })
    }

    // Cancelar la suscripción (soft delete)
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId)
      .select()

    if (error) {
      console.error("Error al cancelar suscripción:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error en la API de suscripción:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
