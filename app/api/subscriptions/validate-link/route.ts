import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger, { LogCategory } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { external_reference, user_id } = await request.json()

    if (!external_reference) {
      return NextResponse.json(
        { error: 'external_reference es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Validar formato del external_reference
    const parts = external_reference.split('-')
    if (parts.length < 4 || parts[0] !== 'PG' || parts[1] !== 'SUB') {
      return NextResponse.json(
        { error: 'Formato de external_reference inválido' },
        { status: 400 }
      )
    }

    const extractedUserId = parts[3]
    const planId = parts[4]
    const timestamp = parseInt(parts[2])

    // Validar que el timestamp no sea muy antiguo (ej: más de 24 horas)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 horas en milisegundos
    if (now - timestamp > maxAge) {
      return NextResponse.json(
        { error: 'El enlace de suscripción ha expirado' },
        { status: 400 }
      )
    }

    // Si se proporciona user_id, validar que coincida con el extraído
    if (user_id && user_id !== extractedUserId) {
      return NextResponse.json(
        { error: 'El enlace no corresponde al usuario actual' },
        { status: 403 }
      )
    }

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', extractedUserId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si ya existe una suscripción activa para este usuario
    const { data: existingSubscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('id, status')
      .eq('user_id', extractedUserId)
      .eq('status', 'active')
      .single()

    if (!subError && existingSubscription) {
      return NextResponse.json(
        { 
          error: 'El usuario ya tiene una suscripción activa',
          existing_subscription: existingSubscription
        },
        { status: 409 }
      )
    }

    // Verificar si ya existe una suscripción con este external_reference
    const { data: duplicateSubscription, error: dupError } = await supabase
      .from('unified_subscriptions')
      .select('id, status')
      .eq('external_reference', external_reference)
      .single()

    if (!dupError && duplicateSubscription) {
      return NextResponse.json(
        { 
          error: 'Ya existe una suscripción con este enlace',
          existing_subscription: duplicateSubscription
        },
        { status: 409 }
      )
    }

    // Obtener información del plan si está disponible
    let planInfo = null
    if (planId) {
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (!planError && plan) {
        planInfo = plan
      }
    }

    logger.info(LogCategory.SUBSCRIPTION, 'Enlace de suscripción validado exitosamente', {
      external_reference,
      user_id: extractedUserId,
      plan_id: planId,
      timestamp
    })

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      external_reference,
      extracted_user_id: extractedUserId,
      plan_id: planId,
      plan_info: planInfo,
      timestamp,
      expires_at: new Date(timestamp + maxAge).toISOString()
    })

  } catch (error: any) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error validando enlace de suscripción', error.message, {
      error: error.message
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const external_reference = searchParams.get('external_reference')
    const user_id = searchParams.get('user_id')

    if (!external_reference) {
      return NextResponse.json(
        { error: 'external_reference es requerido' },
        { status: 400 }
      )
    }

    // Reutilizar la lógica del POST
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ external_reference, user_id }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return await POST(postRequest)

  } catch (error: any) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error en GET de validación de enlace', error.message, {
      error: error.message
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}