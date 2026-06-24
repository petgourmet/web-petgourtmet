// ============================================================
// API Route: GET /api/calculator-config
// Público — devuelve la configuración actual de la calculadora
// (con fallback a defaults si la tabla no existe)
// ============================================================

import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { DEFAULT_CALCULATOR_CONFIG } from "@/lib/calculator-config-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createServiceClient()

    const { data, error } = await (supabase as any)
      .from("calculator_settings")
      .select("settings")
      .eq("id", 1)
      .single()

    if (error || !data) {
      // Tabla no existe todavía o sin datos → devolver defaults
      return NextResponse.json(DEFAULT_CALCULATOR_CONFIG)
    }

    // Merge: defaults base + valores guardados (por si hay campos nuevos)
    const merged = {
      ...DEFAULT_CALCULATOR_CONFIG,
      ...(data.settings as object),
      sections: {
        ...DEFAULT_CALCULATOR_CONFIG.sections,
        ...((data.settings as any)?.sections ?? {}),
      },
    }

    return NextResponse.json(merged)
  } catch {
    return NextResponse.json(DEFAULT_CALCULATOR_CONFIG)
  }
}
