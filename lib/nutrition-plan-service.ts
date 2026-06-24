// ============================================================
// Servicio: Plan Nutricional - Integración con Stripe
// Descripción: Gestiona la creación de suscripciones personalizadas
//              desde la calculadora nutricional
// ============================================================

import Stripe from "stripe"
import { createServerClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

// ─── Tipos ─────────────────────────────────────────────────────

export interface NutritionRecipe {
  id: number
  name: string
  slug: string
  short_name: string
  image_url: string
  price_per_kg: number
}

export interface ExtraProduct {
  id: string
  name: string
  price: number
  image?: string
}

export interface NutritionPlanConfig {
  petName: string
  dailyGrams: number
  servingPlan: "completo" | "medio"
  selectedRecipes: Array<{
    id: number
    name: string
    slug: string
    percentage?: number
  }>
  extras: Array<{
    id: string
    name: string
    price: number
  }>
  totalDays: number
  pricePerKg: number
}

export interface PlanPricing {
  fullPrice: number
  discount: number
  total: number
  pricePerDay: number
  extrasTotal: number
  grandTotal: number
}

// ─── Constantes ────────────────────────────────────────────────

const DELIVERY_DAYS = 28
const FIRST_ORDER_DISCOUNT = 0.5 // 50%
const FREE_SHIPPING_THRESHOLD = 1000 // MXN
const SHIPPING_COST = 100 // MXN

// ─── Clase Principal ───────────────────────────────────────────

export class NutritionPlanService {
  /**
   * Calcula el precio del plan nutricional
   */
  static calculatePlanPrice(
    dailyGrams: number,
    pricePerKg: number,
    recipeCount: number,
    extrasTotal: number = 0
  ): PlanPricing {
    const monthlyKg = (dailyGrams * DELIVERY_DAYS) / 1000
    const perRecipe = monthlyKg * pricePerKg
    const fullPrice = perRecipe * Math.max(recipeCount, 1)
    const discount = fullPrice * FIRST_ORDER_DISCOUNT
    const total = fullPrice - discount
    const pricePerDay = total / DELIVERY_DAYS
    const grandTotal = total + extrasTotal

    return {
      fullPrice,
      discount,
      total,
      pricePerDay,
      extrasTotal,
      grandTotal,
    }
  }

  /**
   * Obtiene las recetas activas de la base de datos
   */
  static async getActiveRecipes(): Promise<NutritionRecipe[]> {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from("nutrition_recipes")
      .select("id, name, slug, short_name, image_url, price_per_kg")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("[NutritionPlanService] Error fetching recipes:", error)
      throw new Error("Failed to fetch nutrition recipes")
    }

    return data || []
  }

  /**
   * Obtiene una receta por slug
   */
  static async getRecipeBySlug(slug: string): Promise<NutritionRecipe | null> {
    const supabase = await createServerClient()
    
    const { data, error } = await supabase
      .from("nutrition_recipes")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single()

    if (error) {
      console.error("[NutritionPlanService] Error fetching recipe:", error)
      return null
    }

    return data
  }

  /**
   * Crea un producto de Stripe para el plan personalizado
   * Nota: Creamos un producto temporal para el plan específico
   */
  static async createStripePlanProduct(
    planConfig: NutritionPlanConfig,
    pricing: PlanPricing
  ): Promise<{ productId: string; priceId: string }> {
    try {
      // Crear producto en Stripe
      const product = await stripe.products.create({
        name: `Plan Nutricional para ${planConfig.petName}`,
        description: `Plan personalizado con ${planConfig.selectedRecipes.length} receta(s) - ${planConfig.servingPlan === "completo" ? "100%" : "50%"} alimentación`,
        images: planConfig.selectedRecipes
          .filter(r => r.slug)
          .map(r => `${process.env.NEXT_PUBLIC_APP_URL}/cacu/${r.slug}.png`)
          .slice(0, 1), // Solo primera imagen
        metadata: {
          type: "nutrition_plan",
          pet_name: planConfig.petName,
          daily_grams: planConfig.dailyGrams.toString(),
          serving_plan: planConfig.servingPlan,
          recipe_count: planConfig.selectedRecipes.length.toString(),
          total_days: planConfig.totalDays.toString(),
        },
      })

      // Crear precio recurrente
      // IMPORTANTE: El precio incluye el descuento del 50% del primer pedido
      // Los siguientes cobros serán al precio completo (fullPrice)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(pricing.total * 100), // Primer cobro con descuento
        currency: "mxn",
        recurring: {
          interval: "month",
          interval_count: 1,
        },
        metadata: {
          first_order_discount: "50%",
          full_price: pricing.fullPrice.toFixed(2),
          discounted_price: pricing.total.toFixed(2),
        },
      })

      return {
        productId: product.id,
        priceId: price.id,
      }
    } catch (error) {
      console.error("[NutritionPlanService] Error creating Stripe product:", error)
      throw new Error("Failed to create Stripe plan product")
    }
  }

  /**
   * Crea sesión de checkout para el plan nutricional
   */
  static async createCheckoutSession(
    planConfig: NutritionPlanConfig,
    pricing: PlanPricing,
    userId?: string,
    userEmail?: string
  ): Promise<{ url: string; sessionId: string }> {
    try {
      // Crear producto y precio en Stripe
      const { priceId } = await this.createStripePlanProduct(planConfig, pricing)

      // Calcular envío
      const needsShipping = pricing.grandTotal < FREE_SHIPPING_THRESHOLD
      const shippingCost = needsShipping ? SHIPPING_COST : 0

      // Preparar line items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price: priceId,
          quantity: 1,
        },
      ]

      // Agregar envío si es necesario
      if (needsShipping) {
        // Crear precio de envío (solo para esta sesión)
        const shippingPrice = await stripe.prices.create({
          product_data: {
            name: "Envío",
            description: `Envío recurrente cada ${DELIVERY_DAYS} días`,
          },
          unit_amount: shippingCost * 100,
          currency: "mxn",
          recurring: {
            interval: "month",
            interval_count: 1,
          },
        })

        lineItems.push({
          price: shippingPrice.id,
          quantity: 1,
        })
      }

      // URLs de éxito y cancelación
      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/crear-plan?canceled=true`

      // Crear sesión de checkout
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: userEmail,
        client_reference_id: userId,
        allow_promotion_codes: false, // Descuento ya aplicado
        billing_address_collection: "required",
        shipping_address_collection: {
          allowed_countries: ["MX"],
        },
        phone_number_collection: {
          enabled: true,
        },
        subscription_data: {
          metadata: {
            source: "nutrition_calculator",
            user_id: userId || "",
            plan_config: JSON.stringify(planConfig),
            pricing: JSON.stringify(pricing),
          },
        },
        metadata: {
          source: "nutrition_calculator",
          user_id: userId || "",
          pet_name: planConfig.petName,
        },
      })

      if (!session.url) {
        throw new Error("Stripe session URL is null")
      }

      return {
        url: session.url,
        sessionId: session.id,
      }
    } catch (error) {
      console.error("[NutritionPlanService] Error creating checkout session:", error)
      throw new Error("Failed to create checkout session")
    }
  }

  /**
   * Valida y prepara el plan antes de crear la sesión
   */
  static async validateAndPreparePlan(
    planConfig: NutritionPlanConfig
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Validar nombre de mascota
    if (!planConfig.petName || planConfig.petName.trim().length === 0) {
      errors.push("El nombre de la mascota es requerido")
    }

    // Validar gramos diarios
    if (planConfig.dailyGrams <= 0) {
      errors.push("Los gramos diarios deben ser mayores a 0")
    }

    // Validar recetas seleccionadas
    if (planConfig.selectedRecipes.length === 0) {
      errors.push("Debes seleccionar al menos una receta")
    }

    // Validar que las recetas existan y estén activas
    const supabase = await createServerClient()
    const recipeIds = planConfig.selectedRecipes.map(r => r.id)
    
    const { data: recipes, error } = await supabase
      .from("nutrition_recipes")
      .select("id")
      .in("id", recipeIds)
      .eq("is_active", true)

    if (error || !recipes || recipes.length !== recipeIds.length) {
      errors.push("Una o más recetas seleccionadas no son válidas")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
