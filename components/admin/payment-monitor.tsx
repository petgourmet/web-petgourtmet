'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity,
  AlertTriangle
} from 'lucide-react'

interface MonitorStatus {
  status: 'running' | 'stopped'
  interval: string
  next_run: string | null
}

interface ValidationResults {
  orders_processed: number
  orders_updated: number
  subscriptions_processed: number
  subscriptions_updated: number
  errors: number
  details: any[]
}

export default function PaymentMonitor() {
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null)
  const [lastResults, setLastResults] = useState<ValidationResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchMonitorStatus = async () => {
    try {
      const response = await fetch('/api/auto-payment-monitor')
      const data = await response.json()
      setMonitorStatus(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching monitor status:', error)
      toast.error('Error obteniendo estado del monitor')
    }
  }

  const toggleMonitor = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)
      const response = await fetch('/api/auto-payment-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        await fetchMonitorStatus()
      } else {
        toast.error(data.error || 'Error en la operación')
      }
    } catch (error) {
      console.error('Error toggling monitor:', error)
      toast.error('Error controlando el monitor')
    } finally {
      setLoading(false)
    }
  }

  const runManualValidation = async () => {
    try {
      setLoading(true)
      toast.info('Ejecutando validación manual...')
      
      const response = await fetch('/api/cron/auto-validate-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'cron-secret-super-seguro-petgourmet-2025'}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setLastResults(data.results)
        toast.success('Validación manual completada')
      } else {
        toast.error(data.error || 'Error en la validación')
      }
    } catch (error) {
      console.error('Error running manual validation:', error)
      toast.error('Error ejecutando validación manual')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitorStatus()
    
    // Actualizar estado cada 30 segundos
    const interval = setInterval(fetchMonitorStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'stopped': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="h-4 w-4" />
      case 'stopped': return <XCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Estado del Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monitor de Pagos Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(monitorStatus?.status || 'stopped')} flex items-center gap-1`}>
                {getStatusIcon(monitorStatus?.status || 'stopped')}
                {monitorStatus?.status === 'running' ? 'Activo' : 'Detenido'}
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Intervalo: {monitorStatus?.interval || '5 minutos'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMonitorStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              {monitorStatus?.status === 'running' ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => toggleMonitor('stop')}
                  disabled={loading}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Detener
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => toggleMonitor('start')}
                  disabled={loading}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Iniciar
                </Button>
              )}
              
              <Button
                variant="secondary"
                size="sm"
                onClick={runManualValidation}
                disabled={loading}
              >
                <Clock className="h-4 w-4 mr-1" />
                Validar Ahora
              </Button>
            </div>
          </div>
          
          {monitorStatus?.next_run && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Próxima ejecución:</strong> {new Date(monitorStatus.next_run).toLocaleString()}
            </div>
          )}
          
          {lastUpdate && (
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados de la Última Validación */}
      {lastResults && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Validación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{lastResults.orders_processed}</div>
                <div className="text-sm text-gray-600">Órdenes Procesadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{lastResults.orders_updated}</div>
                <div className="text-sm text-gray-600">Órdenes Actualizadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{lastResults.subscriptions_processed}</div>
                <div className="text-sm text-gray-600">Suscripciones Procesadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{lastResults.subscriptions_updated}</div>
                <div className="text-sm text-gray-600">Suscripciones Actualizadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{lastResults.errors}</div>
                <div className="text-sm text-gray-600">Errores</div>
              </div>
            </div>
            
            {lastResults.details.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Detalles:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lastResults.details.map((detail, index) => (
                    <div key={index} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <strong>{detail.type === 'order' ? 'Orden' : 'Suscripción'} {detail.id}:</strong> 
                      {detail.old_status} → {detail.new_status}
                      {detail.payment_id && ` (Pago: ${detail.payment_id})`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>Función:</strong> Valida automáticamente pagos pendientes cada 5 minutos</div>
          <div><strong>Alcance:</strong> Órdenes y suscripciones de las últimas 24 horas</div>
          <div><strong>Acción:</strong> Consulta MercadoPago y actualiza estados en tiempo real</div>
          <div><strong>Beneficio:</strong> Garantiza que ningún pago se quede sin procesar</div>
        </CardContent>
      </Card>
    </div>
  )
}