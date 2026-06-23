// ============================================================
// NUTRITION CALCULATOR – Productos Extra
//
// Productos complementarios sugeridos en el resumen del plan.
// Actualizar imágenes y precios con los valores reales del catálogo.
// ============================================================

import type { ExtraProduct } from "../types"

export const EXTRA_PRODUCTS: ExtraProduct[] = [
  {
    id: "donas-pollo",
    name: "Donas de Pollo",
    description: "Snack premium horneado. Ideal para premiar.",
    // ASSET PENDIENTE: reemplazar con imagen real
    image: "/pastel-carne-treats.webp",
    price: 180,
  },
  {
    id: "muffins-carne",
    name: "Muffins de Carne",
    description: "Mini muffins nutritivos. Sin conservadores.",
    // ASSET PENDIENTE: reemplazar con imagen real
    image: "/pastel-carne-front.webp",
    price: 160,
  },
  {
    id: "galletas-verduras",
    name: "Galletas de Verduras",
    description: "Galletas crujientes con vegetales frescos.",
    // ASSET PENDIENTE: reemplazar con imagen real
    image: "/complementar-dog-treat.webp",
    price: 140,
  },
]
