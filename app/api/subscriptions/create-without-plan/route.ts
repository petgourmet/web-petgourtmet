// app/api/subscriptions/create-without-plan/route.ts
// Crear suscripción sin plan según documentación de MercadoPago

import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/lib/mercadopago-service'
import MercadoPagoServiceMock from '@/lib/mercadopago-service-mock'
import { createClient } from '@/lib/supabase/server'
import DynamicDiscountService, { SubscriptionType } from '@/lib/dynamic-discount-service'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://petgourmet.mx'

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

// Configurar MercadoPago (usar mock en modo de prueba)
const USE_MOCK = process.env.USE_MERCADOPAGO_MOCK === 'true'
const mercadoPagoService = USE_MOCK
  ? new MercadoPagoServiceMock(MP_ACCESS_TOKEN, { sandbox: IS_TEST_MODE })
  : new MercadoPagoService(MP_ACCESS_TOKEN, { sandbox: IS_TEST_MODE })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    
    const {
      reason,
      external_reference,
      payer_email,
      card_token_id,
      auto_recurring,
      back_url,
      status,
      user_id,
      product_id,
      quantity = 1,
      subscription_type,
      plan_id
    } = body

    console.log('🔄 Creando suscripción sin plan:', {
      reason,
      external_reference,
      payer_email,
      has_card_token: !!card_token_id,
      status,
      test_mode: IS_TEST_MODE
    })

    // Validaciones requeridas para suscripciones sin plan según documentación
    if (!payer_email) {
      return NextResponse.json(
        { error: 'payer_email es requerido' },
        { status: 400 }
      )
    }

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

    if (!back_url) {
      return NextResponse.json(
        { error: 'back_url es requerido para suscripciones sin plan asociado' },
        { status: 400 }
      )
    }

    if (!auto_recurring) {
      return NextResponse.json(
        { error: 'auto_recurring es requerido para suscripciones sin plan' },
        { status: 400 }
      )
    }

    // Validar campos de auto_recurring
    if (!auto_recurring.frequency || !auto_recurring.frequency_type || !auto_recurring.transaction_amount) {
      return NextResponse.json(
        { error: 'auto_recurring debe incluir frequency, frequency_type y transaction_amount' },
        { status: 400 }
      )
    }

    // Preparar datos según documentación exacta de MercadoPago
    const subscriptionData = {
      reason,
      external_reference,
      payer_email,
      auto_recurring: {
        frequency: auto_recurring.frequency,
        frequency_type: auto_recurring.frequency_type,
        start_date: auto_recurring.start_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_date: auto_recurring.end_date,
        transaction_amount: auto_recurring.transaction_amount,
        currency_id: auto_recurring.currency_id || "MXN"
      },
      back_url: back_url || 'https://petgourmet.mx/perfil/suscripciones',
      status: status || (card_token_id ? "authorized" : "pending")
    }

    // Agregar card_token_id solo si se proporciona
    if (card_token_id) {
      subscriptionData.card_token_id = card_token_id
    }

    console.log('📤 Datos enviados a MercadoPago:', JSON.stringify(subscriptionData, null, 2))

    // Crear la suscripción en MercadoPago
    const result = await mercadoPagoService.createSubscription(subscriptionData)

    console.log('✅ Suscripción creada en MercadoPago:', {
      id: result.id,
      status: result.status,
      init_point: result.init_point
    })

    // Crear suscripción pendiente con descuentos dinámicos si hay user_id y product_id
    if (user_id && product_id && subscription_type) {
      try {
        // Convertir subscription_type a SubscriptionType si es necesario
        let subscriptionTypeEnum: SubscriptionType
        
        // Mapear tipos de suscripción comunes
        if (subscription_type.includes('week')) {
          subscriptionTypeEnum = subscription_type.includes('2') ? 'biweekly' : 'weekly'
        } else if (subscription_type.includes('month')) {
          if (subscription_type.includes('3')) {
            subscriptionTypeEnum = 'quarterly'
          } else if (subscription_type.includes('12')) {
            subscriptionTypeEnum = 'annual'
          } else {
            subscriptionTypeEnum = 'monthly'
          }
        } else {
          // Fallback basado en auto_recurring
          subscriptionTypeEnum = DynamicDiscountService.planFrequencyToSubscriptionType(
            auto_recurring.frequency,
            auto_recurring.frequency_type
          )
        }

        const { pendingSubscription, discountResult } = await DynamicDiscountService.createPendingSubscription({
          userId: user_id,
          productId: product_id,
          subscriptionType: subscriptionTypeEnum,
          externalReference: result.external_reference,
          mercadopagoSubscriptionId: result.id,
          quantity: quantity,
          planId: plan_id
        })

        console.log('💾 Suscripción pendiente creada con descuentos dinámicos:', {
          id: pendingSubscription.id,
          originalPrice: discountResult.originalPrice,
          discountPercentage: discountResult.discountPercentage,
          discountedPrice: discountResult.discountedPrice
        })

      } catch (dbError) {
        console.error('⚠️ Error creando suscripción pendiente:', dbError)
        // No fallar la respuesta si hay error en BD, pero loggearlo
      }
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      subscription: {
        id: result.id,
        version: result.version,
        application_id: result.application_id,
        collector_id: result.collector_id,
        external_reference: result.external_reference,
        reason: result.reason,
        back_url: result.back_url,
        init_point: result.init_point,
        auto_recurring: result.auto_recurring,
        payer_id: result.payer_id,
        card_id: result.card_id,
        payment_method_id: result.payment_method_id,
        next_billing_date: result.next_payment_date,
        date_created: result.date_created,
        last_modified: result.last_modified,
        status: result.status
      },
      redirect_url: result.init_point
    })

  } catch (error) {
    console.error('❌ Error creando suscripción sin plan:', error)
    
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