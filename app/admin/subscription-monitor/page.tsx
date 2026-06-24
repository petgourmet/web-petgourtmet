'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Search, AlertTriangle, CheckCircle, Clock, Users, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface PendingSubscription {
  id: string
  user_id: string
  external_reference: string
  stripe_subscription_id?: string
  mercadopago_subscription_id?: string
  status: string
  subscription_type: string
  base_price: number
  discounted_price: number
  created_at: string
  processed_at?: string
  profiles?: {
    email: string
    full_name?: string
  }
}

interface ActiveSubscription {
  id: string
  user_id: string
  stripe_subscription_id?: string
  mercadopago_subscription_id?: string
  external_reference: string
  status: string
  subscription_type: string
  next_billing_date: string
  current_period_end?: string
  cancel_at_period_end?: boolean
  cancelled_at?: string
  order_status?: string
  created_at: string
  profiles?: {
    email: string
    full_name?: string
  }
}

interface WebhookLog {
  id: string
  source: string
  event_type?: string
  type?: string
  action?: string
  data_id?: string
  processed_at: string
  created_at: string
  success: boolean
  status?: string
  error_message?: string
}

export default function SubscriptionMonitorPage() {
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([])
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [apiErrors, setApiErrors] = useState<Record<string, string | null>>({})

  const fetchData = async () => {
    try {
      setRefreshing(true)

      // ── Endpoint específico del monitor (service_role server-side).
      // NOTA: NO usar /api/admin/subscriptions — ese endpoint está dedicado
      // a la página de gestión (subscription-orders) y mantiene otro contrato.
      const res = await fetch('/api/admin/subscriptions/monitor')
      if (!res.ok) {
        toast.error('Error cargando datos de suscripciones')
        return
      }

      const data = await res.json()

      setPendingSubscriptions(data.pending ?? [])
      setActiveSubscriptions(data.active ?? [])
      setWebhookLogs(data.webhooks ?? [])
      setApiErrors(data.errors ?? {})

      // Mostrar warnings si alguna query falló (no bloquear la UI)
      if (data.errors?.webhooks) {
        console.warn('[Monitor] webhook_logs:', data.errors.webhooks)
      }
      if (data.errors?.active) {
        toast.error('Error cargando suscripciones activas')
        console.error('[Monitor] active:', data.errors.active)
      }
      if (data.errors?.pending) {
        toast.error('Error cargando suscripciones pendientes')
        console.error('[Monitor] pending:', data.errors.pending)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error de red al cargar datos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredPending = pendingSubscriptions.filter(sub => 
    sub.external_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredActive = activeSubscriptions.filter(sub => 
    sub.external_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.mercadopago_subscription_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completada' },
      processed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Procesada' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Activa' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Cancelada' },
      canceled: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Cancelada' },
      paused: { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle, label: 'Pausada' },
      past_due: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, label: 'Pago vencido' },
      incomplete: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Incompleta' },
      incomplete_expired: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Expirada' },
      trialing: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'En prueba' },
      unpaid: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Sin pagar' },
    }
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status }
    const Icon = config.icon
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitor de Suscripciones</h1>
          <p className="text-gray-600 mt-2">Monitoreo en tiempo real del flujo de suscripciones</p>
        </div>
        <Button 
          onClick={fetchData} 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingSubscriptions.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeSubscriptions.filter(s => s.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Procesadas Hoy</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingSubscriptions.filter(s => 
                    s.processed_at && 
                    new Date(s.processed_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Webhooks Recientes</p>
                <p className="text-2xl font-bold text-purple-600">
                  {webhookLogs.length}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-400" />
        <Input
          placeholder="Buscar por email, user_id, external_reference o subscription_id..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Suscripciones Pendientes ({filteredPending.length})</TabsTrigger>
          <TabsTrigger value="active">Suscripciones Activas ({filteredActive.length})</TabsTrigger>
          <TabsTrigger value="webhooks">Logs de Webhooks ({webhookLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Suscripciones Pendientes</CardTitle>
              <CardDescription>
                Suscripciones que están esperando confirmación de MercadoPago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPending.map((subscription) => (
                  <div key={subscription.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {subscription.external_reference}
                        </span>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(subscription.created_at)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Usuario:</span>
                        <p className="font-medium">{subscription.profiles?.email || subscription.user_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Tipo:</span>
                        <p className="font-medium">{subscription.subscription_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Precio:</span>
                        <p className="font-medium">{formatPrice(subscription.discounted_price || subscription.base_price)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">MP ID:</span>
                        <p className="font-mono text-xs">{subscription.mercadopago_subscription_id || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {subscription.processed_at && (
                      <div className="text-sm text-green-600">
                        ✅ Procesada: {formatDate(subscription.processed_at)}
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredPending.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron suscripciones pendientes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Suscripciones Activas</CardTitle>
              <CardDescription>
                Suscripciones confirmadas y activas — procesadas por Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredActive.map((subscription) => (
                  <div key={subscription.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {subscription.external_reference}
                        </span>
                        {getStatusBadge(subscription.status)}
                        {subscription.cancel_at_period_end && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            Cancela al vencer
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(subscription.created_at)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Usuario:</span>
                        <p className="font-medium">{subscription.profiles?.email || subscription.user_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Tipo:</span>
                        <p className="font-medium">{subscription.subscription_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Próxima Facturación:</span>
                        <p className="font-medium">
                          {subscription.next_billing_date
                            ? formatDate(subscription.next_billing_date)
                            : subscription.current_period_end
                            ? formatDate(subscription.current_period_end)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Stripe ID:</span>
                        <p className="font-mono text-xs truncate" title={subscription.stripe_subscription_id}>
                          {subscription.stripe_subscription_id ?? subscription.mercadopago_subscription_id ?? 'N/A'}
                        </p>
                      </div>
                    </div>

                    {subscription.order_status && subscription.order_status !== 'pending' && (
                      <div className="text-sm">
                        <span className="text-gray-600">Estado de orden: </span>
                        <span className="font-medium">{subscription.order_status}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredActive.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron suscripciones activas
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Webhooks Recientes</CardTitle>
              <CardDescription>
                Últimos eventos de Stripe procesados por el webhook
                {apiErrors.webhooks && (
                  <span className="ml-2 text-amber-600 text-xs">
                    ⚠ {apiErrors.webhooks.includes('does not exist')
                      ? 'Tabla webhook_logs pendiente de migración — aplica 20260625_webhook_logs_and_fixes.sql en Supabase'
                      : apiErrors.webhooks}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiErrors.webhooks ? (
                <div className="text-center py-8 space-y-2">
                  <Zap className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-amber-700 font-medium text-sm">Tabla webhook_logs no existe aún</p>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto">
                    Aplica la migración <code className="bg-gray-100 px-1 rounded">20260625_webhook_logs_and_fixes.sql</code> en el SQL Editor de Supabase para habilitar esta sección.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhookLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge className={log.success || log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {log.success || log.status === 'success' ? '✅' : '❌'}
                        </Badge>
                        <div>
                          <span className="font-medium">{log.event_type ?? log.type ?? '—'}</span>
                          {log.action && <span className="text-gray-500 ml-2">({log.action})</span>}
                          <p className="text-xs text-gray-500">{log.source} · {log.data_id ?? '—'}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {formatDate(log.created_at ?? log.processed_at)}
                        {log.error_message && (
                          <p className="text-red-600 text-xs mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {webhookLogs.length === 0 && !apiErrors.webhooks && (
                    <div className="text-center py-8 text-gray-500">
                      No hay eventos registrados todavía
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}