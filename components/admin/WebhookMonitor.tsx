'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Webhook, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  Activity,
  Eye,
  Play
} from 'lucide-react'

interface WebhookEvent {
  id: string
  type: string
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  source: 'mercadopago' | 'stripe' | 'manual'
  data: any
  error?: string
  processingTime?: number
}

interface WebhookStats {
  total: number
  successful: number
  failed: number
  pending: number
  avgProcessingTime: number
}

export default function WebhookMonitor() {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([])
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEvent | null>(null)

  const fetchWebhooks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/webhooks/recent')
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data.webhooks || [])
        setStats(data.stats || null)
      } else {
        console.error('Error al obtener webhooks')
      }
    } catch (error) {
      console.error('Error de conexión:', error)
    } finally {
      setLoading(false)
    }
  }

  const simulateWebhook = async (type: string) => {
    try {
      const response = await fetch('/api/admin/testing/simulate-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      })
      
      if (response.ok) {
        toast.success(`Webhook ${type} simulado exitosamente`)
        setTimeout(fetchWebhooks, 1000)
      } else {
        toast.error('Error al simular webhook')
      }
    } catch (error) {
      toast.error('Error de conexión al simular webhook')
    }
  }

  const retryWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/admin/webhooks/${webhookId}/retry`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Webhook reenviado')
        setTimeout(fetchWebhooks, 1000)
      } else {
        toast.error('Error al reenviar webhook')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  useEffect(() => {
    fetchWebhooks()
    
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(fetchWebhooks, 10000) // Cada 10 segundos
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Exitoso</Badge>
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'mercadopago':
        return <Badge variant="outline" className="bg-blue-50">MercadoPago</Badge>
      case 'stripe':
        return <Badge variant="outline" className="bg-purple-50">Stripe</Badge>
      case 'manual':
        return <Badge variant="outline" className="bg-gray-50">Manual</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exitosos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.successful || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgProcessingTime || 0}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monitor de Webhooks</CardTitle>
              <CardDescription>
                Monitoreo en tiempo real de webhooks recibidos y procesados
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWebhooks}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Botones de simulación */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateWebhook('payment.created')}
              >
                <Play className="h-4 w-4 mr-2" />
                Simular Pago
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateWebhook('subscription.created')}
              >
                <Play className="h-4 w-4 mr-2" />
                Simular Suscripción
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateWebhook('payment.failed')}
              >
                <Play className="h-4 w-4 mr-2" />
                Simular Fallo
              </Button>
            </div>

            <Separator />

            {/* Lista de webhooks */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {webhooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay webhooks recientes</p>
                  </div>
                ) : (
                  webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedWebhook(webhook)}
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(webhook.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{webhook.type}</span>
                            {getSourceBadge(webhook.source)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(webhook.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {webhook.processingTime && (
                          <span className="text-sm text-muted-foreground">
                            {webhook.processingTime}ms
                          </span>
                        )}
                        {getStatusBadge(webhook.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedWebhook(webhook)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {webhook.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              retryWebhook(webhook.id)
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalles del webhook */}
      {selectedWebhook && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detalles del Webhook</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWebhook(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ID:</label>
                  <p className="text-sm text-muted-foreground">{selectedWebhook.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo:</label>
                  <p className="text-sm text-muted-foreground">{selectedWebhook.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado:</label>
                  <div className="mt-1">{getStatusBadge(selectedWebhook.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Fuente:</label>
                  <div className="mt-1">{getSourceBadge(selectedWebhook.source)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp:</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedWebhook.timestamp).toLocaleString()}
                  </p>
                </div>
                {selectedWebhook.processingTime && (
                  <div>
                    <label className="text-sm font-medium">Tiempo de Procesamiento:</label>
                    <p className="text-sm text-muted-foreground">{selectedWebhook.processingTime}ms</p>
                  </div>
                )}
              </div>
              
              {selectedWebhook.error && (
                <div>
                  <label className="text-sm font-medium text-red-600">Error:</label>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                    {selectedWebhook.error}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Datos:</label>
                <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-40">
                  {JSON.stringify(selectedWebhook.data, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}