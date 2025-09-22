import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const operation_id = `consolidate-${Date.now()}`
  
  try {
    console.log('🔧 Iniciando consolidación de suscripciones duplicadas', { operation_id })
    
    const supabase = createServiceClient()
    
    // Buscar las dos suscripciones
    const { data: subscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', 'f68400d1-43df-4813-8fa2-d101e65d59ff')
      .in('id', [45, 46])
    
    if (fetchError) {
      console.error('❌ Error buscando suscripciones', fetchError)
      return NextResponse.json({ error: 'Error al buscar suscripciones' }, { status: 500 })
    }
    
    if (!subscriptions || subscriptions.length !== 2) {
      console.error('❌ No se encontraron ambas suscripciones', { found: subscriptions?.length || 0 })
      return NextResponse.json({ error: 'Suscripciones no encontradas' }, { status: 404 })
    }
    
    const completeSubscription = subscriptions.find(s => s.id === 45) // La completa
    const incompleteSubscription = subscriptions.find(s => s.id === 46) // La incompleta
    
    if (!completeSubscription || !incompleteSubscription) {
      console.error('❌ No se pudieron identificar las suscripciones', {
        complete_found: !!completeSubscription,
        incomplete_found: !!incompleteSubscription
      })
      return NextResponse.json({ error: 'Error identificando suscripciones' }, { status: 400 })
    }
    
    console.log('📋 Suscripciones encontradas', {
      operation_id,
      complete_id: completeSubscription.id,
      complete_status: completeSubscription.status,
      incomplete_id: incompleteSubscription.id,
      incomplete_status: incompleteSubscription.status
    })
    
    // Preparar datos para transferir - empezando con campos básicos
    const updateData = {
      // Solo campos básicos primero
      product_id: completeSubscription.product_id,
      product_name: completeSubscription.product_name,
      customer_data: completeSubscription.customer_data,
      cart_items: completeSubscription.cart_items,
      updated_at: new Date().toISOString()
    }
    
    console.log('📝 Datos a actualizar:', {
      operation_id,
      updateData: Object.keys(updateData),
      product_id: updateData.product_id,
      has_customer_data: !!updateData.customer_data,
      has_cart_items: !!updateData.cart_items
    })
    
    // NUEVO ENFOQUE: Eliminar la suscripción incompleta y activar la completa
    console.log('🗑️ Eliminando suscripción incompleta (sin datos)', {
      operation_id,
      incomplete_id: incompleteSubscription.id,
      incomplete_status: incompleteSubscription.status
    })

    // Eliminar la suscripción incompleta
    const { error: deleteError } = await supabase
      .from('unified_subscriptions')
      .delete()
      .eq('id', incompleteSubscription.id)

    if (deleteError) {
      console.error('❌ Error eliminando suscripción incompleta', deleteError)
      return NextResponse.json(
        { error: 'Error eliminando suscripción incompleta', details: deleteError },
        { status: 500 }
      )
    }

    console.log('✅ Suscripción incompleta eliminada exitosamente', {
      operation_id,
      deleted_id: incompleteSubscription.id
    })

    // Activar la suscripción completa (cambiar de pending a active)
    console.log('🔄 Activando suscripción completa', {
      operation_id,
      complete_id: completeSubscription.id,
      current_status: completeSubscription.status
    })

    const { data: activatedSubscription, error: activateError } = await supabase
      .from('unified_subscriptions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', completeSubscription.id)
      .select()
      .single()

    if (activateError) {
      console.error('❌ Error activando suscripción completa', activateError)
      return NextResponse.json(
        { error: 'Error activando suscripción completa', details: activateError },
        { status: 500 }
      )
    }

    console.log('✅ Consolidación completada exitosamente', {
      operation_id,
      final_subscription_id: activatedSubscription.id,
      deleted_incomplete_id: incompleteSubscription.id,
      final_status: activatedSubscription.status,
      product_name: activatedSubscription.product_name
    })

    return NextResponse.json({
      success: true,
      message: 'Suscripciones consolidadas exitosamente',
      operation_id,
      consolidated_subscription: {
        id: activatedSubscription.id,
        status: activatedSubscription.status,
        product_name: activatedSubscription.product_name,
        external_reference: activatedSubscription.external_reference
      },
      deleted_incomplete_id: incompleteSubscription.id
    })
    
  } catch (error) {
    console.error('❌ Error en consolidación de suscripciones', error instanceof Error ? error.message : String(error), {
      operation_id,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        operation_id 
      },
      { status: 500 }
    )
  }
}