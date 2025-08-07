import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PaymentValidationResult {
  payment_id: string
  subscription_id?: string
  order_id?: string
  original_status: string
  mercadopago_status: string
  amount: number
  updated: boolean
  error?: string
}

interface ValidationSummary {
  total_processed: number
  successful_validations: number
  failed_validations: number
  updated_payments: number
  total_amount_validated: number
  results: PaymentValidationResult[]
}

// Función para validar un pago con MercadoPago
async function validatePaymentWithMercadoPago(paymentId: string) {
  const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
  
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('Token de MercadoPago no configurado')
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

// Función para actualizar el estado local del pago
async function updateLocalPaymentStatus(
  supabase: any,
  paymentId: string,
  mercadopagoData: any
) {
  const { status, status_detail, transaction_amount, payment_method_id } = mercadopagoData
  
  // Actualizar en subscription_billing_history
  const { error: subscriptionError } = await supabase
    .from('subscription_billing_history')
    .update({
      status: status,
      status_detail: status_detail,
      payment_method: payment_method_id,
      updated_at: new Date().toISOString()
    })
    .eq('mercadopago_payment_id', paymentId)

  // Actualizar en orders si existe
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('mercadopago_payment_id', paymentId)

  return {
    subscription_updated: !subscriptionError,
    order_updated: !orderError,
    errors: {
      subscription: subscriptionError?.message,
      order: orderError?.message
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verificar que el cliente de Supabase se inicializó correctamente
    if (!supabase || typeof supabase.from !== 'function') {
      console.error('❌ Error: Cliente de Supabase no inicializado correctamente')
      return NextResponse.json(
        { success: false, error: 'Error de configuración del servidor' },
        { status: 500 }
      )
    }
    
    const { payment_type = 'pending', limit = 50 } = await request.json()

    console.log(`🔍 Iniciando validación masiva de pagos (tipo: ${payment_type}, límite: ${limit})...`)

    // Obtener pagos pendientes de validación
    let query = supabase
      .from('subscription_billing_history')
      .select(`
        id,
        mercadopago_payment_id,
        amount,
        status,
        subscription_id,
        billing_date
      `)
      .not('mercadopago_payment_id', 'is', null)
      .limit(limit)

    // Filtrar por tipo de pago
    if (payment_type === 'pending') {
      query = query.in('status', ['pending', 'in_process', 'authorized'])
    } else if (payment_type === 'all') {
      // No filtrar por estado
    } else {
      query = query.eq('status', payment_type)
    }

    const { data: payments, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ Error al obtener pagos:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener pagos de la base de datos' },
        { status: 500 }
      )
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay pagos para validar',
        summary: {
          total_processed: 0,
          successful_validations: 0,
          failed_validations: 0,
          updated_payments: 0,
          total_amount_validated: 0,
          results: []
        }
      })
    }

    console.log(`📋 Encontrados ${payments.length} pagos para validar`)

    const results: PaymentValidationResult[] = []
    let successfulValidations = 0
    let failedValidations = 0
    let updatedPayments = 0
    let totalAmountValidated = 0

    // Procesar cada pago
    for (const payment of payments) {
      const result: PaymentValidationResult = {
        payment_id: payment.mercadopago_payment_id,
        subscription_id: payment.subscription_id,
        original_status: payment.status,
        mercadopago_status: '',
        amount: payment.amount,
        updated: false
      }

      try {
        console.log(`🔍 Validando pago ${payment.mercadopago_payment_id}...`)
        
        // Validar con MercadoPago
        const mercadopagoData = await validatePaymentWithMercadoPago(payment.mercadopago_payment_id)
        result.mercadopago_status = mercadopagoData.status
        
        // Verificar si necesita actualización
        if (payment.status !== mercadopagoData.status) {
          console.log(`📝 Actualizando estado: ${payment.status} → ${mercadopagoData.status}`)
          
          const updateResult = await updateLocalPaymentStatus(
            supabase,
            payment.mercadopago_payment_id,
            mercadopagoData
          )
          
          if (updateResult.subscription_updated || updateResult.order_updated) {
            result.updated = true
            updatedPayments++
          }
        }
        
        successfulValidations++
        totalAmountValidated += payment.amount
        
        console.log(`✅ Pago ${payment.mercadopago_payment_id} validado exitosamente`)
        
      } catch (error) {
        console.error(`❌ Error validando pago ${payment.mercadopago_payment_id}:`, error)
        result.error = error instanceof Error ? error.message : 'Error desconocido'
        failedValidations++
      }
      
      results.push(result)
      
      // Pequeña pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const summary: ValidationSummary = {
      total_processed: payments.length,
      successful_validations: successfulValidations,
      failed_validations: failedValidations,
      updated_payments: updatedPayments,
      total_amount_validated: totalAmountValidated,
      results
    }

    console.log(`🎯 Validación masiva completada:`, summary)

    return NextResponse.json({
      success: true,
      message: `Validación completada: ${successfulValidations}/${payments.length} exitosos`,
      summary
    })

  } catch (error) {
    console.error('💥 Error en validación masiva:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    
    // Obtener estadísticas de pagos por validar
    let query = supabase
      .from('subscription_billing_history')
      .select('id, status, amount, mercadopago_payment_id')
      .not('mercadopago_payment_id', 'is', null)
    
    if (status === 'pending') {
      query = query.in('status', ['pending', 'in_process', 'authorized'])
    } else if (status !== 'all') {
      query = query.eq('status', status)
    }
    
    const { data: payments, error } = await query
    
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener estadísticas' },
        { status: 500 }
      )
    }
    
    const stats = {
      total_payments: payments?.length || 0,
      total_amount: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      by_status: payments?.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
    }
    
    return NextResponse.json({
      success: true,
      stats
    })
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}