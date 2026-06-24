// ============================================================
// API Route: Checkout de Plan Nutricional
// Endpoint: POST /api/nutrition-plan/checkout
// Descripción: Crea sesión de Stripe para suscripción de plan personalizado
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { NutritionPlanService } from "@/lib/nutrition-plan-service"
import type { NutritionPlanConfig } from "@/lib/nutrition-plan-service"
import { createServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── Tipos de Request ──────────────────────────────────────

interface CheckoutRequestBody {
  planConfig: NutritionPlanConfig
  userEmail?: string
}

// ─── POST Handler ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Parsear body
    const body: CheckoutRequestBody = await request.json()
    const { planConfig, userEmail } = body

    // 2. Validar plan
    const validation = await NutritionPlanService.validateAndPreparePlan(planConfig)
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Validación fallida",
          errors: validation.errors 
        },
        { status: 400 }
      )
    }

    // 3. Obtener usuario autenticado (opcional)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 4. Calcular precios
    const extrasTotal = planConfig.extras.reduce((sum, extra) => sum + extra.price, 0)
    const pricing = NutritionPlanService.calculatePlanPrice(
      planConfig.dailyGrams,
      planConfig.pricePerKg,
      planConfig.selectedRecipes.length,
      extrasTotal
    )

    console.log("[Nutrition Checkout] Creating session:", {
      petName: planConfig.petName,
      recipeCount: planConfig.selectedRecipes.length,
      dailyGrams: planConfig.dailyGrams,
      grandTotal: pricing.grandTotal,
      userId: user?.id,
    })

    // 5. Crear sesión de checkout en Stripe
    const session = await NutritionPlanService.createCheckoutSession(
      planConfig,
      pricing,
      user?.id,
      userEmail || user?.email
    )

    // 6. Registrar en logs (opcional)
    if (user?.id) {
      await supabase
        .from("nutrition_plan_checkouts")
        .insert({
          user_id: user.id,
          session_id: session.sessionId,
          plan_config: planConfig,
          pricing: pricing,
          status: "pending",
        })
        .catch((error) => {
          // No crítico, solo logging
          console.error("[Nutrition Checkout] Failed to log checkout:", error)
        })
    }

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.sessionId,
    })

  } catch (error: any) {
    console.error("[Nutrition Checkout] Error:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al crear sesión de pago",
      },
      { status: 500 }
    )
  }
}
