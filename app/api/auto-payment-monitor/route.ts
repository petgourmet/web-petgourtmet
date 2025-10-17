import { NextRequest, NextResponse } from 'next/server'

// Sistema de monitoreo automático de pagos
let monitoringInterval: NodeJS.Timeout | null = null
let isMonitoring = false

const MONITOR_INTERVAL = 5 * 60 * 1000 // 5 minutos
const CRON_SECRET = process.env.CRON_SECRET

async function validatePendingPayments() {
  try {
    console.log('🔄 Ejecutando validación automática de pagos...', new Date().toISOString())
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/auto-validate-payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Validación automática completada:', {
        orders_updated: result.results?.orders_updated || 0,
        subscriptions_updated: result.results?.subscriptions_updated || 0,
        errors: result.results?.errors || 0
      })
    } else {
      console.error('❌ Error en validación automática:', response.status)
    }
  } catch (error) {
    console.error('❌ Error ejecutando validación automática:', error.message)
  }
}

// Iniciar monitoreo automático
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'start') {
      if (isMonitoring) {
        return NextResponse.json({
          success: true,
          message: 'El monitoreo ya está activo',
          status: 'running'
        })
      }

      // Ejecutar inmediatamente
      await validatePendingPayments()

      // Configurar intervalo
      monitoringInterval = setInterval(validatePendingPayments, MONITOR_INTERVAL)
      isMonitoring = true

      console.log('🚀 Monitoreo automático de pagos iniciado')
      
      return NextResponse.json({
        success: true,
        message: 'Monitoreo automático iniciado',
        interval: `${MONITOR_INTERVAL / 1000 / 60} minutos`,
        status: 'started'
      })
    }

    if (action === 'stop') {
      if (monitoringInterval) {
        clearInterval(monitoringInterval)
        monitoringInterval = null
      }
      isMonitoring = false

      console.log('⏹️ Monitoreo automático de pagos detenido')
      
      return NextResponse.json({
        success: true,
        message: 'Monitoreo automático detenido',
        status: 'stopped'
      })
    }

    if (action === 'status') {
      return NextResponse.json({
        success: true,
        status: isMonitoring ? 'running' : 'stopped',
        interval: `${MONITOR_INTERVAL / 1000 / 60} minutos`,
        next_run: isMonitoring ? new Date(Date.now() + MONITOR_INTERVAL).toISOString() : null
      })
    }

    return NextResponse.json(
      { error: 'Acción no válida. Use: start, stop, o status' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error en monitoreo automático:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Obtener estado del monitoreo
export async function GET() {
  return NextResponse.json({
    service: 'Auto Payment Monitor',
    status: isMonitoring ? 'running' : 'stopped',
    interval: `${MONITOR_INTERVAL / 1000 / 60} minutos`,
    description: 'Monitorea y valida pagos pendientes automáticamente',
    next_run: isMonitoring ? new Date(Date.now() + MONITOR_INTERVAL).toISOString() : null,
    actions: {
      start: 'POST { "action": "start" }',
      stop: 'POST { "action": "stop" }',
      status: 'POST { "action": "status" }'
    }
  })
}

// Auto-iniciar el monitoreo cuando se carga el módulo
if (process.env.NODE_ENV === 'production' && !isMonitoring) {
  setTimeout(() => {
    validatePendingPayments()
    monitoringInterval = setInterval(validatePendingPayments, MONITOR_INTERVAL)
    isMonitoring = true
  }, 5000) // Esperar 5 segundos después del inicio
}