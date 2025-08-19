"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/admin/auth-guard"
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react"
import { toast } from "sonner"

interface SyncResult {
  success: boolean
  syncType: string
  result: any
  timestamp: string
}

export default function SyncPaymentsPage() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<SyncResult | null>(null)
  const [syncType, setSyncType] = useState<'orders' | 'subscriptions' | 'full'>('full')
  const [maxAge, setMaxAge] = useState(24)

  const executSync = async (type: 'orders' | 'subscriptions' | 'full') => {
    setSyncing(true)
    setSyncType(type)
    
    try {
      const response = await fetch(`/api/admin/sync-payments?type=${type}&maxAge=${maxAge}`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLastSync(result)
        toast.success(`Sincronización ${type} completada exitosamente`)
      } else {
        toast.error(`Error en sincronización: ${result.message}`)
      }
      
    } catch (error) {
      console.error('Error ejecutando sincronización:', error)
      toast.error('Error ejecutando sincronización')
    } finally {
      setSyncing(false)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getSyncTypeIcon = (type: string) => {
    switch (type) {
      case 'orders': return '🛒'
      case 'subscriptions': return '🔄'
      case 'full': return '⚡'
      default: return '🔧'
    }
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sincronización de Pagos</h1>
            <p className="text-muted-foreground mt-2">
              Mantén sincronizado el estado de pagos y suscripciones con MercadoPago
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Cada 30 minutos automático
          </Badge>
        </div>

        {/* Configuración */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Configuración de Sincronización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Edad máxima (horas)
                </label>
                <select 
                  value={maxAge} 
                  onChange={(e) => setMaxAge(parseInt(e.target.value))}
                  className="w-full p-2 border rounded-md"
                  disabled={syncing}
                >
                  <option value={1}>1 hora</option>
                  <option value={6}>6 horas</option>
                  <option value={12}>12 horas</option>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                  <option value={72}>72 horas</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo sincronizar pagos creados en las últimas X horas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones de Sincronización */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                🛒 Órdenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Sincronizar solo órdenes pendientes con MercadoPago
              </p>
              <Button 
                onClick={() => executSync('orders')}
                disabled={syncing}
                className="w-full"
                variant="outline"
              >
                {syncing && syncType === 'orders' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar Órdenes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                🔄 Suscripciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Sincronizar suscripciones pendientes
              </p>
              <Button 
                onClick={() => executSync('subscriptions')}
                disabled={syncing}
                className="w-full"
                variant="outline"
              >
                {syncing && syncType === 'subscriptions' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar Suscripciones
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                ⚡ Completa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Sincronización completa de órdenes y suscripciones
              </p>
              <Button 
                onClick={() => executSync('full')}
                disabled={syncing}
                className="w-full"
              >
                {syncing && syncType === 'full' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Sincronización Completa
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultado de la última sincronización */}
        {lastSync && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Última Sincronización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getSyncTypeIcon(lastSync.syncType)}</span>
                    <div>
                      <p className="font-medium capitalize">{lastSync.syncType}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(lastSync.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    Exitosa
                  </Badge>
                </div>

                {/* Resultados para sincronización completa */}
                {lastSync.syncType === 'full' && lastSync.result.orders && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">🛒 Órdenes</h4>
                      <div className="space-y-1 text-sm">
                        <p>Procesadas: <span className="font-medium">{lastSync.result.orders.processed}</span></p>
                        <p>Actualizadas: <span className="font-medium text-green-600">{lastSync.result.orders.updated}</span></p>
                        <p>Errores: <span className="font-medium text-red-600">{lastSync.result.orders.errors}</span></p>
                        <p>Duración: <span className="font-medium">{formatDuration(lastSync.result.orders.duration)}</span></p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">🔄 Suscripciones</h4>
                      <div className="space-y-1 text-sm">
                        <p>Procesadas: <span className="font-medium">{lastSync.result.subscriptions.processed}</span></p>
                        <p>Actualizadas: <span className="font-medium text-green-600">{lastSync.result.subscriptions.updated}</span></p>
                        <p>Errores: <span className="font-medium text-red-600">{lastSync.result.subscriptions.errors}</span></p>
                        <p>Duración: <span className="font-medium">{formatDuration(lastSync.result.subscriptions.duration)}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resultados para sincronización individual */}
                {lastSync.syncType !== 'full' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Procesadas</p>
                        <p className="font-medium text-lg">{lastSync.result.processed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actualizadas</p>
                        <p className="font-medium text-lg text-green-600">{lastSync.result.updated}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Errores</p>
                        <p className="font-medium text-lg text-red-600">{lastSync.result.errors}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duración</p>
                        <p className="font-medium text-lg">{formatDuration(lastSync.result.duration)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detalles de actualizaciones */}
                {lastSync.result.details && lastSync.result.details.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Órdenes Actualizadas:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {lastSync.result.details.map((detail: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <span>Orden #{detail.orderId}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {detail.oldStatus} → {detail.newStatus}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {detail.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información del sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Sincronización automática:</strong> Cada 30 minutos via cron job</p>
              <p><strong>Endpoint automático:</strong> <code>/api/cron/validate-payments</code></p>
              <p><strong>Alcance:</strong> Órdenes y suscripciones pendientes de las últimas 24 horas</p>
              <p><strong>Funcionalidad:</strong> Busca pagos en MercadoPago y actualiza el estado local</p>
              <p><strong>Logs:</strong> Todos los eventos se registran en el sistema de logging</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}