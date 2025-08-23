import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import autoSyncService from '@/lib/auto-sync-service'
import logger from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de orden requerido' },
        { status: 400 }
      )
    }

    // Obtener la orden con sus items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          product_image,
          quantity,
          price,
          size
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Error obteniendo orden:', orderError)
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Validación proactiva automática
    let validationResult = null
    const needsValidation = 
      !order.mercadopago_payment_id || 
      order.payment_status === 'pending' ||
      (order.status === 'pending' && order.payment_status !== 'pending')
    
    if (needsValidation) {
      try {
        logger.info('Ejecutando validación proactiva automática', 'PROACTIVE_AUTO', {
          orderId: order.id,
          reason: !order.mercadopago_payment_id ? 'missing_payment_id' : 
                  order.payment_status === 'pending' ? 'pending_payment' : 'status_mismatch'
        })
        
        validationResult = await autoSyncService.validateOrderPayment(parseInt(orderId))
        
        if (validationResult.success) {
          logger.info('Validación proactiva exitosa', 'PROACTIVE_AUTO', {
            orderId: order.id,
            action: validationResult.action,
            paymentId: validationResult.paymentId
          })
          
          // Recargar la orden actualizada
          const { data: updatedOrder } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                id,
                product_id,
                product_name,
                product_image,
                quantity,
                price,
                size
              )
            `)
            .eq('id', orderId)
            .single()
          
          if (updatedOrder) {
            order = updatedOrder
          }
        } else {
          logger.warn('Validación proactiva falló', 'PROACTIVE_AUTO', {
            orderId: order.id,
            error: validationResult.error
          })
        }
      } catch (error) {
        logger.error('Error en validación proactiva automática', 'PROACTIVE_AUTO', {
          orderId: order.id,
          error: error.message
        })
      }
    }

    // Parsear datos adicionales si existen
    let orderData = null
    let customerData = null
    let items = order.order_items || []

    if (order.shipping_address) {
      try {
        orderData = typeof order.shipping_address === 'string'
          ? JSON.parse(order.shipping_address)
          : order.shipping_address
        
        customerData = orderData.customer_data || null
        
        // Si hay items en shipping_address, usarlos como respaldo
        if (orderData.items && orderData.items.length > 0 && items.length === 0) {
          items = orderData.items
        }
      } catch (e) {
        console.error('Error parseando shipping_address:', e)
      }
    }

    // Formatear la respuesta
    const formattedOrder = {
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
      created_at: order.created_at,
      updated_at: order.updated_at,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      payment_method: order.payment_method,
      mercadopago_payment_id: order.mercadopago_payment_id,
      payment_intent_id: order.payment_intent_id,
      is_subscription: order.is_subscription,
      order_number: orderData?.order_number || `PG-${order.id}`,
      customer_data: customerData,
      items: items,
      shipping_address: orderData?.shipping_address || null,
      notes: order.notes
    }

    return NextResponse.json({
      success: true,
      order: formattedOrder
    })

  } catch (error) {
    console.error('Error en endpoint de orden:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}