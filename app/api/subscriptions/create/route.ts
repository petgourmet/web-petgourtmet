// app/api/subscriptions/create/route.ts

import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/lib/mercadopago-service'
import { createClient } from '@/lib/supabase/server'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    
    const {
      preapproval_plan_id,
      reason,
      external_reference,
      payer_email,
      card_token_id,
      auto_recurring,
      user_id,
      product_id,
      product_name,
      subscription_type,
      discounted_price,
      original_price,
      discount_percentage,
      quantity = 1
    } = body

    // Validaciones básicas según documentación de MercadoPago
    if (!payer_email) {
      return NextResponse.json(
        { error: 'payer_email es requerido según documentación de MercadoPago' },
        { status: 400 }
      )
    }

    // Validaciones para suscripciones sin plan
    if (!preapproval_plan_id) {
      if (!reason) {
        return NextResponse.json(
          { error: 'reason es requerido para suscripciones sin plan asociado' },
          { status: 400 }
        )
      }
      if (!external_reference) {
        return NextResponse.json(
          { error: 'external_reference es requerido para suscripciones sin plan asociado' },
          { status: 400 }
        )
      }
      if (!auto_recurring?.transaction_amount || !auto_recurring?.frequency) {
        return NextResponse.json(
          { 
            error: 'auto_recurring con transaction_amount y frequency son requeridos para suscripciones sin plan' 
          },
          { status: 400 }
        )
      }
    }

    // Generar fechas por defecto si no se proporcionan
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1) // Comenzar mañana
    
    const endDate = new Date()
    endDate.setFullYear(endDate.getFullYear() + 1) // Terminar en 1 año

    // Datos de la suscripción según documentación de MercadoPago
    const subscriptionData: any = {
      payer_email // Campo requerido
    }

    // Campos opcionales según documentación
    if (preapproval_plan_id) {
      subscriptionData.preapproval_plan_id = preapproval_plan_id
    }

    if (reason || !preapproval_plan_id) {
      subscriptionData.reason = reason || `Suscripción Pet Gourmet - ${payer_email}`
    }

    if (external_reference || !preapproval_plan_id) {
      subscriptionData.external_reference = external_reference || `PG-${Date.now()}-${user_id || 'guest'}`
    }

    if (card_token_id) {
      subscriptionData.card_token_id = card_token_id
    }

    // back_url es requerido para suscripciones sin plan
    if (!preapproval_plan_id) {
      subscriptionData.back_url = `${APP_URL}/perfil/suscripciones`
    } else if (back_url) {
      subscriptionData.back_url = back_url
    }

    // Status: pending (sin método de pago) o authorized (con método de pago)
    if (card_token_id) {
      subscriptionData.status = "authorized"
    } else {
      subscriptionData.status = "pending"
    }

    // auto_recurring para configuración de recurrencia
    if (auto_recurring || !preapproval_plan_id) {
      subscriptionData.auto_recurring = auto_recurring || {
        frequency: 1,
        frequency_type: "months" as const,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        transaction_amount: 0,
        currency_id: "MXN" as const
      }
    }

    console.log('🔄 Creando suscripción:', {
      plan_id: subscriptionData.preapproval_plan_id,
      email: subscriptionData.payer_email,
      external_ref: subscriptionData.external_reference,
      test_mode: IS_TEST_MODE
    })

    // Crear la suscripción en MercadoPago
    const result = await mercadoPagoService.createSubscription(subscriptionData)

    console.log('✅ Suscripción creada en MercadoPago:', {
      id: result.id,
      status: result.status,
      init_point: result.init_point
    })

    // Guardar en base de datos local si hay user_id
    if (user_id) {
      try {
        const { data: subscription, error: dbError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id,
            mercadopago_subscription_id: result.id,
            preapproval_plan_id: result.preapproval_plan_id,
            external_reference: result.external_reference,
            reason: result.reason,
            status: result.status,
            frequency: result.auto_recurring?.frequency || 1,
            frequency_type: result.auto_recurring?.frequency_type || 'months',
            transaction_amount: result.auto_recurring?.transaction_amount || 0,
            currency_id: result.auto_recurring?.currency_id || 'MXN',
            start_date: result.auto_recurring?.start_date,
            end_date: result.auto_recurring?.end_date,
            next_payment_date: result.next_payment_date,
            init_point: result.init_point,
            product_id: product_id || null,
            product_name: product_name || null,
            subscription_type: subscription_type || null,
            discounted_price: discounted_price || (result.auto_recurring?.transaction_amount || 0),
            original_price: original_price || null,
            discount_percentage: discount_percentage || null,
            quantity: quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (dbError) {
          console.error('⚠️ Error guardando suscripción en BD:', dbError)
          // No fallar completamente, la suscripción ya existe en MercadoPago
        } else {
          console.log('💾 Suscripción guardada en BD:', subscription?.id)
        }
      } catch (dbError) {
        console.error('⚠️ Error en base de datos:', dbError)
      }
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      subscription: {
        id: result.id,
        status: result.status,
        init_point: result.init_point,
        preapproval_plan_id: result.preapproval_plan_id,
        external_reference: result.external_reference,
        reason: result.reason,
        payer_id: result.payer_id,
        next_payment_date: result.next_payment_date,
        auto_recurring: result.auto_recurring,
        date_created: result.date_created
      },
      redirect_url: result.init_point
    })

  } catch (error) {
    console.error('❌ Error creando suscripción:', error)
    
    // Manejar errores específicos de MercadoPago
    if (error && typeof error === 'object' && 'cause' in error) {
      const mpError = error as any
      if (mpError.cause?.length > 0) {
        const firstError = mpError.cause[0]
        return NextResponse.json(
          { 
            error: `Error de MercadoPago: ${firstError.description}`,
            code: firstError.code,
            details: IS_TEST_MODE ? mpError.cause : undefined
          },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
