import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Configuración de MercadoPago
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

interface CleanupResult {
  subscription_id: string
  mercadopago_id?: string
  user_name?: string
  product_name?: string
  old_status: string
  new_status: string
  reason?: string
}

interface CleanupSummary {
  total_checked: number
  updated_subscriptions: number
  cancelled_subscriptions: number
  paused_subscriptions: number
  errors: number
  updated_details: CleanupResult[]
}

// Función para consultar el estado de una suscripción en MercadoPago
async function getMercadoPagoSubscriptionStatus(subscriptionId: string) {
  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`Error al consultar MP subscription ${subscriptionId}:`, response.status)
      return null
    }

    const data = await response.json()
    return {
      id: data.id,
      status: data.status,
      reason: data.reason || null,
      last_modified: data.last_modified
    }
  } catch (error) {
    console.error(`Error al consultar MP subscription ${subscriptionId}:`, error)
    return null
  }
}

// Función para mapear estados de MercadoPago a estados locales
function mapMercadoPagoStatus(mpStatus: string): string {
  switch (mpStatus) {
    case 'authorized':
    case 'active':
      return 'active'
    case 'paused':
      return 'paused'
    case 'cancelled':
    case 'finished':
      return 'cancelled'
    case 'pending':
      return 'pending'
    default:
      return 'paused' // Estado por defecto para estados desconocidos
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza de suscripciones...')

    // Verificar token de acceso de MercadoPago
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error('❌ Token de MercadoPago no configurado')
      return NextResponse.json(
        { success: false, error: 'Token de MercadoPago no configurado' },
        { status: 500 }
      )
    }

    // Crear cliente de servicio de Supabase
    const supabase = createServiceClient()

    // Obtener todas las suscripciones activas y pausadas que tengan mercadopago_subscription_id
    const { data: subscriptions, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select(`
        id,
        status,
        mercadopago_subscription_id,
        user_id,
        product_id,
        products!inner(name)
      `)
      .in('status', ['active', 'paused', 'pending'])
      .not('mercadopago_subscription_id', 'is', null)

    if (fetchError) {
      console.error('❌ Error al obtener suscripciones:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener suscripciones de la base de datos' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No se encontraron suscripciones para limpiar')
      return NextResponse.json({
        success: true,
        summary: {
          total_checked: 0,
          updated_subscriptions: 0,
          cancelled_subscriptions: 0,
          paused_subscriptions: 0,
          errors: 0,
          updated_details: []
        }
      })
    }

    console.log(`📊 Revisando ${subscriptions.length} suscripciones...`)

    const summary: CleanupSummary = {
      total_checked: subscriptions.length,
      updated_subscriptions: 0,
      cancelled_subscriptions: 0,
      paused_subscriptions: 0,
      errors: 0,
      updated_details: []
    }

    // Procesar cada suscripción
    for (const subscription of subscriptions) {
      try {
        console.log(`🔍 Revisando suscripción ${subscription.id} (MP: ${subscription.mercadopago_subscription_id})`)

        // Consultar estado en MercadoPago
        const mpStatus = await getMercadoPagoSubscriptionStatus(subscription.mercadopago_subscription_id)
        
        if (!mpStatus) {
          console.warn(`⚠️ No se pudo obtener estado de MP para suscripción ${subscription.id}`)
          summary.errors++
          continue
        }

        // Mapear estado de MercadoPago a estado local
        const newStatus = mapMercadoPagoStatus(mpStatus.status)
        
        // Solo actualizar si el estado cambió
        if (newStatus !== subscription.status) {
          console.log(`🔄 Actualizando suscripción ${subscription.id}: ${subscription.status} → ${newStatus}`)
          
          // Actualizar en la base de datos
          const { error: updateError } = await supabase
            .from('unified_subscriptions')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
              ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString() })
            })
            .eq('id', subscription.id)

          if (updateError) {
            console.error(`❌ Error al actualizar suscripción ${subscription.id}:`, updateError)
            summary.errors++
            continue
          }

          // Agregar a estadísticas
          summary.updated_subscriptions++
          if (newStatus === 'cancelled') {
            summary.cancelled_subscriptions++
          } else if (newStatus === 'paused') {
            summary.paused_subscriptions++
          }

          // Agregar detalles
          summary.updated_details.push({
            subscription_id: subscription.id,
            mercadopago_id: subscription.mercadopago_subscription_id,
            user_name: subscription.user_profiles?.full_name,
            product_name: subscription.products?.name,
            old_status: subscription.status,
            new_status: newStatus,
            reason: mpStatus.reason
          })

          console.log(`✅ Suscripción ${subscription.id} actualizada exitosamente`)
        } else {
          console.log(`ℹ️ Suscripción ${subscription.id} ya está sincronizada (${subscription.status})`)
        }
      } catch (error) {
        console.error(`💥 Error procesando suscripción ${subscription.id}:`, error)
        summary.errors++
      }
    }

    console.log('✅ Limpieza completada:', summary)

    return NextResponse.json({
      success: true,
      summary
    })

  } catch (error) {
    console.error('💥 Error general en limpieza:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor durante la limpieza',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// Método GET para obtener estadísticas sin ejecutar limpieza
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Contar suscripciones que podrían necesitar limpieza
    const { count, error } = await supabase
      .from('unified_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'paused', 'pending'])
      .not('mercadopago_subscription_id', 'is', null)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener estadísticas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats: {
        subscriptions_to_check: count || 0
      }
    })
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}