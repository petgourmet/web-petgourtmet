// app/api/subscriptions/force-activate/route.ts
// Endpoint para forzar la activación de una suscripción cuando el webhook falla
// pero sabemos que el pago fue aprobado (usuario llegó a página de éxito)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, paymentId, externalReference } = await request.json()
    
    console.log('🔧 Forzando activación de suscripción', {
      subscriptionId,
      paymentId,
      externalReference,
      timestamp: new Date().toISOString()
    })

    // Buscar la suscripción por ID o external_reference
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let subscription
    
    if (subscriptionId) {
      const { data } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single()
      subscription = data
    } else if (externalReference) {
      // Extraer subscription ID del external_reference
      // Formato: userId_productId_frequency_timestamp_random
      // O buscar por metadata
      const { data } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .contains('metadata', { external_reference: externalReference })
        .single()
      
      if (!data) {
        // Intentar buscar la más reciente con status pending
        const { data: recentSub } = await supabase
          .from('unified_subscriptions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        subscription = recentSub
      } else {
        subscription = data
      }
    }

    if (!subscription) {
      console.error('❌ No se encontró la suscripción', { subscriptionId, externalReference })
      return NextResponse.json({
        success: false,
        error: 'Suscripción no encontrada'
      }, { status: 404 })
    }

    console.log('✅ Suscripción encontrada:', {
      id: subscription.id,
      status: subscription.status,
      mercadopago_payment_id: subscription.mercadopago_payment_id
    })

    // Si ya está activa, retornar éxito
    if (subscription.status === 'active') {
      console.log('✅ Suscripción ya está activa')
      return NextResponse.json({
        success: true,
        already_active: true,
        subscription: {
          id: subscription.id,
          status: subscription.status
        }
      })
    }

    // Actualizar suscripción a activa
    const updateData: any = {
      status: 'active',
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Si tenemos payment_id, agregarlo
    if (paymentId && !subscription.mercadopago_payment_id) {
      updateData.mercadopago_payment_id = paymentId
    }

    // Actualizar metadata para indicar activación forzada
    const currentMetadata = subscription.metadata || {}
    updateData.metadata = {
      ...currentMetadata,
      force_activated: true,
      force_activated_at: new Date().toISOString(),
      force_activation_reason: 'Payment approved but webhook failed'
    }

    const { data: updated, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscription.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error actualizando suscripción', updateError)
      return NextResponse.json({
        success: false,
        error: 'Error al actualizar suscripción',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Suscripción activada exitosamente', {
      id: updated.id,
      status: updated.status,
      activated_at: updated.activated_at
    })

    // Intentar enviar email de confirmación
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-subscription-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: updated.id,
          userId: updated.user_id
        })
      })
      console.log('📧 Email de confirmación enviado')
    } catch (emailError: any) {
      console.warn('⚠️ No se pudo enviar email de confirmación', emailError.message)
      // No fallar si el email falla
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: updated.id,
        status: updated.status,
        activated_at: updated.activated_at
      },
      message: 'Suscripción activada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error en force-activate', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno',
      details: error.message
    }, { status: 500 })
  }
}
