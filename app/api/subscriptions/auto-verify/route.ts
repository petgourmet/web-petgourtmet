// app/api/subscriptions/auto-verify/route.ts
// Endpoint para verificación automática sin autenticación de usuario
// Usado por el sistema de verificación cada 5 segundos

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoSyncService } from '@/lib/mercadopago-sync-service'
import { logger, LogCategory } from '@/lib/logger'
import { getMercadoPagoAccessToken } from '@/lib/mercadopago-config'

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
      let preapprovalId = subscription.mercadopago_subscription_id
      let preapprovalCreated = false
      
      // Si no tiene preapproval y es una suscripción recurrente, crearlo
      if (!preapprovalId && subscription.subscription_type === 'recurring' && subscription.frequency) {
        try {
          logger.subscriptionEvent(subscriptionId.toString(), 'auto-verify-creating-preapproval', {
            userId,
            paymentId: mpStatus.paymentId,
            frequency: subscription.frequency
          })

          // Calcular próxima fecha de pago
          const nextPaymentDate = new Date()
          if (subscription.frequency === 'biweekly') {
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 14)
          } else if (subscription.frequency === 'monthly') {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
          } else if (subscription.frequency === 'quarterly') {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3)
          } else if (subscription.frequency === 'annual') {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1)
          }

          // Calcular fecha de finalización (1 año después)
          const endDate = new Date()
          endDate.setFullYear(endDate.getFullYear() + 1)

          // Crear preapproval en MercadoPago
          const preapprovalData = {
            reason: subscription.plan_name || 'Suscripción PetGourmet',
            auto_recurring: {
              frequency: subscription.frequency === 'biweekly' ? 14 : subscription.frequency === 'monthly' ? 1 : subscription.frequency === 'quarterly' ? 3 : 12,
              frequency_type: subscription.frequency === 'biweekly' ? 'days' : 'months',
              transaction_amount: subscription.amount || subscription.price,
              currency_id: subscription.currency || 'ARS',
              start_date: new Date().toISOString(),
              end_date: endDate.toISOString()
            },
            payer_email: subscription.customer_email || subscription.payer_email,
            external_reference: subscription.external_reference,
            back_url: `${process.env.NEXT_PUBLIC_BASE_URL}/suscripcion/exito?ref=${subscription.external_reference}`,
            status: 'authorized'
          }

          const preapprovalResponse = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getMercadoPagoAccessToken()}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `${subscription.external_reference}-preapproval-${Date.now()}`
            },
            body: JSON.stringify(preapprovalData)
          })

          if (preapprovalResponse.ok) {
            const preapprovalResult = await preapprovalResponse.json()
            preapprovalId = preapprovalResult.id
            preapprovalCreated = true
            
            logger.subscriptionEvent(subscriptionId.toString(), 'auto-verify-preapproval-created', {
              userId,
              preapprovalId,
              paymentId: mpStatus.paymentId
            })
          } else {
            const errorData = await preapprovalResponse.json()
            logger.subscriptionEvent(subscriptionId.toString(), 'auto-verify-preapproval-error', {
              userId,
              error: errorData
            })
          }
        } catch (preapprovalError: any) {
          logger.subscriptionEvent(subscriptionId.toString(), 'auto-verify-preapproval-exception', {
            userId,
            error: preapprovalError.message
          })
          // Continuar con la activación aunque falle el preapproval
        }
      }
      
      // Activar la suscripción
      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: 'active',
          mercadopago_subscription_id: preapprovalId || subscription.mercadopago_subscription_id,
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          last_billing_date: new Date().toISOString(),
          charges_made: 1
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

      logger.subscriptionActivationSuccess(subscriptionId.toString(), 'auto-verify', subscription.status || 'pending', {
        userId,
        newStatus: 'active',
        mpStatus: mpStatus.status,
        preapprovalId,
        preapprovalCreated,
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
        subscription: { ...subscription, status: 'active', mercadopago_subscription_id: preapprovalId },
        mpStatus,
        preapprovalCreated
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