// ============================================================
// Tipos compartidos para la configuración de la calculadora
// Usados tanto en la API como en la UI del admin y la calculadora
// ============================================================

export interface RecipeConfig {
  id: string
  name: string
  shortName: string
  protein: string
  allergens: string[]
  kcalPer100g: number
  pricePerKg: number
  image: string
  productSlug: string | null
  isActive: boolean
  ingredients: { name: string; icon: string }[]
}

export interface ExtraConfig {
  id: string
  name: string
  description: string
  image: string
  price: number
  isActive: boolean
}

export interface SectionTexts {
  basicInfo: {
    title: string
    description: string
  }
  servingPlan: {
    title: string
  }
  recipeSection: {
    title: string
  }
  summary: {
    title: string
  }
}

export interface CalculatorConfig {
  pricePerKg: number
  deliveryDays: number
  firstOrderDiscount: number
  sections: SectionTexts
  recipes: RecipeConfig[]
  extras: ExtraConfig[]
}

// ─── Defaults hardcoded (mismos valores del código original) ───
export const DEFAULT_CALCULATOR_CONFIG: CalculatorConfig = {
  pricePerKg: 850,
  deliveryDays: 28,
  firstOrderDiscount: 0.5,
  sections: {
    basicInfo: {
      title: "Cuéntanos acerca de tu perro:",
      description:
        "Esto nos ayudará a determinar la mejor receta para tu perro así como la cantidad de alimento por día. Si tienes más de un perro, elige uno ahora y podrás añadir otro más adelante.",
    },
    servingPlan: {
      title: "¿Cómo planeas servir Pet Gourmet?",
    },
    recipeSection: {
      title: "Receta recomendada para tu perro:",
    },
    summary: {
      title: "Plan recomendado para tu perro",
    },
  },
  recipes: [
    {
      id: "pollo-verduras",
      name: "Nutrición diaria Pollo Verduras",
      shortName: "Pollo Verduras",
      protein: "pollo",
      allergens: ["pollo"],
      kcalPer100g: 185,
      pricePerKg: 850,
      image: "/cacu/pollo-ver.png",
      productSlug: "pastel-porcin-de-pollo-verduras-hippo",
      isActive: true,
      ingredients: [
        { name: "Pollo",     icon: "/iconos/image/group-beef-cubes.png" },
        { name: "Avena",     icon: "/iconos/image/group-beef-broccoli-carrot.png" },
        { name: "Ejote",     icon: "/iconos/image/broccoli-floret.png" },
        { name: "Huevo",     icon: "/iconos/image/apple-slice.png" },
        { name: "Zanahoria", icon: "/iconos/image/carrot-slice.png" },
      ],
    },
    {
      id: "carne-verduras",
      name: "Nutrición diaria Carne Verduras",
      shortName: "Carne Verduras",
      protein: "res",
      allergens: ["res"],
      kcalPer100g: 188,
      pricePerKg: 850,
      image: "/cacu/carne-ver.png",
      productSlug: "pastel-porcin-de-carne-y-verduras-dante",
      isActive: true,
      ingredients: [
        { name: "Res",      icon: "/iconos/image/beef-chunk.png" },
        { name: "Ejote",    icon: "/iconos/image/carrot-slice.png" },
        { name: "Avena",    icon: "/iconos/image/broccoli-floret.png" },
        { name: "Zanahoria",icon: "/iconos/image/carrot-slice.png" },
        { name: "Espinaca", icon: "/iconos/image/spinach-leaf.png" },
      ],
    },
    {
      id: "cerdo-verduras",
      name: "Nutrición diaria Cerdo Verduras",
      shortName: "Cerdo Verduras",
      protein: "cerdo",
      allergens: ["cerdo"],
      kcalPer100g: 182,
      pricePerKg: 850,
      image: "/cacu/cerdo-ver.png",
      productSlug: null,
      isActive: true,
      ingredients: [
        { name: "Cerdo",    icon: "/iconos/image/beef-chunk.png" },
        { name: "Arroz",    icon: "/iconos/image/group-beef-broccoli-carrot.png" },
        { name: "Ejote",    icon: "/iconos/image/broccoli-floret.png" },
        { name: "Zanahoria",icon: "/iconos/image/carrot-slice.png" },
        { name: "Chayote",  icon: "/iconos/image/apple-slice.png" },
      ],
    },
    {
      id: "ternera-espinaca",
      name: "Nutrición diaria Ternera y Espinaca",
      shortName: "Ternera y Espinaca",
      protein: "ternera",
      allergens: ["ternera"],
      kcalPer100g: 192,
      pricePerKg: 850,
      image: "/cacu/ternera-espi.png",
      productSlug: "pastel-porcin-de-ternera-y-espinca-anabella",
      isActive: true,
      ingredients: [
        { name: "Ternera",  icon: "/iconos/image/beef-chunk.png" },
        { name: "Espinaca", icon: "/iconos/image/spinach-leaf.png" },
        { name: "Arroz",    icon: "/iconos/image/broccoli-floret.png" },
        { name: "Zanahoria",icon: "/iconos/image/carrot-slice.png" },
        { name: "Ejote",    icon: "/iconos/image/carrot-slice.png" },
      ],
    },
  ],
  extras: [
    {
      id: "donas-pollo",
      name: "Donas de Pollo",
      description: "Snack premium horneado. Ideal para premiar.",
      image: "/pastel-carne-treats.webp",
      price: 180,
      isActive: true,
    },
    {
      id: "muffins-carne",
      name: "Muffins de Carne",
      description: "Mini muffins nutritivos. Sin conservadores.",
      image: "/pastel-carne-front.webp",
      price: 160,
      isActive: true,
    },
    {
      id: "galletas-verduras",
      name: "Galletas de Verduras",
      description: "Galletas crujientes con vegetales frescos.",
      image: "/complementar-dog-treat.webp",
      price: 140,
      isActive: true,
    },
  ],
}
