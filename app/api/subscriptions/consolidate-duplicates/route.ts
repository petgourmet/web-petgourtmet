import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { external_reference } = await request.json()

    if (!external_reference) {
      return NextResponse.json(
        { error: 'external_reference es requerido' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Buscar todas las suscripciones con el mismo external_reference
    const { data: subscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', external_reference)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error al buscar suscripciones:', fetchError)
      return NextResponse.json(
        { error: 'Error al buscar suscripciones' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length <= 1) {
      return NextResponse.json({
        message: 'No se encontraron duplicados para consolidar',
        subscriptions_count: subscriptions?.length || 0
      })
    }

    // Identificar la suscripción más completa (la que tenga más datos)
    const mostComplete = subscriptions.reduce((best, current) => {
      const bestScore = calculateCompletenessScore(best)
      const currentScore = calculateCompletenessScore(current)
      return currentScore > bestScore ? current : best
    })

    // Consolidar datos de todas las suscripciones en la más completa
    const consolidatedData = {
      ...mostComplete,
      // Combinar metadata de todas las suscripciones
      metadata: subscriptions.reduce((combined, sub) => {
        return { ...combined, ...(sub.metadata || {}) }
      }, {}),
      // Usar la fecha de creación más antigua
      created_at: subscriptions[0].created_at,
      // Usar la fecha de actualización más reciente
      updated_at: new Date().toISOString()
    }

    // Actualizar la suscripción más completa con los datos consolidados
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        metadata: consolidatedData.metadata,
        created_at: consolidatedData.created_at,
        updated_at: consolidatedData.updated_at
      })
      .eq('id', mostComplete.id)

    if (updateError) {
      console.error('Error al actualizar suscripción:', updateError)
      return NextResponse.json(
        { error: 'Error al consolidar datos' },
        { status: 500 }
      )
    }

    // Eliminar las suscripciones duplicadas (mantener solo la más completa)
    const duplicateIds = subscriptions
      .filter(sub => sub.id !== mostComplete.id)
      .map(sub => sub.id)

    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('unified_subscriptions')
        .delete()
        .in('id', duplicateIds)

      if (deleteError) {
        console.error('Error al eliminar duplicados:', deleteError)
        return NextResponse.json(
          { error: 'Error al eliminar duplicados' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Duplicados consolidados exitosamente',
      consolidated_subscription_id: mostComplete.id,
      removed_duplicates: duplicateIds.length,
      total_processed: subscriptions.length
    })

  } catch (error) {
    console.error('Error en consolidación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Función para calcular qué tan completa está una suscripción
function calculateCompletenessScore(subscription: any): number {
  let score = 0
  
  // Campos básicos
  if (subscription.product_name) score += 1
  if (subscription.subscription_type) score += 1
  if (subscription.price) score += 1
  if (subscription.status) score += 1
  
  // Metadata
  const metadata = subscription.metadata || {}
  if (metadata.payment_id) score += 2
  if (metadata.collection_id) score += 2
  if (metadata.preference_id) score += 1
  if (metadata.payment_type) score += 1
  if (metadata.activated_at) score += 1
  
  // Fechas importantes
  if (subscription.next_billing_date) score += 1
  if (subscription.trial_end_date) score += 1
  
  return score
}