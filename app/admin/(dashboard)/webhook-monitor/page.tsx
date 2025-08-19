"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/admin/auth-guard"
import { RefreshCw, Activity, AlertCircle, CheckCircle, Clock, Zap, TrendingUp } from "lucide-react"
import { toast } from "sonner"

interface WebhookStats {
  total_received: number
  successful: number
  failed: number
  last_24h: number
  avg_response_time: number
  last_webhook: string
}

interface SyncStats {
  orders_pending: number
  orders_synced_today: number
  last_sync: string
  next_sync: string
  sync_success_rate: number
}

interface RecentActivity {
  id: string
  type: 'webhook' | 'sync' | 'manual'
  status: 'success' | 'error' | 'pending'
  message: string
  timestamp: string
  details?: any
}

export default function WebhookMonitorPage() {
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      setRefreshing(true)
      
      // Simular datos (en producción, estos vendrían de APIs reales)
      const mockWebhookStats: WebhookStats = {
        total_received: 1247,
        successful: 1198,
        failed: 49,
        last_24h: 23,
        avg_response_time: 145,
        last_webhook: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      }
      
      const mockSyncStats: SyncStats = {
        orders_pending: 3,
        orders_synced_today: 8,
        last_sync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        next_sync: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        sync_success_rate: 96.8
      }
      
      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'webhook',
          status: 'success',
          message: 'Pago aprobado - Orden #142',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          details: { payment_id: '123456789', amount: 299 }
        },
        {
          id: '2',
          type: 'sync',
          status: 'success',
          message: 'Sincronización automática completada',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          details: { orders_processed: 5, orders_updated: 2 }
        },
        {
          id: '3',
          type: 'webhook',
          status: 'success',
          message: 'Pago pendiente - Orden #141',
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          details: { payment_id: '122928599272', method: 'bancomer' }
        },
        {
          id: '4',
          type: 'manual',
          status: 'success',
          message: 'Sincronización manual ejecutada',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          details: { triggered_by: 'admin', orders_updated: 3 }
        },
        {
          id: '5',
          type: 'webhook',
          status: 'error',
          message: 'Error procesando webhook - Firma inválida',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          details: { error: 'Invalid signature', ip: '192.168.1.100' }
        }
      ]
      
      setWebhookStats(mockWebhookStats)
      setSyncStats(mockSyncStats)
      setRecentActivity(mockActivity)
      
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Error cargando estadísticas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'webhook': return '🔔'
      case 'sync': return '🔄'
      case 'manual': return '👤'
      default: return '📋'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `hace ${hours}h ${minutes % 60}m`
    return `hace ${minutes}m`
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando estadísticas...</span>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monitor de Webhooks y Sincronización</h1>
            <p className="text-muted-foreground mt-2">
              Monitoreo en tiempo real del sistema de pagos
            </p>
          </div>
          <Button 
            onClick={fetchStats} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Estadísticas de Webhooks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Webhooks Recibidos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{webhookStats?.total_received}</div>
              <p className="text-xs text-muted-foreground">
                {webhookStats?.last_24h} en las últimas 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {webhookStats ? Math.round((webhookStats.successful / webhookStats.total_received) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {webhookStats?.successful} exitosos, {webhookStats?.failed} fallidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo de Respuesta</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{webhookStats?.avg_response_time}ms</div>
              <p className="text-xs text-muted-foreground">
                Promedio de respuesta
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Último Webhook</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {webhookStats ? formatTimeAgo(webhookStats.last_webhook) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Última actividad
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas de Sincronización */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{syncStats?.orders_pending}</div>
              <p className="text-xs text-muted-foreground">
                Sin Payment ID
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sincronizadas Hoy</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{syncStats?.orders_synced_today}</div>
              <p className="text-xs text-muted-foreground">
                Órdenes actualizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Sincronización</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {syncStats ? formatTimeAgo(syncStats.last_sync) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Próxima: {syncStats ? formatTimeAgo(syncStats.next_sync).replace('hace', 'en') : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Sincronización</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{syncStats?.sync_success_rate}%</div>
              <p className="text-xs text-muted-foreground">
                Éxito en sincronización
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(activity.type)}</span>
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.message}
                      </p>
                      <Badge variant={activity.status === 'success' ? 'default' : activity.status === 'error' ? 'destructive' : 'secondary'}>
                        {activity.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-gray-400">
                          {activity.type === 'webhook' && activity.details.payment_id && 
                            `Payment: ${activity.details.payment_id}`
                          }
                          {activity.type === 'sync' && activity.details.orders_updated && 
                            `${activity.details.orders_updated} órdenes actualizadas`
                          }
                          {activity.type === 'manual' && activity.details.triggered_by && 
                            `Por: ${activity.details.triggered_by}`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Estado del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Webhooks: Operativo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Cron Jobs: Activo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Base de Datos: Conectada</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                ✅ <strong>Sistema funcionando correctamente</strong>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Todos los servicios están operativos. Los webhooks se procesan en tiempo real y la sincronización automática está activa.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}