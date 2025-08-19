import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

// Endpoint para validación periódica de pagos
// Se ejecuta cada 30 minutos para verificar pagos pendientes
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.info('Iniciando validación periódica de pagos', 'CRON', {
      timestamp: new Date().toISOString()
    })

    // Verificar autorización del cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Intento de acceso no autorizado al cron de validación', 'CRON')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createClient()
    
    // 1. Obtener órdenes pendientes con payment_intent_id pero sin mercadopago_payment_id
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_status', 'pending')
      .not('payment_intent_id', 'is', null)
      .is('mercadopago_payment_id', null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas
      .limit(50)

    if (ordersError) {
      logger.error('Error obteniendo órdenes pendientes', 'CRON', {
        error: ordersError.message
      })
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      logger.info('No hay órdenes pendientes para validar', 'CRON')
      return NextResponse.json({ 
        success: true, 
        message: 'No hay órdenes pendientes',
        processed: 0
      })
    }

    logger.info(`Validando ${pendingOrders.length} órdenes pendientes`, 'CRON')

    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      details: [] as any[]
    }

    // 2. Verificar cada orden en MercadoPago
    for (const order of pendingOrders) {
      try {
        results.processed++
        
        logger.info(`Validando orden ${order.id}`, 'CRON', {
          orderId: order.id,
          paymentIntentId: order.payment_intent_id
        })

        // Buscar pagos por external_reference en MercadoPago
        const searchResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
            }
          }
        )

        if (!searchResponse.ok) {
          logger.warn(`Error consultando MercadoPago para orden ${order.id}`, 'CRON', {
            status: searchResponse.status
          })
          results.errors++
          continue
        }

        const searchData = await searchResponse.json()
        
        if (searchData.results && searchData.results.length > 0) {
          // Tomar el pago más reciente
          const latestPayment = searchData.results[searchData.results.length - 1]
          
          logger.info(`Pago encontrado para orden ${order.id}`, 'CRON', {
            paymentId: latestPayment.id,
            status: latestPayment.status,
            amount: latestPayment.transaction_amount
          })

          // Actualizar la orden con la información del pago
          const updateData: any = {
            mercadopago_payment_id: latestPayment.id.toString(),
            payment_status: latestPayment.status,
            payment_type: latestPayment.payment_type_id,
            payment_method: latestPayment.payment_method_id,
            external_reference: latestPayment.external_reference || order.id.toString(),
            collection_id: latestPayment.id.toString(),
            site_id: latestPayment.currency_id === 'MXN' ? 'MLM' : 'MLA',
            processing_mode: 'aggregator',
            updated_at: new Date().toISOString()
          }

          // Actualizar estado de la orden si el pago fue aprobado
          if (latestPayment.status === 'approved' || latestPayment.status === 'paid') {
            updateData.status = 'confirmed'
            updateData.confirmed_at = new Date().toISOString()
          } else if (latestPayment.status === 'rejected' || latestPayment.status === 'cancelled') {
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
            logger.info(`Orden ${order.id} actualizada exitosamente`, 'CRON', {
              newStatus: updateData.status,
              paymentStatus: updateData.payment_status
            })
            results.updated++
            
            results.details.push({
              orderId: order.id,
              paymentId: latestPayment.id,
              oldStatus: order.status,
              newStatus: updateData.status,
              paymentStatus: latestPayment.status
            })
          }
        } else {
          logger.info(`No se encontraron pagos para orden ${order.id}`, 'CRON')
        }

      } catch (error) {
        logger.error(`Error procesando orden ${order.id}`, 'CRON', {
          error: error.message
        })
        results.errors++
      }
    }

    const duration = Date.now() - startTime
    
    logger.info('Validación periódica completada', 'CRON', {
      duration,
      processed: results.processed,
      updated: results.updated,
      errors: results.errors
    })

    return NextResponse.json({
      success: true,
      message: 'Validación completada',
      duration,
      ...results
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('Error en validación periódica de pagos', 'CRON', {
      error: error.message,
      duration
    })

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      duration
    }, { status: 500 })
  }
}

// Endpoint GET para verificar el estado del cron
export async function GET() {
  return NextResponse.json({
    service: 'Payment Validation Cron',
    status: 'active',
    description: 'Valida periódicamente el estado de pagos pendientes con MercadoPago',
    frequency: 'Cada 30 minutos',
    lastRun: new Date().toISOString()
  })
}