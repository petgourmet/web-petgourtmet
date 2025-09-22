// app/api/subscriptions/create-without-plan/route.ts
// Crear suscripción sin plan según documentación de MercadoPago

import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/lib/mercadopago-service'
import MercadoPagoServiceMock from '@/lib/mercadopago-service-mock'
import { createClient } from '@/lib/supabase/server'
import DynamicDiscountService, { SubscriptionType } from '@/lib/dynamic-discount-service'
import logger, { LogCategory } from '@/lib/logger'

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
    
    logger.info(LogCategory.SUBSCRIPTION, 'Iniciando creación de suscripción sin plan', {
      hasPayerEmail: !!body.payer_email,
      hasReason: !!body.reason,
      hasExternalReference: !!body.external_reference,
      hasBackUrl: !!body.back_url,
      hasAutoRecurring: !!body.auto_recurring,
      requestOrigin: request.headers.get('origin') || 'unknown'
    })
    
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
      logger.warn(LogCategory.SUBSCRIPTION, 'payer_email faltante en creación de suscripción', {
        externalReference: external_reference || 'no-reference'
      })
      return NextResponse.json(
        { error: 'payer_email es requerido' },
        { status: 400 }
      )
    }

    if (!reason) {
      logger.warn(LogCategory.SUBSCRIPTION, 'reason faltante en creación de suscripción', {
        externalReference: external_reference || 'no-reference'
      })
      return NextResponse.json(
        { error: 'reason es requerido para suscripciones sin plan asociado' },
        { status: 400 }
      )
    }

    if (!external_reference) {
      logger.warn(LogCategory.SUBSCRIPTION, 'external_reference faltante en creación de suscripción', {})
      return NextResponse.json(
        { error: 'external_reference es requerido para suscripciones sin plan asociado' },
        { status: 400 }
      )
    }

    if (!back_url) {
      logger.warn(LogCategory.SUBSCRIPTION, 'back_url faltante en creación de suscripción', {
        externalReference: external_reference
      })
      return NextResponse.json(
        { error: 'back_url es requerido para suscripciones sin plan asociado' },
        { status: 400 }
      )
    }

    if (!auto_recurring) {
      logger.warn(LogCategory.SUBSCRIPTION, 'auto_recurring faltante en creación de suscripción', {
        externalReference: external_reference
      })
      return NextResponse.json(
        { error: 'auto_recurring es requerido para suscripciones sin plan' },
        { status: 400 }
      )
    }

    // Validar campos de auto_recurring
    if (!auto_recurring.frequency || !auto_recurring.frequency_type || !auto_recurring.transaction_amount) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Datos de auto_recurring incompletos', {
        hasFrequency: !!auto_recurring.frequency,
        hasFrequencyType: !!auto_recurring.frequency_type,
        hasTransactionAmount: !!auto_recurring.transaction_amount,
        externalReference: external_reference
      })
      
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

    logger.info(LogCategory.SUBSCRIPTION, 'Datos de suscripción preparados para MercadoPago', {
      externalReference: external_reference,
      payerEmail: payer_email,
      reason: reason,
      frequency: auto_recurring.frequency,
      frequencyType: auto_recurring.frequency_type,
      transactionAmount: auto_recurring.transaction_amount,
      backUrl: back_url
    })
    
    console.log('📤 Datos enviados a MercadoPago:', JSON.stringify(subscriptionData, null, 2))

    // Crear la suscripción en MercadoPago
    const result = await mercadoPagoService.createSubscription(subscriptionData)

    logger.info(LogCategory.SUBSCRIPTION, 'Suscripción creada exitosamente en MercadoPago', {
      subscriptionId: result.id,
      status: result.status,
      externalReference: external_reference,
      payerEmail: payer_email,
      transactionAmount: auto_recurring.transaction_amount,
      hasInitPoint: !!result.init_point
    })
    
    console.log('✅ Suscripción creada en MercadoPago:', {
      id: result.id,
      status: result.status,
      init_point: result.init_point
    })

    // Guardar o actualizar suscripción en unified_subscriptions
    try {
      const supabase = await createClient()
      let existingSubscription = null
      
      // Buscar suscripción existente si hay user_id y external_reference
      if (user_id && external_reference) {
        const { data, error: findError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', external_reference)
          .eq('user_id', user_id)
          .single()
        
        if (data && !findError) {
          existingSubscription = data
          console.log('🔍 Suscripción existente encontrada:', {
            id: data.id,
            status: data.status,
            external_reference: data.external_reference,
            mercadopago_subscription_id: data.mercadopago_subscription_id
          })
        } else {
          console.log('❌ No se encontró suscripción existente para:', {
            external_reference,
            user_id,
            error: findError?.message
          })
        }
      }

      if (existingSubscription) {
        // ACTUALIZAR suscripción existente - PRESERVAR TODOS LOS DATOS EXISTENTES
        console.log('🔄 Actualizando suscripción existente ID:', existingSubscription.id)
        
        // Preparar datos de actualización - SOLO agregar campos faltantes
        const updateData: any = {
          mercadopago_subscription_id: result.id,
          updated_at: new Date().toISOString(),
          processed_at: new Date().toISOString()
        }

        // PRESERVAR customer_data existente, solo agregar si no existe
        if (payer_email && !existingSubscription.customer_data) {
          updateData.customer_data = {
            email: payer_email,
            processed_via: 'create-without-plan',
            mercadopago_subscription_id: result.id
          }
        }

          // PRESERVAR cart_items existentes, solo agregar si no existen
          if (product_id && !existingSubscription.cart_items) {
            // Obtener información del producto para cart_items
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('*')
              .eq('id', product_id)
              .single()

            if (productData && !productError) {
              updateData.cart_items = [{
                product_id: productData.id,
                product_name: productData.name,
                quantity: quantity || 1,
                price: productData.price,
                size: productData.size || 'Standard',
                isSubscription: true,
                subscriptionType: subscription_type || 'monthly'
              }]
              
              // Agregar campos del producto SOLO si no existen
              if (!existingSubscription.product_name) {
                updateData.product_name = productData.name
              }
              if (!existingSubscription.product_image) {
                updateData.product_image = productData.image
              }
              if (!existingSubscription.size) {
                updateData.size = productData.size || 'Standard'
              }
            }
          }

          // Actualizar la suscripción existente con todos los campos
          const { error: updateError } = await supabase
            .from('unified_subscriptions')
            .update(updateData)
            .eq('id', existingSubscription.id)

          if (updateError) {
            logger.error(LogCategory.SUBSCRIPTION, 'Error actualizando suscripción con ID de MercadoPago', updateError.message, {
              externalReference: external_reference,
              mercadopagoSubscriptionId: result.id,
              errorCode: updateError.code,
              errorDetails: updateError.details
            })
            console.error('⚠️ Error actualizando suscripción existente:', updateError)
          } else {
            logger.info(LogCategory.SUBSCRIPTION, 'Suscripción actualizada exitosamente con ID de MercadoPago', {
              externalReference: external_reference,
              mercadopagoSubscriptionId: result.id
            })
            console.log('✅ Suscripción existente actualizada con mercadopago_subscription_id:', result.id)
          }
      } else {
        // CREAR nueva suscripción si no existe una previa
        console.log('📝 Creando nueva suscripción en unified_subscriptions')
        
        // Preparar datos para nueva suscripción
        const newSubscriptionData: any = {
          external_reference: external_reference,
          mercadopago_subscription_id: result.id,
          status: result.status || 'pending',
          subscription_type: subscription_type || 'monthly',
          frequency: auto_recurring.frequency,
          frequency_type: auto_recurring.frequency_type,
          transaction_amount: auto_recurring.transaction_amount,
          currency_id: auto_recurring.currency_id || 'MXN',
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Agregar user_id si se proporciona
        if (user_id) {
          newSubscriptionData.user_id = user_id
        }
        
        // Agregar customer_data
        if (payer_email) {
          newSubscriptionData.customer_data = {
            email: payer_email,
            processed_via: 'create-without-plan',
            mercadopago_subscription_id: result.id
          }
        }
        
        // Agregar información del producto si está disponible
        if (product_id) {
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', product_id)
            .single()
          
          if (productData && !productError) {
            newSubscriptionData.product_id = productData.id
            newSubscriptionData.product_name = productData.name
            newSubscriptionData.product_image = productData.image
            newSubscriptionData.size = productData.size || 'Standard'
            newSubscriptionData.base_price = productData.price
            newSubscriptionData.discounted_price = productData.price // Por defecto igual al precio base
            newSubscriptionData.discount_percentage = 0
            
            newSubscriptionData.cart_items = [{
              product_id: productData.id,
              product_name: productData.name,
              quantity: quantity || 1,
              price: productData.price,
              size: productData.size || 'Standard',
              isSubscription: true,
              subscriptionType: subscription_type || 'monthly'
            }]
          }
        }
        
        // Crear la nueva suscripción
        const { error: insertError } = await supabase
          .from('unified_subscriptions')
          .insert([newSubscriptionData])
        
        if (insertError) {
          logger.error(LogCategory.SUBSCRIPTION, 'Error creando nueva suscripción en unified_subscriptions', insertError.message, {
            externalReference: external_reference,
            mercadopagoSubscriptionId: result.id,
            errorCode: insertError.code,
            errorDetails: insertError.details
          })
          console.error('⚠️ Error creando nueva suscripción:', insertError)
        } else {
          logger.info(LogCategory.SUBSCRIPTION, 'Nueva suscripción creada exitosamente en unified_subscriptions', {
            externalReference: external_reference,
            mercadopagoSubscriptionId: result.id
          })
          console.log('✅ Nueva suscripción creada en unified_subscriptions')
        }
      }
      
    } catch (dbError) {
      console.error('⚠️ Error en operaciones de base de datos:', dbError)
      // No fallar la respuesta si hay error en BD, pero loggearlo
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
    logger.error(LogCategory.SUBSCRIPTION, 'Error crítico creando suscripción sin plan', error.message, {
      errorStack: error.stack,
      errorName: error.name,
      requestOrigin: request.headers.get('origin') || 'unknown'
    })
    
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