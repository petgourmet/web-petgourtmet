import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      external_reference,
      customer_email,
      plan_name,
      amount,
      currency = 'MXN',
      billing_frequency = 30,
      status = 'pending'
    } = body

    // Validar datos requeridos
    if (!external_reference || !customer_email || !plan_name || !amount) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: external_reference, customer_email, plan_name, amount' },
        { status: 400 }
      )
    }

    // Crear suscripción de prueba
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        external_reference,
        customer_email,
        plan_name,
        amount,
        currency,
        billing_frequency,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creando suscripción de prueba:', error)
      return NextResponse.json(
        { error: 'Error creando suscripción de prueba', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Suscripción de prueba creada:', {
      subscription_id: subscription.id,
      external_reference: subscription.external_reference,
      status: subscription.status
    })

    return NextResponse.json({
      success: true,
      message: 'Suscripción de prueba creada exitosamente',
      subscription_id: subscription.id,
      external_reference: subscription.external_reference,
      status: subscription.status
    })

  } catch (error) {
    console.error('Error en endpoint create-test:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

// Método GET para verificar que el endpoint está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de creación de suscripciones de prueba activo',
    timestamp: new Date().toISOString()
  })
}