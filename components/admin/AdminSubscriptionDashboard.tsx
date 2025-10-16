'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Package, 
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pause,
  Play,
  X,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface DashboardMetrics {
  total_subscriptions: number
  active_subscriptions: number
  paused_subscriptions: number
  cancelled_subscriptions: number
  total_revenue: number
  monthly_revenue: number
  average_subscription_value: number
  churn_rate: number
  growth_rate: number
  top_products: Array<{
    product_name: string
    subscription_count: number
    revenue: number
  }>
  revenue_by_period: Array<{
    period: string
    revenue: number
    subscriptions: number
  }>
}

interface Subscription {
  id: string
  user_id: string
  user_email: string
  user_name: string
  product_id: string
  product_name: string
  subscription_type: string
  quantity: number
  unit_price: number
  total_price: number
  discount_percentage?: number
  status: 'active' | 'paused' | 'cancelled' | 'pending'
  next_payment_date: string
  created_at: string
  last_payment_date?: string
  payment_method?: {
    type: string
    last_four: string
    brand: string
  }
}

const STATUS_LABELS = {
  active: 'Activa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  pending: 'Pendiente'
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 border-green-200',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-blue-100 text-blue-800 border-blue-200'
}

const SUBSCRIPTION_TYPE_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal', 
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual'
}

