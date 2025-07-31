import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface MercadoPagoPaymentResponse {
  id: number
  status: string
  status_detail: string
  date_created: string
  date_approved?: string
  date_last_updated: string
  transaction_amount: number
  currency_id: string
  payment_method_id: string
  payment_type_id: string
  external_reference?: string
  description?: string
  payer: {
    id: string
    email: string
  }
  metadata?: {
    subscription_id?: string
    user_id?: string
  }
}

// Función para consultar el estado de un pago en MercadoPago
async function validatePaymentWithMercadoPago(paymentId: string): Promise<MercadoPagoPaymentResponse | null> {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error('❌ MERCADOPAGO_ACCESS_TOKEN no está configurado')
      return null
    }

    console.log(`🔍 Validando pago ${paymentId} con MercadoPago...`)

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`❌ Error al consultar pago ${paymentId}:`, response.status, response.statusText)
      return null
    }

    const paymentData = await response.json()
    
    console.log(`✅ Estado del pago ${paymentId} obtenido:`, {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      date_approved: paymentData.date_approved,
      external_reference: paymentData.external_reference
    })

    return paymentData
  } catch (error) {
    console.error(`💥 Error al validar pago ${paymentId}:`, error)
    return null
  }
}

// Función para actualizar el estado local basado en la respuesta de MercadoPago
async function updateLocalPaymentStatus(paymentId: string, mercadoPagoData: MercadoPagoPaymentResponse) {
  const supabase = createClient()

  try {
    // Buscar en historial de facturación de suscripciones
    const { data: billingRecord, error: billingError } = await supabase
      .from('subscription_billing_history')
      .select('*')
      .eq('mercadopago_payment_id', paymentId)
      .single()

    if (billingRecord && !billingError) {
      // Actualizar historial de suscripción
      const { error: updateError } = await supabase
        .from('subscription_billing_history')
        .update({
          status: mercadoPagoData.status,
          payment_details: {
            ...billingRecord.payment_details,
            status_detail: mercadoPagoData.status_detail,
            date_approved: mercadoPagoData.date_approved,
            date_last_updated: mercadoPagoData.date_last_updated
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', billingRecord.id)

      if (updateError) {
        console.error('❌ Error al actualizar historial de suscripción:', updateError)
        return false
      }

      console.log(`✅ Historial de suscripción actualizado para pago ${paymentId}`)
      return true
    }

    // Buscar en órdenes regulares
    const { data: orderRecord, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('mercadopago_payment_id', paymentId)
      .single()

    if (orderRecord && !orderError) {
      // Determinar nuevo estado
      let newOrderStatus = 'pending'
      let paymentStatus = mercadoPagoData.status

      if (mercadoPagoData.status === 'approved') {
        newOrderStatus = 'processing'
        paymentStatus = 'paid'
      } else if (mercadoPagoData.status === 'rejected' || mercadoPagoData.status === 'cancelled') {
        newOrderStatus = 'cancelled'
        paymentStatus = 'failed'
      }

      const updateData: any = {
        payment_status: paymentStatus,
        status: newOrderStatus,
        updated_at: new Date().toISOString()
      }

      if (paymentStatus === 'paid' && !orderRecord.confirmed_at) {
        updateData.confirmed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderRecord.id)

      if (updateError) {
        console.error('❌ Error al actualizar orden:', updateError)
        return false
      }

      console.log(`✅ Orden actualizada para pago ${paymentId}`)
      return true
    }

    console.warn(`⚠️ No se encontró registro local para el pago ${paymentId}`)
    return false

  } catch (error) {
    console.error('💥 Error al actualizar estado local:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Iniciando validación del pago: ${paymentId}`)

    // Consultar estado actual en MercadoPago
    const mercadoPagoData = await validatePaymentWithMercadoPago(paymentId)

    if (!mercadoPagoData) {
      return NextResponse.json(
        { error: 'Failed to validate payment with MercadoPago' },
        { status: 500 }
      )
    }

    // Actualizar estado local
    const localUpdateSuccess = await updateLocalPaymentStatus(paymentId, mercadoPagoData)

    return NextResponse.json({
      success: true,
      payment_id: paymentId,
      mercadopago_status: mercadoPagoData.status,
      status_detail: mercadoPagoData.status_detail,
      amount: mercadoPagoData.transaction_amount,
      date_approved: mercadoPagoData.date_approved,
      local_update_success: localUpdateSuccess,
      validation_timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error en validación de pago:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Endpoint GET para validar múltiples pagos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentIds = searchParams.get('payment_ids')?.split(',') || []

    if (paymentIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one payment ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Validando múltiples pagos: ${paymentIds.join(', ')}`)

    const results = []

    for (const paymentId of paymentIds) {
      const mercadoPagoData = await validatePaymentWithMercadoPago(paymentId.trim())
      
      if (mercadoPagoData) {
        const localUpdateSuccess = await updateLocalPaymentStatus(paymentId.trim(), mercadoPagoData)
        
        results.push({
          payment_id: paymentId.trim(),
          status: mercadoPagoData.status,
          status_detail: mercadoPagoData.status_detail,
          amount: mercadoPagoData.transaction_amount,
          date_approved: mercadoPagoData.date_approved,
          local_update_success: localUpdateSuccess
        })
      } else {
        results.push({
          payment_id: paymentId.trim(),
          error: 'Failed to validate with MercadoPago'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      validation_timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error en validación múltiple:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}