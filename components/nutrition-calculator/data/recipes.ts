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

// Precio real: $408 MXN / paquete de 6 porciones × 80g = 480g
// → pricePerKg = $408 / 0.480kg ≈ $850 MXN/kg
const PRICE_PER_KG = 850

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
    image: "https://res.cloudinary.com/dn7unepxa/image/upload/v1749168609/products/hcnkcdqv67vure97tiab.webp",
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
    image: "https://res.cloudinary.com/dn7unepxa/image/upload/v1749162638/products/qajybx64czfggsw0hjzc.webp",
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
    // Usar imagen de placeholder hasta que exista el producto en Supabase
    image: "/pastel-carne-front.webp",
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
    image: "https://res.cloudinary.com/dn7unepxa/image/upload/v1749160663/products/pkxrxomv6bnssbdjavkk.webp",
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
