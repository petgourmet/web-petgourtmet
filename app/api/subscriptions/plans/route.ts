// app/api/subscriptions/plans/route.ts

import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/lib/mercadopago-service'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      reason,
      frequency,
      frequency_type,
      transaction_amount,
      repetitions,
      billing_day,
      billing_day_proportional,
      free_trial,
      setup_fee
    } = body

    // Validaciones
    if (!reason || !frequency || !frequency_type || !transaction_amount) {
      return NextResponse.json(
        { 
          error: 'Campos requeridos: reason, frequency, frequency_type, transaction_amount' 
        },
        { status: 400 }
      )
    }

    if (!['months', 'days'].includes(frequency_type)) {
      return NextResponse.json(
        { 
          error: 'frequency_type debe ser "months" o "days"' 
        },
        { status: 400 }
      )
    }

    if (transaction_amount <= 0) {
      return NextResponse.json(
        { 
          error: 'transaction_amount debe ser mayor a 0' 
        },
        { status: 400 }
      )
    }

    // Datos del plan
    const planData = {
      reason,
      frequency: Number(frequency),
      frequency_type: frequency_type as "months" | "days",
      transaction_amount: Number(transaction_amount),
      currency_id: "MXN" as const,
      repetitions: repetitions ? Number(repetitions) : undefined,
      billing_day: billing_day ? Number(billing_day) : undefined,
      billing_day_proportional: billing_day_proportional || false,
      free_trial: free_trial ? {
        frequency: Number(free_trial.frequency),
        frequency_type: free_trial.frequency_type as "months" | "days"
      } : undefined,
      setup_fee: setup_fee ? Number(setup_fee) : undefined
    }

    console.log('📋 Creando plan de suscripción:', {
      reason: planData.reason,
      frequency: planData.frequency,
      frequency_type: planData.frequency_type,
      amount: planData.transaction_amount,
      test_mode: IS_TEST_MODE
    })

    // Crear el plan en MercadoPago
    const result = await mercadoPagoService.createSubscriptionPlan(planData)

    console.log('✅ Plan creado exitosamente:', {
      id: result.id,
      reason: result.reason,
      status: result.status
    })

    return NextResponse.json({
      success: true,
      plan: {
        id: result.id,
        reason: result.reason,
        frequency: result.frequency,
        frequency_type: result.frequency_type,
        transaction_amount: result.transaction_amount,
        currency_id: result.currency_id,
        status: result.status,
        date_created: result.date_created,
        repetitions: result.repetitions,
        billing_day: result.billing_day,
        billing_day_proportional: result.billing_day_proportional,
        free_trial: result.free_trial,
        setup_fee: result.setup_fee
      }
    })

  } catch (error) {
    console.error('❌ Error creando plan de suscripción:', error)
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Implementar listado de planes desde la base de datos
    // Por ahora devolvemos los planes predefinidos de Pet Gourmet
    
    const predefinedPlans = [
      {
        id: "plan_semanal_petgourmet",
        name: "Plan Semanal",
        description: "Entrega semanal de alimento premium para tu mascota",
        frequency: 1,
        frequency_type: "weeks",
        discount_percentage: 5,
        recommended: false
      },
      {
        id: "plan_quincenal_petgourmet",
        name: "Plan Quincenal",
        description: "Entrega cada 2 semanas con descuento atractivo",
        frequency: 2,
        frequency_type: "weeks",
        discount_percentage: 7,
        recommended: false
      },
      {
        id: "plan_mensual_petgourmet", 
        name: "Plan Mensual",
        description: "Entrega mensual con descuento especial",
        frequency: 1,
        frequency_type: "months",
        discount_percentage: 10,
        recommended: true
      },
      {
        id: "plan_trimestral_petgourmet",
        name: "Plan Trimestral", 
        description: "Entrega cada 3 meses con mayor descuento",
        frequency: 3,
        frequency_type: "months",
        discount_percentage: 15,
        recommended: false
      },
      {
        id: "plan_anual_petgourmet",
        name: "Plan Anual",
        description: "Entrega anual con el máximo descuento",
        frequency: 12,
        frequency_type: "months", 
        discount_percentage: 20,
        recommended: false
      }
    ]

    return NextResponse.json({
      success: true,
      plans: predefinedPlans
    })

  } catch (error) {
    console.error('❌ Error obteniendo planes:', error)
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
