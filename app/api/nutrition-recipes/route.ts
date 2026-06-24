// ============================================================
// API Route: Obtener Recetas Nutricionales
// Endpoint: GET /api/nutrition-recipes
// Descripción: Lista recetas activas para la calculadora
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Obtener parámetro de URL para filtrar activos/todos
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    let query = supabase
      .from("nutrition_recipes")
      .select("*")
      .order("display_order", { ascending: true })

    // Solo filtrar por activos si no es admin
    if (!includeInactive) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Nutrition Recipes API] Error:", error)
      return NextResponse.json(
        { success: false, error: "Error al obtener recetas" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recipes: data || [],
      count: data?.length || 0,
    })

  } catch (error: any) {
    console.error("[Nutrition Recipes API] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
