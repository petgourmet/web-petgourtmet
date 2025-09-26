import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import MercadoPagoService from "@/lib/mercadopago-service"
import { subscriptionDeduplicationService } from '@/lib/subscription-deduplication-service'
import { createEnhancedIdempotencyServiceServer } from '@/lib/enhanced-idempotency-service.server'

export async function POST(request: NextRequest) {
  try {
    const { preapproval_id, user_id } = await request.json()

    if (!preapproval_id || !user_id) {
      return NextResponse.json(
        { error: "preapproval_id y user_id son requeridos" },
        { status: 400 }
      )
    }
    
    // Generar clave de idempotencia para la validación
    const idempotencyKey = subscriptionDeduplicationService.generateIdempotencyKey(
      preapproval_id,
      user_id,
      'validation'
    )

    // Usar servicio de idempotencia para la validación
    const idempotencyService = createEnhancedIdempotencyServiceServer()
    const result = await idempotencyService.executeSubscriptionWithIdempotency(
      idempotencyKey,
      async () => {
        // Inicializar servicio de MercadoPago
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
        if (!accessToken) {
          throw new Error("Token de MercadoPago no configurado")
        }

        const mpService = new MercadoPagoService(accessToken)

        // Obtener información de la suscripción desde MercadoPago
        const subscriptionInfo = await mpService.getSubscription(preapproval_id)

        if (!subscriptionInfo || subscriptionInfo.status !== "authorized") {
          throw new Error("Suscripción no encontrada o no autorizada")
        }
        
        console.log('📋 Información de suscripción obtenida:', {
          id: subscriptionInfo.id,
          status: subscriptionInfo.status,
          external_reference: subscriptionInfo.external_reference
        })
        
        return { subscriptionInfo }
      },
      {
        timeoutMs: 30000,
        maxRetries: 3
      }
    )
    
    // Manejar resultado desde caché o nueva ejecución
    if (result.fromCache) {
      console.log('✅ Validación de suscripción obtenida desde caché de idempotencia')
      return NextResponse.json({
        success: true,
        message: 'Suscripción ya validada (desde caché)',
        ...result.result,
        fromCache: true
      })
    }
    
    const { subscriptionInfo } = result.result

    // PASO 1: Buscar suscripción por external_reference (prioridad)
    const externalReference = subscriptionInfo.external_reference || preapproval_id
    
    const { data: existingByReference, error: referenceError } = await supabase
      .from("unified_subscriptions")
      .select("*")
      .eq("external_reference", externalReference)
      .eq("user_id", user_id)

    if (referenceError) {
      console.error("Error buscando por external_reference:", referenceError)
      return NextResponse.json(
        { error: "Error al buscar suscripción" },
        { status: 500 }
      )
    }

    let targetSubscription = null

    // Si existe suscripción con external_reference
    if (existingByReference && existingByReference.length > 0) {
      console.log(`🔍 Encontradas ${existingByReference.length} suscripciones con external_reference:`, externalReference)
      
      // Verificar si ya hay una activa
      const activeSubscription = existingByReference.find(sub => sub.status === 'active')
      if (activeSubscription) {
        console.log('✅ Suscripción ya está activa:', activeSubscription.id)
        return NextResponse.json({
          success: true,
          subscription: activeSubscription,
          message: "Suscripción ya está activa"
        })
      }

      // Buscar la suscripción pending más completa
      const pendingSubscriptions = existingByReference.filter(sub => sub.status === 'pending')
      if (pendingSubscriptions.length > 0) {
        // Seleccionar la más completa (con más datos)
        targetSubscription = pendingSubscriptions.reduce((best, current) => {
          const bestScore = getCompletenessScore(best)
          const currentScore = getCompletenessScore(current)
          return currentScore > bestScore ? current : best
        })
        
        console.log('📋 Suscripción pending seleccionada:', {
          id: targetSubscription.id,
          completeness_score: getCompletenessScore(targetSubscription),
          has_product_data: !!(targetSubscription.product_name && targetSubscription.base_price),
          has_customer_data: !!targetSubscription.customer_data
        })

        // Eliminar duplicados
        const duplicateIds = pendingSubscriptions
          .filter(sub => sub.id !== targetSubscription.id)
          .map(sub => sub.id)
        
        if (duplicateIds.length > 0) {
          console.log('🗑️ Eliminando duplicados:', duplicateIds)
          await supabase
            .from('unified_subscriptions')
            .delete()
            .in('id', duplicateIds)
        }
      }
    }

    // PASO 2: Si no se encontró por external_reference, buscar por preapproval_id
    if (!targetSubscription) {
      const { data: pendingByPreapproval, error: preapprovalError } = await supabase
        .from("unified_subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .eq("mercadopago_subscription_id", preapproval_id)

      if (preapprovalError) {
        console.error("Error buscando por preapproval_id:", preapprovalError)
        return NextResponse.json(
          { error: "Error al buscar suscripción" },
          { status: 500 }
        )
      }

      if (pendingByPreapproval && pendingByPreapproval.length > 0) {
        targetSubscription = pendingByPreapproval[0]
        console.log('📋 Suscripción encontrada por preapproval_id:', targetSubscription.id)
      }
    }

    // PASO 3: Si no se encontró ninguna, NO crear una nueva (evitar duplicados)
    if (!targetSubscription) {
      console.log('❌ No se encontró suscripción pending para activar')
      return NextResponse.json(
        { error: "No se encontró suscripción pendiente para activar" },
        { status: 404 }
      )
    }

    const pendingSubscription = targetSubscription

    // Calcular próxima fecha de facturación
    const nextBillingDate = calculateNextBillingDate(pendingSubscription.subscription_type)

    // Actualizar suscripción pendiente a activa CON TODOS LOS DATOS
    const updateData = {
      status: "active",
      external_reference: subscriptionInfo.external_reference || preapproval_id,
      mercadopago_subscription_id: preapproval_id,
      next_billing_date: nextBillingDate,
      last_billing_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activated_at: new Date().toISOString(),
      // CRÍTICO: Preservar TODOS los datos existentes
      ...(pendingSubscription.product_name && { product_name: pendingSubscription.product_name }),
      ...(pendingSubscription.product_id && { product_id: pendingSubscription.product_id }),
      ...(pendingSubscription.base_price && { base_price: pendingSubscription.base_price }),
      ...(pendingSubscription.discounted_price && { discounted_price: pendingSubscription.discounted_price }),
      ...(pendingSubscription.transaction_amount && { transaction_amount: pendingSubscription.transaction_amount }),
      ...(pendingSubscription.customer_data && { customer_data: pendingSubscription.customer_data }),
      ...(pendingSubscription.cart_items && { cart_items: pendingSubscription.cart_items }),
      ...(pendingSubscription.subscription_type && { subscription_type: pendingSubscription.subscription_type })
    }

    console.log('💰 Activando suscripción con datos completos:', {
      id: pendingSubscription.id,
      external_reference: updateData.external_reference,
      product_name: updateData.product_name,
      transaction_amount: updateData.transaction_amount,
      has_customer_data: !!updateData.customer_data
    })

    const { data: newSubscription, error: createError } = await supabase
      .from("unified_subscriptions")
      .update(updateData)
      .eq("id", pendingSubscription.id)
      .select()
      .single()

    if (createError) {
      console.error("Error creando suscripción activa:", createError)
      return NextResponse.json(
        { error: "Error al activar suscripción" },
        { status: 500 }
      )
    }

    // La suscripción ya fue actualizada a 'active' arriba

    // Actualizar perfil del usuario
    await supabase
      .from("profiles")
      .update({ 
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", user_id)

    return NextResponse.json({
      success: true,
      subscription: newSubscription,
      message: "Suscripción activada exitosamente"
    })

  } catch (error) {
    console.error("Error validando preapproval:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

function calculateNextBillingDate(subscriptionType: string): string {
  const now = new Date()
  
  switch (subscriptionType) {
    case "weekly":
      now.setDate(now.getDate() + 7)
      break
    case "biweekly":
      now.setDate(now.getDate() + 14)
      break
    case "monthly":
      now.setMonth(now.getMonth() + 1)
      break
    case "quarterly":
      now.setMonth(now.getMonth() + 3)
      break
    case "annual":
      now.setFullYear(now.getFullYear() + 1)
      break
    default:
      now.setMonth(now.getMonth() + 1) // Default mensual
  }
  
  return now.toISOString()
}

function getFrequencyFromType(subscriptionType: string): string {
  switch (subscriptionType) {
    case "weekly": return "1"
    case "biweekly": return "2"
    case "monthly": return "1"
    case "quarterly": return "3"
    case "annual": return "12"
    default: return "1"
  }
}

/**
 * Calcula un puntaje de completitud para una suscripción
 * Usado para seleccionar la suscripción más completa cuando hay duplicados
 */
function getCompletenessScore(subscription: any): number {
  let score = 0
  
  // Campos críticos (peso 10)
  if (subscription.product_name) score += 10
  if (subscription.product_id) score += 10
  if (subscription.base_price && parseFloat(subscription.base_price) > 0) score += 10
  if (subscription.transaction_amount && parseFloat(subscription.transaction_amount) > 0) score += 10
  if (subscription.customer_data) score += 10
  
  // Campos importantes (peso 5)
  if (subscription.cart_items) score += 5
  if (subscription.discounted_price) score += 5
  if (subscription.subscription_type) score += 5
  if (subscription.product_image) score += 5
  
  // Campos adicionales (peso 1)
  if (subscription.size) score += 1
  if (subscription.discount_percentage) score += 1
  if (subscription.notes) score += 1
  
  return score
}