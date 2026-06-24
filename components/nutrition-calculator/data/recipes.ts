// ============================================================
// NUTRITION CALCULATOR – Catálogo de Recetas
//
// Valores calóricos exactos: fuente flujocal.md (MVZ Pet Gourmet)
//   receta_res:     188 kcal / 100g
//   receta_pollo:   185 kcal / 100g
//   receta_cerdo:   182 kcal / 100g
//   receta_ternera: 192 kcal / 100g
// ============================================================

import type { Recipe } from "../types"

// Precio del configurador de planes: $80 MXN/kg (ajuste del
// cliente). Este precio está alineado con el cálculo en
// plan-summary-section.tsx (también $80/kg).
const PRICE_PER_KG = 80

export const RECIPES: Recipe[] = [
  {
    id: "pollo-verduras",
    name: "Nutrición diaria Pollo Verduras",
    shortName: "Pollo Verduras",
    protein: "pollo",
    allergens: ["pollo"],
    kcalPer100g: 185,   // ← valor exacto MVZ
    ingredients: [
      { name: "Pollo",    icon: "/iconos/image/group-beef-cubes.png" },
      { name: "Avena",    icon: "/iconos/image/group-beef-broccoli-carrot.png" },
      { name: "Ejote",    icon: "/iconos/image/broccoli-floret.png" },
      { name: "Huevo",    icon: "/iconos/image/apple-slice.png" },
      { name: "Zanahoria",icon: "/iconos/image/carrot-slice.png" },
    ],
    // Producto real: "Pastel por porción de pollo y verduras x 6 unidades"
    image: "/cacu/pollo-ver.png",
    productSlug: "pastel-porcin-de-pollo-verduras-hippo",
    pricePerKg: PRICE_PER_KG,
  },
  {
    id: "carne-verduras",
    name: "Nutrición diaria Carne Verduras",
    shortName: "Carne Verduras",
    protein: "res",
    allergens: ["res"],
    kcalPer100g: 188,   // ← valor exacto MVZ
    ingredients: [
      { name: "Res",      icon: "/iconos/image/beef-chunk.png" },
      { name: "Ejote",    icon: "/iconos/image/carrot-slice.png" },
      { name: "Avena",    icon: "/iconos/image/broccoli-floret.png" },
      { name: "Zanahoria",icon: "/iconos/image/carrot-slice.png" },
      { name: "Espinaca", icon: "/iconos/image/spinach-leaf.png" },
    ],
    // Producto real: "Pastel por porción de carne y verduras x 6 unidades"
    image: "/cacu/carne-ver.png",
    productSlug: "pastel-porcin-de-carne-y-verduras-dante",
    pricePerKg: PRICE_PER_KG,
  },
  {
    id: "cerdo-verduras",
    name: "Nutrición diaria Cerdo Verduras",
    shortName: "Cerdo Verduras",
    protein: "cerdo",
    allergens: ["cerdo"],
    kcalPer100g: 182,   // ← valor exacto MVZ
    ingredients: [
      { name: "Cerdo",    icon: "/iconos/image/beef-chunk.png" },
      { name: "Arroz",    icon: "/iconos/image/group-beef-broccoli-carrot.png" },
      { name: "Ejote",    icon: "/iconos/image/broccoli-floret.png" },
      { name: "Zanahoria",icon: "/iconos/image/carrot-slice.png" },
      { name: "Chayote",  icon: "/iconos/image/apple-slice.png" },
    ],
    // Imagen local actualizada
    image: "/cacu/cerdo-ver.png",
    // Sin slug propio — redirige al catálogo de complementar
    productSlug: null,
    pricePerKg: PRICE_PER_KG,
  },
  {
    id: "ternera-espinaca",
    name: "Nutrición diaria Ternera y Espinaca",
    shortName: "Ternera y Espinaca",
    protein: "ternera",
    allergens: ["ternera"],
    kcalPer100g: 192,   // ← valor exacto MVZ
    ingredients: [
      { name: "Ternera",  icon: "/iconos/image/beef-chunk.png" },
      { name: "Espinaca", icon: "/iconos/image/spinach-leaf.png" },
      { name: "Arroz",    icon: "/iconos/image/broccoli-floret.png" },
      { name: "Zanahoria",icon: "/iconos/image/carrot-slice.png" },
      { name: "Ejote",    icon: "/iconos/image/carrot-slice.png" },
    ],
    // Producto real: "Pastel porción de ternera y espinaca x 6 unidades"
    image: "/cacu/ternera-espi.png",
    productSlug: "pastel-porcin-de-ternera-y-espinca-anabella",
    pricePerKg: PRICE_PER_KG,
  },
]

/** Filtra recetas excluyendo las que contienen los alérgenos marcados. */
export function filterRecipesByAllergens(allergens: string[]): Recipe[] {
  if (!allergens.length) return RECIPES
  return RECIPES.filter(
    (r) => !r.allergens.some((a) => allergens.includes(a))
  )
}

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id)
}

/** kcal/100g promedio de las recetas disponibles (para cálculo previo a selección). */
export function getDefaultKcalPer100g(allergens: string[] = []): number {
  const available = filterRecipesByAllergens(allergens)
  if (!available.length) return 185
  const sum = available.reduce((acc, r) => acc + r.kcalPer100g, 0)
  return sum / available.length
}
