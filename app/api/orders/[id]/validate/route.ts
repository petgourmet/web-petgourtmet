import { NextRequest, NextResponse } from 'next/server'
import autoSyncService from '@/lib/auto-sync-service'
import logger from '@/lib/logger'

// Endpoint para validación proactiva de una orden específica
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id)
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID de orden inválido' },
        { status: 400 }
      )
    }

    logger.info('Iniciando validación proactiva de orden', 'PROACTIVE_VALIDATE', {
      orderId
    })

    // Ejecutar validación automática
    const result = await autoSyncService.validateOrderPayment(orderId)
    
    logger.info('Validación proactiva completada', 'PROACTIVE_VALIDATE', {
      orderId,
      success: result.success,
      action: result.action
    })

    return NextResponse.json({
      success: true,
      orderId,
      validation: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error en validación proactiva', 'PROACTIVE_VALIDATE', {
      orderId: params.id,
      error: error.message
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Error en validación proactiva',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar si una orden necesita validación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id)
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID de orden inválido' },
        { status: 400 }
      )
    }

    // Verificar si la orden necesita validación (sin ejecutarla)
    const needsValidation = await checkIfOrderNeedsValidation(orderId)
    
    return NextResponse.json({
      orderId,
      needsValidation,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Error verificando estado de validación',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Función auxiliar para verificar si una orden necesita validación
async function checkIfOrderNeedsValidation(orderId: number): Promise<{
  needed: boolean
  reason?: string
  lastUpdated?: string
}> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const supabase = createServiceClient()
    
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return {
        needed: false,
        reason: 'Orden no encontrada'
      }
    }

    // Verificar si necesita validación
    const needsValidation = 
      !order.mercadopago_payment_id || // No tiene Payment ID
      order.payment_status === 'pending' || // Estado pendiente
      (order.status === 'pending' && order.payment_status !== 'pending') // Inconsistencia de estados

    let reason = ''
    if (!order.mercadopago_payment_id) {
      reason = 'Falta Payment ID de MercadoPago'
    } else if (order.payment_status === 'pending') {
      reason = 'Pago en estado pendiente'
    } else if (order.status === 'pending' && order.payment_status !== 'pending') {
      reason = 'Inconsistencia entre estados de orden y pago'
    }

    return {
      needed: needsValidation,
      reason: needsValidation ? reason : 'Orden sincronizada correctamente',
      lastUpdated: order.updated_at
    }

  } catch (error) {
    return {
      needed: true,
      reason: `Error verificando orden: ${error.message}`
    }
  }
}