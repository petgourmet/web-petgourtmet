// app/api/subscriptions/webhook-backup/route.ts
// Sistema de webhook backup que verifica suscripciones pendientes cada minuto

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoSyncService } from '@/lib/mercadopago-sync-service'
import { logger, LogCategory } from '@/lib/logger'

// Configuración de Supabase con service role key para operaciones administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verificar autorización (opcional: agregar API key o token)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.WEBHOOK_BACKUP_TOKEN || 'backup-webhook-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Intento de acceso no autorizado al webhook backup', {
        authHeader: authHeader ? 'presente' : 'ausente'
      })
      
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    logger.info(LogCategory.SUBSCRIPTION, '🔄 INICIANDO WEBHOOK BACKUP - Verificación de suscripciones pendientes')

    // Buscar todas las suscripciones pendientes que llevan más de 2 minutos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    
    const { data: pendingSubscriptions, error: fetchError } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', twoMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(20) // Procesar máximo 20 por ejecución

    if (fetchError) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error obteniendo suscripciones pendientes', fetchError.message)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
      logger.info(LogCategory.SUBSCRIPTION, '✅ No hay suscripciones pendientes para procesar')
      return NextResponse.json({
        success: true,
        message: 'No hay suscripciones pendientes para procesar',
        processed: 0,
        duration: `${Date.now() - startTime}ms`
      })
    }

    logger.info(LogCategory.SUBSCRIPTION, `🔍 Encontradas ${pendingSubscriptions.length} suscripciones pendientes para verificar`)

    // Inicializar servicio de sincronización
    const syncService = new MercadoPagoSyncService()
    
    let processedCount = 0
    let activatedCount = 0
    const results = []

    // Procesar cada suscripción pendiente
    for (const subscription of pendingSubscriptions) {
      try {
        logger.info(LogCategory.SUBSCRIPTION, `⚡ Verificando suscripción ${subscription.id} via webhook backup`)
        
        // Verificar estado en MercadoPago
        const verificationResult = await syncService.verifySubscriptionStatus(subscription.id)
        
        processedCount++
        
        if (verificationResult.success && verificationResult.updated) {
          activatedCount++
          logger.info(LogCategory.SUBSCRIPTION, `✅ ÉXITO: Suscripción ${subscription.id} activada via webhook backup`)
          
          results.push({
            subscriptionId: subscription.id,
            status: 'activated',
            previousStatus: 'pending',
            newStatus: verificationResult.currentStatus
          })
        } else {
          logger.info(LogCategory.SUBSCRIPTION, `⏳ Suscripción ${subscription.id} aún pendiente en MercadoPago`)
          
          results.push({
            subscriptionId: subscription.id,
            status: 'still_pending',
            mpStatus: verificationResult.mpStatus
          })
        }
        
        // Pequeña pausa entre verificaciones para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error: any) {
        logger.error(LogCategory.SUBSCRIPTION, `❌ Error verificando suscripción ${subscription.id}`, error.message)
        
        results.push({
          subscriptionId: subscription.id,
          status: 'error',
          error: error.message
        })
      }
    }

    const duration = Date.now() - startTime

    // Log del resumen
    logger.info(LogCategory.SUBSCRIPTION, `🎯 WEBHOOK BACKUP COMPLETADO`, {
      totalFound: pendingSubscriptions.length,
      processed: processedCount,
      activated: activatedCount,
      duration: `${duration}ms`
    })

    return NextResponse.json({
      success: true,
      message: `Webhook backup completado: ${activatedCount} suscripciones activadas de ${processedCount} procesadas`,
      summary: {
        totalFound: pendingSubscriptions.length,
        processed: processedCount,
        activated: activatedCount,
        stillPending: processedCount - activatedCount,
        duration: `${duration}ms`
      },
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.error(LogCategory.SUBSCRIPTION, '❌ Error crítico en webhook backup', error.message, {
      duration: `${duration}ms`,
      stack: error.stack
    })

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message,
        duration: `${duration}ms`
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar el estado del servicio
export async function GET(request: NextRequest) {
  try {
    // Contar suscripciones pendientes
    const { count: pendingCount, error } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      return NextResponse.json(
        { error: 'Error consultando base de datos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      service: 'webhook-backup',
      status: 'active',
      pendingSubscriptions: pendingCount || 0,
      lastCheck: new Date().toISOString(),
      description: 'Sistema de respaldo para activación automática de suscripciones'
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno del servidor', message: error.message },
      { status: 500 }
    )
  }
}