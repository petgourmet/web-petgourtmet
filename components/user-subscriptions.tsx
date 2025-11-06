'use client'

import { useState, useEffect } from 'react'
import { Calendar, CreditCard, Package, AlertCircle, CheckCircle, XCircle, PauseCircle, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'

// Helper para formatear fechas de forma segura
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'No disponible'
  
  try {
    const date = new Date(dateString)
    // Validar que la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    return date.toLocaleDateString('es-MX')
  } catch (error) {
    console.error('Error formateando fecha:', dateString, error)
    return 'Error en fecha'
  }
}

interface Subscription {
  id: string
  mercadopago_subscription_id: string
  reason: string
  status: 'pending' | 'authorized' | 'paused' | 'cancelled'
  frequency: number
  frequency_type: string
  transaction_amount: number
  currency_id: string
  start_date: string
  end_date?: string
  next_payment_date: string
  created_at: string
  products?: {
    id: number
    name: string
    description: string
    images: string[]
    price: number
  }
  quantity: number
}

interface UserSubscriptionsProps {
  userId: string
}

export default function UserSubscriptions({ userId }: UserSubscriptionsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingSubscription, setUpdatingSubscription] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchSubscriptions()
    }
  }, [userId])

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/subscriptions/user/${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setSubscriptions(result.subscriptions)
      } else {
        toast.error('Error cargando suscripciones')
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: 'cancel' | 'pause' | 'reactivate') => {
    setUpdatingSubscription(subscriptionId)

    try {
      const response = await fetch(`/api/subscriptions/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          action
        })
      })

      const result = await response.json()

      if (result.success) {
        // Actualizar la suscripción en el estado local
        setSubscriptions(prev => 
          prev.map(sub => 
            sub.id === subscriptionId 
              ? { ...sub, status: result.subscription.status }
              : sub
          )
        )

        const actionTexts = {
          cancel: 'cancelada',
          pause: 'pausada', 
          reactivate: 'reactivada'
        }

        toast.success(`Suscripción ${actionTexts[action]} exitosamente`)
      } else {
        throw new Error(result.error || 'Error actualizando suscripción')
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      toast.error('Error al actualizar suscripción', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo'
      })
    } finally {
      setUpdatingSubscription(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'paused':
        return 'text-blue-600 bg-blue-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <AlertCircle className="h-4 w-4" />
      case 'paused':
        return <PauseCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'active':
        return 'Activa'
      case 'pending':
        return 'Pendiente'
      case 'paused':
        return 'Pausada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getFrequencyText = (frequency: number, frequencyType: string) => {
    if (frequencyType === 'months') {
      return frequency === 1 ? 'Mensual' : `Cada ${frequency} meses`
    } else if (frequencyType === 'days') {
      const weeks = Math.floor(frequency / 7)
      if (weeks > 0) {
        return weeks === 1 ? 'Semanal' : `Cada ${weeks} semanas`
      }
      return `Cada ${frequency} días`
    }
    return `Cada ${frequency} ${frequencyType}`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32 w-full"></div>
        ))}
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No tienes suscripciones activas
        </h3>
        <p className="text-gray-600 mb-6">
          Suscríbete a tus productos favoritos y ahorra en cada entrega
        </p>
        <button className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
          Explorar productos
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Mis Suscripciones
        </h2>
        <button
          onClick={fetchSubscriptions}
          className="text-primary hover:text-primary/80 font-medium"
        >
          Actualizar
        </button>
      </div>

      <div className="grid gap-6">
        {subscriptions.map((subscription) => {
          const isUpdating = updatingSubscription === subscription.id
          const canCancel = ['authorized', 'active', 'pending'].includes(subscription.status)
          const canPause = ['authorized', 'active'].includes(subscription.status)
          const canReactivate = subscription.status === 'paused'

          return (
            <div
              key={subscription.id}
              className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Información principal */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {subscription.reason}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {getStatusIcon(subscription.status)}
                        {getStatusText(subscription.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <CreditCard className="h-4 w-4" />
                        <span>${subscription.transaction_amount} {subscription.currency_id}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{getFrequencyText(subscription.frequency, subscription.frequency_type)}</span>
                      </div>
                      
                      {subscription.next_payment_date && ['authorized', 'active'].includes(subscription.status) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Próximo cobro: {formatDate(subscription.next_payment_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {subscription.products && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        {subscription.products.images?.[0] && (
                          <img
                            src={subscription.products.images[0]}
                            alt={subscription.products.name}
                            className="h-12 w-12 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {subscription.products.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Cantidad: {subscription.quantity}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-auto">
                    {canPause && (
                      <button
                        onClick={() => handleSubscriptionAction(subscription.id, 'pause')}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        ) : (
                          <PauseCircle className="h-4 w-4" />
                        )}
                        Pausar
                      </button>
                    )}

                    {canReactivate && (
                      <button
                        onClick={() => handleSubscriptionAction(subscription.id, 'reactivate')}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                        Reactivar
                      </button>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => handleSubscriptionAction(subscription.id, 'cancel')}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Información adicional */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Creada:</span> {formatDate(subscription.created_at)}
                    </div>
                    <div>
                      <span className="font-medium">ID:</span> {subscription.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
