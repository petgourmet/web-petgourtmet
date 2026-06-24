// ============================================================
// GET /api/nutrition-plan/random-extras
//
// Devuelve N productos al azar para mostrar como "extras" en el
// resumen del plan nutricional. Por regla de negocio, los extras
// son MAYORITARIAMENTE snacks (category_id = 1 → "premiar").
// Si no hay suficientes snacks activos en el catálogo, completa
// el resto con productos de otras categorías.
//
// Reglas:
//   - Los admin NO los editan: salen del catálogo público.
//   - Sólo productos con stock > 0 y price > 0.
//   - Mayoría snacks (default 70%), resto otras categorías.
//   - Selección aleatoria (Fisher–Yates) en cada pool.
//
// Query params:
//   - limit:         cuántos productos devolver (default 3, max 10).
//   - poolSize:      tamaño total del pool desde el que muestrear
//                    cada categoría (default 24, max 60).
//   - snackRatio:    proporción objetivo de snacks (0..1, default 0.7).
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ID de categoría "premiar" (snacks). Mapeado en
// components/product-category-loader.tsx → CATEGORY_ID_MAP.
const SNACK_CATEGORY_ID = 1

interface ExtraProduct {
  id:          string
  name:        string
  description: string
  image:       string
  price:       number
  category?:   string   // nombre legible de la categoría
  slug?:       string   // slug para link al producto
}

interface ProductRow {
  id:          number
  name:        string | null
  description: string | null
  image:       string | null
  price:       number | null
  slug:        string | null
  category_id: number | null
  // `categories` puede venir como objeto o arreglo según el join.
  categories:  { name: string | null } | { name: string | null }[] | null
}

/** Fisher–Yates: mezcla los primeros `count` elementos del array (in-place). */
function shuffleFirst<T>(arr: T[], count: number): T[] {
  const out = [...arr]
  const n = Math.min(count, out.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (out.length - i))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function toExtra(p: ProductRow): ExtraProduct {
  // `categories` puede llegar como objeto, arreglo o null según el shape del join.
  const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories
  return {
    id:          String(p.id),
    name:        p.name?.trim() || "Producto",
    description: p.description?.trim() || "",
    image:       p.image?.trim() || "/full-nutritious-dog-bowl.webp",
    price:       Number(p.price ?? 0),
    category:    cat?.name?.trim() || undefined,
    slug:        p.slug?.trim() || undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit      = Math.max(1, Math.min(10, parseInt(searchParams.get("limit") ?? "3", 10) || 3))
    const poolSize   = Math.max(limit, Math.min(60, parseInt(searchParams.get("poolSize") ?? "24", 10) || 24))
    const snackRatio = Math.max(0, Math.min(1, parseFloat(searchParams.get("snackRatio") ?? "0.7")))

    // Cuántos deben ser snacks (al menos 1 si snackRatio>0 y limit>0).
    const targetSnacks    = Math.min(limit, Math.max(snackRatio > 0 ? 1 : 0, Math.ceil(limit * snackRatio)))
    const targetNonSnacks = limit - targetSnacks

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Configuración de Supabase incompleta" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Pool 1: SNACKS (category_id = 1) ──────────────────────
    // NOTA: la tabla `products` NO tiene columna `active`. La
    // disponibilidad se filtra por `stock > 0` (mismo criterio que
    // usa cart-modal.tsx en sus recomendaciones).
    const snacksPromise = supabase
      .from("products")
      .select("id, name, description, image, price, slug, category_id, categories(name)")
      .eq("category_id", SNACK_CATEGORY_ID)
      .gt("stock", 0)
      .gt("price", 0)
      .limit(poolSize)

    // ── Pool 2: NO-SNACKS (resto de categorías) ───────────────
    const othersPromise = supabase
      .from("products")
      .select("id, name, description, image, price, slug, category_id, categories(name)")
      .neq("category_id", SNACK_CATEGORY_ID)
      .gt("stock", 0)
      .gt("price", 0)
      .limit(poolSize)

    const [snacksRes, othersRes] = await Promise.all([snacksPromise, othersPromise])

    if (snacksRes.error) {
      console.error("[random-extras] Error pool snacks:", snacksRes.error)
    }
    if (othersRes.error) {
      console.error("[random-extras] Error pool otros:", othersRes.error)
    }

    const snackPool   = ((snacksRes.data ?? []) as ProductRow[])
    const othersPool  = ((othersRes.data ?? []) as ProductRow[])

    // Si por algún motivo no hay snacks en BD, todo se cubre con otros.
    let snackPicks  = shuffleFirst(snackPool,  Math.min(targetSnacks, snackPool.length)).slice(0, targetSnacks)
    let othersPicks = shuffleFirst(othersPool, Math.min(targetNonSnacks, othersPool.length)).slice(0, targetNonSnacks)

    // Rellenar huecos si una de las pools no alcanzó su cuota.
    if (snackPicks.length < targetSnacks) {
      const missing = targetSnacks - snackPicks.length
      const usedIds = new Set(othersPicks.map((p) => p.id))
      const extra   = shuffleFirst(othersPool.filter((p) => !usedIds.has(p.id)), missing).slice(0, missing)
      othersPicks   = [...othersPicks, ...extra]
    }
    if (othersPicks.length < targetNonSnacks) {
      const missing = targetNonSnacks - othersPicks.length
      const usedIds = new Set(snackPicks.map((p) => p.id))
      const extra   = shuffleFirst(snackPool.filter((p) => !usedIds.has(p.id)), missing).slice(0, missing)
      snackPicks    = [...snackPicks, ...extra]
    }

    // Combinar y mezclar el orden final para que el snack no salga
    // siempre en la primera posición.
    const combined = shuffleFirst([...snackPicks, ...othersPicks], limit).slice(0, limit)

    const extras: ExtraProduct[] = combined.map(toExtra)

    return NextResponse.json({ success: true, extras })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    console.error("[random-extras] Excepción:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
