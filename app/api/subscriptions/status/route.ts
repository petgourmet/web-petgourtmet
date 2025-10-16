import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const external_reference = searchParams.get('external_reference')
    const subscription_id = searchParams.get('subscription_id')
    const customer_email = searchParams.get('customer_email')

    if (!external_reference && !subscription_id && !customer_email) {
      return NextResponse.json(
        { error: 'Se requiere al menos uno: external_reference, subscription_id, o customer_email' },
        { status: 400 }
      )
    }

    let query = supabase.from('unified_subscriptions').select('*')

    // Buscar por external_reference (prioridad)
    if (external_reference) {
      query = query.eq('external_reference', external_reference)
    } else if (subscription_id) {
      query = query.eq('id', subscription_id)
    } else if (customer_email) {
      query = query.eq('customer_email', customer_email)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error('Error consultando suscripción:', error)
      return NextResponse.json(
        { error: 'Error consultando suscripción', details: error.message },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    const subscription = subscriptions[0]

    console.log('📊 Estado de suscripción consultado:', {
      subscription_id: subscription.id,
      external_reference: subscription.external_reference,
      status: subscription.status,
      activated_at: subscription.activated_at,
      created_at: subscription.created_at
    })

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      external_reference: subscription.external_reference,
      status: subscription.status,
      customer_email: subscription.customer_email,
      plan_name: subscription.plan_name,
      amount: subscription.amount,
      currency: subscription.currency,
      activated_at: subscription.activated_at,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
      next_billing_date: subscription.next_billing_date,
      charges_made: subscription.charges_made || 0
    })

  } catch (error) {
    console.error('Error en endpoint status:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

// Método POST para actualizar estado (útil para pruebas)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_reference, subscription_id, status, force_update = false } = body

    if (!external_reference && !subscription_id) {
      return NextResponse.json(
        { error: 'Se requiere external_reference o subscription_id' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Se requiere el nuevo status' },
        { status: 400 }
      )
    }

    let query = supabase.from('unified_subscriptions')

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Si se está activando, agregar campos de activación
    if (status === 'active') {
      updateData.activated_at = new Date().toISOString()
      updateData.next_billing_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
      updateData.charges_made = (updateData.charges_made || 0) + 1
    }

    if (external_reference) {
      query = query.update(updateData).eq('external_reference', external_reference)
    } else {
      query = query.update(updateData).eq('id', subscription_id)
    }

    const { data, error } = await query.select().single()

    if (error) {
      console.error('Error actualizando suscripción:', error)
      return NextResponse.json(
        { error: 'Error actualizando suscripción', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Estado de suscripción actualizado:', {
      subscription_id: data.id,
      external_reference: data.external_reference,
      old_status: 'unknown',
      new_status: data.status
    })

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      subscription: data
    })

  } catch (error) {
    console.error('Error actualizando estado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}