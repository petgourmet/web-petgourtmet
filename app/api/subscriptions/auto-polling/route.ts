// app/api/subscriptions/auto-polling/route.ts
// Sistema de polling automático que se ejecuta cada 30 segundos para activar suscripciones pendientes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MercadoPagoSyncService } from '@/lib/mercadopago-sync-service'
import { logger, LogCategory } from '@/lib/logger'

// Configuración de Supabase con service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Variable para controlar el estado del polling
let isPollingActive = false
let pollingInterval: NodeJS.Timeout | null = null
let lastPollingResult: any = null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'start') {
      return startPolling()
    } else if (action === 'stop') {
      return stopPolling()
    } else if (action === 'status') {
      return getPollingStatus()
    } else {
      // Ejecutar una verificación manual inmediata
      return await executePollingCheck()
    }

  } catch (error: any) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error en auto-polling endpoint', error.message)
    return NextResponse.json(
      { error: 'Error interno del servidor', message: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return getPollingStatus()
}

async function startPolling() {
  if (isPollingActive) {
    return NextResponse.json({
      success: true,
      message: 'El polling ya está activo',
      status: 'already_running'
    })
  }

  logger.info(LogCategory.SUBSCRIPTION, '🚀 INICIANDO POLLING AUTOMÁTICO cada 30 segundos')

  isPollingActive = true
  
  // Ejecutar primera verificación inmediatamente
  await executePollingCheck()

  // Configurar intervalo de 30 segundos
  pollingInterval = setInterval(async () => {
    if (isPollingActive) {
      await executePollingCheck()
    }
  }, 30000) // 30 segundos

  return NextResponse.json({
    success: true,
    message: 'Polling automático iniciado correctamente',
    interval: '30 segundos',
    status: 'started'
  })
}

async function stopPolling() {
  if (!isPollingActive) {
    return NextResponse.json({
      success: true,
      message: 'El polling no estaba activo',
      status: 'already_stopped'
    })
  }

  logger.info(LogCategory.SUBSCRIPTION, '🛑 DETENIENDO POLLING AUTOMÁTICO')

  isPollingActive = false
  
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }

  return NextResponse.json({
    success: true,
    message: 'Polling automático detenido correctamente',
    status: 'stopped'
  })
}

async function getPollingStatus() {
  return NextResponse.json({
    isActive: isPollingActive,
    interval: isPollingActive ? '30 segundos' : null,
    lastResult: lastPollingResult,
    uptime: isPollingActive ? 'Activo' : 'Inactivo',
    nextCheck: isPollingActive ? 'En 30 segundos' : 'N/A'
  })
}

async function executePollingCheck() {
  const startTime = Date.now()
  
  try {
    logger.info(LogCategory.SUBSCRIPTION, '⚡ EJECUTANDO VERIFICACIÓN AUTOMÁTICA DE POLLING')

    // Buscar suscripciones pendientes recientes (últimos 30 minutos)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: pendingSubscriptions, error: fetchError } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(10) // Procesar máximo 10 por verificación

    if (fetchError) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error obteniendo suscripciones para polling', fetchError.message)
      lastPollingResult = {
        success: false,
        error: fetchError.message,
        timestamp: new Date().toISOString()
      }
      return
    }

    if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
      logger.info(LogCategory.SUBSCRIPTION, '✅ POLLING: No hay suscripciones pendientes recientes')
      lastPollingResult = {
        success: true,
        message: 'No hay suscripciones pendientes para procesar',
        processed: 0,
        activated: 0,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      }
      return
    }

    logger.info(LogCategory.SUBSCRIPTION, `🔍 POLLING: Verificando ${pendingSubscriptions.length} suscripciones pendientes`)

    // Inicializar servicio de sincronización
    const syncService = new MercadoPagoSyncService()
    
    let processedCount = 0
    let activatedCount = 0
    const results = []

    // Procesar cada suscripción
    for (const subscription of pendingSubscriptions) {
      try {
        logger.info(LogCategory.SUBSCRIPTION, `⚡ POLLING: Verificando suscripción ${subscription.id}`)
        
        const verificationResult = await syncService.verifySubscriptionStatus(subscription.id)
        
        processedCount++
        
        if (verificationResult.success && verificationResult.updated) {
          activatedCount++
          logger.info(LogCategory.SUBSCRIPTION, `✅ POLLING ÉXITO: Suscripción ${subscription.id} activada`)
          
          results.push({
            subscriptionId: subscription.id,
            status: 'activated',
            userEmail: subscription.customer_data ? JSON.parse(subscription.customer_data).email : 'N/A'
          })
        } else {
          results.push({
            subscriptionId: subscription.id,
            status: 'still_pending'
          })
        }
        
        // Pausa breve entre verificaciones
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error: any) {
        logger.error(LogCategory.SUBSCRIPTION, `❌ POLLING ERROR: Suscripción ${subscription.id}`, error.message)
        results.push({
          subscriptionId: subscription.id,
          status: 'error',
          error: error.message
        })
      }
    }

    const duration = Date.now() - startTime

    lastPollingResult = {
      success: true,
      message: `Polling completado: ${activatedCount} activadas de ${processedCount} procesadas`,
      processed: processedCount,
      activated: activatedCount,
      results,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }

    logger.info(LogCategory.SUBSCRIPTION, `🎯 POLLING COMPLETADO`, {
      processed: processedCount,
      activated: activatedCount,
      duration: `${duration}ms`
    })

    return lastPollingResult

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.error(LogCategory.SUBSCRIPTION, '❌ Error crítico en polling automático', error.message)
    
    lastPollingResult = {
      success: false,
      error: error.message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }
  }
}

// Iniciar polling automáticamente al cargar el módulo (opcional)
// Descomenta las siguientes líneas si quieres que se inicie automáticamente
/*
if (process.env.NODE_ENV === 'production') {
  setTimeout(() => {
    startPolling()
  }, 5000) // Iniciar después de 5 segundos
}
*/