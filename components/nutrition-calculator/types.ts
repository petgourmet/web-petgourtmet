// ============================================================
// NUTRITION CALCULATOR – Tipos TypeScript
// Fuente: flujocal.md + PGM - Calculadora.xlsx
// ============================================================

export type PetGender = "macho" | "hembra"

export type LifeStage =
  | "cachorro-pequeno"  // < 4 meses — factor 3.0
  | "cachorro-grande"   // 4–12 meses — factor 2.0
  | "adulto"            // 1–7 años — factor 1.7 (macho no esterilizado) / 1.5 (esterilizado) / 1.6 (hembra)
  | "senior"            // +7 años — factor 1.2

export type ActivityLevel = "bajo" | "moderado" | "alto"

// BodyCondition ELIMINADA — no forma parte del flujo oficial (ver flujocal.md)

export type AllergenId = "pollo" | "res" | "cerdo" | "ternera"

export type ServingPlan = "completo" | "medio"

// Estado del formulario
export interface CalculatorFormData {
  // Sección 1 – Datos básicos
  petName:  string
  gender:   PetGender | null
  weight:   number | null   // kg

  // Sección 2 – Etapa de vida
  lifeStage: LifeStage | null

  // Sección 3 – ¿Está esterilizado? (SOLO machos adultos)
  isNeutered: boolean | null

  // Sección 4 – Nivel de actividad
  activityLevel: ActivityLevel | null

  // Sección 5 – Alergias
  hasAllergies: boolean | null
  allergens:    AllergenId[]

  // Sección 6 – Plan de servicio
  servingPlan: ServingPlan | null

  // Sección 7 – Recetas seleccionadas
  selectedRecipes: string[]

  // Sección 8 – Extras
  selectedExtras: string[]
}

// Resultado del cálculo
export interface CalorieCalculation {
  rer:             number   // Requerimiento Energético en Reposo (kcal/día)
  mer:             number   // RED final (kcal/día) — Requerimiento Energético Diario
  dailyGrams:      number   // Gramos diarios recomendados
  gramsPerServing: number   // Gramos por toma (2 tomas/día)
}

// Datos de una receta
export interface Recipe {
  id:           string
  name:         string
  shortName:    string
  protein:      AllergenId
  allergens:    AllergenId[]
  kcalPer100g:  number          // kcal / 100g — valor exacto del MVZ
  ingredients:  IngredientItem[]
  image:        string
  productSlug:  string | null
  pricePerKg:   number          // MXN
}

export interface IngredientItem {
  name: string
  icon: string
}

// Extra product
export interface ExtraProduct {
  id:          string
  name:        string
  description: string
  image:       string
  price:       number
  category?:   string   // nombre legible de la categoría (ej. "Para Premiar")
  slug?:       string   // slug para link al detalle del producto
}

export type SectionVisibility = "hidden" | "active" | "complete"
