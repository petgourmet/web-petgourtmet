import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, LogCategory } from '@/lib/logger'

/**
 * Endpoint para limpiar suscripciones pendientes antiguas del mismo usuario/producto
 * Esto previene duplicaciones y conflictos en el flujo de creación
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, product_id, keep_latest = true } = await request.json()

    if (!user_id || !product_id) {
      return NextResponse.json(
        { success: false, error: 'user_id y product_id son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    logger.info(LogCategory.SUBSCRIPTION, 'Iniciando limpieza de suscripciones pendientes', {
      userId: user_id,
      productId: product_id,
      keepLatest: keep_latest
    })

    // 1. Buscar todas las suscripciones pendientes del usuario para este producto
    const { data: pendingSubscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .eq('product_id', product_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (fetchError) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error buscando suscripciones pendientes', fetchError.message, {
        userId: user_id,
        productId: product_id
      })
      return NextResponse.json(
        { success: false, error: 'Error al buscar suscripciones pendientes' },
        { status: 500 }
      )
    }

    if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
      logger.info(LogCategory.SUBSCRIPTION, 'No se encontraron suscripciones pendientes para limpiar', {
        userId: user_id,
        productId: product_id
      })
      return NextResponse.json({
        success: true,
        message: 'No hay suscripciones pendientes para limpiar',
        cleaned_count: 0
      })
    }

    let subscriptionsToDelete = []

    if (keep_latest && pendingSubscriptions.length > 1) {
      // Mantener la más reciente, eliminar las demás
      subscriptionsToDelete = pendingSubscriptions.slice(1)
      logger.info(LogCategory.SUBSCRIPTION, 'Manteniendo la suscripción más reciente', {
        userId: user_id,
        productId: product_id,
        totalFound: pendingSubscriptions.length,
        keepingId: pendingSubscriptions[0].id,
        deletingCount: subscriptionsToDelete.length
      })
    } else if (!keep_latest) {
      // Eliminar todas las pendientes
      subscriptionsToDelete = pendingSubscriptions
      logger.info(LogCategory.SUBSCRIPTION, 'Eliminando todas las suscripciones pendientes', {
        userId: user_id,
        productId: product_id,
        deletingCount: subscriptionsToDelete.length
      })
    }

    if (subscriptionsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay suscripciones para eliminar',
        cleaned_count: 0
      })
    }

    // 2. Eliminar las suscripciones seleccionadas
    const idsToDelete = subscriptionsToDelete.map(sub => sub.id)
    
    const { error: deleteError } = await supabase
      .from('unified_subscriptions')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error eliminando suscripciones pendientes', deleteError.message, {
        userId: user_id,
        productId: product_id,
        idsToDelete
      })
      return NextResponse.json(
        { success: false, error: 'Error al eliminar suscripciones pendientes' },
        { status: 500 }
      )
    }

    logger.info(LogCategory.SUBSCRIPTION, 'Suscripciones pendientes eliminadas exitosamente', {
      userId: user_id,
      productId: product_id,
      cleanedCount: idsToDelete.length,
      deletedIds: idsToDelete
    })

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${idsToDelete.length} suscripciones pendientes`,
      cleaned_count: idsToDelete.length,
      deleted_ids: idsToDelete,
      kept_subscription: keep_latest && pendingSubscriptions.length > 0 ? pendingSubscriptions[0].id : null
    })

  } catch (error) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error crítico en cleanup-pending', error instanceof Error ? error.message : 'Error desconocido', {
      error: error instanceof Error ? error.stack : error
    })
    
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}