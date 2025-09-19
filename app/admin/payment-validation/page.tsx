'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Search,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Eye,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import { AuthGuard } from '@/components/admin/auth-guard'
import { createClient } from '@/lib/supabase/client'

interface PaymentValidationItem {
  id: string
  payment_id: string
  subscription_id?: string
  order_id?: string
  amount: number
  status: string
  mercadopago_status?: string
  customer_email: string
  customer_name: string
  product_name: string
  payment_method?: string
  created_at: string
  validated_at?: string
  last_validation?: string
  type: 'subscription' | 'order'
}

interface ValidationStats {
  total_payments: number
  validated_payments: number
  pending_validation: number
  failed_payments: number
  total_amount: number
  validated_amount: number
}

export default function PaymentValidationPage() {
  const [payments, setPayments] = useState<PaymentValidationItem[]>([])
  const [stats, setStats] = useState<ValidationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchPaymentData()
  }, [])

  const fetchPaymentData = async () => {
    try {
      setLoading(true)
      
      // Obtener pagos de suscripciones
      const { data: subscriptionPayments, error: subError } = await supabase
        .from('subscription_billing_history')
        .select(`
          *,
          subscriptions!inner (
            id,
            user_id,
            product_id,
            products (
              name
            ),
            user_profile:profiles!subscriptions_user_id_fkey (
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      // Obtener órdenes con pagos
      const { data: orderPayments, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            products (
              name
            )
          )
        `)
        .not('mercadopago_payment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (subError) {
        console.error('Error fetching subscription payments:', subError)
      }

      if (orderError) {
        console.error('Error fetching order payments:', orderError)
      }

      // Procesar datos de suscripciones
      const processedSubPayments: PaymentValidationItem[] = (subscriptionPayments || []).map(payment => ({
        id: `sub_${payment.id}`,
        payment_id: payment.mercadopago_payment_id || '',
        subscription_id: payment.subscription_id,
        amount: payment.amount || 0,
        status: payment.status || 'pending',
        mercadopago_status: payment.payment_details?.status || payment.status,
        customer_email: payment.subscriptions?.user_profile?.email || 'Sin email',
        customer_name: payment.subscriptions?.user_profile?.full_name || 'Sin nombre',
        product_name: payment.subscriptions?.products?.name || 'Producto de suscripción',
        payment_method: payment.payment_method || 'Desconocido',
        created_at: payment.transaction_date || payment.created_at,
        validated_at: payment.updated_at,
        last_validation: payment.updated_at,
        type: 'subscription' as const
      }))

      // Procesar datos de órdenes
      const processedOrderPayments: PaymentValidationItem[] = (orderPayments || []).map(order => ({
        id: `order_${order.id}`,
        payment_id: order.mercadopago_payment_id || '',
        order_id: order.id,
        amount: order.total || 0,
        status: order.payment_status || 'pending',
        mercadopago_status: order.payment_status,
        customer_email: order.customer_email || order.payer_email || 'Sin email',
        customer_name: order.customer_name || 'Sin nombre',
        product_name: order.order_items?.[0]?.products?.name || 'Orden de compra',
        payment_method: order.payment_type || 'Desconocido',
        created_at: order.created_at,
        validated_at: order.updated_at,
        last_validation: order.updated_at,
        type: 'order' as const
      }))

      // Combinar y ordenar todos los pagos
      const allPayments = [...processedSubPayments, ...processedOrderPayments]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setPayments(allPayments)

      // Calcular estadísticas
      const totalPayments = allPayments.length
      const validatedPayments = allPayments.filter(p => 
        p.status === 'approved' || p.status === 'paid' || p.mercadopago_status === 'approved'
      ).length
      const pendingValidation = allPayments.filter(p => 
        p.status === 'pending' || p.status === 'in_process'
      ).length
      const failedPayments = allPayments.filter(p => 
        p.status === 'rejected' || p.status === 'cancelled' || p.status === 'failed'
      ).length
      const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0)
      const validatedAmount = allPayments
        .filter(p => p.status === 'approved' || p.status === 'paid' || p.mercadopago_status === 'approved')
        .reduce((sum, p) => sum + p.amount, 0)

      setStats({
        total_payments: totalPayments,
        validated_payments: validatedPayments,
        pending_validation: pendingValidation,
        failed_payments: failedPayments,
        total_amount: totalAmount,
        validated_amount: validatedAmount
      })

    } catch (error) {
      console.error('Error fetching payment data:', error)
      toast.error('Error al cargar los datos de pagos')
    } finally {
      setLoading(false)
    }
  }

  const validatePayment = async (paymentId: string, itemId: string) => {
    if (!paymentId) {
      toast.error('ID de pago no disponible')
      return
    }

    try {
      setValidating(itemId)
      
      const response = await fetch('/api/mercadopago/validate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Pago ${paymentId} validado exitosamente`)
        // Actualizar el estado local del pago
        setPayments(prev => prev.map(payment => 
          payment.id === itemId 
            ? { 
                ...payment, 
                status: result.mercadopago_status,
                mercadopago_status: result.mercadopago_status,
                last_validation: new Date().toISOString()
              }
            : payment
        ))
        // Refrescar estadísticas
        await fetchPaymentData()
      } else {
        toast.error(`Error al validar pago: ${result.error}`)
      }
    } catch (error) {
      console.error('Error validating payment:', error)
      toast.error('Error al validar el pago')
    } finally {
      setValidating(null)
    }
  }

  const validateAllPending = async () => {
    const pendingPayments = filteredPayments.filter(p => 
      (p.status === 'pending' || p.status === 'in_process') && p.payment_id
    )

    if (pendingPayments.length === 0) {
      toast.info('No hay pagos pendientes para validar')
      return
    }

    try {
      setRefreshing(true)
      const paymentIds = pendingPayments.map(p => p.payment_id).join(',')
      
      const response = await fetch(`/api/mercadopago/validate-payment?payment_ids=${paymentIds}`)
      const result = await response.json()

      if (result.success) {
        const successCount = result.results.filter((r: any) => !r.error).length
        toast.success(`${successCount} de ${pendingPayments.length} pagos validados`)
        await fetchPaymentData()
      } else {
        toast.error('Error al validar pagos pendientes')
      }
    } catch (error) {
      console.error('Error validating pending payments:', error)
      toast.error('Error al validar pagos pendientes')
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string, mercadopagoStatus?: string) => {
    const finalStatus = mercadopagoStatus || status
    
    switch (finalStatus) {
      case 'approved':
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">✅ Aprobado</Badge>
      case 'pending':
      case 'in_process':
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendiente</Badge>
      case 'rejected':
      case 'cancelled':
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">❌ Rechazado</Badge>
      case 'refunded':
        return <Badge className="bg-gray-100 text-gray-800">💰 Reembolsado</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">❓ {finalStatus}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'subscription' ? '🔄' : '🛒'
  }

  // Filtrar pagos
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_id.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || 
      payment.status === statusFilter || 
      payment.mercadopago_status === statusFilter
    
    const matchesType = typeFilter === 'all' || payment.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-gray-600">Cargando datos de validación...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Validación de Pagos y Suscripciones
          </h1>
          <p className="text-gray-600">
            Monitorea y valida el estado de todos los pagos con MercadoPago
          </p>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Pagos</p>
                    <p className="text-2xl font-bold">{stats.total_payments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Validados</p>
                    <p className="text-2xl font-bold">{stats.validated_payments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Pendientes</p>
                    <p className="text-2xl font-bold">{stats.pending_validation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Fallidos</p>
                    <p className="text-2xl font-bold">{stats.failed_payments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Monto Total</p>
                    <p className="text-xl font-bold">${stats.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Validado</p>
                    <p className="text-xl font-bold">${stats.validated_amount.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controles */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, email, producto o ID de pago..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos los estados</option>
              <option value="approved">Aprobados</option>
              <option value="pending">Pendientes</option>
              <option value="rejected">Rechazados</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos los tipos</option>
              <option value="subscription">Suscripciones</option>
              <option value="order">Órdenes</option>
            </select>
            
            <Button
              onClick={validateAllPending}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Validar Pendientes
            </Button>
            
            <Button
              onClick={fetchPaymentData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Lista de pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagos y Suscripciones ({filteredPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No se encontraron pagos
                </h3>
                <p className="text-gray-600">
                  Ajusta los filtros para ver más resultados
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-lg">{getTypeIcon(payment.type)}</span>
                          <h3 className="font-semibold text-gray-900">
                            {payment.product_name}
                          </h3>
                          {getStatusBadge(payment.status, payment.mercadopago_status)}
                          {payment.type === 'subscription' && (
                            <Badge variant="outline">Suscripción</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Cliente:</span> {payment.customer_name}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {payment.customer_email}
                          </div>
                          <div>
                            <span className="font-medium">Monto:</span> ${payment.amount.toFixed(2)} MXN
                          </div>
                          <div>
                            <span className="font-medium">Método:</span> {payment.payment_method}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Creado:</span> {new Date(payment.created_at).toLocaleDateString('es-MX')}
                          </div>
                          {payment.payment_id && (
                            <div>
                              <span className="font-medium">ID Pago:</span> {payment.payment_id}
                            </div>
                          )}
                          {payment.last_validation && (
                            <div>
                              <span className="font-medium">Última validación:</span> {new Date(payment.last_validation).toLocaleDateString('es-MX')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        {payment.payment_id && (
                          <Button
                            onClick={() => validatePayment(payment.payment_id, payment.id)}
                            disabled={validating === payment.id}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            {validating === payment.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Validar
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => {
                            if (payment.type === 'subscription') {
                              window.open(`/admin/subscription-orders`, '_blank')
                            } else {
                              window.open(`/admin/orders/${payment.order_id}`, '_blank')
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}