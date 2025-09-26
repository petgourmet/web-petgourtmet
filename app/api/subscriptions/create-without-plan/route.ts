// app/api/subscriptions/create-without-plan/route.ts
// Crear suscripción sin plan según documentación de MercadoPago

import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/lib/mercadopago-service'
import MercadoPagoServiceMock from '@/lib/mercadopago-service-mock'
import { createClient } from '@/lib/supabase/server'
import DynamicDiscountService, { SubscriptionType } from '@/lib/dynamic-discount-service'
import { logger, LogCategory } from '@/lib/logger'
import { subscriptionDeduplicationService } from '@/lib/subscription-deduplication-service'
import { createEnhancedIdempotencyServiceServer } from '@/lib/enhanced-idempotency-service.server'

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

    // Generar external_reference determinística si no se proporciona
    let finalExternalReference = external_reference
    if (!finalExternalReference && user_id && product_id) {
      finalExternalReference = subscriptionDeduplicationService.generateDeterministicReference({
        userId: user_id,
        planId: product_id,
        amount: auto_recurring?.transaction_amount,
        currency: 'MXN',
        additionalData: { subscription_type: subscription_type || 'monthly' }
      })
      logger.info(LogCategory.SUBSCRIPTION, 'External reference generada determinísticamente', {
        userId: user_id,
        productId: product_id,
        subscriptionType: subscription_type,
        generatedReference: finalExternalReference
      })
    }

    // Validación previa para evitar duplicados
    if (user_id && product_id) {
      const validationResult = await subscriptionDeduplicationService.validateBeforeCreate({
        userId: user_id,
        planId: product_id,
        amount: auto_recurring.transaction_amount,
        currency: 'MXN',
        additionalData: { subscription_type: subscription_type || 'monthly' }
      })
      
      if (!validationResult.isValid) {
        logger.warn(LogCategory.SUBSCRIPTION, 'Intento de crear suscripción duplicada bloqueado', {
          userId: user_id,
          productId: product_id,
          subscriptionType: subscription_type,
          reason: validationResult.reason,
          existingSubscriptionId: validationResult.existingSubscription?.id
        })
        
        return NextResponse.json({
          error: 'Ya existe una suscripción activa para este producto',
          reason: validationResult.reason,
          existing_subscription: validationResult.existingSubscription
        }, { status: 409 })
      }
    }

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

    if (!finalExternalReference) {
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

    // Usar servicio de idempotencia mejorado para crear la suscripción
    const idempotencyKey = subscriptionDeduplicationService.generateIdempotencyKey(
      finalExternalReference,
      payer_email,
      auto_recurring.transaction_amount
    )

    const idempotencyService = createEnhancedIdempotencyServiceServer()
    const result = await idempotencyService.executeSubscriptionWithIdempotency(
      idempotencyKey,
      async () => {
        // Preparar datos según documentación exacta de MercadoPago
        const subscriptionData = {
          reason,
          external_reference: finalExternalReference,
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
          externalReference: finalExternalReference,
          payerEmail: payer_email,
          reason: reason,
          frequency: auto_recurring.frequency,
          frequencyType: auto_recurring.frequency_type,
          transactionAmount: auto_recurring.transaction_amount,
          backUrl: back_url,
          idempotencyKey
        })
        
        console.log('📤 Datos enviados a MercadoPago:', JSON.stringify(subscriptionData, null, 2))

        // Crear la suscripción en MercadoPago
        return await mercadoPagoService.createSubscription(subscriptionData)
      },
      {
        lockTimeout: 30000, // 30 segundos
        resultTtl: 300000,  // 5 minutos
        maxRetries: 3
      }
    )

    // Si es un resultado de caché, retornarlo directamente
    if (result.fromCache) {
      logger.info(LogCategory.SUBSCRIPTION, 'Suscripción obtenida desde caché de idempotencia', {
        externalReference: finalExternalReference,
        idempotencyKey,
        subscriptionId: result.data.id
      })
      
      return NextResponse.json({
        success: true,
        from_cache: true,
        subscription: result.data,
        redirect_url: result.data.init_point
      })
    }

    // Continuar con el resultado nuevo
    const mpResult = result.data

    logger.info(LogCategory.SUBSCRIPTION, 'Suscripción creada exitosamente en MercadoPago', {
      subscriptionId: mpResult.id,
      status: mpResult.status,
      externalReference: finalExternalReference,
      payerEmail: payer_email,
      transactionAmount: auto_recurring.transaction_amount,
      hasInitPoint: !!mpResult.init_point
    })
    
    console.log('✅ Suscripción creada en MercadoPago:', {
      id: mpResult.id,
      status: mpResult.status,
      init_point: mpResult.init_point
    })

    // Guardar o actualizar suscripción en unified_subscriptions
    try {
      const supabase = await createClient()
      let existingSubscription = null
      
      // Buscar suscripción existente con lógica mejorada
      if (user_id && finalExternalReference) {
        logger.info(LogCategory.SUBSCRIPTION, 'Buscando suscripción existente con múltiples criterios', {
          userId: user_id,
          externalReference: finalExternalReference,
          searchCriteria: 'external_reference_and_user_id'
        })
        
        // Buscar primero por external_reference y user_id
        let { data, error: findError } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', finalExternalReference)
          .eq('user_id', user_id)
          .maybeSingle()
        
        if (data && !findError) {
          existingSubscription = data
          logger.info(LogCategory.SUBSCRIPTION, 'Suscripción existente encontrada por external_reference', {
            id: data.id,
            status: data.status,
            external_reference: data.external_reference,
            mercadopago_subscription_id: data.mercadopago_subscription_id
          })
        } else {
          // Si no se encuentra, buscar por mercadopago_subscription_id si está disponible
          if (mpResult.id) {
            logger.info(LogCategory.SUBSCRIPTION, 'Búsqueda por external_reference falló, intentando por mercadopago_subscription_id', {
              mercadopagoId: mpResult.id,
              userId: user_id
            })
            
            const { data: mpData, error: mpFindError } = await supabase
              .from('unified_subscriptions')
              .select('*')
              .eq('mercadopago_subscription_id', mpResult.id)
              .eq('user_id', user_id)
              .maybeSingle()
            
            if (mpData && !mpFindError) {
              existingSubscription = mpData
              logger.info(LogCategory.SUBSCRIPTION, 'Suscripción existente encontrada por mercadopago_subscription_id', {
                id: mpData.id,
                status: mpData.status,
                external_reference: mpData.external_reference,
                mercadopago_subscription_id: mpData.mercadopago_subscription_id
              })
            }
          }
          
          if (!existingSubscription) {
            logger.info(LogCategory.SUBSCRIPTION, 'No se encontró suscripción existente', {
              external_reference: finalExternalReference,
              user_id,
              mercadopago_subscription_id: mpResult.id,
              searchResult: 'not_found'
            })
          }
        }
      }

      if (existingSubscription) {
        // ACTUALIZAR suscripción existente - PRESERVAR TODOS LOS DATOS EXISTENTES
        logger.info(LogCategory.SUBSCRIPTION, 'Actualizando suscripción existente en lugar de crear duplicado', {
          existingId: existingSubscription.id,
          existingStatus: existingSubscription.status,
          existingExternalRef: existingSubscription.external_reference,
          newMercadopagoId: mpResult.id,
          operation: 'update_existing'
        })
        console.log('🔄 Actualizando suscripción existente ID:', existingSubscription.id)
        
        // Preparar datos de actualización - SOLO agregar campos faltantes
        const updateData: any = {
          mercadopago_subscription_id: mpResult.id,
          updated_at: new Date().toISOString(),
          processed_at: new Date().toISOString()
        }

        // PRESERVAR customer_data existente, solo agregar si no existe
        if (payer_email && !existingSubscription.customer_data) {
          updateData.customer_data = {
            email: payer_email,
            processed_via: 'create-without-plan',
            mercadopago_subscription_id: mpResult.id
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
              externalReference: finalExternalReference,
              mercadopagoSubscriptionId: mpResult.id,
              errorCode: updateError.code,
              errorDetails: updateError.details
            })
            console.error('⚠️ Error actualizando suscripción existente:', updateError)
          } else {
            logger.info(LogCategory.SUBSCRIPTION, 'Suscripción actualizada exitosamente con ID de MercadoPago', {
              externalReference: finalExternalReference,
              mercadopagoSubscriptionId: mpResult.id
            })
            console.log('✅ Suscripción existente actualizada con mercadopago_subscription_id:', mpResult.id)
          }
      } else {
        // CREAR nueva suscripción si no existe una previa
        console.log('📝 Creando nueva suscripción en unified_subscriptions')
        
        // Preparar datos para nueva suscripción
        const newSubscriptionData: any = {
          external_reference: finalExternalReference,
          mercadopago_subscription_id: mpResult.id,
          status: mpResult.status || 'pending',
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
            mercadopago_subscription_id: mpResult.id
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
            externalReference: finalExternalReference,
            mercadopagoSubscriptionId: mpResult.id,
            errorCode: insertError.code,
            errorDetails: insertError.details
          })
          console.error('⚠️ Error creando nueva suscripción:', insertError)
        } else {
          logger.info(LogCategory.SUBSCRIPTION, 'Nueva suscripción creada exitosamente en unified_subscriptions', {
            externalReference: finalExternalReference,
            mercadopagoSubscriptionId: mpResult.id
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
        id: mpResult.id,
        version: mpResult.version,
        application_id: mpResult.application_id,
        collector_id: mpResult.collector_id,
        external_reference: mpResult.external_reference,
        reason: mpResult.reason,
        back_url: mpResult.back_url,
        init_point: mpResult.init_point,
        auto_recurring: mpResult.auto_recurring,
        payer_id: mpResult.payer_id,
        card_id: mpResult.card_id,
        payment_method_id: mpResult.payment_method_id,
        next_billing_date: mpResult.next_payment_date,
        date_created: mpResult.date_created,
        last_modified: mpResult.last_modified,
        status: mpResult.status
      },
      redirect_url: mpResult.init_point
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