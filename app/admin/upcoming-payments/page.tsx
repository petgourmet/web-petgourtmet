'use client'

import { useState, useEffect } from 'react'
import { Clock, CreditCard, AlertTriangle, CheckCircle, Calendar, TrendingUp, Users, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { AuthGuard } from '@/components/admin/auth-guard'

interface UpcomingPayment {
  id: number
  user_id: string
  product_name: string
  amount: number
  frequency: number
  frequency_type: string
  next_payment_date: string
  status: string
  charges_made: number
  customer_email?: string
  order_id?: number
  days_until_payment: number
}

interface DashboardStats {
  total_active_subscriptions: number
  payments_due_today: number
  payments_due_this_week: number
  total_monthly_revenue: number
}

export default function UpcomingPaymentsDashboard() {
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all')

  useEffect(() => {
    fetchUpcomingPayments()
    const interval = setInterval(fetchUpcomingPayments, 5 * 60 * 1000) // Actualizar cada 5 minutos
    return () => clearInterval(interval)
  }, [])

  const fetchUpcomingPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/upcoming-payments')
      const result = await response.json()

      if (response.ok && result.success) {
        setUpcomingPayments(result.payments || [])
        setStats(result.stats || null)
      } else {
        toast.error('Error cargando próximos pagos: ' + result.error)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysUntilPayment = (dateString: string) => {
    const now = new Date()
    const paymentDate = new Date(dateString)
    const diffTime = paymentDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'bg-red-100 text-red-800 border-red-200'
    if (days === 0) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (days <= 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (days <= 3) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getUrgencyLabel = (days: number) => {
    if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
    if (days === 0) return '¡HOY!'
    if (days === 1) return '¡Mañana!'
    return `En ${days} día${days !== 1 ? 's' : ''}`
  }

  const filteredPayments = upcomingPayments.filter(payment => {
    const days = getDaysUntilPayment(payment.next_payment_date)
    switch (filter) {
      case 'today': return days <= 0
      case 'week': return days <= 7 && days >= 0
      case 'overdue': return days < 0
      default: return true
    }
  })

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Próximos Cobros de Suscripciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitorea y gestiona los pagos recurrentes programados
          </p>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Suscripciones Activas
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.total_active_subscriptions}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pagos Hoy
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {stats.payments_due_today}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pagos Esta Semana
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.payments_due_this_week}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Ingresos Mensuales
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.total_monthly_revenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todos', count: upcomingPayments.length },
              { key: 'overdue', label: 'Vencidos', count: upcomingPayments.filter(p => getDaysUntilPayment(p.next_payment_date) < 0).length },
              { key: 'today', label: 'Hoy', count: upcomingPayments.filter(p => getDaysUntilPayment(p.next_payment_date) <= 0 && getDaysUntilPayment(p.next_payment_date) >= 0).length },
              { key: 'week', label: 'Esta Semana', count: upcomingPayments.filter(p => getDaysUntilPayment(p.next_payment_date) <= 7 && getDaysUntilPayment(p.next_payment_date) >= 0).length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Lista de próximos pagos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Próximos Cobros ({filteredPayments.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando próximos pagos...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No hay pagos pendientes en este filtro</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPayments.map((payment) => {
                const daysUntil = getDaysUntilPayment(payment.next_payment_date)
                return (
                  <div key={payment.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {payment.product_name}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(daysUntil)}`}>
                                {getUrgencyLabel(daysUntil)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div>
                                <span className="font-medium">Cliente:</span> {payment.customer_email || 'No disponible'}
                              </div>
                              <div>
                                <span className="font-medium">Monto:</span> {formatCurrency(payment.amount)}
                              </div>
                              <div>
                                <span className="font-medium">Frecuencia:</span> Cada {payment.frequency} {payment.frequency_type}
                              </div>
                              <div>
                                <span className="font-medium">Cobros:</span> {payment.charges_made}
                              </div>
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Próximo pago:</span> {formatDate(payment.next_payment_date)}
                              {payment.order_id && (
                                <span className="ml-3">
                                  <span className="font-medium">Orden:</span> #{payment.order_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {payment.order_id && (
                          <a 
                            href={`/admin/orders/${payment.order_id}`}
                            className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
                          >
                            Ver Orden
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
