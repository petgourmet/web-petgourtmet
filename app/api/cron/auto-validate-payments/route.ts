import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import logger from '@/lib/logger'

const CRON_SECRET = process.env.CRON_SECRET
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

// Endpoint para validación automática de pagos pendientes
export async function POST(request: NextRequest) {
  try {
    // Verificar autorización del cron job
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    logger.info('Iniciando validación automática de pagos pendientes', 'CRON', {
      timestamp: new Date().toISOString()
    })

    const supabase = createClient()
    const results = {
      orders_processed: 0,
      orders_updated: 0,
      subscriptions_processed: 0,
      subscriptions_updated: 0,
      errors: 0,
      details: [] as any[]
    }

    // 1. Buscar órdenes pendientes (últimas 24 horas)
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'pending')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(50)

    if (ordersError) {
      logger.error('Error obteniendo órdenes pendientes', 'CRON', {
        error: ordersError.message
      })
    } else if (pendingOrders && pendingOrders.length > 0) {
      logger.info(`Procesando ${pendingOrders.length} órdenes pendientes`, 'CRON')
      
      for (const order of pendingOrders) {
        try {
          results.orders_processed++
          
          // Buscar pago en MercadoPago por external_reference
          const searchResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`,
            {
              headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
              }
            }
          )

          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            
            if (searchData.results && searchData.results.length > 0) {
              const payment = searchData.results[0]
              
              logger.info(`Pago encontrado para orden ${order.id}`, 'CRON', {
                payment_id: payment.id,
                status: payment.status,
                amount: payment.transaction_amount
              })

              // Actualizar orden con información del pago
              const updateData: any = {
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

              const { error: updateError } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id)

              if (updateError) {
                logger.error(`Error actualizando orden ${order.id}`, 'CRON', {
                  error: updateError.message
                })
                results.errors++
              } else {
                results.orders_updated++
                results.details.push({
                  type: 'order',
                  id: order.id,
                  payment_id: payment.id,
                  old_status: order.status,
                  new_status: updateData.status,
                  payment_status: payment.status
                })
                
                logger.info(`Orden ${order.id} actualizada automáticamente`, 'CRON', {
                  new_status: updateData.status,
                  payment_status: payment.status
                })
              }
            }
          }
        } catch (error) {
          logger.error(`Error procesando orden ${order.id}`, 'CRON', {
            error: error.message
          })
          results.errors++
        }
      }
    }

    // 2. Buscar suscripciones pendientes de validación
    const { data: pendingSubscriptions, error: subscriptionsError } = await supabase
      .from('pending_subscriptions')
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
          results.subscriptions_processed++
          
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

            // Si la suscripción está autorizada, moverla a user_subscriptions
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

              // Crear suscripción activa
              const { error: createError } = await supabase
                .from('user_subscriptions')
                .insert({
                  user_id: subscription.user_id,
                  product_id: subscription.product_id,
                  status: 'active',
                  frequency: subscription.subscription_type,
                  price: subscription.amount,
                  next_billing_date: nextBillingDate.toISOString(),
                  mercadopago_subscription_id: subscription.mercadopago_subscription_id,
                  external_reference: subscription.external_reference,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })

              if (createError) {
                logger.error(`Error creando suscripción activa ${subscription.id}`, 'CRON', {
                  error: createError.message
                })
                results.errors++
              } else {
                // Marcar suscripción pendiente como procesada
                await supabase
                  .from('pending_subscriptions')
                  .update({ status: 'processed' })
                  .eq('id', subscription.id)

                results.subscriptions_updated++
                results.details.push({
                  type: 'subscription',
                  id: subscription.id,
                  mp_subscription_id: subscription.mercadopago_subscription_id,
                  status: 'activated'
                })
                
                logger.info(`Suscripción ${subscription.id} activada automáticamente`, 'CRON')
              }
            }
          }
        } catch (error) {
          logger.error(`Error procesando suscripción ${subscription.id}`, 'CRON', {
            error: error.message
          })
          results.errors++
        }
      }
    }

    logger.info('Validación automática completada', 'CRON', {
      orders_processed: results.orders_processed,
      orders_updated: results.orders_updated,
      subscriptions_processed: results.subscriptions_processed,
      subscriptions_updated: results.subscriptions_updated,
      errors: results.errors
    })

    return NextResponse.json({
      success: true,
      message: 'Validación automática completada',
      timestamp: new Date().toISOString(),
      results
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