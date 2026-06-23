// ============================================================
// NUTRITION CALCULATOR – Motor de Cálculo Calórico
//
// Fórmula oficial (MVZ Pet Gourmet):
//   RER = 70 × (peso_kg)^0.75
//   RED = RER × factor_etapa_vida
//   RED_final = RED × factor_actividad
//   gramos_diarios = (RED_final / kcal_receta_100g) × 100
//
// Fuente: flujocal.md + PGM - Calculadora.xlsx
// ============================================================

import type { LifeStage, ActivityLevel, ServingPlan, CalorieCalculation } from "./types"

// ------------------------------------
// Factores de etapa de vida (factor_red)
// Fuente: Excel columna INSTRUCCIÓN
// ------------------------------------
export const LIFE_STAGE_FACTORS = {
  "cachorro-pequeno": 3.0,           // < 4 meses
  "cachorro-grande": 2.0,            // 4 – 12 meses
  "adulto-no-esterilizado": 1.7,     // Solo aplica a machos
  "adulto-esterilizado": 1.5,        // Solo aplica a machos
  adulto: 1.6,                       // Hembras adultas (promedio)
  senior: 1.2,                       // > 7 años
} as const

export type LifeStageKey = keyof typeof LIFE_STAGE_FACTORS

// ------------------------------------
// Factores de actividad
// Fuente: Excel "Bajo sin afectación / Moderado 2.0 / Activo 2.5"
// ------------------------------------
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  bajo: 1.0,       // Sin afectación
  moderado: 2.0,   // ×2.0 sobre el RED base
  alto: 2.5,       // ×2.5 sobre el RED base
}

// ------------------------------------
// Número de tomas diarias recomendadas
// ------------------------------------
const DAILY_SERVINGS = 2

/**
 * Calcula el RER (Requerimiento Energético en Reposo).
 * Fórmula: 70 × peso_kg^0.75
 */
export function calculateRER(weightKg: number): number {
  return 70 * Math.pow(weightKg, 0.75)
}

/**
 * Resuelve el factor_red correcto según etapa de vida, género y castración.
 */
export function resolveLifeStageFactor(
  lifeStage: LifeStage,
  gender: "macho" | "hembra",
  isNeutered: boolean | null
): number {
  // Cachorros: mismo factor sin importar género
  if (lifeStage === "cachorro-pequeno") return LIFE_STAGE_FACTORS["cachorro-pequeno"]
  if (lifeStage === "cachorro-grande")  return LIFE_STAGE_FACTORS["cachorro-grande"]
  if (lifeStage === "senior")           return LIFE_STAGE_FACTORS["senior"]

  // Adulto: solo machos diferencian esterilizado/no esterilizado
  if (lifeStage === "adulto") {
    if (gender === "macho") {
      return isNeutered
        ? LIFE_STAGE_FACTORS["adulto-esterilizado"]
        : LIFE_STAGE_FACTORS["adulto-no-esterilizado"]
    }
    // Hembra: usa factor promedio
    return LIFE_STAGE_FACTORS["adulto"]
  }

  return LIFE_STAGE_FACTORS["adulto"]
}

/**
 * Cálculo principal.
 *
 * @param weightKg        - Peso del perro en kilogramos
 * @param lifeStage       - Etapa de vida seleccionada
 * @param gender          - Género (macho | hembra)
 * @param isNeutered      - ¿Está esterilizado? (solo relevante para machos adultos)
 * @param activityLevel   - Nivel de actividad
 * @param kcalPer100g     - Densidad calórica de la receta elegida (kcal / 100g)
 * @param servingPlan     - "completo" (100%) o "medio" (50%)
 */
export function calculateCalories(
  weightKg: number,
  lifeStage: LifeStage,
  gender: "macho" | "hembra",
  isNeutered: boolean | null,
  activityLevel: ActivityLevel,
  kcalPer100g: number,
  servingPlan: ServingPlan = "completo"
): CalorieCalculation {
  // 1. RER
  const rer = calculateRER(weightKg)

  // 2. RED base = RER × factor_etapa_vida
  const lifeFactor = resolveLifeStageFactor(lifeStage, gender, isNeutered)
  const redBase = rer * lifeFactor

  // 3. RED final = RED_base × factor_actividad
  const activityFactor = ACTIVITY_FACTORS[activityLevel]
  const red = redBase * activityFactor

  // 4. Gramos diarios = (RED / kcal_100g) × 100
  const fullDailyGrams = Math.round((red / kcalPer100g) * 100)

  // 5. Ajuste si es Medio Plan
  const dailyGrams =
    servingPlan === "medio" ? Math.round(fullDailyGrams / 2) : fullDailyGrams

  const gramsPerServing = Math.round(dailyGrams / DAILY_SERVINGS)

  return {
    rer: Math.round(rer),
    mer: Math.round(red),
    dailyGrams,
    gramsPerServing,
  }
}

// ─── Helpers de descripción ───────────────────────────────────

export function getLifeStageRange(lifeStage: LifeStage): string {
  const ranges: Record<LifeStage, string> = {
    "cachorro-pequeno": "De 2 meses y hasta 4 meses",
    "cachorro-grande":  "De 4 meses y hasta 12 meses",
    adulto:             "De 1 a 7 años",
    senior:             "Más de 7 años",
  }
  return ranges[lifeStage]
}

export function getActivityDescription(level: ActivityLevel): string {
  const descriptions: Record<ActivityLevel, string> = {
    bajo:     "No hace mucho ejercicio. Una o dos veces a la semana, una hora cada vez.",
    moderado: "Sale a pasear casi todos los días, aproximadamente por una hora. En casa juega un poco.",
    alto:     "Un atleta. Toma paseos a diario por más de una hora. Llega a casa y sigue muy activo.",
  }
  return descriptions[level]
}

/**
 * Lógica de recomendación automática de receta.
 * Fuente: flujocal.md sección 4.
 */
export function getAutoRecommendedRecipe(
  lifeFactor: number,
  allergens: string[]
): string {
  const candidates: { id: string; condition: boolean }[] = [
    { id: "pollo-verduras",    condition: lifeFactor >= 2.0 },   // Cachorros / Activos
    { id: "cerdo-verduras",    condition: lifeFactor <= 1.3 },   // Seniors / reducción
    { id: "ternera-espinaca",  condition: false },               // Si busca musculatura (manual)
    { id: "carne-verduras",    condition: true },                // Default adultos estándar
  ]

  for (const c of candidates) {
    if (c.condition && !allergens.includes(c.id.split("-")[0])) {
      return c.id
    }
  }
  // Fallback: primera sin alérgeno
  const safe = ["pollo-verduras", "carne-verduras", "cerdo-verduras", "ternera-espinaca"]
  return safe.find((id) => !allergens.includes(id.split("-")[0])) ?? "carne-verduras"
}
