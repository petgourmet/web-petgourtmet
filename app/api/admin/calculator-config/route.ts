// ============================================================
// API Route: /api/admin/calculator-config
// GET  — lee la config actual
// PUT  — guarda una nueva config
// DELETE — restaura los defaults
// Solo accesible con service_role (admin)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { DEFAULT_CALCULATOR_CONFIG } from "@/lib/calculator-config-types"
import type { CalculatorConfig } from "@/lib/calculator-config-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── GET ──────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = createServiceClient()

    const { data, error } = await (supabase as any)
      .from("calculator_settings")
      .select("settings, updated_at")
      .eq("id", 1)
      .single()

    if (error || !data) {
      return NextResponse.json({
        config: DEFAULT_CALCULATOR_CONFIG,
        updatedAt: null,
        isDefault: true,
      })
    }

    return NextResponse.json({
      config: data.settings,
      updatedAt: data.updated_at,
      isDefault: false,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al cargar configuración" },
      { status: 500 }
    )
  }
}

// ─── PUT — guardar ────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body: { config: CalculatorConfig } = await request.json()

    if (!body.config) {
      return NextResponse.json({ error: "Falta el campo config" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await (supabase as any)
      .from("calculator_settings")
      .upsert(
        {
          id: 1,
          settings: body.config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )

    if (error) {
      console.error("[Calculator Config] Save error:", error)
      return NextResponse.json(
        { error: error.message || "Error al guardar configuración" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al guardar" },
      { status: 500 }
    )
  }
}

// ─── DELETE — restaurar defaults ──────────────────────────────
export async function DELETE() {
  try {
    const supabase = createServiceClient()

    const { error } = await (supabase as any)
      .from("calculator_settings")
      .upsert(
        {
          id: 1,
          settings: DEFAULT_CALCULATOR_CONFIG,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )

    if (error) {
      return NextResponse.json(
        { error: error.message || "Error al restaurar" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, config: DEFAULT_CALCULATOR_CONFIG })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al restaurar" },
      { status: 500 }
    )
  }
}
