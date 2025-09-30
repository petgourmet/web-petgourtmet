import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger, LogCategory } from '@/lib/logger'

/**
 * SISTEMA DE MONITOREO DE ACTIVACIONES DE SUSCRIPCIONES
 * 
 * Este endpoint proporciona estadísticas y alertas sobre activaciones fallidas,
 * suscripciones pendientes y el estado general del sistema de activación automática.
 * 
 * Funcionalidades:
 * - Detectar suscripciones pendientes con pagos aprobados
 * - Estadísticas de activación en tiempo real
 * - Alertas de activaciones fallidas
 * - Dashboard de monitoreo para administradores
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h' // 1h, 6h, 24h, 7d
    const includeDetails = searchParams.get('details') === 'true'
    
    const supabase = createServiceClient()
    
    // Calcular fecha de inicio según timeframe
    const now = new Date()
    let startDate = new Date(now)
    
    switch (timeframe) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1)
        break
      case '6h':
        startDate.setHours(startDate.getHours() - 6)
        break
      case '24h':
        startDate.setDate(startDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      default:
        startDate.setDate(startDate.getDate() - 1)
    }
    
    // ESTADÍSTICAS GENERALES
    const { data: allSubscriptions, error: allError } = await supabase
      .from('unified_subscriptions')
      .select('id, status, created_at, activated_at, external_reference, product_name')
      .gte('created_at', startDate.toISOString())
    
    if (allError) {
      throw new Error(`Error obteniendo estadísticas: ${allError.message}`)
    }
    
    // Agrupar por estado
    const statusStats = allSubscriptions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // SUSCRIPCIONES PENDIENTES CRÍTICAS (más de 30 minutos)
    const criticalThreshold = new Date(Date.now() - 30 * 60 * 1000) // 30 minutos
    const { data: criticalPending, error: criticalError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', criticalThreshold.toISOString())
      .order('created_at', { ascending: true })
      .limit(50)
    
    if (criticalError) {
      throw new Error(`Error obteniendo suscripciones críticas: ${criticalError.message}`)
    }
    
    // SUSCRIPCIONES ACTIVADAS RECIENTEMENTE
    const { data: recentActivations, error: activationError } = await supabase
      .from('unified_subscriptions')
      .select('id, product_name, activated_at, external_reference, user_id')
      .eq('status', 'active')
      .not('activated_at', 'is', null)
      .gte('activated_at', startDate.toISOString())
      .order('activated_at', { ascending: false })
      .limit(20)
    
    if (activationError) {
      throw new Error(`Error obteniendo activaciones recientes: ${activationError.message}`)
    }
    
    // CALCULAR TIEMPO PROMEDIO DE ACTIVACIÓN
    const activatedSubs = allSubscriptions.filter(sub => 
      sub.status === 'active' && sub.activated_at
    )
    
    let avgActivationTime = 0
    if (activatedSubs.length > 0) {
      const totalTime = activatedSubs.reduce((sum, sub) => {
        const created = new Date(sub.created_at).getTime()
        const activated = new Date(sub.activated_at!).getTime()
        return sum + (activated - created)
      }, 0)
      avgActivationTime = Math.round(totalTime / activatedSubs.length / 1000) // en segundos
    }
    
    // DETECTAR POSIBLES ACTIVACIONES FALLIDAS
    const suspiciousPending = criticalPending.filter(sub => {
      const minutesOld = (Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60)
      return minutesOld > 60 && sub.external_reference // Más de 1 hora con external_reference
    })
    
    // ESTADÍSTICAS DE BILLING HISTORY
    const { data: billingStats, error: billingError } = await supabase
      .from('subscription_billing_history')
      .select('status, created_at')
      .gte('created_at', startDate.toISOString())
    
    const billingStatusStats = billingStats?.reduce((acc, bill) => {
      acc[bill.status] = (acc[bill.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    // ALERTAS AUTOMÁTICAS
    const alerts = []
    
    // Alerta: Muchas suscripciones pendientes
    if ((statusStats.pending || 0) > 10) {
      alerts.push({
        type: 'warning',
        message: `${statusStats.pending} suscripciones pendientes detectadas`,
        severity: 'medium',
        action: 'Revisar proceso de activación automática'
      })
    }
    
    // Alerta: Suscripciones críticas (muy antiguas)
    if (suspiciousPending.length > 0) {
      alerts.push({
        type: 'error',
        message: `${suspiciousPending.length} suscripciones con posibles activaciones fallidas`,
        severity: 'high',
        action: 'Activación manual requerida',
        details: suspiciousPending.map(sub => ({
          id: sub.id,
          external_reference: sub.external_reference,
          product_name: sub.product_name,
          minutes_old: Math.round((Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60))
        }))
      })
    }
    
    // Alerta: Tiempo de activación muy lento
    if (avgActivationTime > 300) { // Más de 5 minutos
      alerts.push({
        type: 'warning',
        message: `Tiempo promedio de activación: ${Math.round(avgActivationTime / 60)} minutos`,
        severity: 'medium',
        action: 'Optimizar proceso de activación'
      })
    }
    
    // Alerta: Pocas activaciones exitosas
    const activationRate = activatedSubs.length / (allSubscriptions.length || 1)
    if (activationRate < 0.8 && allSubscriptions.length > 5) {
      alerts.push({
        type: 'error',
        message: `Tasa de activación baja: ${Math.round(activationRate * 100)}%`,
        severity: 'high',
        action: 'Revisar webhook y endpoints de activación'
      })
    }
    
    const response = {
      success: true,
      timeframe,
      timestamp: new Date().toISOString(),
      statistics: {
        total_subscriptions: allSubscriptions.length,
        by_status: statusStats,
        activation_rate: Math.round(activationRate * 100),
        avg_activation_time_seconds: avgActivationTime,
        critical_pending_count: criticalPending.length,
        suspicious_pending_count: suspiciousPending.length
      },
      billing_statistics: {
        total_billing_records: billingStats?.length || 0,
        by_status: billingStatusStats
      },
      alerts,
      recent_activations: recentActivations.map(sub => ({
        id: sub.id,
        product_name: sub.product_name,
        activated_at: sub.activated_at,
        external_reference: sub.external_reference,
        minutes_ago: Math.round((Date.now() - new Date(sub.activated_at!).getTime()) / (1000 * 60))
      })),
      health_score: calculateHealthScore(statusStats, avgActivationTime, activationRate, alerts.length)
    }
    
    // Incluir detalles si se solicita
    if (includeDetails) {
      response['critical_pending_details'] = criticalPending.map(sub => ({
        id: sub.id,
        external_reference: sub.external_reference,
        product_name: sub.product_name,
        created_at: sub.created_at,
        minutes_old: Math.round((Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60)),
        customer_email: sub.customer_data?.email
      }))
    }
    
    // Log del monitoreo
    logger.info('📊 Monitoreo de suscripciones ejecutado', 'SUBSCRIPTION_MONITORING', {
      timeframe,
      totalSubscriptions: allSubscriptions.length,
      pendingCount: statusStats.pending || 0,
      activeCount: statusStats.active || 0,
      criticalCount: criticalPending.length,
      alertCount: alerts.length,
      healthScore: response.health_score
    })
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    logger.error('❌ Error en monitoreo de suscripciones', 'SUBSCRIPTION_MONITORING_ERROR', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { error: 'Error en sistema de monitoreo' },
      { status: 500 }
    )
  }
}

/**
 * POST - Ejecutar acciones de corrección automática
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, subscription_ids } = body
    
    const supabase = createServiceClient()
    const results = []
    
    switch (action) {
      case 'force_activate_suspicious':
        // Activar forzadamente suscripciones sospechosas
        if (!subscription_ids || !Array.isArray(subscription_ids)) {
          return NextResponse.json(
            { error: 'Se requiere array de subscription_ids' },
            { status: 400 }
          )
        }
        
        for (const subId of subscription_ids) {
          try {
            // Llamar al endpoint de auto-activación
            const activateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/auto-activate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription_id: subId })
            })
            
            const activateResult = await activateResponse.json()
            results.push({
              subscription_id: subId,
              success: activateResponse.ok,
              result: activateResult
            })
          } catch (error: any) {
            results.push({
              subscription_id: subId,
              success: false,
              error: error.message
            })
          }
        }
        break
        
      case 'cleanup_old_pending':
        // Limpiar suscripciones pendientes muy antiguas (más de 7 días)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        
        const { data: oldPending, error: oldError } = await supabase
          .from('unified_subscriptions')
          .select('id, external_reference, created_at')
          .eq('status', 'pending')
          .lt('created_at', weekAgo.toISOString())
        
        if (oldError) {
          throw new Error(`Error obteniendo suscripciones antiguas: ${oldError.message}`)
        }
        
        // Marcar como expiradas en lugar de eliminar
        const { error: updateError } = await supabase
          .from('unified_subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .in('id', oldPending.map(sub => sub.id))
        
        if (updateError) {
          throw new Error(`Error actualizando suscripciones: ${updateError.message}`)
        }
        
        results.push({
          action: 'cleanup_old_pending',
          expired_count: oldPending.length,
          success: true
        })
        break
        
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }
    
    logger.info('🔧 Acción de corrección ejecutada', 'SUBSCRIPTION_CORRECTION', {
      action,
      resultsCount: results.length,
      successCount: results.filter(r => r.success).length
    })
    
    return NextResponse.json({
      success: true,
      action,
      results
    })
    
  } catch (error: any) {
    logger.error('❌ Error ejecutando acción de corrección', 'SUBSCRIPTION_CORRECTION_ERROR', {
      error: error.message
    })
    
    return NextResponse.json(
      { error: 'Error ejecutando acción' },
      { status: 500 }
    )
  }
}

/**
 * Calcular puntuación de salud del sistema (0-100)
 */
function calculateHealthScore(
  statusStats: Record<string, number>,
  avgActivationTime: number,
  activationRate: number,
  alertCount: number
): number {
  let score = 100
  
  // Penalizar por baja tasa de activación
  if (activationRate < 0.9) score -= (0.9 - activationRate) * 50
  
  // Penalizar por tiempo de activación lento
  if (avgActivationTime > 60) score -= Math.min((avgActivationTime - 60) / 10, 20)
  
  // Penalizar por alertas
  score -= alertCount * 5
  
  // Penalizar por muchas suscripciones pendientes
  const pendingRatio = (statusStats.pending || 0) / (Object.values(statusStats).reduce((a, b) => a + b, 0) || 1)
  if (pendingRatio > 0.1) score -= (pendingRatio - 0.1) * 100
  
  return Math.max(0, Math.round(score))
}