"use client"
// ============================================================
// NUTRITION CALCULATOR – Orquestador Principal
//
// Flujo oficial (fuente: PGM - Calculadora.xlsx):
//   1. Datos básicos: nombre, género, peso
//   2. Etapa de vida: cachorro pequeño / grande / adulto / senior
//   3. ¿Esterilizado? — SOLO si es MACHO ADULTO
//   4. Nivel de actividad: bajo / moderado / alto
//   5. Alergias: tiene/no tiene + selección de proteínas
//   ─── Cálculo automático RED + gramos ───
//   6. ¿Cómo planeas servirlo? plan completo / medio plan
//   7. Receta recomendada (pre-seleccionada por algoritmo)
//   8. Resumen + extras + checkout
//
// Fórmula:
//   RER = 70 × peso^0.75
//   RED = RER × factor_etapa × factor_actividad
//   gramos = (RED / kcal_100g) × 100
// ============================================================

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { useCart } from "@/components/cart-context"
import { useCalculatorConfig } from "@/hooks/use-calculator-config"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronDown } from "lucide-react"
import Image from "next/image"

import type { CalculatorFormData, LifeStage, ActivityLevel, ServingPlan, AllergenId, ExtraProduct } from "./types"
import {
  calculateCalories,
  resolveLifeStageFactor,
  getAutoRecommendedRecipe,
} from "./calculator-engine"
import {
  filterRecipesByAllergens,
  getRecipeById,
  getDefaultKcalPer100g,
} from "./data/recipes"
import { NUTRITION_PLAN_IN_STOCK } from "@/lib/nutrition-plan-stock"
import type { RecipeConfig } from "@/lib/calculator-config-types"

import { SectionReveal }               from "./ui/section-reveal"
import { BasicInfoSection }            from "./sections/basic-info-section"
import { LifeStageSection }            from "./sections/life-stage-section"
import { NeuteredSection }             from "./sections/neutered-section"
import { ActivityLevelSection }        from "./sections/activity-level-section"
import { AllergiesSection }            from "./sections/allergies-section"
import { ServingPlanSection }          from "./sections/serving-plan-section"
import { RecipeRecommendationSection } from "./sections/recipe-recommendation-section"
import { PlanSummarySection }          from "./sections/plan-summary-section"

// ─── Constantes ───────────────────────────────────────────────
const MAX_DOGS = 10

// ─── Tipo para planes guardados ───────────────────────────────
type SavedDogPlan = {
  id: string
  petName: string
  dailyGrams: number
  dailyKcal: number
  servingPlan: ServingPlan
  recipeIds: string[]
  extraIds: string[]
  formSnapshot: CalculatorFormData
}

// ─── Estado inicial ───────────────────────────────────────────
const INITIAL_FORM: CalculatorFormData = {
  petName:        "",
  gender:         null,
  weight:         null,
  lifeStage:      null,
  isNeutered:     null,
  activityLevel:  null,
  hasAllergies:   null,
  allergens:      [],
  servingPlan:    null,
  selectedRecipes:[],
  selectedExtras: [],
}

// ─── Guards de completitud ────────────────────────────────────
const isBasicInfoComplete    = (f: CalculatorFormData) =>
  f.petName.trim().length > 0 && f.gender !== null && (f.weight ?? 0) > 0

const isLifeStageComplete    = (f: CalculatorFormData) => f.lifeStage !== null

/** La pregunta de castración solo aplica a machos adultos */
const needsNeuteredQuestion  = (f: CalculatorFormData) =>
  f.gender === "macho" && f.lifeStage === "adulto"

const isNeuteredComplete     = (f: CalculatorFormData) =>
  !needsNeuteredQuestion(f) || f.isNeutered !== null

const isActivityComplete     = (f: CalculatorFormData) => f.activityLevel !== null

const isAllergiesComplete    = (f: CalculatorFormData) =>
  f.hasAllergies === false ||
  (f.hasAllergies === true && f.allergens.length > 0)

const isServingPlanComplete  = (f: CalculatorFormData) => f.servingPlan !== null

const isRecipesComplete      = (f: CalculatorFormData) => f.selectedRecipes.length > 0

