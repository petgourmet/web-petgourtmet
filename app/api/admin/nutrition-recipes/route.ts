// ============================================================
// API Route: Admin - CRUD de Recetas Nutricionales
// Endpoint: /api/admin/nutrition-recipes
// Descripción: Gestión completa de recetas (solo admins)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── Helper: Verificar Admin ───────────────────────────────

async function isAdmin(): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return profile?.role === "admin"
}

// ─── GET: Listar todas las recetas (incluye inactivas) ────

export async function GET(request: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      )
    }

    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from("nutrition_recipes")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) {
      console.error("[Admin Nutrition Recipes] GET error:", error)
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
    console.error("[Admin Nutrition Recipes] GET unexpected error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// ─── POST: Crear nueva receta ──────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      slug,
      short_name,
      description,
      image_url,
      price_per_kg,
      protein_source,
      ingredients,
      benefits,
      is_active,
      display_order,
    } = body

    // Validaciones
    if (!name || !slug || !short_name) {
      return NextResponse.json(
        { success: false, error: "Campos requeridos: name, slug, short_name" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Verificar slug único
    const { data: existing } = await supabase
      .from("nutrition_recipes")
      .select("id")
      .eq("slug", slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: "El slug ya existe" },
        { status: 400 }
      )
    }

    // Insertar
    const { data, error } = await supabase
      .from("nutrition_recipes")
      .insert({
        name,
        slug,
        short_name,
        description,
        image_url,
        price_per_kg: price_per_kg || 850,
        protein_source,
        ingredients,
        benefits,
        is_active: is_active ?? true,
        display_order: display_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      console.error("[Admin Nutrition Recipes] POST error:", error)
      return NextResponse.json(
        { success: false, error: "Error al crear receta" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recipe: data,
      message: "Receta creada exitosamente",
    })

  } catch (error: any) {
    console.error("[Admin Nutrition Recipes] POST unexpected error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// ─── PUT: Actualizar receta existente ──────────────────────

export async function PUT(request: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Si se actualiza el slug, verificar que sea único
    if (updates.slug) {
      const { data: existing } = await supabase
        .from("nutrition_recipes")
        .select("id")
        .eq("slug", updates.slug)
        .neq("id", id)
        .single()

      if (existing) {
        return NextResponse.json(
          { success: false, error: "El slug ya existe en otra receta" },
          { status: 400 }
        )
      }
    }

    // Actualizar
    const { data, error } = await supabase
      .from("nutrition_recipes")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Admin Nutrition Recipes] PUT error:", error)
      return NextResponse.json(
        { success: false, error: "Error al actualizar receta" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recipe: data,
      message: "Receta actualizada exitosamente",
    })

  } catch (error: any) {
    console.error("[Admin Nutrition Recipes] PUT unexpected error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// ─── DELETE: Eliminar receta (soft delete) ─────────────────

export async function DELETE(request: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido" },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Soft delete: marcar como inactivo
    const { data, error } = await supabase
      .from("nutrition_recipes")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Admin Nutrition Recipes] DELETE error:", error)
      return NextResponse.json(
        { success: false, error: "Error al eliminar receta" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recipe: data,
      message: "Receta desactivada exitosamente",
    })

  } catch (error: any) {
    console.error("[Admin Nutrition Recipes] DELETE unexpected error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
