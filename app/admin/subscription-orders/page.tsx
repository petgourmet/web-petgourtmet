'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
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
  Shield
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
  
  const supabase = createClient()

  const fetchAllSubscriptions = async (currentRetry = 0) => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1 segundo
    
    try {
      setLoading(true)
      setError(null)
      setRetryCount(currentRetry)
      console.log(`🔍 Cargando suscripciones... (intento ${currentRetry + 1}/${MAX_RETRIES + 1})`)

      // Verificar conexión a Supabase
      try {
        const { data: healthCheck } = await supabase
          .from("user_subscriptions")
          .select("count")
          .limit(1)
          .single()
        
        console.log("✅ Conexión a Supabase verificada")
      } catch (healthError) {
        console.warn("⚠️ Problema de conexión detectado:", healthError)
        throw new Error("Problema de conectividad con la base de datos")
      }
      
      // Obtener suscripciones con manejo de errores granular
      let subscriptionsData = null
      let error = null
      
      try {
        // Obtener suscripciones sin relación con profiles por ahora
        const result = await supabase
          .from("user_subscriptions")
          .select(`
            *,
            products (
              id,
              name,
              image,
              price
            )
          `)
          .order("created_at", { ascending: false })
        
        subscriptionsData = result.data
        error = result.error
        
        // Si tenemos suscripciones, obtener los perfiles de usuario por separado
        if (subscriptionsData && subscriptionsData.length > 0 && !error) {
          const userIds = [...new Set(subscriptionsData.map(sub => sub.user_id).filter(Boolean))]
          
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, auth_users_id, full_name, email, phone')
              .in('auth_users_id', userIds)
            
            // Combinar datos de perfiles con suscripciones
            subscriptionsData = subscriptionsData.map(subscription => {
              const userProfile = profilesData?.find(profile => profile.auth_users_id === subscription.user_id)
              return {
                ...subscription,
                user_profile: userProfile ? {
                  full_name: userProfile.full_name,
                  email: userProfile.email,
                  phone: userProfile.phone
                } : null
              }
            })
          }
        }
      } catch (queryError) {
        console.error("💥 Error en consulta SQL:", queryError)
        error = queryError
      }

      if (error) {
        const errorInfo = {
          message: error.message || 'Error desconocido',
          details: error.details || 'Sin detalles disponibles',
          hint: error.hint || 'Sin sugerencias disponibles',
          code: error.code || 'Sin código de error',
          timestamp: new Date().toISOString()
        }
        
        console.error("❌ Error detallado al obtener suscripciones:", errorInfo)
        
        // Estrategia de reintento para errores temporales
        if (currentRetry < MAX_RETRIES && (
          error.code === 'PGRST301' || // Timeout
          error.code === 'PGRST116' || // Connection error
          error.message?.includes('timeout') ||
          error.message?.includes('connection')
        )) {
           console.log(`🔄 Reintentando en ${RETRY_DELAY}ms...`)
           setTimeout(() => {
             fetchAllSubscriptions(currentRetry + 1)
           }, RETRY_DELAY * (currentRetry + 1)) // Backoff exponencial
           return
         }
         
         // Error persistente - mostrar mensaje amigable
         const userMessage = error.code === 'PGRST116' 
           ? 'Problema de conexión. Verifica tu internet e intenta nuevamente.'
           : error.code === 'PGRST204'
           ? 'No se encontraron suscripciones en el sistema.'
           : error.message?.includes('permission')
           ? 'Sin permisos para acceder a esta información. Contacta al administrador.'
           : `Error al cargar suscripciones: ${errorInfo.message}`
         
         setError(userMessage)
         
         toast.error(userMessage, {
           description: `Código: ${errorInfo.code} | Intento: ${currentRetry + 1}`,
           action: {
             label: "Reintentar",
             onClick: () => fetchAllSubscriptions(0)
           }
         })
         
         // Establecer estado de error para mostrar UI alternativa
         setSubscriptions([])
         return
      }
      
      // Validar datos recibidos
      if (!Array.isArray(subscriptionsData)) {
        console.warn("⚠️ Datos recibidos no son un array:", subscriptionsData)
        subscriptionsData = []
      }

      console.log(`📊 Suscripciones encontradas: ${subscriptionsData?.length || 0}`)
      
      // Manejar caso de no hay suscripciones
      if (!subscriptionsData || subscriptionsData.length === 0) {
        console.log('ℹ️ No se encontraron suscripciones en el sistema')
        setSubscriptions([])
        setLoading(false)
        return
      }

      // Procesar suscripciones con validación y manejo de errores
      const subscriptionsWithPayments: AdminSubscription[] = []
      let processedCount = 0
      let errorCount = 0
      
      if (subscriptionsData && subscriptionsData.length > 0) {
        console.log(`📋 Procesando ${subscriptionsData.length} suscripciones...`)
        
        for (const [index, sub] of subscriptionsData.entries()) {
          try {
            // Validar datos básicos de la suscripción
            if (!sub || !sub.id) {
              console.warn(`⚠️ Suscripción ${index} inválida:`, sub)
              errorCount++
              continue
            }
            
            // Obtener historial de pagos con manejo de errores
            let billingHistory = null
            try {
              const { data, error: billingError } = await supabase
                .from("subscription_billing_history")
                .select("*")
                .eq("subscription_id", sub.id)
                .order("billing_date", { ascending: false })
              
              if (billingError) {
                console.warn(`⚠️ Error al obtener historial de pagos para ${sub.id}:`, billingError)
                billingHistory = []
              } else {
                billingHistory = data || []
              }
            } catch (billingQueryError) {
              console.warn(`⚠️ Error en consulta de historial para ${sub.id}:`, billingQueryError)
              billingHistory = []
            }

            // Calcular estadísticas de pagos con validación
            const paymentHistoryCount = Array.isArray(billingHistory) ? billingHistory.length : 0
            const totalPaid = Array.isArray(billingHistory) 
              ? billingHistory.reduce((sum, payment) => {
                  const amount = typeof payment?.amount === 'number' ? payment.amount : 0
                  return sum + amount
                }, 0)
              : 0

            // Obtener último pago con validación
            const lastPayment = Array.isArray(billingHistory) && billingHistory.length > 0 
              ? billingHistory[0] 
              : null

            // Crear objeto de suscripción con valores por defecto seguros
            const adminSubscription: AdminSubscription = {
              id: sub.id || `unknown-${index}`,
              user_id: sub.user_id || '',
              product_id: sub.product_id || '',
              status: sub.status || (sub.is_active ? 'active' : 'inactive'),
              subscription_type: sub.subscription_type || 'monthly',
              price: typeof sub.price === 'number' ? sub.price : (sub.products?.price || 0),
              quantity: typeof sub.quantity === 'number' ? sub.quantity : 1,
              size: sub.size || undefined,
              next_billing_date: sub.next_billing_date || '',
              last_billing_date: sub.last_billing_date || lastPayment?.billing_date || '',
              created_at: sub.created_at || new Date().toISOString(),
              cancelled_at: sub.cancelled_at || undefined,
              is_active: Boolean(sub.is_active),
              user_profile: sub.profiles ? {
                full_name: sub.profiles.full_name || 'Usuario sin nombre',
                email: sub.profiles.email || 'Sin email',
                phone: sub.profiles.phone || undefined
              } : undefined,
              product: sub.products ? {
                id: sub.products.id || '',
                name: sub.products.name || 'Producto sin nombre',
                image: sub.products.image || '/placeholder.jpg',
                price: typeof sub.products.price === 'number' ? sub.products.price : 0
              } : undefined,
              last_payment: lastPayment ? {
                id: lastPayment.id || '',
                billing_date: lastPayment.billing_date || '',
                amount: typeof lastPayment.amount === 'number' ? lastPayment.amount : 0,
                status: lastPayment.status || 'unknown',
                payment_method: lastPayment.payment_method || undefined,
                mercadopago_payment_id: lastPayment.mercadopago_payment_id || undefined
              } : undefined,
              payment_history_count: paymentHistoryCount,
              total_paid: totalPaid
            }

            subscriptionsWithPayments.push(adminSubscription)
            processedCount++
            
          } catch (subscriptionError) {
            console.error(`💥 Error procesando suscripción ${index}:`, subscriptionError)
            errorCount++
          }
        }
      }

      // Establecer datos con información de procesamiento
      setSubscriptions(subscriptionsWithPayments)
      
      const successMessage = `✅ Procesamiento completado: ${processedCount} suscripciones cargadas`
      const warningMessage = errorCount > 0 ? ` (${errorCount} errores)` : ''
      
      console.log(successMessage + warningMessage)
      
      if (errorCount > 0) {
        toast.warning(`Algunas suscripciones tuvieron problemas`, {
          description: `${processedCount} cargadas correctamente, ${errorCount} con errores`
        })
      } else if (processedCount > 0) {
        console.log(`🎉 Todas las suscripciones se cargaron correctamente`)
      }
      
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

  useEffect(() => {
    fetchAllSubscriptions()
  }, [])

  // Filtrar suscripciones
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && sub.is_active) ||
      (statusFilter === "inactive" && !sub.is_active) ||
      (statusFilter === "cancelled" && sub.cancelled_at)
    
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
    if (subscription.cancelled_at) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>
    }
    if (subscription.is_active) {
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

  const getFrequencyLabel = (type: string) => {
    const labels: Record<string, string> = {
      'biweekly': 'Cada 2 semanas',
      'monthly': 'Mensual',
      'quarterly': 'Cada 3 meses',
      'annual': 'Anual'
    }
    return labels[type] || type
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

      {/* Filters and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{subscriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Activas</p>
                <p className="text-2xl font-bold">
                  {subscriptions.filter(s => s.is_active && !s.cancelled_at).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold">
                  {subscriptions.filter(s => s.cancelled_at).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold">
                  {formatPrice(subscriptions.reduce((sum, s) => sum + s.total_paid, 0))}
                </p>
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
                <option value="inactive">Inactivas</option>
                <option value="cancelled">Canceladas</option>
              </select>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Información del Usuario y Producto */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      {subscription.product?.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={subscription.product.image}
                            alt={subscription.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                          {subscription.product?.name || 'Producto no encontrado'}
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
                        {subscription.user_profile?.phone && (
                          <p className="text-sm text-gray-500">
                            📞 {subscription.user_profile.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {getStatusBadge(subscription)}
                      <Badge variant="outline">
                        {getFrequencyLabel(subscription.subscription_type)}
                      </Badge>
                      {subscription.size && (
                        <Badge variant="outline">
                          Tamaño: {subscription.size}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Información de Suscripción */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Detalles de Suscripción</p>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>ID:</span>
                          <span className="font-mono text-xs">{subscription.id.slice(-8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precio:</span>
                          <span className="font-semibold">{formatPrice(subscription.price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cantidad:</span>
                          <span>{subscription.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Creada:</span>
                          <span>{formatDate(subscription.created_at)}</span>
                        </div>
                        {subscription.cancelled_at && (
                          <div className="flex justify-between text-red-600">
                            <span>Cancelada:</span>
                            <span>{formatDate(subscription.cancelled_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Próximas Fechas</p>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Próximo cobro:</span>
                          <span className="font-medium">
                            {subscription.next_billing_date 
                              ? formatDate(subscription.next_billing_date)
                              : "No programado"
                            }
                          </span>
                        </div>
                        {subscription.last_billing_date && (
                          <div className="flex justify-between">
                            <span>Último cobro:</span>
                            <span>{formatDate(subscription.last_billing_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información de Pagos */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Estado de Pagos</p>
                      <div className="mt-2">
                        {getPaymentStatusBadge(subscription.last_payment)}
                      </div>
                      {getMoneyTransferStatus(subscription.last_payment)}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Total pagos:</span>
                        <span className="font-semibold">{subscription.payment_history_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total cobrado:</span>
                        <span className="font-semibold text-green-600">
                          {formatPrice(subscription.total_paid)}
                        </span>
                      </div>
                      
                      {subscription.last_payment && (
                        <>
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-medium text-gray-700">Último Pago:</p>
                              {subscription.last_payment.mercadopago_payment_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => validatePaymentWithMercadoPago(subscription.last_payment!.mercadopago_payment_id!)}
                                  disabled={validatingPayment === subscription.last_payment.mercadopago_payment_id}
                                  className="h-6 px-2 text-xs"
                                >
                                  {validatingPayment === subscription.last_payment.mercadopago_payment_id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Shield className="h-3 w-3 mr-1" />
                                  )}
                                  Validar
                                </Button>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span>Fecha:</span>
                                <span>{formatDate(subscription.last_payment.billing_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Monto:</span>
                                <span className="font-semibold">
                                  {formatPrice(subscription.last_payment.amount)}
                                </span>
                              </div>
                              {subscription.last_payment.mercadopago_payment_id && (
                                <div className="flex justify-between">
                                  <span>MP ID:</span>
                                  <span className="font-mono text-xs">
                                    {subscription.last_payment.mercadopago_payment_id}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
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
    </div>
  )
}
