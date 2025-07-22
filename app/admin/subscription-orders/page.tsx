'use client'

import { useState, useEffect } from 'react'
import { Calendar, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, PlayCircle, PauseCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface OrderWithSubscription {
  id: number
  customer_name: string
  customer_email: string
  total: number
  payment_status: string
  created_at: string
  subscription_items: any[]
  related_subscription: any
  subscription_status: string
  next_payment_date: string
}

interface Stats {
  total_orders_with_subscriptions: number
  active_subscriptions: number
  pending_subscriptions: number
  total_subscription_revenue: number
}

export default function SubscriptionOrdersPage() {
  const [orders, setOrders] = useState<OrderWithSubscription[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithSubscription | null>(null)

  useEffect(() => {
    fetchOrdersWithSubscriptions()
  }, [])

  const fetchOrdersWithSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/orders-with-subscriptions')
      const result = await response.json()

      if (response.ok && result.success) {
        setOrders(result.orders || [])
        setStats(result.stats || null)
        toast.success(`${result.orders?.length || 0} órdenes con suscripciones encontradas`)
      } else {
        toast.error('Error cargando órdenes: ' + result.error)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const runSubscriptionCron = async () => {
    try {
      toast.info('Ejecutando proceso de suscripciones...')
      
      const response = await fetch('/api/cron/subscription-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test-secret'}`
        }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(`Proceso completado: ${result.results.reminders_sent} recordatorios, ${result.results.payments_processed} pagos`)
        await fetchOrdersWithSubscriptions() // Refrescar datos
      } else {
        toast.error('Error ejecutando proceso: ' + result.error)
      }
    } catch (error) {
      console.error('Error running cron:', error)
      toast.error('Error de conexión')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      case 'paused': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'authorized': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      case 'paused': return <PauseCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No programada'
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando órdenes con suscripciones...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📊 Órdenes con Suscripciones
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Gestión y monitoreo de suscripciones activas
            </p>
          </div>
          
          <button
            onClick={runSubscriptionCron}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Ejecutar Proceso
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Órdenes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_orders_with_subscriptions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.active_subscriptions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.pending_subscriptions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ingresos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.total_subscription_revenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Órdenes con Suscripciones ({orders.length})
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No hay órdenes con suscripciones</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Items Suscripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado Suscripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Próximo Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {order.customer_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {order.customer_email}
                          </div>
                          <div className="text-xs text-gray-400">
                            #{order.id} • {formatDate(order.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {order.subscription_items.map((item: any, index: number) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {item.product_name}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
                                x{item.quantity} • {formatCurrency(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.subscription_status)}`}>
                          {getStatusIcon(order.subscription_status)}
                          <span className="ml-1">
                            {order.subscription_status === 'authorized' ? 'Activa' :
                             order.subscription_status === 'pending' ? 'Pendiente' :
                             order.subscription_status === 'cancelled' ? 'Cancelada' :
                             order.subscription_status === 'paused' ? 'Pausada' :
                             'Sin suscripción'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(order.next_payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de detalles */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Detalles de Orden #{selectedOrder.id}
                  </h3>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Información del cliente */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Cliente</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    <p><strong>Nombre:</strong> {selectedOrder.customer_name}</p>
                    <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                  </div>
                </div>

                {/* Items de suscripción */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Items de Suscripción</h4>
                  <div className="space-y-2">
                    {selectedOrder.subscription_items.map((item: any, index: number) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <p><strong>{item.product_name}</strong></p>
                        <p>Cantidad: {item.quantity} • Precio: {formatCurrency(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Información de suscripción */}
                {selectedOrder.related_subscription && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Suscripción</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p><strong>Estado:</strong> {selectedOrder.related_subscription.status}</p>
                      <p><strong>Frecuencia:</strong> {selectedOrder.related_subscription.frequency} {selectedOrder.related_subscription.frequency_type}</p>
                      <p><strong>Monto:</strong> {formatCurrency(selectedOrder.related_subscription.amount)}</p>
                      <p><strong>Próximo pago:</strong> {formatDate(selectedOrder.related_subscription.next_payment_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
