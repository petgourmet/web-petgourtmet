import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import logger from '@/lib/logger'

// Endpoint para sincronizar manualmente una orden específica con MercadoPago
export async function POST(request: NextRequest) {
  try {
    const { orderId, forceSync = false } = await request.json()
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID es requerido' },
        { status: 400 }
      )
    }

    const mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!mercadoPagoToken) {
      return NextResponse.json(
        { error: 'Token de MercadoPago no configurado' },
        { status: 500 }
      )
    }

    const supabase = createServiceClient()
    
    // Obtener información de la orden
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { 
          error: 'Orden no encontrada',
          orderId,
          details: orderError
        },
        { status: 404 }
      )
    }

    // Verificar si ya tiene Payment ID y no es forzado
    if (order.mercadopago_payment_id && !forceSync) {
      return NextResponse.json({
        success: false,
        message: 'La orden ya tiene Payment ID asignado',
        orderId,
        existingPaymentId: order.mercadopago_payment_id,
        suggestion: 'Usa forceSync: true para forzar la sincronización'
      })
    }

    logger.info('Iniciando sincronización manual de orden', 'SYNC', {
      orderId,
      forceSync,
      currentPaymentId: order.mercadopago_payment_id
    })

    // Buscar pagos en MercadoPago por external_reference
    let foundPayments = []
    
    try {
      // Método 1: Buscar por external_reference (ID de la orden)
      const searchByReference = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${mercadoPagoToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (searchByReference.ok) {
        const referenceData = await searchByReference.json()
        if (referenceData.results && referenceData.results.length > 0) {
          foundPayments.push(...referenceData.results)
          logger.info('Pagos encontrados por external_reference', 'SYNC', {
            orderId,
            paymentsFound: referenceData.results.length
          })
        }
      }

      // Método 2: Si tenemos preference_id, buscar por él
      if (order.payment_intent_id && foundPayments.length === 0) {
        try {
          const preferenceResponse = await fetch(
            `https://api.mercadopago.com/checkout/preferences/${order.payment_intent_id}`,
            {
              headers: {
                'Authorization': `Bearer ${mercadoPagoToken}`
              }
            }
          )
          
          if (preferenceResponse.ok) {
            const preferenceData = await preferenceResponse.json()
            
            // Buscar pagos relacionados con esta preferencia
            if (preferenceData.external_reference) {
              const searchByPrefReference = await fetch(
                `https://api.mercadopago.com/v1/payments/search?external_reference=${preferenceData.external_reference}`,
                {
                  headers: {
                    'Authorization': `Bearer ${mercadoPagoToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              )
              
              if (searchByPrefReference.ok) {
                const prefReferenceData = await searchByPrefReference.json()
                if (prefReferenceData.results && prefReferenceData.results.length > 0) {
                  foundPayments.push(...prefReferenceData.results)
                  logger.info('Pagos encontrados por preference external_reference', 'SYNC', {
                    orderId,
                    preferenceId: order.payment_intent_id,
                    paymentsFound: prefReferenceData.results.length
                  })
                }
              }
            }
          }
        } catch (prefError) {
          logger.warn('Error buscando por preference_id', 'SYNC', {
            orderId,
            preferenceId: order.payment_intent_id,
            error: prefError.message
          })
        }
      }

      // Método 3: Buscar por email del cliente en un rango de fechas
      if (foundPayments.length === 0 && order.customer_email) {
        const orderDate = new Date(order.created_at)
        const startDate = new Date(orderDate.getTime() - 24 * 60 * 60 * 1000) // 1 día antes
        const endDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000) // 1 día después
        
        const searchByEmail = await fetch(
          `https://api.mercadopago.com/v1/payments/search?payer.email=${order.customer_email}&begin_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
          {
            headers: {
              'Authorization': `Bearer ${mercadoPagoToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (searchByEmail.ok) {
          const emailData = await searchByEmail.json()
          if (emailData.results && emailData.results.length > 0) {
            // Filtrar por monto similar (±5 pesos de diferencia)
            const similarAmountPayments = emailData.results.filter(payment => 
              Math.abs(payment.transaction_amount - order.total) <= 5
            )
            
            if (similarAmountPayments.length > 0) {
              foundPayments.push(...similarAmountPayments)
              logger.info('Pagos encontrados por email y monto', 'SYNC', {
                orderId,
                customerEmail: order.customer_email,
                orderTotal: order.total,
                paymentsFound: similarAmountPayments.length
              })
            }
          }
        }
      }

    } catch (searchError) {
      logger.error('Error buscando pagos en MercadoPago', 'SYNC', {
        orderId,
        error: searchError.message
      })
      
      return NextResponse.json(
        { 
          error: 'Error buscando pagos en MercadoPago',
          details: searchError.message
        },
        { status: 500 }
      )
    }

    if (foundPayments.length === 0) {
      logger.warn('No se encontraron pagos para la orden', 'SYNC', {
        orderId,
        searchMethods: ['external_reference', 'preference_id', 'email_and_amount']
      })
      
      return NextResponse.json({
        success: false,
        message: 'No se encontraron pagos en MercadoPago para esta orden',
        orderId,
        searchAttempts: {
          byExternalReference: true,
          byPreferenceId: !!order.payment_intent_id,
          byEmailAndAmount: !!order.customer_email
        }
      })
    }

    // Seleccionar el mejor pago (aprobado > pendiente > otros)
    const approvedPayments = foundPayments.filter(p => p.status === 'approved')
    const pendingPayments = foundPayments.filter(p => p.status === 'pending')
    
    let selectedPayment
    if (approvedPayments.length > 0) {
      selectedPayment = approvedPayments[0] // Tomar el primer pago aprobado
    } else if (pendingPayments.length > 0) {
      selectedPayment = pendingPayments[0] // Tomar el primer pago pendiente
    } else {
      selectedPayment = foundPayments[0] // Tomar cualquier pago
    }

    logger.info('Pago seleccionado para sincronización', 'SYNC', {
      orderId,
      paymentId: selectedPayment.id,
      paymentStatus: selectedPayment.status,
      paymentAmount: selectedPayment.transaction_amount,
      totalPaymentsFound: foundPayments.length
    })

    // Mapear estado del pago a estado de orden
    const mapPaymentStatusToOrderStatus = (paymentStatus) => {
      switch (paymentStatus) {
        case 'approved':
        case 'paid':
          return 'confirmed'
        case 'pending':
        case 'in_process':
          return 'pending_payment'
        case 'cancelled':
        case 'rejected':
          return 'cancelled'
        case 'refunded':
          return 'refunded'
        default:
          return 'pending'
      }
    }

    const orderStatus = mapPaymentStatusToOrderStatus(selectedPayment.status)
    
    // Actualizar la orden con la información del pago
    const updateData = {
      mercadopago_payment_id: selectedPayment.id.toString(),
      payment_status: selectedPayment.status,
      status: orderStatus,
      updated_at: new Date().toISOString(),
      payment_type: selectedPayment.payment_type_id,
      payment_method: selectedPayment.payment_method_id,
      external_reference: selectedPayment.external_reference || orderId.toString(),
      collection_id: selectedPayment.id.toString(),
      site_id: selectedPayment.currency_id === 'MXN' ? 'MLM' : 'MLA',
      processing_mode: 'aggregator'
    }

    if (selectedPayment.status === 'approved' || selectedPayment.status === 'paid') {
      updateData.confirmed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      logger.error('Error actualizando orden con datos del pago', 'SYNC', {
        orderId,
        paymentId: selectedPayment.id,
        error: updateError.message
      })
      
      return NextResponse.json(
        { 
          error: 'Error actualizando la orden',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    logger.info('Orden sincronizada exitosamente', 'SYNC', {
      orderId,
      paymentId: selectedPayment.id,
      newStatus: orderStatus,
      paymentStatus: selectedPayment.status
    })

    return NextResponse.json({
      success: true,
      message: 'Orden sincronizada exitosamente',
      orderId,
      syncResult: {
        paymentId: selectedPayment.id,
        paymentStatus: selectedPayment.status,
        orderStatus: orderStatus,
        amount: selectedPayment.transaction_amount,
        paymentMethod: selectedPayment.payment_method_id,
        dateCreated: selectedPayment.date_created,
        totalPaymentsFound: foundPayments.length
      }
    })

  } catch (error) {
    logger.error('Error en sincronización manual de orden', 'SYNC', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar el estado del servicio
export async function GET() {
  return NextResponse.json({
    service: 'Manual Order Payment Sync',
    status: 'active',
    description: 'Sincroniza manualmente órdenes específicas con MercadoPago',
    usage: 'POST con { orderId: number, forceSync?: boolean }'
  })
}