// ─── Componente principal ─────────────────────────────────────
export function NutritionCalculator() {
  const router              = useRouter()
  const { user }            = useClientAuth()
  const { addToCart, setShowCart } = useCart()
  const { config: calcConfig } = useCalculatorConfig()
  const [form, setForm]           = useState<CalculatorFormData>(INITIAL_FORM)
  const [savedDogs, setSavedDogs]         = useState<SavedDogPlan[]>([])
  const [expandedDogId, setExpandedDogId] = useState<string | null>(null)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError]         = useState<string | null>(null)
  const [randomExtras, setRandomExtras]           = useState<ExtraProduct[]>([])
  const addedToCartRef = useRef(false) // Para evitar agregar múltiples veces

  // ─── Recetas activas desde config (o fallback a hardcoded) ───
  const configRecipes = useMemo(() => {
    if (!calcConfig?.recipes?.length) return null
    return calcConfig.recipes
      .filter((r) => r.isActive)
      .map((r: RecipeConfig) => ({
        id: r.id,
        name: r.name,
        shortName: r.shortName,
        protein: r.protein as AllergenId,
        allergens: r.allergens as AllergenId[],
        kcalPer100g: r.kcalPer100g,
        pricePerKg: r.pricePerKg,
        image: r.image,
        productSlug: r.productSlug,
        ingredients: r.ingredients,
      }))
  }, [calcConfig])

  // ─── Extras: 3 productos al azar entre los más baratos del catálogo ───
  // Los admin NO los editan; salen de la tienda pública.
  useEffect(() => {
    let cancelled = false
    fetch("/api/nutrition-plan/random-extras?limit=3", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json?.success && Array.isArray(json.extras)) {
          setRandomExtras(json.extras as ExtraProduct[])
        }
      })
      .catch((err) => {
        console.warn("[nutrition-calculator] No se pudieron cargar extras:", err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = useCallback((updates: Partial<CalculatorFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }, [])

  // ─── Derivados ────────────────────────────────────────────
  const availableRecipes = useMemo(() => {
    if (configRecipes) {
      // Usar recetas del config, filtrar por alérgenos
      const allergens = form.hasAllergies ? form.allergens : []
      return allergens.length
        ? configRecipes.filter((r) => !r.allergens.some((a: string) => allergens.includes(a as AllergenId)))
        : configRecipes
    }
    return filterRecipesByAllergens(form.hasAllergies ? form.allergens : [])
  }, [configRecipes, form.hasAllergies, form.allergens])

  /** kcal/100g para usar en el cálculo antes de que el usuario elija receta */
  const defaultKcal = useMemo(() => {
    if (configRecipes) {
      const allergens = form.hasAllergies ? form.allergens : []
      const filtered = allergens.length
        ? configRecipes.filter((r) => !r.allergens.some((a: string) => allergens.includes(a as AllergenId)))
        : configRecipes
      if (!filtered.length) return 185
      return filtered.reduce((sum: number, r) => sum + r.kcalPer100g, 0) / filtered.length
    }
    return getDefaultKcalPer100g(form.hasAllergies ? form.allergens : [])
  }, [configRecipes, form.hasAllergies, form.allergens])

  /** kcal/100g de la primera receta seleccionada (o default) */
  const activeKcal = useMemo(() => {
    if (!form.selectedRecipes.length) return defaultKcal
    // Buscar en configRecipes primero, luego en hardcoded
    const r = configRecipes?.find((rc) => rc.id === form.selectedRecipes[0])
      ?? getRecipeById(form.selectedRecipes[0])
    return r?.kcalPer100g ?? defaultKcal
  }, [form.selectedRecipes, defaultKcal, configRecipes])

  const canCalculate =
    (form.weight ?? 0) > 0 &&
    form.lifeStage !== null &&
    form.gender !== null &&
    isNeuteredComplete(form) &&
    form.activityLevel !== null

  const calorieResult = useMemo(() => {
    if (!canCalculate) return null
    return calculateCalories(
      form.weight!,
      form.lifeStage as LifeStage,
      form.gender!,
      form.isNeutered,
      form.activityLevel as ActivityLevel,
      activeKcal,
      (form.servingPlan as ServingPlan) ?? "completo"
    )
  }, [canCalculate, form.weight, form.lifeStage, form.gender, form.isNeutered,
      form.activityLevel, activeKcal, form.servingPlan])

  /** Recomendación automática al revelarse la sección de recetas */
  const autoRecommendedId = useMemo(() => {
    if (!form.lifeStage || !form.gender) return null
    const lifeFactor = resolveLifeStageFactor(
      form.lifeStage as LifeStage,
      form.gender,
      form.isNeutered
    )
    return getAutoRecommendedRecipe(
      lifeFactor,
      form.hasAllergies ? form.allergens : []
    )
  }, [form.lifeStage, form.gender, form.isNeutered, form.hasAllergies, form.allergens])

  const selectedRecipeObjects = useMemo(
    () => form.selectedRecipes
      .map((id) => configRecipes?.find((r) => r.id === id) ?? getRecipeById(id))
      .filter(Boolean),
    [form.selectedRecipes, configRecipes]
  ) as NonNullable<ReturnType<typeof getRecipeById>>[]

  // ─── Visibilidad de secciones ──────────────────────────────
  const showLifeStage   = isBasicInfoComplete(form)
  const showNeutered    = showLifeStage && isLifeStageComplete(form) && needsNeuteredQuestion(form)
  const showActivity    = showLifeStage && isLifeStageComplete(form) && isNeuteredComplete(form)
  const showAllergies   = showActivity  && isActivityComplete(form)
  const showServingPlan = showAllergies && isAllergiesComplete(form)
  const showRecipes     = showServingPlan && isServingPlanComplete(form) && calorieResult !== null
  const showSummary     = showRecipes   && isRecipesComplete(form)

  // NO auto-seleccionar receta - esperar selección manual del usuario
  const handleServingPlanChange = useCallback((updates: Partial<CalculatorFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }))
    // Al cambiar de tipo de plan permitimos que vuelva a dispararse
    // el auto-add (se ajustan los gramos / el precio).
    addedToCartRef.current = false
  }, [])

  // ─── Auto-selección de receta recomendada al elegir tipo de plan ───────
  // Cuando el usuario elige "completo" o "medio", si todavía no ha
  // seleccionado manualmente ninguna receta, marcamos la recomendada
  // automáticamente. Así el usuario no tiene que hacer scroll y click
  // adicional para continuar.
  useEffect(() => {
    if (
      form.servingPlan &&
      autoRecommendedId &&
      form.selectedRecipes.length === 0 &&
      availableRecipes.some((r) => r.id === autoRecommendedId)
    ) {
      setForm((prev) => ({ ...prev, selectedRecipes: [autoRecommendedId] }))
    }
  }, [form.servingPlan, autoRecommendedId, form.selectedRecipes.length, availableRecipes])

  // ─── Auto-agregar al carrito al completar el plan ──────────
  // Cuando hay servingPlan + receta seleccionada + cálculo listo,
  // agregamos el plan al carrito una sola vez (sin abrir el modal).
  // El plan se guarda con `petPlan` metadata para que persista
  // como un item independiente por perro.
  useEffect(() => {
    if (
      !form.servingPlan ||
      selectedRecipeObjects.length === 0 ||
      !calorieResult ||
      addedToCartRef.current
    ) {
      return
    }

    addedToCartRef.current = true

    const planSignature = [
      form.petName.trim().toLowerCase() || "perro",
      form.servingPlan,
      calorieResult.dailyGrams,
      [...form.selectedRecipes].sort().join("+"),
    ].join("|")

    selectedRecipeObjects.forEach((recipe) => {
      const monthlyKg        = (calorieResult.dailyGrams * 28) / 1000
      const fullMonthlyPrice = monthlyKg * recipe.pricePerKg
      const discountedPrice  = fullMonthlyPrice * 0.5 // 50% primer pedido

      addToCart({
        id:               parseInt(recipe.id.split("-")[0]) || Math.floor(Math.random() * 10000),
        name:             `${recipe.name}${form.petName ? ` — ${form.petName}` : ""}`,
        price:            discountedPrice,
        quantity:         1,
        image:            recipe.image,
        size:             `${calorieResult.dailyGrams}g/día · ${Math.round(calorieResult.dailyGrams / 2)}g por toma`,
        isSubscription:   true,
        subscriptionType: "monthly",
        slug:             recipe.productSlug || undefined,
        petPlan: {
          petName:         form.petName || "Sin nombre",
          dailyGrams:      calorieResult.dailyGrams,
          gramsPerServing: calorieResult.gramsPerServing,
          servingPlan:     (form.servingPlan as ServingPlan) ?? "completo",
          weight:          form.weight ?? null,
          lifeStage:       form.lifeStage ?? null,
          activityLevel:   form.activityLevel ?? null,
          recipeId:        recipe.id,
          signature:       planSignature,
        },
      }, false) // false = NO abrir el modal del carrito (silent add)
    })
  }, [
    form.servingPlan,
    form.petName,
    form.weight,
    form.lifeStage,
    form.activityLevel,
    form.selectedRecipes,
    selectedRecipeObjects,
    calorieResult,
    addToCart,
  ])

  // Resetear el flag si el usuario quita todas las recetas o cambia plan
  useEffect(() => {
    if (selectedRecipeObjects.length === 0) {
      addedToCartRef.current = false
    }
  }, [selectedRecipeObjects.length])

  // ─── Guardar plan del perro actual y empezar otro ─────────
  const totalDogs   = savedDogs.length + 1          // guardados + el actual
  const canAddMore  = totalDogs < MAX_DOGS           // puede guardar el actual y empezar otro

  const handleAddAnotherDog = useCallback(() => {
    if (!calorieResult) return

    const newSaved: SavedDogPlan = {
      id:           `dog-${Date.now()}`,
      petName:      form.petName || `Perro ${totalDogs}`,
      dailyGrams:   calorieResult.dailyGrams,
      dailyKcal:    calorieResult.mer,
      servingPlan:  (form.servingPlan as ServingPlan) ?? "completo",
      recipeIds:    [...form.selectedRecipes],
      extraIds:     [...form.selectedExtras],
      formSnapshot: { ...form },
    }

    setSavedDogs((prev) => [...prev, newSaved])
    addedToCartRef.current = false // Resetear para el próximo perro
    window.scrollTo({ top: 0, behavior: "smooth" })
    setTimeout(() => setForm(INITIAL_FORM), 400)
  }, [form, calorieResult, totalDogs])

  const handleRemoveSavedDog = useCallback((id: string) => {
    setSavedDogs((prev) => prev.filter((d) => d.id !== id))
    setExpandedDogId((prev) => (prev === id ? null : prev))
  }, [])

  // ─── Checkout: Verificar auth y proceder a Stripe ──────
  const handleCheckout = useCallback(async () => {
    if (!selectedRecipeObjects.length || !calorieResult) return
    setCheckoutError(null)

    // Si no hay usuario, no hacer nada (el panel se encarga de mostrar opciones)
    if (!user) {
      return
    }

    setIsCheckoutLoading(true)

    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // NUEVO FLUJO: Usar endpoint de nutrition plan
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const planConfig = {
        petName: form.petName || "Sin nombre",
        weight: calorieResult.weight,
        age: form.age || "adulto",
        activityLevel: form.activityLevel || "moderado",
        bodyCondition: form.bodyCondition || "ideal",
        neutered: form.neutered !== undefined ? form.neutered : true,
        servingPlan: form.servingPlan || "completo",
        dailyCalories: calorieResult.calories,
        dailyGrams: calorieResult.dailyGrams,
        selectedRecipes: selectedRecipeObjects.map((r) => ({
          id: r.id,
          name: r.name,
          shortName: r.shortName,
          image: r.image,
        })),
      }

      const response = await fetch("/api/nutrition-plan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planConfig,
          userId: user.id,
          userEmail: user.email ?? "",
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Error al crear la sesión de pago")
      }

      const { url, sessionId } = await response.json()
      if (!url) throw new Error("No se recibió URL de Stripe")

      if (sessionId) localStorage.setItem("stripe_session_id", sessionId)
      
      window.location.href = url

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al procesar el pago"
      setCheckoutError(msg)
      setIsCheckoutLoading(false)
    }
  }, [user, selectedRecipeObjects, calorieResult, form])

  const handleRemoveRecipe = useCallback((id: string) => {
    handleChange({ selectedRecipes: form.selectedRecipes.filter((r) => r !== id) })
  }, [form.selectedRecipes, handleChange])

  const handleBackToRecipes = useCallback(() => {
    handleChange({ selectedRecipes: [] })
  }, [handleChange])

  // ─── Agregar al carrito manualmente (con modal abierto) ──────
  const handleManualAddToCart = useCallback(() => {
    if (!selectedRecipeObjects.length || !calorieResult) return

    const planSignature = [
      form.petName.trim().toLowerCase() || "perro",
      form.servingPlan ?? "completo",
      calorieResult.dailyGrams,
      [...form.selectedRecipes].sort().join("+"),
    ].join("|")

    // Agregar cada receta seleccionada al carrito
    selectedRecipeObjects.forEach((recipe) => {
      // Calcular precio mensual (28 días) con 50% de descuento en primer pedido
      const monthlyKg = (calorieResult.dailyGrams * 28) / 1000
      const fullMonthlyPrice = monthlyKg * recipe.pricePerKg
      const discountedPrice = fullMonthlyPrice * 0.5  // 50% descuento primer pedido
      
      addToCart({
        id:               parseInt(recipe.id.split('-')[0]) || Math.floor(Math.random() * 10000),
        name:             `${recipe.name}${form.petName ? ` — ${form.petName}` : ""}`,
        price:            discountedPrice,
        quantity:         1,
        image:            recipe.image,
        size:             `${calorieResult.dailyGrams}g/día · ${Math.round(calorieResult.dailyGrams / 2)}g por toma`,
        isSubscription:   true,
        subscriptionType: "monthly",
        slug:             recipe.productSlug || undefined,
        petPlan: {
          petName:         form.petName || "Sin nombre",
          dailyGrams:      calorieResult.dailyGrams,
          gramsPerServing: calorieResult.gramsPerServing,
          servingPlan:     (form.servingPlan as ServingPlan) ?? "completo",
          weight:          form.weight ?? null,
          lifeStage:       form.lifeStage ?? null,
          activityLevel:   form.activityLevel ?? null,
          recipeId:        recipe.id,
          signature:       planSignature,
        },
      }, true) // ← true = SÍ abrir el modal del carrito
    })
  }, [selectedRecipeObjects, calorieResult, form.petName, form.weight, form.lifeStage, form.activityLevel, form.servingPlan, form.selectedRecipes, addToCart])

  // ─── Progreso ─────────────────────────────────────────────
  const STEPS = [
    { label: "Tu perro",     done: isBasicInfoComplete(form) },
    { label: "Etapa",        done: isLifeStageComplete(form) },
    { label: "Actividad",    done: isActivityComplete(form) },
    { label: "Alergias",     done: isAllergiesComplete(form) },
    { label: "Plan",         done: isServingPlanComplete(form) },
    { label: "Receta",       done: isRecipesComplete(form) },
  ]
  const completedSteps = STEPS.filter(s => s.done).length
  const progressPct = Math.round((completedSteps / STEPS.length) * 100)

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl mx-auto">

      {/* ── Panel de perros guardados ── */}
      <AnimatePresence>
        {savedDogs.length > 0 && (
          <motion.div
            key="saved-dogs-panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#7AB8BF]">
                Planes guardados
              </span>
              <span className="text-[11px] text-[#b8c8cb]">
                {totalDogs} / {MAX_DOGS}
              </span>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout">
                {savedDogs.map((dog, idx) => {
                  const isOpen     = expandedDogId === dog.id
                  const recipeName = dog.recipeIds
                    .map((id) => getRecipeById(id)?.name ?? "")
                    .filter(Boolean)
                    .join(" · ")
                  return (
                    <motion.div
                      key={dog.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    >
                      {/* Chip principal — clickeable para expandir */}
                      <button
                        type="button"
                        onClick={() => setExpandedDogId(isOpen ? null : dog.id)}
                        className={`group flex items-center gap-3 bg-white border rounded-2xl px-4 py-2.5 shadow-sm transition-colors text-left w-full ${
                          isOpen
                            ? "border-[#2a7880] rounded-b-none shadow-none"
                            : "border-[#e3ecee] hover:border-[#7AB8BF]"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-[#b8c8cb] leading-none w-3 shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-semibold text-[#16313b] leading-tight capitalize truncate max-w-[110px]">
                            {dog.petName}
                          </span>
                          {recipeName && (
                            <span className="text-[10px] text-[#7AB8BF] truncate max-w-[130px] leading-tight">
                              {recipeName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-[#b8c8cb] whitespace-nowrap shrink-0">
                          {dog.dailyGrams}g/día
                        </span>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="shrink-0 text-[#b8c8cb]"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </motion.span>
                        {/* Eliminar — stopPropagation para no colapsar al borrar */}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleRemoveSavedDog(dog.id) }}
                          onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), handleRemoveSavedDog(dog.id))}
                          aria-label={`Eliminar plan de ${dog.petName}`}
                          className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[#d0dde0] hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <X className="h-2.5 w-2.5" />
                        </span>
                      </button>

                      {/* Panel de detalles expandible */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            key="detail"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                            className="overflow-hidden"
                          >
                            <SavedDogDetail dog={dog} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Barra de progreso ── */}
      <div className="mb-16 px-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#5d7276] uppercase tracking-wider">
            {savedDogs.length > 0
              ? `Perro ${savedDogs.length + 1} de ${MAX_DOGS}`
              : "Progreso del plan"}
          </span>
          <span className="text-xs font-bold text-[#2a7880]">{progressPct}%</span>
        </div>
        <div className="w-full h-3 bg-[#e3ecee] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#7AB8BF] to-[#2a7880] rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                step.done ? "bg-[#2a7880]" : "bg-[#e3ecee]"
              }`} />
              <span className={`text-[9px] font-medium hidden sm:block transition-colors duration-300 ${
                step.done ? "text-[#2a7880]" : "text-[#b8c8cb]"
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 1. Datos básicos (siempre visible) ── */}
      <CalcSection number={1} title={calcConfig?.sections?.basicInfo?.title ?? "Cuéntanos acerca de tu perro:"}>
        <p className="text-sm text-[#607478] mb-6 leading-relaxed">
          {calcConfig?.sections?.basicInfo?.description ?? "Esto nos ayudará a determinar la mejor receta para tu perro así como la cantidad de alimento por día. Si tienes más de un perro, elige uno ahora y podrás añadir otro más adelante."}
        </p>
        <BasicInfoSection data={form} onChange={handleChange} />
      </CalcSection>

      {/* ── 2. Etapa de vida ── */}
      <SectionReveal visible={showLifeStage} className="pt-10">
        <Divider />
        <LifeStageSection
          petName={form.petName}
          selected={form.lifeStage}
          onChange={handleChange}
        />
      </SectionReveal>

      {/* ── 3. ¿Está esterilizado? (solo macho adulto) ── */}
      <SectionReveal visible={showNeutered} className="pt-10">
        <Divider />
        <NeuteredSection
          petName={form.petName}
          isNeutered={form.isNeutered}
          onChange={handleChange}
        />
      </SectionReveal>

      {/* ── 4. Nivel de actividad ── */}
      <SectionReveal visible={showActivity} className="pt-10">
        <Divider />
        <ActivityLevelSection
          petName={form.petName}
          selected={form.activityLevel}
          onChange={handleChange}
        />
      </SectionReveal>

      {/* ── 5. Alergias ── */}
      <SectionReveal visible={showAllergies} className="pt-10">
        <Divider />
        <AllergiesSection
          petName={form.petName}
          hasAllergies={form.hasAllergies}
          allergens={form.allergens as AllergenId[]}
          onChange={handleChange}
        />
      </SectionReveal>

      {/* ── 6. ¿Cómo planeas servirlo? ── */}
      <SectionReveal visible={showServingPlan} className="pt-10">
        <Divider />
        <CalcSection number={2} title={calcConfig?.sections?.servingPlan?.title ?? "¿Cómo planeas servir Pet Gourmet?"}>
          <ServingPlanSection
            petName={form.petName}
            dailyKcal={calorieResult?.mer ?? 0}
            selected={form.servingPlan}
            onChange={handleServingPlanChange}
          />
        </CalcSection>
      </SectionReveal>

      {/* ── 7. Receta recomendada ── */}
      <SectionReveal visible={showRecipes} className="pt-10">
        <Divider />
        <CalcSection
          number={3}
          title={
            form.petName ? (
              <>
                {(calcConfig?.sections?.recipeSection?.title ?? "Receta recomendada para tu perro:").replace("tu perro:", "")}
                <span className="text-[#2a7880]">{form.petName}</span>:
              </>
            ) : (
              calcConfig?.sections?.recipeSection?.title ?? "Receta recomendada para tu perro:"
            )
          }
        >
          <RecipeRecommendationSection
            petName={form.petName}
            dailyGrams={calorieResult?.dailyGrams ?? 0}
            gramsPerServing={calorieResult?.gramsPerServing ?? 0}
            recipes={availableRecipes}
            selectedRecipes={form.selectedRecipes}
            recommendedRecipeId={autoRecommendedId}
            onChange={handleChange}
          />
        </CalcSection>
      </SectionReveal>

      {/* ── 8. Resumen del plan ── */}
      <SectionReveal visible={showSummary} className="pt-10">
        <Divider />
        <CalcSection
          title={
            form.petName ? (
              <>
                {(calcConfig?.sections?.summary?.title ?? "Plan recomendado para tu perro").replace("tu perro", "")}
                <span className="text-[#2a7880]">{form.petName}</span>
              </>
            ) : (
              calcConfig?.sections?.summary?.title ?? "Plan recomendado para tu perro"
            )
          }
        >
          <PlanSummarySection
            petName={form.petName}
            selectedRecipes={selectedRecipeObjects}
            dailyGrams={calorieResult?.dailyGrams ?? 0}
            servingPlan={form.servingPlan ?? "completo"}
            extras={randomExtras}
            selectedExtras={form.selectedExtras}
            savedDogsCount={savedDogs.length}
            canAddMore={canAddMore}
            isCheckoutLoading={isCheckoutLoading}
            checkoutError={checkoutError}
            isAuthenticated={!!user}
            outOfStock={!NUTRITION_PLAN_IN_STOCK}
            onDismissError={() => setCheckoutError(null)}
            onToggleExtra={(id) => {
              const updated = form.selectedExtras.includes(id)
                ? form.selectedExtras.filter((e) => e !== id)
                : [...form.selectedExtras, id]
              handleChange({ selectedExtras: updated })
            }}
            onRemoveRecipe={handleRemoveRecipe}
            onAddAnotherDog={handleAddAnotherDog}
            onBackToRecipes={handleBackToRecipes}
            onCheckout={handleCheckout}
            onAddToCart={handleManualAddToCart}
          />
        </CalcSection>
      </SectionReveal>

      <div className="h-20" />
    </div>
  )
}

// ─── Detalle de un perro guardado ─────────────────────────────

const LIFE_STAGE_LABELS: Record<string, string> = {
  "cachorro-pequeno": "Cachorro pequeño",
  "cachorro-grande":  "Cachorro grande",
  "adulto":           "Adulto",
  "senior":           "Senior",
}
const ACTIVITY_LABELS: Record<string, string> = {
  bajo:     "Bajo",
  moderado: "Moderado",
  alto:     "Alto",
}
const SERVING_LABELS: Record<string, string> = {
  completo: "Plan completo · 100%",
  medio:    "Medio plan · 50%",
}

function SavedDogDetail({ dog }: { dog: SavedDogPlan }) {
  const f        = dog.formSnapshot
  const recipes  = dog.recipeIds.map((id) => getRecipeById(id)?.name ?? id).join(", ")
  const allergens = f.allergens.length > 0 ? f.allergens.join(", ") : null

  const rows: { label: string; value: string }[] = [
    { label: "Peso",      value: `${f.weight ?? "—"} kg` },
    { label: "Género",    value: f.gender ? (f.gender.charAt(0).toUpperCase() + f.gender.slice(1)) : "—" },
    { label: "Etapa",     value: f.lifeStage ? (LIFE_STAGE_LABELS[f.lifeStage] ?? f.lifeStage) : "—" },
    { label: "Actividad", value: f.activityLevel ? (ACTIVITY_LABELS[f.activityLevel] ?? f.activityLevel) : "—" },
    { label: "Alergias",  value: f.hasAllergies === false ? "No tiene" : (allergens ?? "—") },
    { label: "Plan",      value: f.servingPlan ? (SERVING_LABELS[f.servingPlan] ?? f.servingPlan) : "—" },
    { label: "Receta",    value: recipes || "—" },
    { label: "Ración",    value: `${dog.dailyGrams} g/día` },
  ]

  return (
    <div className="bg-[#f8fbfc] border border-[#2a7880] border-t-0 rounded-b-2xl px-4 py-3">
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[9px] font-semibold uppercase tracking-wider text-[#7AB8BF]">
              {label}
            </dt>
            <dd className="text-xs font-medium text-[#16313b] capitalize">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ─── Componentes internos de layout ───────────────────────────

function CalcSection({
  number,
  title,
  children,
}: {
  number?: number
  title: string | React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="w-full rounded-[28px] border border-[#e3ecee] bg-white p-6 shadow-sm md:p-8">
      <h2 className="font-display text-2xl font-bold text-[#16313b] mb-4">
        {number !== undefined && (
          <span className="text-[#2a7880]">{number}.&nbsp;</span>
        )}
        {title}
      </h2>
      {children}
    </div>
  )
}

function Divider() {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.6 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0 }}
      viewport={{ once: false, amount: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full flex items-center gap-3 mb-8"
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7AB8BF]/50 to-transparent" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#7AB8BF]/50 shrink-0" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7AB8BF]/50 to-transparent" />
    </motion.div>
  )
}