export default function AdminSubscriptionDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  
  // Selected subscription for actions
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'pause' | 'resume' | 'cancel' | null>(null)
  const [actionReason, setActionReason] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    filterSubscriptions()
  }, [subscriptions, searchTerm, statusFilter, productFilter, dateRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch metrics
      const metricsResponse = await fetch('/api/admin/subscriptions/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }

      // Fetch all subscriptions
      const subscriptionsResponse = await fetch('/api/admin/subscriptions/list')
      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json()
        setSubscriptions(subscriptionsData.subscriptions || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Error al cargar los datos del dashboard')
    } finally {
      setLoading(false)
    }
  }

  const filterSubscriptions = () => {
    let filtered = [...subscriptions]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter)
    }

    // Product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(sub => sub.product_id === productFilter)
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3)
          break
      }
      
      if (dateRange !== 'all') {
        filtered = filtered.filter(sub => new Date(sub.created_at) >= filterDate)
      }
    }

    setFilteredSubscriptions(filtered)
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      setActionLoading(subscriptionId)
      
      const response = await fetch('/api/admin/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          action,
          admin_reason: actionReason
        }),
      })

      if (!response.ok) {
        throw new Error(`Error al ${action} la suscripción`)
      }

      // Update local state
      const newStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'cancelled'
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, status: newStatus as any }
            : sub
        )
      )

      setActionDialogOpen(false)
      setSelectedSubscription(null)
      setActionReason('')
      toast.success(`Suscripción ${action === 'pause' ? 'pausada' : action === 'resume' ? 'reanudada' : 'cancelada'} exitosamente`)
      
      // Refresh metrics
      fetchDashboardData()
    } catch (error) {
      console.error(`Error ${action}ing subscription:`, error)
      toast.error(`Error al ${action} la suscripción`)
    } finally {
      setActionLoading(null)
    }
  }

  const openActionDialog = (subscription: Subscription, action: 'pause' | 'resume' | 'cancel') => {
    setSelectedSubscription(subscription)
    setActionType(action)
    setActionDialogOpen(true)
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            status: statusFilter,
            product: productFilter,
            dateRange,
            search: searchTerm
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Error al exportar datos')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Datos exportados exitosamente')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Error al exportar los datos')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Suscripciones</h1>
          <p className="text-gray-600">Gestiona y monitorea todas las suscripciones</p>
        </div>
        <Button onClick={exportData} className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Exportar</span>
        </Button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Suscripciones</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.total_subscriptions}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {formatPercentage(metrics.growth_rate)}
                </span>
                <span className="text-gray-600 ml-2">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Suscripciones Activas</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.active_subscriptions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">
                  {((metrics.active_subscriptions / metrics.total_subscriptions) * 100).toFixed(1)}% del total
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos Mensuales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(metrics.monthly_revenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">
                  Promedio: {formatPrice(metrics.average_subscription_value)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tasa de Cancelación</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.churn_rate.toFixed(1)}%</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">
                  {metrics.cancelled_subscriptions} canceladas
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por email, nombre, producto o ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="paused">Pausadas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el tiempo</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mes</SelectItem>
                    <SelectItem value="quarter">Último trimestre</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="outline">
                  {filteredSubscriptions.length} resultado{filteredSubscriptions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Próximo Pago
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSubscriptions.map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {subscription.user_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {subscription.user_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {subscription.product_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {SUBSCRIPTION_TYPE_LABELS[subscription.subscription_type as keyof typeof SUBSCRIPTION_TYPE_LABELS]} • Qty: {subscription.quantity}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={STATUS_COLORS[subscription.status]}>
                            {STATUS_LABELS[subscription.status]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatPrice(subscription.total_price)}
                          </div>
                          {subscription.discount_percentage && (
                            <div className="text-sm text-green-600">
                              {subscription.discount_percentage}% desc.
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(subscription.next_payment_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSubscription(subscription)
                                setViewDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {subscription.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionDialog(subscription, 'pause')}
                                disabled={actionLoading === subscription.id}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {subscription.status === 'paused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionDialog(subscription, 'resume')}
                                disabled={actionLoading === subscription.id}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {(subscription.status === 'active' || subscription.status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openActionDialog(subscription, 'cancel')}
                                disabled={actionLoading === subscription.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos Más Populares</CardTitle>
                  <CardDescription>Por número de suscripciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.top_products.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{product.product_name}</p>
                          <p className="text-sm text-gray-600">
                            {product.subscription_count} suscripciones
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(product.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Período</CardTitle>
                  <CardDescription>Últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.revenue_by_period.map((period, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{period.period}</p>
                          <p className="text-sm text-gray-600">
                            {period.subscriptions} suscripciones
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(period.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Productos</CardTitle>
              <CardDescription>Configurar productos para suscripciones</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Funcionalidad de gestión de productos en desarrollo...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Subscription Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalles de Suscripción</DialogTitle>
            <DialogDescription>
              Información completa de la suscripción
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">ID</Label>
                  <p className="text-sm">{selectedSubscription.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Estado</Label>
                  <Badge className={STATUS_COLORS[selectedSubscription.status]}>
                    {STATUS_LABELS[selectedSubscription.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Usuario</Label>
                  <p className="text-sm">{selectedSubscription.user_name}</p>
                  <p className="text-xs text-gray-500">{selectedSubscription.user_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Producto</Label>
                  <p className="text-sm">{selectedSubscription.product_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Frecuencia</Label>
                  <p className="text-sm">
                    {SUBSCRIPTION_TYPE_LABELS[selectedSubscription.subscription_type as keyof typeof SUBSCRIPTION_TYPE_LABELS]}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Cantidad</Label>
                  <p className="text-sm">{selectedSubscription.quantity}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Precio Total</Label>
                  <p className="text-sm font-medium">{formatPrice(selectedSubscription.total_price)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Próximo Pago</Label>
                  <p className="text-sm">{formatDate(selectedSubscription.next_payment_date)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Creada</Label>
                  <p className="text-sm">{formatDate(selectedSubscription.created_at)}</p>
                </div>
                {selectedSubscription.last_payment_date && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Último Pago</Label>
                    <p className="text-sm">{formatDate(selectedSubscription.last_payment_date)}</p>
                  </div>
                )}
              </div>

              {selectedSubscription.payment_method && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Método de Pago</Label>
                  <p className="text-sm">
                    {selectedSubscription.payment_method.brand} •••• {selectedSubscription.payment_method.last_four}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {actionType === 'cancel' && <AlertTriangle className="h-5 w-5 text-red-500" />}
              <span>
                {actionType === 'pause' && 'Pausar Suscripción'}
                {actionType === 'resume' && 'Reanudar Suscripción'}
                {actionType === 'cancel' && 'Cancelar Suscripción'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {actionType === 'pause' && 'La suscripción será pausada y no se procesarán pagos.'}
              {actionType === 'resume' && 'La suscripción será reactivada y se reanudarán los pagos.'}
              {actionType === 'cancel' && 'Esta acción no se puede deshacer. La suscripción será cancelada permanentemente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="action-reason">Motivo (opcional)</Label>
              <Textarea
                id="action-reason"
                placeholder="Describe el motivo de esta acción..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={actionLoading === selectedSubscription?.id}
            >
              Cancelar
            </Button>
            <Button
              variant={actionType === 'cancel' ? 'destructive' : 'default'}
              onClick={() => selectedSubscription && actionType && handleSubscriptionAction(selectedSubscription.id, actionType)}
              disabled={actionLoading === selectedSubscription?.id}
            >
              {actionLoading === selectedSubscription?.id ? 'Procesando...' : 
                actionType === 'pause' ? 'Pausar' :
                actionType === 'resume' ? 'Reanudar' : 'Cancelar'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}