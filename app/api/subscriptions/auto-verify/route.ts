// app/api/subscriptions/auto-verify/route.ts
// Endpoint para verificación automática sin autenticación de usuario
// Usado por el sistema de verificación cada 5 segundos

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoSyncService } from '@/lib/mercadopago-sync-service'
import { logger, LogCategory } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Obtener datos del request
    const { subscriptionId, userId } = await request.json()
    
    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'ID de suscripción y usuario requeridos' },
        { status: 400 }
      )
    }

    logger.subscriptionEvent(subscriptionId.toString(), 'auto-verification-attempt', {
      userId,
      timestamp: new Date().toISOString()
    })

    // Usar cliente de Supabase con service role para acceso directo
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar que la suscripción existe y pertenece al usuario
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      logger.subscriptionEvent(subscriptionId.toString(), 'auto-verification-failure', {
        userId,
        error: 'Suscripción no encontrada',
        details: subError?.message
      })
      
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Si ya está activa, no hacer nada
    if (subscription.status === 'active') {
      logger.subscriptionEvent(subscriptionId.toString(), 'auto-verification-already-active', {
        userId,
        status: subscription.status
      })
      
      return NextResponse.json({
        success: true,
        updated: false,
        message: 'Suscripción ya está activa',
        subscription
      })
    }

    // Solo procesar si está pendiente
    if (subscription.status !== 'pending') {
      return NextResponse.json({
        success: true,
        updated: false,
        message: `Suscripción en estado ${subscription.status}, no requiere verificación`,
        subscription
      })
    }

    // Inicializar servicio de sincronización
    const syncService = new MercadoPagoSyncService()

    logger.subscriptionEvent(subscriptionId.toString(), 'auto-verification-checking-mp', {
      userId,
      externalReference: subscription.external_reference,
      mpSubscriptionId: subscription.mercadopago_subscription_id
    })

    // Verificar estado en MercadoPago
    let mpStatus = null

    if (subscription.mercadopago_subscription_id) {
      // Verificar por subscription ID
      mpStatus = await syncService.getSubscriptionStatus(subscription.mercadopago_subscription_id)
    } else if (subscription.external_reference) {
      // Verificar por external reference usando múltiples estrategias
      mpStatus = await syncService.getPaymentByExternalReference(subscription.external_reference, subscription)
    }

    if (mpStatus && (mpStatus.status === 'authorized' || mpStatus.status === 'approved')) {
      // Activar la suscripción
      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId)

      if (updateError) {
        logger.subscriptionEvent(subscriptionId.toString(), 'auto-verification-update-error', {
          userId,
          error: updateError.message,
          duration: Date.now() - startTime
        })
        
        return NextResponse.json(
          { error: 'Error actualizando suscripción', details: updateError.message },
          { status: 500 }
        )
      }

      logger.subscriptionActivationSuccess(subscriptionId.toString(), {
        userId,
        newStatus: 'active',
        mpStatus: mpStatus.status,
        duration: Date.now() - startTime
      })

      // Actualizar perfil del usuario
      await supabase
        .from('profiles')
        .update({ 
          has_active_subscription: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      return NextResponse.json({
        success: true,
        updated: true,
        statusChanged: true,
        message: 'Suscripción activada automáticamente',
        subscription: { ...subscription, status: 'active' },
        mpStatus
      })
    } else if (!mpStatus) {
      // NUEVA LÓGICA: Si no se encuentra en MercadoPago, marcar como huérfana
      const duration = Date.now() - startTime
      
      // Verificar si la suscripción es muy antigua (más de 1 hora)
      const createdAt = new Date(subscription.created_at)
      const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceCreation > 1) {
        // Marcar como error si es muy antigua y no existe en MercadoPago
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({
            status: 'error',
            updated_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString(),
            notes: `Suscripción huérfana - No existe en MercadoPago después de ${Math.round(hoursSinceCreation)} horas`
          })
          .eq('id', subscriptionId)
          .eq('user_id', userId)

        if (!updateError) {
          logger.subscriptionEvent(subscriptionId.toString(), 'orphaned-subscription-marked', {
            userId,
            hoursSinceCreation: Math.round(hoursSinceCreation),
            duration
          })
        }

        return NextResponse.json({
          success: false,
          error: 'Suscripción huérfana detectada',
          subscription: { ...subscription, status: 'error' },
          mpStatus: null,
          recommendation: 'Crear nueva suscripción'
        })
      }

      // Si es reciente, mantener como pending
      logger.subscriptionEvent(subscriptionId.toString(), 'mercadopago-not-found-recent', {
        userId,
        hoursSinceCreation: Math.round(hoursSinceCreation),
        duration
      })

      return NextResponse.json({
        success: false,
        subscription,
        mpStatus: null,
        message: 'Suscripción no encontrada en MercadoPago (reciente)'
      })
    } else {
      // MercadoPago encontrado pero no autorizado
      logger.subscriptionEvent(subscriptionId.toString(), 'auto-verification-no-action', {
        userId,
        mpStatus: mpStatus?.status,
        duration: Date.now() - startTime
      })

      return NextResponse.json({
        success: false,
        updated: false,
        statusChanged: false,
        message: 'Suscripción aún pendiente en MercadoPago',
        subscription,
        mpStatus
      })
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.systemError('Auto-verification error', error, {
      subscriptionId: request.body?.subscriptionId,
      duration
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'Endpoint para verificación automática de suscripciones' },
    { status: 200 }
  )
}