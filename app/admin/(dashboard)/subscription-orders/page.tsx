'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { invalidateSubscriptionsCache } from '@/lib/query-optimizations'
import SubscriptionValidator from "@/components/subscription-validator"
import { 
  Calendar, 
  DollarSign, 
  User, 
  Package,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  Download,
  Upload,
  TrendingUp,
  Activity
} from "lucide-react"

interface AdminSubscription {
  id: string
  user_id: string
  product_id: string
  status: string
  subscription_type: string
  price: number
  quantity: number
  size?: string
  next_billing_date: string
  last_billing_date?: string
  created_at: string
  cancelled_at?: string
  is_active: boolean
  // Nuevos campos del webhook
  discount_percentage?: number
  base_price?: number
  discounted_price?: number
  updated_at?: string
  product_name?: string
  product_image?: string
  metadata?: {
    preapproval_id?: string
    processed_manually?: boolean
    original_cart_items?: Array<{
      size: string
      price: number
      quantity: number
      product_id: number
      product_name: string
      isSubscription: boolean
      subscriptionType: string
    }>
  }
  mercadopago_subscription_id?: string
  mercadopago_plan_id?: string
  external_reference?: string
  reason?: string
  charges_made?: number
  frequency?: number
  frequency_type?: string
  version?: string
  application_id?: string
  collector_id?: string
  preapproval_plan_id?: string
  back_url?: string
  init_point?: string
  start_date?: string
  end_date?: string
  currency_id?: string
  transaction_amount?: number
  free_trial?: any
  // Relaciones
  user_profile?: {
    full_name: string
    email: string
    phone?: string
  }
  product?: {
    id: string
    name: string
    image: string
    price: number
  }
  // Información de pagos
  last_payment?: {
    id: string
    billing_date: string
    amount: number
    status: string
    payment_method?: string
    mercadopago_payment_id?: string
  }
  payment_history_count: number
  total_paid: number
}

export default function AdminSubscriptionOrdersPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [refreshing, setRefreshing] = useState(false)
  const [validatingPayment, setValidatingPayment] = useState<string | null>(null)
  const [validatingAll, setValidatingAll] = useState(false)
  const [validationStats, setValidationStats] = useState<any>(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  
  const supabase = createClient()

  const fetchAllSubscriptions = async (currentRetry = 0) => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1 segundo
    
    try {
      setLoading(true)
      setError(null)
      setRetryCount(currentRetry)
      console.log(`🔍 Cargando suscripciones... (intento ${currentRetry + 1}/${MAX_RETRIES + 1})`)

      // ✅ IMPLEMENTAR TIEMPO REAL: Configurar suscripción a cambios (solo una vez)
      if (currentRetry === 0 && !window.subscriptionRealtimeChannel) {
        console.log('🔄 Configurando suscripción en tiempo real...')
        const subscriptionChannel = supabase
          .channel('admin_subscriptions_realtime')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions'
          }, (payload) => {
            console.log('📡 Cambio detectado en suscripciones:', payload.eventType)
            
            // Invalidar caché y refrescar suscripciones automáticamente
            invalidateSubscriptionsCache()
            fetchAllSubscriptions(0)
            
            // Mostrar notificación discreta
            if (payload.eventType === 'UPDATE') {
              console.log('📝 Suscripción actualizada')
            } else if (payload.eventType === 'INSERT') {
              console.log('🆕 Nueva suscripción creada')
            }
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'subscription_billing_history'
          }, (payload) => {
            console.log('📡 Cambio detectado en historial de facturación:', payload.eventType)
            
            // Invalidar caché y refrescar suscripciones cuando se validen pagos
            invalidateSubscriptionsCache()
            fetchAllSubscriptions(0)
            
            // Mostrar notificación de pago validado
            if (payload.eventType === 'INSERT') {
              console.log('💰 Nuevo pago de suscripción validado')
              toast.success('Pago de suscripción validado automáticamente')
            }
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'pending_subscriptions'
          }, (payload) => {
            console.log('📡 Cambio detectado en suscripciones pendientes:', payload.eventType)
            
            // Refrescar cuando cambie el estado de suscripciones pendientes
            invalidateSubscriptionsCache()
            fetchAllSubscriptions(0)
            
            if (payload.eventType === 'UPDATE' && payload.new?.status === 'processed') {
              console.log('✅ Suscripción pendiente procesada')
              toast.success('Suscripción activada automáticamente')
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Canal de tiempo real conectado exitosamente')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Error en canal de tiempo real')
              window.subscriptionRealtimeChannel = null
            }
          })

        // Guardar referencia para cleanup posterior
        window.subscriptionRealtimeChannel = subscriptionChannel
      } else if (window.subscriptionRealtimeChannel) {
        console.log('⚠️ Canal de tiempo real ya existe, evitando duplicación')
      }
      
      // Usar API route para obtener suscripciones (bypasea RLS)
      const response = await fetch('/api/admin/subscriptions')
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener suscripciones')
      }
      const optimizedSubscriptions = result.data
      
      // Convertir a formato AdminSubscription
      const adminSubscriptions = optimizedSubscriptions.map(sub => ({
        ...sub,
        user_profile: sub.user_profile || undefined,
        product: sub.products || undefined,
        last_payment: undefined, // Se puede agregar si es necesario
        payment_history_count: 0, // Se puede calcular si es necesario
        total_paid: 0 // Se puede calcular si es necesario
      }))
      
      setSubscriptions(adminSubscriptions)
      
      console.log(`✅ Procesamiento completado: ${adminSubscriptions.length} suscripciones cargadas`)
      
    } catch (error) {
      const errorInfo = {
        error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        retryCount,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'
      }
      
      console.error("💥 Error inesperado en fetchAllSubscriptions:", errorInfo)
      
      // Estrategia de reintento para errores de red
       if (currentRetry < MAX_RETRIES && (
         error instanceof TypeError && error.message.includes('fetch') ||
         error instanceof Error && error.message.includes('network')
       )) {
         console.log(`🔄 Reintentando por error de red en ${RETRY_DELAY}ms...`)
         setTimeout(() => {
           fetchAllSubscriptions(currentRetry + 1)
         }, RETRY_DELAY * (currentRetry + 1))
         return
       }
       
       // Error crítico - mostrar mensaje y opciones de recuperación
       const userMessage = error instanceof TypeError
         ? 'Error de conexión. Verifica tu internet e intenta nuevamente.'
         : error instanceof Error && error.message.includes('permission')
         ? 'Sin permisos suficientes. Contacta al administrador.'
         : 'Error inesperado del sistema. Intenta recargar la página.'
       
       setError(userMessage)
       
       toast.error(userMessage, {
         description: `Intento ${currentRetry + 1}/${MAX_RETRIES + 1} | ${new Date().toLocaleTimeString()}`,
         action: {
           label: "Reintentar",
           onClick: () => fetchAllSubscriptions(0)
         },
         duration: 10000 // 10 segundos para errores críticos
       })
       
       // Establecer estado seguro
       setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAllSubscriptions()
    setRefreshing(false)
    toast.success("Suscripciones actualizadas")
  }

  const validatePaymentWithMercadoPago = async (paymentId: string) => {
    if (!paymentId) {
      toast.error("ID de pago no disponible")
      return
    }

    setValidatingPayment(paymentId)
    
    try {
      console.log(`🔍 Validando pago ${paymentId} con MercadoPago...`)
      
      const response = await fetch('/api/mercadopago/validate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log('✅ Validación exitosa:', result)
        
        toast.success(`Pago validado: ${result.mercadopago_status}`, {
          description: `Estado: ${result.status_detail} | Monto: $${result.amount}`
        })
        
        // Refrescar datos si hubo cambios
        if (result.local_update_success) {
          await fetchAllSubscriptions()
        }
      } else {
        console.error('❌ Error en validación:', result)
        toast.error("Error al validar el pago", {
          description: result.error || "Error desconocido"
        })
      }
    } catch (error) {
      console.error('💥 Error al validar pago:', error)
      toast.error("Error de conexión al validar el pago")
    } finally {
      setValidatingPayment(null)
    }
  }

  const validateAllPayments = async (paymentType: string = 'pending', limit: number = 50) => {
    setValidatingAll(true)
    
    try {
      console.log(`🔍 Iniciando validación masiva de pagos (${paymentType})...`)
      
      const response = await fetch('/api/admin/validate-all-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_type: paymentType, limit })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        console.log('✅ Validación masiva exitosa:', result.summary)
        
        setValidationStats(result.summary)
        setShowValidationModal(true)
        
        toast.success(`Validación completada: ${result.summary.successful_validations}/${result.summary.total_processed} exitosos`, {
          description: `${result.summary.updated_payments} pagos actualizados`
        })
        
        // Refrescar datos
        await fetchAllSubscriptions()
      } else {
        console.error('❌ Error en validación masiva:', result)
        toast.error("Error en validación masiva", {
          description: result.error || "Error desconocido"
        })
      }
    } catch (error) {
      console.error('💥 Error en validación masiva:', error)
      toast.error("Error de conexión en validación masiva")
    } finally {
      setValidatingAll(false)
    }
  }

  const fetchValidationStats = async () => {
    try {
      const response = await fetch('/api/admin/validate-all-payments?status=pending')
      const result = await response.json()
      
      if (response.ok && result.success) {
        return result.stats
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
    }
    return null
  }

  useEffect(() => {
    fetchAllSubscriptions()
    
    // Cleanup function para evitar suscripciones múltiples
    return () => {
      if (window.subscriptionRealtimeChannel) {
        console.log('🧹 Limpiando canal de tiempo real...')
        window.subscriptionRealtimeChannel.unsubscribe()
        window.subscriptionRealtimeChannel = null
      }
    }
  }, [])

  // Filtrar suscripciones
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      (sub.user_profile?.full_name && sub.user_profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.user_profile?.email && sub.user_profile.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.product?.name && sub.product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.id && sub.id.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && sub.status === 'active') ||
      (statusFilter === "inactive" && !sub.is_active && sub.status !== 'cancelled') ||
      (statusFilter === "cancelled" && sub.status === 'cancelled') ||
      (statusFilter === "pending" && sub.status === "pending")
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  const getStatusBadge = (subscription: AdminSubscription) => {
    if (subscription.status === 'cancelled') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>
    }
    if (subscription.status === "pending") {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pendiente (Webhook)</Badge>
    }
    if (subscription.status === 'active') {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Activa</Badge>
    }
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inactiva</Badge>
  }

  const getPaymentStatusBadge = (payment?: AdminSubscription['last_payment']) => {
    if (!payment) {
      return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Sin pagos</Badge>
    }
    
    switch (payment.status) {
      case 'approved':
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />Dinero Acreditado ✓
            </Badge>
            {payment.mercadopago_payment_id && (
              <span className="text-xs text-green-600 font-mono">
                MP: {payment.mercadopago_payment_id}
              </span>
            )}
          </div>
        )
      case 'paid':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Pagado ✓</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente ⏳</Badge>
      case 'in_process':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Procesando...</Badge>
      case 'authorized':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Autorizado (No capturado)</Badge>
      case 'cancelled':
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallido ❌</Badge>
      case 'refunded':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800"><XCircle className="h-3 w-3 mr-1" />Reembolsado 💰</Badge>
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Estado: {payment.status}</Badge>
    }
  }

  const getMoneyTransferStatus = (payment?: AdminSubscription['last_payment']) => {
    if (!payment) return null
    
    const isMoneyReceived = payment.status === 'approved' || payment.status === 'paid'
    
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className={`w-3 h-3 rounded-full ${
          isMoneyReceived ? 'bg-green-500' : 'bg-gray-300'
        }`} />
        <span className={`text-sm font-medium ${
          isMoneyReceived ? 'text-green-700' : 'text-gray-500'
        }`}>
          {isMoneyReceived ? 'Dinero recibido' : 'Dinero pendiente'}
        </span>
      </div>
    )
  }

  const getFrequencyLabel = (subscription: AdminSubscription) => {
    // Si tiene frequency y frequency_type (datos del webhook), usar esos
    if (subscription.frequency && subscription.frequency_type) {
      const frequency = subscription.frequency
      const type = subscription.frequency_type
      
      if (type === 'weeks') {
        return frequency === 1 ? 'Semanal' : `Cada ${frequency} semanas`
      } else if (type === 'months') {
        return frequency === 1 ? 'Mensual' : `Cada ${frequency} meses`
      } else if (type === 'days') {
        return frequency === 1 ? 'Diario' : `Cada ${frequency} días`
      }
      return `Cada ${frequency} ${type}`
    }
    
    // Fallback a subscription_type tradicional
    const labels: Record<string, string> = {
      'weekly': 'Semanal',
      'biweekly': 'Cada 2 semanas',
      'monthly': 'Mensual',
      'quarterly': 'Cada 3 meses',
      'annual': 'Anual'
    }
    return labels[subscription.subscription_type] || subscription.subscription_type
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">
            Cargando suscripciones...
            {retryCount > 0 && ` (Intento ${retryCount + 1})`}
          </span>
        </div>
      </div>
    )
  }

  // UI de error amigable
  if (error && !loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Error al cargar las suscripciones
            </h3>
            <p className="text-gray-600 max-w-md">
              {error}
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500">
                Intentos realizados: {retryCount + 1}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => fetchAllSubscriptions(0)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Recargar página
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Administración de Suscripciones
        </h1>
        <p className="text-gray-600">
          Gestiona todas las suscripciones activas y su estado de pagos
        </p>
      </div>



      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-xl font-bold">
                  {subscriptions.filter(s => s.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-xl font-bold">
                  {subscriptions.filter(s => s.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-xl font-bold">
                  {subscriptions.filter(s => s.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-gray-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-xl font-bold">
                  {subscriptions.filter(s => !s.is_active && s.status !== 'cancelled' && s.status !== 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold">{subscriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email, producto o ID..."
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="pending">Pendientes</option>
                <option value="inactive">Inactivas</option>
                <option value="cancelled">Canceladas</option>
              </select>
              

              
              <div className="flex gap-2">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                
                {filteredSubscriptions.some(sub => sub.status === 'pending') && (
                  <Button
                    onClick={() => {
                      toast.info('Función de procesamiento manual en desarrollo');
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Procesar Pendientes
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <div className="space-y-4">
        {filteredSubscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se encontraron suscripciones
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all" 
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "No hay suscripciones registradas en el sistema"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Información Principal */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      {(subscription.product?.image || subscription.product_image) && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={subscription.product?.image || subscription.product_image}
                            alt={subscription.product?.name || subscription.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                          {subscription.product?.name || subscription.product_name || 'Producto no encontrado'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {subscription.user_profile?.full_name || 'Usuario no encontrado'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {subscription.user_profile?.email}
                        </p>
                        {/* ID de suscripción y MercadoPago */}
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-xs text-gray-400 font-mono">
                            ID: {String(subscription.id).slice(0, 8)}...
                          </p>
                          {subscription.mercadopago_subscription_id && (
                            <p className="text-xs text-blue-600 font-mono">
                              MP: {subscription.mercadopago_subscription_id}
                            </p>
                          )}
                          {subscription.user_profile?.phone && (
                            <p className="text-xs text-gray-500">
                              📱 {subscription.user_profile.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {getStatusBadge(subscription)}
                      <Badge variant="outline">
                        {getFrequencyLabel(subscription)}
                      </Badge>
                      {subscription.size && (
                        <Badge variant="outline">
                          {subscription.size}
                        </Badge>
                      )}
                      {subscription.quantity > 1 && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800">
                          Qty: {subscription.quantity}
                        </Badge>
                      )}
                      {subscription.discount_percentage > 0 && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          -{subscription.discount_percentage}%
                        </Badge>
                      )}
                      {subscription.metadata?.processed_manually && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          🔧 Manual
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Información de Suscripción */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Precio</p>
                        <div className="flex flex-col">
                          <p className="font-semibold">{formatPrice(subscription.discounted_price || subscription.price)}</p>
                          {subscription.discount_percentage > 0 && (
                            <p className="text-xs text-green-600">
                              {subscription.discount_percentage}% descuento
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500">Creada</p>
                        <p>{formatDate(subscription.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Próximo cobro</p>
                        <p className="font-medium">
                          {subscription.next_billing_date 
                            ? formatDate(subscription.next_billing_date)
                            : "No programado"
                          }
                        </p>
                      </div>
                      {subscription.start_date && (
                        <div>
                          <p className="text-gray-500">Fecha inicio</p>
                          <p>{formatDate(subscription.start_date)}</p>
                        </div>
                      )}

                      {subscription.status === 'cancelled' && subscription.cancelled_at && (
                        <div>
                          <p className="text-gray-500">Cancelada</p>
                          <div className="flex flex-col">
                            <p className="text-red-600">{formatDate(subscription.cancelled_at)}</p>
                            {subscription.reason && (
                              <p className="text-xs text-red-500 mt-1">
                                Motivo: {subscription.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Información adicional del metadata */}
                    {subscription.metadata?.processed_manually && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm font-medium">Procesada manualmente</span>
                        </div>
                      </div>
                    )}
                    
                    {subscription.currency_id && subscription.currency_id !== 'MXN' && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-700">
                          Moneda: {subscription.currency_id}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {filteredSubscriptions.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="text-center text-sm text-gray-600">
              Mostrando {filteredSubscriptions.length} de {subscriptions.length} suscripciones
              {searchTerm && (
                <span className="ml-2">
                  • Filtrado por: "{searchTerm}"
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Resultados de Validación */}
      {showValidationModal && validationStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Resultados de Validación Masiva</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowValidationModal(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{validationStats.total_processed}</div>
                    <div className="text-sm text-gray-600">Total Procesados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{validationStats.successful_validations}</div>
                    <div className="text-sm text-gray-600">Exitosos</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{validationStats.failed_validations}</div>
                    <div className="text-sm text-gray-600">Fallidos</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{validationStats.updated_payments}</div>
                    <div className="text-sm text-gray-600">Actualizados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatPrice(validationStats.total_amount_validated)}
                    </div>
                    <div className="text-sm text-gray-600">Monto Total</div>
                  </CardContent>
                </Card>
              </div>

              {/* Detalles */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles por Pago</h3>
                <div className="max-h-96 overflow-y-auto">
                  {validationStats.results.map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-gray-600">
                          MP: {result.payment_id}
                        </div>
                        <div className="text-sm">
                          {result.original_status} → {result.mercadopago_status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(result.amount)}</div>
                        <div className="flex items-center gap-2">
                          {result.updated ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />Actualizado
                            </Badge>
                          ) : result.error ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />Error
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />Sin cambios
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowValidationModal(false)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    setShowValidationModal(false)
                    handleRefresh()
                  }}
                >
                  Actualizar Lista
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
