'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'

interface DashboardData {
  webhookStats: {
    totalReceived: number
    totalProcessed: number
    totalErrors: number
    errorRate: number
    averageProcessingTime: number
    lastProcessed: string | null
  }
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    summary: string
    issues: Array<{
      type: string
      severity: string
      description: string
      recommendation: string
    }>
  }
  autoSyncStats: {
    isRunning: boolean
    lastSyncTime: Date
    queueSize: number
  }
  recentEvents: Array<{
    id: string
    type: string
    action: string
    timestamp: string
    processed: boolean
    error?: string
    processingTime?: number
  }>
}

export default function PaymentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchDashboardData = async () => {
    try {
      const [webhookResponse, healthResponse, eventsResponse, syncStatsResponse] = await Promise.all([
        fetch('/api/admin/webhook-monitor?action=stats'),
        fetch('/api/admin/webhook-monitor?action=health'),
        fetch('/api/admin/webhook-monitor?action=events&limit=20'),
        fetch('/api/admin/auto-sync-stats')
      ])

      const [webhookData, healthData, eventsData, syncData] = await Promise.all([
        webhookResponse.json(),
        healthResponse.json(),
        eventsResponse.json(),
        syncStatsResponse.json().catch(() => ({ stats: { isRunning: false, lastSyncTime: new Date(), queueSize: 0 } }))
      ])

      setData({
        webhookStats: webhookData.stats || {
          totalReceived: 0,
          totalProcessed: 0,
          totalErrors: 0,
          errorRate: 0,
          averageProcessingTime: 0,
          lastProcessed: null
        },
        systemHealth: healthData.health || {
          status: 'warning',
          score: 0,
          summary: 'No se pudo obtener estado del sistema',
          issues: []
        },
        autoSyncStats: syncData.stats || {
          isRunning: false,
          lastSyncTime: new Date(),
          queueSize: 0
        },
        recentEvents: eventsData.events || []
      })

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Error cargando datos del dashboard',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerManualSync = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/cron/auto-validate-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maxAge: 2, force: true })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Sincronización exitosa',
          description: `Procesadas: ${result.result.totalProcessed}, Exitosas: ${result.result.successful}, Fallidas: ${result.result.failed}`
        })
        
        // Actualizar datos después de la sincronización
        setTimeout(() => fetchDashboardData(), 2000)
      } else {
        toast({
          title: 'Error en sincronización',
          description: result.error || 'Error desconocido',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error ejecutando sincronización manual',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000) // Actualizar cada 30 segundos

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'default'
      case 'warning': return 'secondary'
      case 'critical': return 'destructive'
      default: return 'secondary'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleString()
  }

  if (isLoading && !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Cargando dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Pagos en Tiempo Real</h1>
          <p className="text-muted-foreground">
            Monitoreo automático del sistema de pagos y webhooks
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </Button>
          <Button onClick={fetchDashboardData} disabled={isLoading}>
            🔄 Actualizar
          </Button>
          <Button onClick={triggerManualSync} disabled={isLoading} variant="secondary">
            ⚡ Sincronizar Ahora
          </Button>
        </div>
      </div>

      {lastUpdate && (
        <div className="text-sm text-muted-foreground">
          Última actualización: {formatTime(lastUpdate)}
        </div>
      )}

      {data && (
        <>
          {/* Resumen de Salud del Sistema */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(data.systemHealth.status)}>
                    {data.systemHealth.status.toUpperCase()}
                  </Badge>
                  <span className="text-2xl font-bold">{data.systemHealth.score}/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.systemHealth.summary}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Webhooks Procesados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.webhookStats.totalProcessed}</div>
                <p className="text-xs text-muted-foreground">
                  de {data.webhookStats.totalReceived} recibidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Errores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {data.webhookStats.errorRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.webhookStats.totalErrors} errores
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tiempo de Procesamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.webhookStats.averageProcessingTime}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  promedio
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="health" className="space-y-4">
            <TabsList>
              <TabsTrigger value="health">Salud del Sistema</TabsTrigger>
              <TabsTrigger value="events">Eventos Recientes</TabsTrigger>
              <TabsTrigger value="sync">Auto-Sincronización</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="space-y-4">
              {data.systemHealth.issues.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Problemas Detectados</h3>
                  {data.systemHealth.issues.map((issue, index) => (
                    <Alert key={index}>
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(issue.severity)}>
                                {issue.severity.toUpperCase()}
                              </Badge>
                              <span className="font-medium">{issue.type}</span>
                            </div>
                            <p className="text-sm">{issue.description}</p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Recomendación:</strong> {issue.recommendation}
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span>No se detectaron problemas en el sistema</span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Últimos 20 Eventos</h3>
                {data.recentEvents.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentEvents.map((event, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={event.processed ? 'default' : event.error ? 'destructive' : 'secondary'}>
                              {event.processed ? '✅' : event.error ? '❌' : '⏳'}
                            </Badge>
                            <span className="font-medium">{event.type}</span>
                            <span className="text-sm text-muted-foreground">{event.action}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(event.timestamp)}
                          </div>
                        </div>
                        {event.error && (
                          <p className="text-sm text-red-600 mt-1">{event.error}</p>
                        )}
                        {event.processingTime && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Procesado en {event.processingTime}ms
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hay eventos recientes</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Estado de Auto-Sync</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={data.autoSyncStats.isRunning ? 'default' : 'secondary'}>
                      {data.autoSyncStats.isRunning ? '🔄 Ejecutándose' : '⏸️ Inactivo'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Última Sincronización</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {formatTime(data.autoSyncStats.lastSyncTime)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cola de Sincronización</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.autoSyncStats.queueSize}
                    </div>
                    <p className="text-xs text-muted-foreground">órdenes pendientes</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}