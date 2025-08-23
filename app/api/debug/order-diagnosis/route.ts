import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import logger from '@/lib/logger'

// Endpoint para diagnosticar problemas específicos de órdenes
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID es requerido' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    
    // Obtener información completa de la orden
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

    // Analizar el estado de la orden
    const diagnosis = {
      orderId: order.id,
      status: order.status,
      paymentStatus: order.payment_status,
      mercadopagoPaymentId: order.mercadopago_payment_id,
      paymentIntentId: order.payment_intent_id,
      externalReference: order.external_reference,
      customerEmail: order.customer_email,
      total: order.total,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      confirmedAt: order.confirmed_at,
      
      // Análisis de problemas
      issues: [],
      recommendations: []
    }

    // Detectar problemas
    if (!order.mercadopago_payment_id) {
      diagnosis.issues.push({
        type: 'MISSING_PAYMENT_ID',
        severity: 'CRITICAL',
        description: 'La orden no tiene Payment ID de MercadoPago asignado',
        impact: 'El cliente pagó pero el sistema no refleja el pago'
      })
      
      diagnosis.recommendations.push({
        action: 'SYNC_PAYMENT',
        description: 'Sincronizar manualmente con MercadoPago usando external_reference o preference_id',
        priority: 'HIGH'
      })
    }

    if (order.status === 'pending' && order.payment_status === 'pending') {
      diagnosis.issues.push({
        type: 'PAYMENT_NOT_PROCESSED',
        severity: 'HIGH',
        description: 'El pago no ha sido procesado por el webhook',
        impact: 'La orden permanece en estado pendiente'
      })
      
      diagnosis.recommendations.push({
        action: 'CHECK_WEBHOOK_LOGS',
        description: 'Revisar logs del webhook para esta orden',
        priority: 'HIGH'
      })
    }

    if (!order.external_reference) {
      diagnosis.issues.push({
        type: 'MISSING_EXTERNAL_REFERENCE',
        severity: 'MEDIUM',
        description: 'La orden no tiene external_reference configurado',
        impact: 'Dificulta la sincronización con MercadoPago'
      })
    }

    // Intentar buscar el pago en MercadoPago si tenemos preference_id
    let mercadopagoSearch = null
    if (order.payment_intent_id) {
      try {
        const mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN
        if (mercadoPagoToken) {
          // Buscar por external_reference
          const searchResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}`,
            {
              headers: {
                'Authorization': `Bearer ${mercadoPagoToken}`,
                'Content-Type': 'application/json'
              }
            }
          )
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            mercadopagoSearch = {
              found: searchData.results?.length > 0,
              payments: searchData.results || [],
              totalFound: searchData.results?.length || 0
            }
            
            if (searchData.results?.length > 0) {
              const payment = searchData.results[0]
              diagnosis.recommendations.push({
                action: 'UPDATE_ORDER_WITH_PAYMENT',
                description: `Pago encontrado en MercadoPago: ${payment.id} (${payment.status})`,
                priority: 'HIGH',
                paymentData: {
                  id: payment.id,
                  status: payment.status,
                  amount: payment.transaction_amount,
                  dateCreated: payment.date_created
                }
              })
            }
          }
        }
      } catch (error) {
        mercadopagoSearch = {
          error: 'Error buscando en MercadoPago',
          details: error.message
        }
      }
    }

    // Log del diagnóstico
    logger.info('Diagnóstico de orden completado', 'DIAGNOSIS', {
      orderId,
      issuesCount: diagnosis.issues.length,
      recommendationsCount: diagnosis.recommendations.length
    })

    return NextResponse.json({
      success: true,
      diagnosis,
      mercadopagoSearch,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error en diagnóstico de orden', 'DIAGNOSIS', {
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
    service: 'Order Diagnosis',
    status: 'active',
    description: 'Diagnostica problemas específicos de órdenes y pagos',
    usage: 'POST con { orderId: number }'
  })
}