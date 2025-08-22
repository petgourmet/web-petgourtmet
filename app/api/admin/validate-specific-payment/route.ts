import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

// Endpoint para validar un pago específico manualmente
export async function POST(request: NextRequest) {
  let operation_id = null
  
  try {
    const requestData = await request.json()
    operation_id = requestData.operation_id
    const { user_email, amount } = requestData
    
    if (!operation_id) {
      return NextResponse.json(
        { error: 'operation_id es requerido' },
        { status: 400 }
      )
    }

    logger.info('Iniciando validación manual de pago', 'ADMIN', {
      operation_id,
      user_email,
      amount
    })

    const supabase = createClient()
    
    // 1. Buscar el pago en MercadoPago por payment_id directamente
    let searchResponse
    let searchData
    
    // Primero intentar buscar por payment_id directamente
    try {
      searchResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${operation_id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
          }
        }
      )
      
      if (searchResponse.ok) {
        const paymentData = await searchResponse.json()
        searchData = { results: [paymentData] }
      } else {
        // Si no funciona, intentar buscar por external_reference
        searchResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${operation_id}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
            }
          }
        )
        
        if (searchResponse.ok) {
          searchData = await searchResponse.json()
        }
      }
    } catch (error) {
      logger.error('Error en consulta a MercadoPago', 'ADMIN', {
        operation_id,
        error: error.message
      })
    }

    if (!searchData || !searchData.results || searchData.results.length === 0) {
      logger.warn('Pago no encontrado en MercadoPago', 'ADMIN', {
        operation_id,
        searchResponse_status: searchResponse?.status
      })
      return NextResponse.json(
        { error: 'Pago no encontrado en MercadoPago' },
        { status: 404 }
      )
    }

    const payment = searchData.results[0]
    
    logger.info('Pago encontrado en MercadoPago', 'ADMIN', {
      operation_id,
      payment_id: payment.id,
      status: payment.status,
      amount: payment.transaction_amount,
      payer_email: payment.payer?.email
    })

    // 2. Verificar si ya existe en la base de datos
    const { data: existingPayment } = await supabase
      .from('subscription_billing_history')
      .select('id')
      .eq('mercadopago_payment_id', payment.id.toString())
      .single()

    if (existingPayment) {
      logger.info('Pago ya existe en base de datos', 'ADMIN', {
        operation_id,
        existing_id: existingPayment.id
      })
      return NextResponse.json({
        success: true,
        message: 'Pago ya existe en la base de datos',
        payment_id: payment.id,
        existing_record: existingPayment.id
      })
    }

    // 3. Determinar si es una orden o suscripción
    let isSubscription = false
    let subscriptionId = null
    let orderId = null
    
    // Verificar si es una suscripción
    if (payment.metadata?.subscription_id) {
      subscriptionId = payment.metadata.subscription_id
      isSubscription = true
    }
    else if (payment.external_reference?.startsWith('subscription_')) {
      subscriptionId = payment.external_reference.replace('subscription_', '')
      isSubscription = true
    }
    else {
       // Es una orden regular, buscar por external_reference
       logger.info('Buscando orden por external_reference', 'ADMIN', {
         operation_id,
         external_reference: payment.external_reference
       })
       
       const { data: order, error: orderError } = await supabase
         .from('orders')
         .select('id')
         .eq('id', payment.external_reference)
         .single()
       
       if (orderError) {
         logger.warn('Error buscando orden por external_reference', 'ADMIN', {
           operation_id,
           external_reference: payment.external_reference,
           error: orderError.message
         })
       }
       
       if (order) {
         orderId = order.id
         isSubscription = false
         logger.info('Orden encontrada por external_reference', 'ADMIN', {
           operation_id,
           order_id: orderId
         })
       } else {
         // Buscar por email del usuario en órdenes
         logger.info('Buscando orden por email', 'ADMIN', {
           operation_id,
           payer_email: payment.payer?.email
         })
         
         const { data: userOrders, error: userOrdersError } = await supabase
           .from('orders')
           .select('id')
           .eq('customer_email', payment.payer?.email)
           .eq('payment_status', 'pending')
           .order('created_at', { ascending: false })
           .limit(1)
         
         if (userOrdersError) {
           logger.warn('Error buscando órdenes por email', 'ADMIN', {
             operation_id,
             payer_email: payment.payer?.email,
             error: userOrdersError.message
           })
         }
         
         if (userOrders && userOrders.length > 0) {
           orderId = userOrders[0].id
           isSubscription = false
           logger.info('Orden encontrada por email', 'ADMIN', {
             operation_id,
             order_id: orderId
           })
         }
       }
     }

    if (!subscriptionId && !orderId) {
      logger.warn('No se pudo determinar orden o suscripción asociada', 'ADMIN', {
        operation_id,
        payment_id: payment.id,
        payer_email: payment.payer?.email,
        external_reference: payment.external_reference
      })
      return NextResponse.json(
        { error: 'No se pudo determinar la orden o suscripción asociada' },
        { status: 400 }
      )
    }

    // 4. Procesar según el tipo (orden o suscripción)
    if (isSubscription) {
      // Crear registro en subscription_billing_history
      const billingData = {
        subscription_id: subscriptionId,
        billing_date: payment.date_created,
        amount: payment.transaction_amount,
        status: payment.status,
        status_detail: payment.status_detail,
        payment_method: payment.payment_method_id,
        mercadopago_payment_id: payment.id.toString(),
        payment_details: {
          operation_id: operation_id,
          currency_id: payment.currency_id,
          payment_type_id: payment.payment_type_id,
          date_approved: payment.date_approved,
          payer_email: payment.payer?.email,
          manually_validated: true,
          validated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: billingRecord, error: billingError } = await supabase
        .from('subscription_billing_history')
        .insert(billingData)
        .select()
        .single()

      if (billingError) {
        logger.error('Error creando registro de facturación', 'ADMIN', {
          operation_id,
          error: billingError.message
        })
        return NextResponse.json(
          { error: 'Error creando registro de facturación' },
          { status: 500 }
        )
      }
    } else {
      // Actualizar orden regular
      const orderUpdateData = {
        mercadopago_payment_id: payment.id.toString(),
        payment_status: payment.status,
        payment_type: payment.payment_type_id,
        payment_method: payment.payment_method_id,
        external_reference: payment.external_reference || orderId.toString(),
        collection_id: payment.id.toString(),
        site_id: payment.currency_id === 'MXN' ? 'MLM' : 'MLA',
        processing_mode: 'aggregator',
        updated_at: new Date().toISOString()
      }

      // Actualizar estado de la orden si el pago fue aprobado
      if (payment.status === 'approved' || payment.status === 'paid') {
        orderUpdateData.status = 'confirmed'
        orderUpdateData.confirmed_at = new Date().toISOString()
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        orderUpdateData.status = 'cancelled'
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderUpdateData)
        .eq('id', orderId)

      if (orderError) {
        logger.error('Error actualizando orden', 'ADMIN', {
          operation_id,
          order_id: orderId,
          error: orderError.message
        })
        return NextResponse.json(
          { error: 'Error actualizando orden' },
          { status: 500 }
        )
      }
    }

    // 5. Actualizar suscripción si es necesario y el pago fue aprobado
    if (isSubscription && (payment.status === 'approved' || payment.status === 'paid')) {
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .update({
          last_billing_date: payment.date_created,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

      if (subscriptionError) {
        logger.error('Error actualizando suscripción', 'ADMIN', {
          operation_id,
          subscription_id: subscriptionId,
          error: subscriptionError.message
        })
      }
    }

    logger.info('Pago validado manualmente exitosamente', 'ADMIN', {
      operation_id,
      payment_id: payment.id,
      subscription_id: subscriptionId,
      order_id: orderId,
      is_subscription: isSubscription,
      status: payment.status
    })

    return NextResponse.json({
      success: true,
      message: `${isSubscription ? 'Suscripción' : 'Orden'} validada exitosamente`,
      data: {
        operation_id,
        payment_id: payment.id,
        subscription_id: subscriptionId,
        order_id: orderId,
        is_subscription: isSubscription,
        amount: payment.transaction_amount,
        status: payment.status,
        payer_email: payment.payer?.email,
        date_created: payment.date_created
      }
    })

  } catch (error) {
    logger.error('Error en validación manual de pago', 'ADMIN', {
      operation_id,
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar el estado del servicio
export async function GET() {
  return NextResponse.json({
    service: 'Manual Payment Validation',
    status: 'active',
    description: 'Valida manualmente pagos específicos que no fueron procesados por webhooks',
    usage: 'POST con { operation_id, user_email?, amount? }'
  })
}