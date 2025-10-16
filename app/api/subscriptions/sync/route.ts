import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoSyncService } from '@/lib/mercadopago-sync-service'
import { createClient } from '@/lib/supabase/server'

// Instancia del servicio de sincronización
const syncService = new MercadoPagoSyncService()

/**
 * Endpoint para sincronizar suscripciones de un usuario con MercadoPago
 * GET /api/subscriptions/sync?user_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tiene permiso
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log(`🔄 Solicitud de sincronización para usuario: ${userId}`)

    // Obtener todas las suscripciones del usuario
    const { data: subscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .not('mercadopago_subscription_id', 'is', null)
      .in('status', ['active', 'pending', 'paused'])

    if (fetchError) {
      return NextResponse.json(
        { error: 'Error obteniendo suscripciones', details: fetchError.message },
        { status: 500 }
      )
    }

    // Sincronizar cada suscripción
    let synced = 0
    const errors: string[] = []

    for (const subscription of subscriptions || []) {
      try {
        const success = await syncService.syncSubscription(subscription)
        if (success) synced++
      } catch (error) {
        errors.push(`Error en suscripción ${subscription.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${synced} suscripciones actualizadas`,
      synced,
      total: subscriptions?.length || 0,
      errors
    })

  } catch (error) {
    console.error('❌ Error en endpoint de sincronización:', error)
    return NextResponse.json(
      { 
        error: 'Error sincronizando suscripciones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscriptions/sync
 * Sincroniza una suscripción específica
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscription_id, user_id } = body

    if (!subscription_id || !user_id) {
      return NextResponse.json(
        { error: 'subscription_id y user_id son requeridos' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== user_id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener la suscripción
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', user_id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // Sincronizar
    const syncStatus = await (syncService as any).syncSingleSubscription(subscription)

    return NextResponse.json({
      success: true,
      synced: syncStatus.needsSync,
      status: syncStatus.mercadopagoStatus,
      reason: syncStatus.reason
    })

  } catch (error) {
    console.error('❌ Error sincronizando suscripción:', error)
    return NextResponse.json(
      { 
        error: 'Error sincronizando suscripción',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
