// app/api/subscriptions/create-without-plan/route.ts
// Crear suscripción sin plan según documentación de MercadoPago

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import MercadoPagoService from '@/lib/mercadopago-service'
import MercadoPagoServiceMock from '@/lib/mercadopago-service-mock'
import { createClient } from '@/lib/supabase/server'
import { logger, LogCategory } from '@/lib/logger'
import { subscriptionDeduplicationService } from '@/lib/subscription-deduplication-service'
import { createEnhancedIdempotencyServiceServer } from '@/lib/enhanced-idempotency-service.server'

type UnifiedSubscriptionRow = {
  id: number
  user_id: string | null
  product_id: number | null
  subscription_type: string
  status: string
  external_reference: string | null
  mercadopago_subscription_id: string | null
  cart_items: any
  customer_data: any
  metadata: any
  quantity: number
  size: string | null
  transaction_amount: number | null
  frequency: number | null
  frequency_type: string | null
  discounted_price: number | null
  base_price: number | null
  product_name: string | null
  product_image: string | null
  updated_at: string | null
  created_at: string | null
}

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
  const supabaseClient = supabase as any
    
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
      plan_id,
      cart_items = [],
      cart_summary,
      shipping_cost = 0,
      bundle_label,
      customer_data,
      shipping_address
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

    const normalizeCartItems = Array.isArray(cart_items)
      ? cart_items.map((item: any) => ({
          product_id: item.product_id ?? item.id ?? null,
          product_name: item.product_name ?? item.name ?? null,
          quantity: Number(item.quantity ?? 1),
          price: Number(item.price ?? 0),
          size: item.size ?? null,
          isSubscription: Boolean(item.isSubscription ?? true),
          subscriptionType: item.subscriptionType || subscription_type || 'monthly',
          metadata: item.metadata ?? null
        }))
      : []

    const cartFingerprintPayload = normalizeCartItems
      .map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        size: item.size
      }))
      .sort((a, b) => {
        const keyA = `${a.product_id ?? 'none'}-${a.size ?? 'std'}`
        const keyB = `${b.product_id ?? 'none'}-${b.size ?? 'std'}`
        return keyA.localeCompare(keyB)
      })

    const bundleHash = cartFingerprintPayload.length > 0
      ? createHash('sha256').update(JSON.stringify(cartFingerprintPayload)).digest('hex').slice(0, 16)
      : null

    const subscriptionContext = user_id && product_id ? {
      userId: user_id,
      planId: String(product_id),
      amount: auto_recurring.transaction_amount,
      currency: auto_recurring.currency_id || 'MXN',
      additionalData: {
        subscription_type: subscription_type || 'monthly',
        bundle_hash: bundleHash,
        quantity
      }
    } : undefined

    const mergeMetadata = (previous: any): Record<string, any> => {
      let base: Record<string, any> = {}

      if (previous) {
        if (typeof previous === 'object') {
          base = { ...(previous as Record<string, any>) }
        } else if (typeof previous === 'string') {
          try {
            base = JSON.parse(previous)
          } catch {
            base = {}
          }
        }
      }

      const additions: Record<string, any> = {
        bundle_hash: bundleHash,
        bundle_label,
        cart_summary,
        shipping_cost,
        cart_items_count: normalizeCartItems.length,
        updated_via: 'create-without-plan',
        updated_at: new Date().toISOString()
      }

      if (cartFingerprintPayload.length > 0) {
        additions.bundle_fingerprint = cartFingerprintPayload
      }

      return Object.fromEntries(
        Object.entries({ ...base, ...additions }).filter(([, value]) => value !== undefined)
      )
    }

    const idempotencyKeySeed = [
      user_id || 'guest',
      product_id ?? 'bundle',
      finalExternalReference || 'pending-ref',
      subscription_type || 'monthly',
      auto_recurring.transaction_amount,
      bundleHash || 'no-bundle'
    ].join('|')

    const idempotencyKey = createHash('sha256')
      .update(idempotencyKeySeed)
      .digest('hex')

    const idempotencyService = createEnhancedIdempotencyServiceServer()

    const idempotencyResult = await idempotencyService.executeSubscriptionWithIdempotency<any>(
      async (prevalidatedExternalReference: string) => {
        const externalReferenceForOperation = finalExternalReference || prevalidatedExternalReference
        finalExternalReference = externalReferenceForOperation

        const subscriptionPayload: any = {
          reason,
          external_reference: externalReferenceForOperation,
          payer_email,
          auto_recurring: {
            frequency: auto_recurring.frequency,
            frequency_type: auto_recurring.frequency_type,
            start_date: auto_recurring.start_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            end_date: auto_recurring.end_date,
            transaction_amount: auto_recurring.transaction_amount,
            currency_id: auto_recurring.currency_id || 'MXN'
          },
          back_url: back_url || `${APP_URL}/suscripcion`,
          status: status || (card_token_id ? 'authorized' : 'pending')
        }

        if (card_token_id) {
          subscriptionPayload.card_token_id = card_token_id
        }

        logger.info(LogCategory.SUBSCRIPTION, 'Datos de suscripción preparados para MercadoPago', {
          externalReference: externalReferenceForOperation,
          payerEmail: payer_email,
          reason,
          frequency: auto_recurring.frequency,
          frequencyType: auto_recurring.frequency_type,
          transactionAmount: auto_recurring.transaction_amount,
          backUrl: back_url,
          idempotencyKey
        })

        console.log('📤 Datos enviados a MercadoPago:', JSON.stringify(subscriptionPayload, null, 2))

        return await mercadoPagoService.createSubscription(subscriptionPayload)
      },
      {
        key: idempotencyKey,
        ttlSeconds: 300,
        maxRetries: 3,
        retryDelayMs: 1000,
        enablePreValidation: Boolean(subscriptionContext),
        subscriptionData: subscriptionContext
      }
    )

    if (!idempotencyResult.success) {
      if (idempotencyResult.validationResult && !idempotencyResult.validationResult.isValid) {
        return NextResponse.json({
          error: idempotencyResult.validationResult.reason,
          existing_subscription: idempotencyResult.validationResult.existingSubscription
        }, { status: 409 })
      }

      if (idempotencyResult.errorCode === 'LOCK_NOT_ACQUIRED') {
        return NextResponse.json({
          error: 'Estamos finalizando una solicitud anterior con la misma información. Intenta de nuevo en unos segundos.',
          reason: 'LOCK_NOT_ACQUIRED'
        }, { status: 409 })
      }

      return NextResponse.json({
        error: idempotencyResult.error || 'No se pudo crear la suscripción'
      }, { status: 500 })
    }

    if (!finalExternalReference) {
      finalExternalReference = idempotencyResult.externalReference || finalExternalReference
    }

    const mpResult = idempotencyResult.data as any
    const wasAlreadyProcessed = idempotencyResult.wasAlreadyProcessed

    logger.info(LogCategory.SUBSCRIPTION, 'Suscripción creada exitosamente en MercadoPago', {
      subscriptionId: mpResult.id,
      status: mpResult.status,
      externalReference: finalExternalReference,
      payerEmail: payer_email,
      transactionAmount: auto_recurring.transaction_amount,
      hasInitPoint: !!mpResult.init_point,
      fromCache: wasAlreadyProcessed
    })
    
    console.log('✅ Suscripción creada en MercadoPago:', {
      id: mpResult.id,
      status: mpResult.status,
      init_point: mpResult.init_point
    })

    // Guardar o actualizar suscripción en unified_subscriptions
    try {
      const supabase = await createClient()
  let existingSubscription: UnifiedSubscriptionRow | null = null
      
      // Buscar suscripción existente con lógica mejorada
      if (user_id && finalExternalReference) {
        logger.info(LogCategory.SUBSCRIPTION, 'Buscando suscripción existente con múltiples criterios', {
          userId: user_id,
          externalReference: finalExternalReference,
          searchCriteria: 'external_reference_and_user_id'
        })
        
        // Buscar primero por external_reference y user_id
        let { data, error: findError } = await supabaseClient
          .from('unified_subscriptions')
          .select('*')
          .eq('external_reference', finalExternalReference)
          .eq('user_id', user_id)
          .maybeSingle()
        
        if (data && !findError) {
          existingSubscription = data as UnifiedSubscriptionRow
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
            
            const { data: mpData, error: mpFindError } = await supabaseClient
              .from('unified_subscriptions')
              .select('*')
              .eq('mercadopago_subscription_id', mpResult.id)
              .eq('user_id', user_id)
              .maybeSingle()
            
            if (mpData && !mpFindError) {
              existingSubscription = mpData as UnifiedSubscriptionRow
              logger.info(LogCategory.SUBSCRIPTION, 'Suscripción existente encontrada por mercadopago_subscription_id', {
                id: mpData.id,
                status: mpData.status,
                external_reference: mpData.external_reference,
                mercadopago_subscription_id: mpData.mercadopago_subscription_id
              })
            }
          }
          
          if (!existingSubscription && user_id && product_id) {
            const statusFilter = ['pending', 'active', 'authorized', 'processing']
            const { data: candidateList, error: comboError } = await supabaseClient
              .from('unified_subscriptions')
              .select('*')
              .eq('user_id', user_id)
              .eq('product_id', product_id)
              .in('status', statusFilter)
              .order('created_at', { ascending: false })
              .limit(1)

            if (!comboError && candidateList && candidateList.length > 0) {
              existingSubscription = candidateList[0] as UnifiedSubscriptionRow
              logger.info(LogCategory.SUBSCRIPTION, 'Suscripción existente encontrada por user_id/product_id', {
                id: existingSubscription.id,
                status: existingSubscription.status,
                productId: existingSubscription.product_id,
                subscriptionType: existingSubscription.subscription_type
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
          processed_at: new Date().toISOString(),
          transaction_amount: auto_recurring.transaction_amount,
          frequency: auto_recurring.frequency,
          frequency_type: auto_recurring.frequency_type,
          subscription_type: subscription_type || existingSubscription.subscription_type,
          quantity
        }

        if (customer_data) {
          updateData.customer_data = customer_data
        } else if (payer_email && !existingSubscription.customer_data) {
          updateData.customer_data = {
            email: payer_email,
            processed_via: 'create-without-plan',
            mercadopago_subscription_id: mpResult.id
          }
        }

        const primaryCartItem = normalizeCartItems.find(item => item.product_id === product_id) || normalizeCartItems[0]

        if (primaryCartItem) {
          updateData.cart_items = normalizeCartItems
          updateData.product_name = primaryCartItem.product_name || existingSubscription.product_name
          updateData.size = primaryCartItem.size || existingSubscription.size
          updateData.base_price = primaryCartItem.price || existingSubscription.base_price
          updateData.discounted_price = auto_recurring.transaction_amount

          const numericProductId = Number(primaryCartItem.product_id ?? product_id)
          if (!Number.isNaN(numericProductId)) {
            updateData.product_id = numericProductId
          }
        } else {
          updateData.cart_items = normalizeCartItems.length > 0 ? normalizeCartItems : existingSubscription.cart_items

          if (product_id) {
            const { data: productRow, error: productError } = await supabaseClient
              .from('products')
              .select('*')
              .eq('id', product_id)
              .single()

            const productData = productRow as any

            if (productData && !productError) {
              updateData.product_id = productData.id
              updateData.product_name = productData.name
              updateData.product_image = productData.image
              updateData.size = productData.size || 'Standard'
              updateData.base_price = productData.price
              updateData.discounted_price = auto_recurring.transaction_amount
            }
          }
        }

        const metadataSource = mergeMetadata(existingSubscription.metadata)
        if (shipping_address) {
          metadataSource.shipping_address = shipping_address
        }
        updateData.metadata = metadataSource

          // Actualizar la suscripción existente con todos los campos
          const { error: updateError } = await supabaseClient
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
          updated_at: new Date().toISOString(),
          quantity,
          discounted_price: auto_recurring.transaction_amount,
          metadata: mergeMetadata(null)
        }

        if (shipping_address) {
          newSubscriptionData.metadata = {
            ...newSubscriptionData.metadata,
            shipping_address
          }
        }
        
        // Agregar user_id si se proporciona
        if (user_id) {
          newSubscriptionData.user_id = user_id
        }
        
        // Agregar customer_data
        if (customer_data) {
          newSubscriptionData.customer_data = customer_data
        } else if (payer_email) {
          newSubscriptionData.customer_data = {
            email: payer_email,
            processed_via: 'create-without-plan',
            mercadopago_subscription_id: mpResult.id
          }
        }
        
        if (normalizeCartItems.length > 0) {
          newSubscriptionData.cart_items = normalizeCartItems
          const primaryCartItem = normalizeCartItems.find(item => item.product_id === product_id) || normalizeCartItems[0]

          if (primaryCartItem) {
            const numericProductId = Number(primaryCartItem.product_id ?? product_id)
            if (!Number.isNaN(numericProductId)) {
              newSubscriptionData.product_id = numericProductId
            } else if (product_id) {
              newSubscriptionData.product_id = product_id
            }

            newSubscriptionData.product_name = primaryCartItem.product_name || null
            newSubscriptionData.size = primaryCartItem.size || null
            newSubscriptionData.base_price = primaryCartItem.price || null
            newSubscriptionData.discount_percentage = 0
          }
        } else if (product_id) {
          const { data: productRow, error: productError } = await supabaseClient
            .from('products')
            .select('*')
            .eq('id', product_id)
            .single()

          const productData = productRow as any

          if (productData && !productError) {
            newSubscriptionData.product_id = productData.id
            newSubscriptionData.product_name = productData.name
            newSubscriptionData.product_image = productData.image
            newSubscriptionData.size = productData.size || 'Standard'
            newSubscriptionData.base_price = productData.price
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

        if (!newSubscriptionData.cart_items) {
          newSubscriptionData.cart_items = []
        }
        
        // Crear la nueva suscripción
        const { error: insertError } = await supabaseClient
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
      from_cache: wasAlreadyProcessed,
      bundle_hash: bundleHash,
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

  } catch (error: any) {
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