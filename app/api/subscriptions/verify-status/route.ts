// app/api/subscriptions/verify-status/route.ts
// Endpoint para verificar manualmente el estado de una suscripción específica

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MercadoPagoSyncService } from '@/lib/mercadopago-sync-service'
import { logger, LogCategory } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Obtener datos del request
    const { subscriptionId } = await request.json()
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'ID de suscripción requerido' },
        { status: 400 }
      )
    }

    logger.info(LogCategory.SUBSCRIPTION, 'Iniciando verificación manual de suscripción', {
      subscriptionId
    })

    // Inicializar cliente de Supabase con cookies para autenticación
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Verificar autenticación del usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Intento de verificación sin autenticación', {
        subscriptionId,
        error: authError?.message
      })
      
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que la suscripción pertenece al usuario
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      logger.warn(LogCategory.SUBSCRIPTION, 'Suscripción no encontrada o no pertenece al usuario', {
        subscriptionId,
        userId: user.id,
        error: subError?.message
      })
      
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Inicializar servicio de sincronización
    const syncService = new MercadoPagoSyncService()

    // Verificar estado actual
    const verificationResult = await syncService.verifySubscriptionStatus(subscriptionId)
    
    const duration = Date.now() - startTime

    // Preparar respuesta
    const response = {
      success: verificationResult.success,
      subscriptionId,
      currentStatus: verificationResult.currentStatus,
      mpStatus: verificationResult.mpStatus,
      updated: verificationResult.updated,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`
    }

    // Log del resultado
    if (verificationResult.updated) {
      logger.info(LogCategory.SUBSCRIPTION, '✅ Suscripción verificada y actualizada', {
        subscriptionId,
        userId: user.id,
        oldStatus: subscription.status,
        newStatus: verificationResult.currentStatus,
        duration
      })
    } else if (verificationResult.success) {
      logger.info(LogCategory.SUBSCRIPTION, '✅ Suscripción verificada - sin cambios', {
        subscriptionId,
        userId: user.id,
        status: verificationResult.currentStatus,
        duration
      })
    } else {
      logger.warn(LogCategory.SUBSCRIPTION, '⚠️ Error verificando suscripción', {
        subscriptionId,
        userId: user.id,
        status: verificationResult.currentStatus,
        duration
      })
    }

    return NextResponse.json(response)

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.error(LogCategory.SUBSCRIPTION, '❌ Error en verificación de suscripción', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificación rápida sin autenticación (solo para admin/cron)
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')
    const adminSecret = searchParams.get('secret')
    
    // Verificar autorización de admin
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'ID de suscripción requerido' },
        { status: 400 }
      )
    }

    logger.info(LogCategory.SUBSCRIPTION, 'Verificación admin de suscripción', {
      subscriptionId
    })

    // Inicializar servicio de sincronización
    const syncService = new MercadoPagoSyncService()

    // Verificar estado
    const verificationResult = await syncService.verifySubscriptionStatus(parseInt(subscriptionId))
    
    const duration = Date.now() - startTime

    const response = {
      success: verificationResult.success,
      subscriptionId: parseInt(subscriptionId),
      currentStatus: verificationResult.currentStatus,
      mpStatus: verificationResult.mpStatus,
      updated: verificationResult.updated,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`
    }

    logger.info(LogCategory.SUBSCRIPTION, 'Verificación admin completada', {
      ...response,
      duration
    })

    return NextResponse.json(response)

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.error(LogCategory.SUBSCRIPTION, '❌ Error en verificación admin', {
      error: error.message,
      duration: `${duration}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      },
      { status: 500 }
    )
  }
}