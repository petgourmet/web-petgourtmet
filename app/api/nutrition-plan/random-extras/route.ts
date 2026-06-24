// ============================================================
// GET /api/nutrition-plan/random-extras
//
// Devuelve 3 productos para mostrar como "extras" en el resumen
// del plan nutricional, ordenados por TIPO:
//   1º Galleta (dogueta, biscocho, cookie, crocant)
//   2º Pastel  (pastel, flan, tarta, cake, cupcake, muffin, porción)
//   3º Bola    (bola, ball, donut, rolito, albóndiga, truffa)
//
// Reglas:
//   - Prioriza productos de categoría "premiar" (snacks, cat_id=1).
//   - Si no hay match en snacks, busca en otras categorías.
//   - Selección aleatoria dentro de cada tipo (variedad en reloads).
//   - Sólo productos con stock > 0 y price > 0.
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ID de categoría "premiar" (snacks)
const SNACK_CATEGORY_ID = 1

// Tipos de snacks en orden deseado
const SNACK_TYPES = [
  { type: "galleta", regex: /(galleta|dogueta|biscocho|cookie|crocant)/i },
  { type: "pastel",  regex: /(pastel|flan|tarta|cake|cupcake|muffin|porci[oó]n)/i },
  { type: "bola",    regex: /(bola|ball|donut|rolito|alb[oó]ndiga|truffa)/i },
] as const

interface ExtraProduct {
  id:          string
  name:        string
  description: string
  image:       string
  price:       number
  category?:   string
  slug?:       string
}

interface ProductRow {
  id:          number
  name:        string | null
  description: string | null
  image:       string | null
  price:       number | null
  slug:        string | null
  category_id: number | null
  categories:  { name: string | null } | { name: string | null }[] | null
}

/** Selecciona un elemento al azar del array */
function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined
  return arr[Math.floor(Math.random() * arr.length)]
}

function toExtra(p: ProductRow): ExtraProduct {
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

/** Clasifica un producto por tipo de snack */
function getSnackType(p: ProductRow): string | null {
  const text = `${p.name ?? ""} ${p.description ?? ""}`.toLowerCase()
  for (const { type, regex } of SNACK_TYPES) {
    if (regex.test(text)) return type
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
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

    // Traer snacks (categoría premiar)
    const snacksRes = await supabase
      .from("products")
      .select("id, name, description, image, price, slug, category_id, categories(name)")
      .eq("category_id", SNACK_CATEGORY_ID)
      .gt("stock", 0)
      .gt("price", 0)
      .limit(50)

    // Traer otros productos (fallback)
    const othersRes = await supabase
      .from("products")
      .select("id, name, description, image, price, slug, category_id, categories(name)")
      .neq("category_id", SNACK_CATEGORY_ID)
      .gt("stock", 0)
      .gt("price", 0)
      .limit(50)

    const snackPool  = (snacksRes.data ?? []) as ProductRow[]
    const othersPool = (othersRes.data ?? []) as ProductRow[]
    const allPool    = [...snackPool, ...othersPool]

    // Agrupar snacks por tipo
    const snacksByType: Record<string, ProductRow[]> = {
      galleta: [],
      pastel: [],
      bola: [],
    }

    for (const p of snackPool) {
      const type = getSnackType(p)
      if (type && snacksByType[type]) {
        snacksByType[type].push(p)
      }
    }

    // Seleccionar uno de cada tipo, en orden
    const result: ExtraProduct[] = []
    const usedIds = new Set<number>()

    for (const { type } of SNACK_TYPES) {
      // Primero intentar en pool de snacks
      let candidates = snacksByType[type].filter(p => !usedIds.has(p.id))
      let pick = pickRandom(candidates)

      // Si no hay en snacks, buscar en todo el catálogo
      if (!pick) {
        candidates = allPool.filter(p => !usedIds.has(p.id) && getSnackType(p) === type)
        pick = pickRandom(candidates)
      }

      if (pick) {
        result.push(toExtra(pick))
        usedIds.add(pick.id)
      }
    }

    // Si no se llenaron los 3 slots, completar con snacks aleatorios
    if (result.length < 3) {
      const remaining = snackPool.filter(p => !usedIds.has(p.id))
      for (const p of remaining) {
        if (result.length >= 3) break
        result.push(toExtra(p))
        usedIds.add(p.id)
      }
    }

    // Si aún faltan, completar con otros productos
    if (result.length < 3) {
      const remaining = othersPool.filter(p => !usedIds.has(p.id))
      for (const p of remaining) {
        if (result.length >= 3) break
        result.push(toExtra(p))
        usedIds.add(p.id)
      }
    }

    return NextResponse.json({ success: true, extras: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno"
    console.error("[random-extras] Excepción:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
