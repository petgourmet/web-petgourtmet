import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, LogCategory } from '@/lib/logger'
import { DynamicSubscriptionService } from '@/lib/services/dynamic-subscription-service'
import { NotificationService } from '@/lib/services/notification-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CreateDynamicSubscriptionRequest {
  user_id: string
  product_id: number
  frequency: number // 1-90 días
  frequency_type: 'days' | 'months'
  payment_method: 'pending' | 'authorized'
  customer_data: {
    email: string
    name: string
    phone?: string
    address: {
      street: string
      number: string
      city: string
      state: string
      zip_code: string
      country: string
    }
  }
  card_token?: string // Solo para método autorizado
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let requestData: CreateDynamicSubscriptionRequest

  try {
    // Parsear y validar request
    requestData = await request.json()
    
    logger.info(LogCategory.SUBSCRIPTION, 'Iniciando creación de suscripción dinámica', {
      user_id: requestData.user_id,
      product_id: requestData.product_id,
      frequency: requestData.frequency,
      frequency_type: requestData.frequency_type,
      payment_method: requestData.payment_method
    })

    // Validaciones básicas
    if (!requestData.user_id || !requestData.product_id || !requestData.frequency) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: user_id, product_id, frequency'
      }, { status: 400 })
    }

    // Validar frecuencia
    if (requestData.frequency < 1 || requestData.frequency > 90) {
      return NextResponse.json({
        success: false,
        error: 'La frecuencia debe estar entre 1 y 90 días'
      }, { status: 400 })
    }

    // Validar método de pago autorizado requiere token
    if (requestData.payment_method === 'authorized' && !requestData.card_token) {
      return NextResponse.json({
        success: false,
        error: 'El método de pago autorizado requiere card_token'
      }, { status: 400 })
    }

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', requestData.user_id)
      .single()

    if (userError || !user) {
      logger.error(LogCategory.SUBSCRIPTION, 'Usuario no encontrado', {
        user_id: requestData.user_id,
        error: userError?.message
      })
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado'
      }, { status: 404 })
    }

    // Verificar que el producto existe y obtener precio
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('id', requestData.product_id)
      .single()

    if (productError || !product) {
      logger.error(LogCategory.SUBSCRIPTION, 'Producto no encontrado', {
        product_id: requestData.product_id,
        error: productError?.message
      })
      return NextResponse.json({
        success: false,
        error: 'Producto no encontrado'
      }, { status: 404 })
    }

    // Calcular precio con descuento basado en la frecuencia
    const basePrice = product.price
    let discountPercentage = 0
    
    // Determinar el descuento según la frecuencia
    if (requestData.frequency_type === 'days') {
      if (requestData.frequency <= 7) {
        discountPercentage = product.weekly_discount || 0
      } else if (requestData.frequency <= 14) {
        discountPercentage = product.biweekly_discount || 0
      } else {
        discountPercentage = product.monthly_discount || 0
      }
    } else if (requestData.frequency_type === 'months') {
      if (requestData.frequency === 1) {
        discountPercentage = product.monthly_discount || 0
      } else if (requestData.frequency === 3) {
        discountPercentage = product.quarterly_discount || 0
      } else if (requestData.frequency >= 12) {
        discountPercentage = product.annual_discount || 0
      } else {
        discountPercentage = product.monthly_discount || 0
      }
    }
    
    const finalPrice = basePrice * (1 - discountPercentage / 100)

    // Verificar suscripciones activas existentes para el mismo producto
    const { data: existingSubscriptions, error: existingError } = await supabase
      .from('unified_subscriptions')
      .select('id, status, external_reference, created_at')
      .eq('user_id', requestData.user_id)
      .eq('product_id', requestData.product_id)
      .in('status', ['pending', 'authorized', 'active'])

    if (existingError) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error verificando suscripciones existentes', {
        error: existingError.message
      })
    }

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      // Separar suscripciones por estado
      const activeOrAuthorized = existingSubscriptions.filter(s => s.status === 'active' || s.status === 'authorized')
      const pendingSubscriptions = existingSubscriptions.filter(s => s.status === 'pending')
      
      // Solo bloquear si hay suscripciones activas o autorizadas
      if (activeOrAuthorized.length > 0) {
        logger.warn(LogCategory.SUBSCRIPTION, 'Suscripción activa/autorizada existente encontrada', {
          user_id: requestData.user_id,
          product_id: requestData.product_id,
          existing_subscriptions: activeOrAuthorized.map(s => ({ id: s.id, status: s.status }))
        })
        
        return NextResponse.json({
          success: false,
          error: 'Ya tienes una suscripción activa para este producto',
          existing_subscription: activeOrAuthorized[0]
        }, { status: 409 })
      }
      
      // Si solo hay suscripciones pendientes, cancelar las expiradas (más de 30 minutos)
      if (pendingSubscriptions.length > 0) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const expiredPending = pendingSubscriptions.filter(s => s.created_at < thirtyMinutesAgo)
        
        if (expiredPending.length > 0) {
          logger.info(LogCategory.SUBSCRIPTION, 'Cancelando suscripciones pendientes expiradas', {
            user_id: requestData.user_id,
            product_id: requestData.product_id,
            expired_subscriptions: expiredPending.map(s => s.id)
          })
          
          // Cancelar suscripciones pendientes expiradas
          const { error: cancelError } = await supabase
            .from('unified_subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .in('id', expiredPending.map(s => s.id))
            
          if (cancelError) {
            logger.error(LogCategory.SUBSCRIPTION, 'Error cancelando suscripciones expiradas', {
              error: cancelError.message
            })
          }
        }
        
        // Si hay suscripciones pendientes recientes (menos de 30 minutos), permitir reintento
        const recentPending = pendingSubscriptions.filter(s => s.created_at >= thirtyMinutesAgo)
        if (recentPending.length > 0) {
          logger.info(LogCategory.SUBSCRIPTION, 'Permitiendo reintento de pago para suscripción pendiente reciente', {
            user_id: requestData.user_id,
            product_id: requestData.product_id,
            recent_pending: recentPending.map(s => ({ id: s.id, created_at: s.created_at }))
          })
        }
      }
    }

    // Crear suscripción usando el servicio dinámico
    const subscriptionService = new DynamicSubscriptionService()
    const subscriptionResult = await subscriptionService.createDynamicSubscription({
      user_id: requestData.user_id,
      product_id: requestData.product_id,
      frequency: requestData.frequency,
      frequency_type: requestData.frequency_type,
      payment_method: requestData.payment_method,
      customer_data: requestData.customer_data,
      card_token: requestData.card_token,
      product_data: {
        name: product.name,
        price: finalPrice,
        base_price: basePrice,
        discount_percentage: discountPercentage
      }
    })

    if (!subscriptionResult.success) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error creando suscripción dinámica', {
        error: subscriptionResult.error,
        user_id: requestData.user_id,
        product_id: requestData.product_id
      })
      
      return NextResponse.json({
        success: false,
        error: subscriptionResult.error || 'Error interno creando suscripción'
      }, { status: 500 })
    }

    // Enviar notificación de bienvenida
    try {
      const notificationService = new NotificationService()
      await notificationService.sendSubscriptionWelcome({
        user_email: requestData.customer_data.email,
        user_name: requestData.customer_data.name,
        subscription: subscriptionResult.subscription!,
        product: product
      })
    } catch (notificationError) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Error enviando notificación de bienvenida', {
        error: notificationError.message,
        subscription_id: subscriptionResult.subscription?.id
      })
      // No fallar la creación por error de notificación
    }

    const processingTime = Date.now() - startTime
    
    logger.info(LogCategory.SUBSCRIPTION, 'Suscripción dinámica creada exitosamente', {
      subscription_id: subscriptionResult.subscription?.id,
      external_reference: subscriptionResult.subscription?.external_reference,
      status: subscriptionResult.subscription?.status,
      processing_time_ms: processingTime,
      user_id: requestData.user_id,
      product_id: requestData.product_id
    })

    return NextResponse.json({
      success: true,
      subscription: subscriptionResult.subscription,
      processing_time_ms: processingTime
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    logger.error(LogCategory.SUBSCRIPTION, 'Error inesperado creando suscripción dinámica', {
      error: error.message,
      stack: error.stack,
      processing_time_ms: processingTime,
      request_data: requestData ? {
        user_id: requestData.user_id,
        product_id: requestData.product_id,
        payment_method: requestData.payment_method
      } : 'No disponible'
    })

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      processing_time_ms: processingTime
    }, { status: 500 })
  }
}