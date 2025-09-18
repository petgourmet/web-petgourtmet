import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import logger from '@/lib/logger'
import autoSyncService from '@/lib/auto-sync-service'
import webhookMonitor from '@/lib/webhook-monitor'

const CRON_SECRET = process.env.CRON_SECRET
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

// Inicializar cliente de Supabase
const supabase = createClient()

// Endpoint para validación automática de pagos pendientes
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const executionId = `auto-validate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    // Verificar autorización del cron job
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    console.log(`🚀 Iniciando auto-validación de pagos [${executionId}]:`, {
      timestamp: new Date().toISOString(),
      userAgent,
      clientIP,
      hasAuth: !!authHeader
    })
    
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.error(`🚫 Acceso no autorizado a auto-validación [${executionId}]:`, {
        providedAuth: authHeader ? 'Bearer ***' : 'none',
        expectedAuth: 'Bearer ***',
        clientIP
      })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    logger.info('Iniciando validación automática de pagos pendientes (mejorada)', 'CRON_AUTO_VALIDATE', {
      timestamp: new Date().toISOString(),
      executionId
    })

    // Usar el nuevo servicio de auto-sincronización
    const syncResult = await autoSyncService.syncPendingOrders(2) // Últimas 2 horas
    
    // Generar reporte de salud del sistema
    const healthReport = webhookMonitor.generateHealthReport()
    
    // Persistir estadísticas si hay problemas
    if (healthReport.status !== 'healthy') {
      await webhookMonitor.persistStats()
    }

    const results = {
      orders_processed: syncResult.totalProcessed,
      orders_updated: syncResult.successful,
      subscriptions_processed: 0, // Mantenemos compatibilidad
      subscriptions_updated: 0,
      errors: syncResult.failed,
      details: syncResult.results.map(r => ({
        orderId: r.orderId,
        success: r.success,
        action: r.action,
        error: r.error,
        paymentId: r.paymentId
      })),
      health: {
        status: healthReport.status,
        score: healthReport.score,
        issues: healthReport.issues.length
      }
    }
    
    // Variables para el procesamiento adicional
    let additionalOrdersProcessed = 0
    let additionalOrdersUpdated = 0
    let additionalErrors = 0
    const additionalDetails: any[] = []

    // 1. Buscar órdenes pendientes (últimas 24 horas)
    console.log(`🔍 Buscando órdenes pendientes [${executionId}]:`, {
      timeWindow: '24 horas',
      limit: 50
    })
    
    const ordersSearchStart = Date.now()
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'pending')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(50)
    const ordersSearchTime = Date.now() - ordersSearchStart

    if (ordersError) {
      console.error(`❌ Error obteniendo órdenes pendientes [${executionId}]:`, {
        error: ordersError.message,
        queryTime: `${ordersSearchTime}ms`
      })
      logger.error('Error obteniendo órdenes pendientes', 'CRON', {
        error: ordersError.message,
        executionId
      })
    } else {
      console.log(`📋 Órdenes pendientes encontradas [${executionId}]:`, {
        count: pendingOrders?.length || 0,
        queryTime: `${ordersSearchTime}ms`,
        orderIds: pendingOrders?.map(o => o.id) || []
      })
      
      if (pendingOrders && pendingOrders.length > 0) {
        logger.info(`Procesando ${pendingOrders.length} órdenes pendientes`, 'CRON', {
          executionId
        })
      
      for (const order of pendingOrders) {
        const orderProcessStart = Date.now()
        try {
          console.log(`🔄 Procesando orden [${executionId}]:`, {
            orderId: order.id,
            currentStatus: order.status,
            paymentStatus: order.payment_status,
            createdAt: order.created_at
          })
          
          additionalOrdersProcessed++
          
          // Buscar pago en MercadoPago por external_reference
          console.log(`🔍 Buscando pago en MercadoPago [${executionId}]:`, {
            orderId: order.id,
            externalReference: order.id
          })
          
          const mpSearchStart = Date.now()
          const searchResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`,
            {
              headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
              }
            }
          )
          const mpSearchTime = Date.now() - mpSearchStart

          console.log(`📡 Respuesta de MercadoPago [${executionId}]:`, {
            orderId: order.id,
            responseOk: searchResponse.ok,
            status: searchResponse.status,
            queryTime: `${mpSearchTime}ms`
          })

          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            
            console.log(`💳 Resultados de búsqueda [${executionId}]:`, {
              orderId: order.id,
              paymentsFound: searchData.results?.length || 0,
              paymentIds: searchData.results?.map(p => p.id) || []
            })
            
            if (searchData.results && searchData.results.length > 0) {
              const payment = searchData.results[0]
              
              console.log(`✅ Pago encontrado [${executionId}]:`, {
                orderId: order.id,
                paymentId: payment.id,
                status: payment.status,
                amount: payment.transaction_amount,
                paymentType: payment.payment_type_id,
                paymentMethod: payment.payment_method_id
              })
              
              logger.info(`Pago encontrado para orden ${order.id}`, 'CRON', {
                payment_id: payment.id,
                status: payment.status,
                amount: payment.transaction_amount,
                executionId
              })

              // Actualizar orden con información del pago
              const updateData: Record<string, string | boolean> = {
                mercadopago_payment_id: payment.id.toString(),
                payment_status: payment.status,
                payment_type: payment.payment_type_id,
                payment_method: payment.payment_method_id,
                external_reference: payment.external_reference || order.id.toString(),
                collection_id: payment.id.toString(),
                site_id: payment.currency_id === 'MXN' ? 'MLM' : 'MLA',
                processing_mode: 'aggregator',
                updated_at: new Date().toISOString()
              }

              // Actualizar estado si el pago fue aprobado
              if (payment.status === 'approved' || payment.status === 'paid') {
                updateData.status = 'confirmed'
                updateData.confirmed_at = new Date().toISOString()
              } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
                updateData.status = 'cancelled'
              }

              console.log(`💾 Actualizando orden en base de datos [${executionId}]:`, {
                orderId: order.id,
                oldStatus: order.status,
                newStatus: updateData.status,
                paymentId: payment.id,
                paymentStatus: payment.status
              })
              
              const dbUpdateStart = Date.now()
              const { error: updateError } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id)
              const dbUpdateTime = Date.now() - dbUpdateStart

              if (updateError) {
                console.error(`❌ Error actualizando orden [${executionId}]:`, {
                  orderId: order.id,
                  error: updateError.message,
                  updateTime: `${dbUpdateTime}ms`
                })
                logger.error(`Error actualizando orden ${order.id}`, 'CRON', {
                  error: updateError.message,
                  executionId
                })
                additionalErrors++
              } else {
                console.log(`✅ Orden actualizada exitosamente [${executionId}]:`, {
                  orderId: order.id,
                  oldStatus: order.status,
                  newStatus: updateData.status,
                  paymentStatus: payment.status,
                  updateTime: `${dbUpdateTime}ms`
                })
                
                additionalOrdersUpdated++
                additionalDetails.push({
                  type: 'order',
                  id: order.id,
                  payment_id: payment.id,
                  old_status: order.status,
                  new_status: updateData.status,
                  payment_status: payment.status
                })
                
                logger.info(`Orden ${order.id} actualizada automáticamente`, 'CRON', {
                  new_status: updateData.status,
                  payment_status: payment.status,
                  executionId
                })
              }
            } else {
              console.log(`🔍 No se encontraron pagos para la orden [${executionId}]:`, {
                orderId: order.id,
                searchTime: `${mpSearchTime}ms`
              })
            }
          } else {
            console.error(`❌ Error en respuesta de MercadoPago [${executionId}]:`, {
              orderId: order.id,
              status: searchResponse.status,
              statusText: searchResponse.statusText
            })
          }
        } catch (error: unknown) {
          const totalTime = Date.now() - orderProcessStart
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
          const errorStack = error instanceof Error ? error.stack : undefined
          console.error(`❌ Error procesando orden [${executionId}]:`, {
            orderId: order.id,
            error: errorMessage,
            stack: errorStack,
            totalTime: `${totalTime}ms`
          })
          logger.error(`Error procesando orden ${order.id}`, 'CRON', {
            error: errorMessage,
            executionId
          })
          additionalErrors++
        }
      }
    }
    }

    // 2. Buscar suscripciones pendientes de validación
    const { data: pendingSubscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'pending')
      .not('mercadopago_subscription_id', 'is', null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(20)

    if (subscriptionsError) {
      logger.error('Error obteniendo suscripciones pendientes', 'CRON', {
        error: subscriptionsError.message
      })
    } else if (pendingSubscriptions && pendingSubscriptions.length > 0) {
      logger.info(`Procesando ${pendingSubscriptions.length} suscripciones pendientes`, 'CRON')
      
      for (const subscription of pendingSubscriptions) {
        try {
          // Procesamos suscripción (se cuenta en el resultado final)
          
          // Verificar estado de la suscripción en MercadoPago
          const subscriptionResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${subscription.mercadopago_subscription_id}`,
            {
              headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
              }
            }
          )

          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json()
            
            logger.info(`Suscripción encontrada ${subscription.id}`, 'CRON', {
              mp_subscription_id: subscription.mercadopago_subscription_id,
              status: subscriptionData.status
            })

            // Si la suscripción está autorizada, activarla en la tabla subscriptions
            if (subscriptionData.status === 'authorized') {
              // Calcular próxima fecha de pago
              const nextBillingDate = new Date()
              switch (subscription.subscription_type) {
                case 'weekly':
                  nextBillingDate.setDate(nextBillingDate.getDate() + 7)
                  break
                case 'biweekly':
                  nextBillingDate.setDate(nextBillingDate.getDate() + 14)
                  break
                case 'monthly':
                  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
                  break
                case 'quarterly':
                  nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
                  break
                case 'annual':
                  nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
                  break
                default:
                  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
              }

              // Actualizar suscripción a activa
              const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  next_billing_date: nextBillingDate.toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id)

              if (updateError) {
                logger.error(`Error actualizando suscripción ${subscription.id}`, 'CRON', {
                  error: updateError.message
                })
                additionalErrors++
              } else {
                additionalOrdersUpdated++ // Contamos como orden actualizada
                additionalDetails.push({
                  type: 'subscription',
                  id: subscription.id,
                  mp_subscription_id: subscription.mercadopago_subscription_id,
                  status: 'activated'
                })
                
                logger.info(`Suscripción ${subscription.id} activada automáticamente`, 'CRON', {
                  subscriptionId: subscription.id,
                  nextBillingDate: nextBillingDate.toISOString(),
                  executionId
                })
              }
            }
          }
        } catch (error) {
          logger.error(`Error procesando suscripción ${subscription.id}`, 'CRON', {
            error: error.message
          })
          additionalErrors++
        }
      }
    }

    // 3. Aplicar descuentos automáticos a suscripciones sin descuento
    try {
      logger.info('Aplicando descuentos automáticos a suscripciones', 'CRON')
      
      const discountRules = {
        'Flan de Pollo': {
          weekly: 15,
          biweekly: 10,
          monthly: 8,
          quarterly: 5,
          annual: 20
        },
        'default': {
          weekly: 10,
          biweekly: 8,
          monthly: 5,
          quarterly: 3,
          annual: 15
        }
      }
      
      const { data: subscriptionsWithoutDiscount, error: discountError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'active')
        .or('discount_percentage.is.null,discount_percentage.eq.0')
        .limit(10)
      
      if (!discountError && subscriptionsWithoutDiscount && subscriptionsWithoutDiscount.length > 0) {
        logger.info(`Aplicando descuentos a ${subscriptionsWithoutDiscount.length} suscripciones`, 'CRON')
        
        for (const sub of subscriptionsWithoutDiscount) {
          try {
            const productName = sub.product_name
            const frequency = sub.subscription_type
            
            let discountPercentage = 0
            
            if (discountRules[productName] && discountRules[productName][frequency]) {
              discountPercentage = discountRules[productName][frequency]
            } else if (discountRules['default'][frequency]) {
              discountPercentage = discountRules['default'][frequency]
            }
            
            if (discountPercentage > 0) {
              const basePrice = parseFloat(sub.base_price) || parseFloat(sub.price) || 0
              const discountedPrice = basePrice * (1 - discountPercentage / 100)
              
              const { error: updateError } = await supabase
                .from('unified_subscriptions')
                .update({
                  discount_percentage: discountPercentage,
                  base_price: basePrice,
                  discounted_price: discountedPrice,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sub.id)
              
              if (!updateError) {
                logger.info(`Descuento aplicado a suscripción ${sub.id}: ${discountPercentage}%`, 'CRON')
                additionalDetails.push({
                  type: 'discount_applied',
                  subscription_id: sub.id,
                  product: productName,
                  frequency: frequency,
                  discount: discountPercentage
                })
              }
            }
          } catch (error) {
            logger.error(`Error aplicando descuento a suscripción ${sub.id}`, 'CRON', {
              error: error.message
            })
          }
        }
      }
    } catch (error) {
      logger.error('Error en aplicación automática de descuentos', 'CRON', {
        error: error.message
      })
    }

    // Consolidar resultados finales
    const finalResults = {
      orders_processed: results.orders_processed + additionalOrdersProcessed,
      orders_updated: results.orders_updated + additionalOrdersUpdated,
      subscriptions_processed: results.subscriptions_processed,
      subscriptions_updated: results.subscriptions_updated,
      errors: results.errors + additionalErrors,
      details: [...results.details, ...additionalDetails],
      health: results.health
    }

    logger.info('Validación automática completada', 'CRON', {
      orders_processed: finalResults.orders_processed,
      orders_updated: finalResults.orders_updated,
      subscriptions_processed: finalResults.subscriptions_processed,
      subscriptions_updated: finalResults.subscriptions_updated,
      errors: finalResults.errors
    })

    return NextResponse.json({
      success: true,
      message: 'Validación automática completada',
      timestamp: new Date().toISOString(),
      results: finalResults
    })

  } catch (error) {
    logger.error('Error en validación automática de pagos', 'CRON', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// Endpoint GET para verificar el estado del servicio
export async function GET() {
  return NextResponse.json({
    service: 'Auto Payment Validation',
    status: 'active',
    description: 'Valida automáticamente pagos pendientes cada cierto tiempo',
    frequency: 'Cada 5 minutos',
    lastRun: new Date().toISOString()
  })
}