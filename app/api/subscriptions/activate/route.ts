import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger, LogCategory } from '@/lib/logger'
import { createAdvancedIdempotencyServiceServer } from '@/lib/services/advanced-idempotency.service.server'
import { createSubscriptionSyncServiceServer } from '@/lib/services/subscription-sync.service.server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      externalReference,
      collectionId,
      paymentId,
      status,
      collectionStatus,
      preferenceId,
      paymentType,
      userEmail
    } = body

    // Validar parámetros requeridos
    if (!userId || !externalReference) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and externalReference' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const supabase = createServiceClient()
    
    // Usar el nuevo servicio de idempotencia avanzado del servidor
    const advancedIdempotencyService = createAdvancedIdempotencyServiceServer()
    const newSyncService = createSubscriptionSyncServiceServer()
    
    // PASO 1: Adquirir lock para prevenir condiciones de carrera
    const lockKey = `subscription_activation:${userId}:${externalReference}`
    const lockAcquired = await advancedIdempotencyService.acquireLock(lockKey, 300) // 5 minutos
    
    if (!lockAcquired) {
      logger.warn('Could not acquire lock - another process is handling this subscription', 'SUBSCRIPTION_ACTIVATION', {
        userId,
        externalReference,
        lockKey
      })
      return NextResponse.json(
        { error: 'Another process is handling this subscription. Please wait.' },
        { status: 409 }
      )
    }
    
    try {
      // PASO 2: Verificar duplicados usando múltiples criterios
      const duplicateCheck = await advancedIdempotencyService.checkForDuplicates({
        external_reference: externalReference,
        user_id: userId,
        product_id: null, // Se determinará después
        payer_email: userEmail || ''
      })
      
      if (duplicateCheck.isDuplicate) {
        logger.info('Duplicate subscription detected - returning existing', 'SUBSCRIPTION_ACTIVATION', {
          userId,
          externalReference,
          existingSubscriptionId: duplicateCheck.existingSubscription?.id,
          duplicateReason: duplicateCheck.reason
        })
        
        if (duplicateCheck.existingSubscription?.status === 'active') {
          return NextResponse.json({
            success: true,
            message: 'Subscription already active',
            subscription: duplicateCheck.existingSubscription
          })
        }
      }
      
      // PASO 3: Buscar suscripción usando el servicio de sincronización mejorado
      let targetSubscription = await newSyncService.findSubscriptionByExternalReference(externalReference)
      
      // PASO 4: Si no se encuentra, usar criterios alternativos
      if (!targetSubscription) {
        logger.info('Subscription not found by external_reference - trying alternative criteria', 'SUBSCRIPTION_ACTIVATION', {
          userId,
          externalReference,
          collectionId,
          paymentId,
          preferenceId
        })
        
        const alternativeCriteria = {
          userId: userId,
          productId: null,
          payerEmail: userEmail || '',
          collectionId: collectionId || undefined,
          paymentId: paymentId || undefined,
          preferenceId: preferenceId || undefined
        }
        
        targetSubscription = await newSyncService.findSubscriptionByAlternativeCriteria(alternativeCriteria)
      }
      
      if (!targetSubscription) {
        logger.error('No subscription found for activation', 'SUBSCRIPTION_ACTIVATION', {
          userId,
          externalReference,
          collectionId,
          paymentId,
          preferenceId
        })
        return NextResponse.json(
          { error: 'No subscription found for activation' },
          { status: 404 }
        )
      }
      
      // PASO 5: Verificar que no esté ya activa
      if (targetSubscription.status === 'active') {
        logger.info('Subscription already active', 'SUBSCRIPTION_ACTIVATION', {
          subscriptionId: targetSubscription.id,
          externalReference
        })
        return NextResponse.json({
          success: true,
          message: 'Subscription already active',
          subscription: targetSubscription
        })
      }
      
      // PASO 6: Activar suscripción usando el servicio de sincronización
      const mercadoPagoData = {
        collection_id: collectionId,
        payment_id: paymentId,
        status: status,
        collection_status: collectionStatus,
        payment_type: paymentType,
        external_reference: externalReference,
        preference_id: preferenceId
      }
      
      const activationResult = await newSyncService.updateSubscriptionFromMercadoPago(
        targetSubscription.id,
        mercadoPagoData
      )
      
      if (!activationResult.success) {
        throw new Error(activationResult.error || 'Error activating subscription')
      }
      
      // PASO 7: Almacenar resultado en idempotencia
      await advancedIdempotencyService.storeResult(lockKey, {
        success: true,
        subscriptionId: targetSubscription.id,
        productName: targetSubscription.product_name,
        activatedAt: new Date().toISOString()
      })
      
      logger.info('✅ Subscription activated successfully with advanced services', 'SUBSCRIPTION_ACTIVATION', {
        subscriptionId: targetSubscription.id,
        externalReference,
        userId,
        productName: targetSubscription.product_name,
        duration: Date.now() - startTime
      })
      
      return NextResponse.json({
        success: true,
        message: 'Subscription activated successfully',
        subscription: {
          id: targetSubscription.id,
          product_name: targetSubscription.product_name,
          status: 'active'
        }
      })
      
    } finally {
      // PASO 8: Liberar lock
      await advancedIdempotencyService.releaseLock(lockKey)
    }

  } catch (error: any) {
    logger.error('❌ Critical error in subscription activation API', 'SUBSCRIPTION_ACTIVATION', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      { error: 'Internal server error during subscription activation' },
      { status: 500 }
    )
  }
}