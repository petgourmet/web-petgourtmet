'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Calendar, 
  CreditCard, 
  Package, 
  Pause, 
  Play, 
  X, 
  Edit3, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Truck,
  Bell
} from 'lucide-react'

interface Subscription {
  id: string
  product_id: string
  product_name: string
  product_image?: string
  subscription_type: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  quantity: number
  unit_price: number
  total_price: number
  discount_percentage?: number
  status: 'active' | 'paused' | 'cancelled' | 'pending'
  next_payment_date: string
  created_at: string
  payment_method?: {
    type: string
    last_four: string
    brand: string
  }
  delivery_address?: {
    street: string
    city: string
    state: string
    postal_code: string
  }
}

interface SubscriptionManagementProps {
  userId: string
}

const SUBSCRIPTION_TYPE_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal', 
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual'
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

export default function SubscriptionManagement({ userId }: SubscriptionManagementProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [modifyData, setModifyData] = useState({
    subscription_type: '',
    quantity: 1,
    delivery_address: {
      street: '',
      city: '',
      state: '',
      postal_code: ''
    }
  })
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    fetchSubscriptions()
  }, [userId])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/subscriptions/user/${userId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar suscripciones')
      }

      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Error al cargar las suscripciones')
    } finally {
      setLoading(false)
    }
  }

  const handlePauseResume = async (subscriptionId: string, action: 'pause' | 'resume') => {
    try {
      setActionLoading(subscriptionId)
      
      const response = await fetch('/api/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          action,
          user_id: userId
        }),
      })

      if (!response.ok) {
        throw new Error(`Error al ${action === 'pause' ? 'pausar' : 'reanudar'} la suscripción`)
      }

      const result = await response.json()
      
      // Actualizar el estado local
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, status: action === 'pause' ? 'paused' : 'active' }
            : sub
        )
      )

      toast.success(
        action === 'pause' 
          ? 'Suscripción pausada exitosamente' 
          : 'Suscripción reanudada exitosamente'
      )
    } catch (error) {
      console.error(`Error ${action}ing subscription:`, error)
      toast.error(`Error al ${action === 'pause' ? 'pausar' : 'reanudar'} la suscripción`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleModify = async () => {
    if (!selectedSubscription) return

    try {
      setActionLoading(selectedSubscription.id)
      
      const response = await fetch('/api/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: selectedSubscription.id,
          action: 'modify',
          user_id: userId,
          modifications: {
            subscription_type: modifyData.subscription_type || selectedSubscription.subscription_type,
            quantity: modifyData.quantity,
            delivery_address: modifyData.delivery_address
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Error al modificar la suscripción')
      }

      const result = await response.json()
      
      // Actualizar el estado local
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === selectedSubscription.id 
            ? { 
                ...sub, 
                subscription_type: modifyData.subscription_type as any || sub.subscription_type,
                quantity: modifyData.quantity,
                delivery_address: modifyData.delivery_address
              }
            : sub
        )
      )

      setModifyDialogOpen(false)
      setSelectedSubscription(null)
      toast.success('Suscripción modificada exitosamente')
    } catch (error) {
      console.error('Error modifying subscription:', error)
      toast.error('Error al modificar la suscripción')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    if (!selectedSubscription) return

    try {
      setActionLoading(selectedSubscription.id)
      
      const response = await fetch('/api/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: selectedSubscription.id,
          action: 'cancel',
          user_id: userId,
          cancel_reason: cancelReason
        }),
      })

      if (!response.ok) {
        throw new Error('Error al cancelar la suscripción')
      }

      const result = await response.json()
      
      // Actualizar el estado local
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === selectedSubscription.id 
            ? { ...sub, status: 'cancelled' }
            : sub
        )
      )

      setCancelDialogOpen(false)
      setSelectedSubscription(null)
      setCancelReason('')
      toast.success('Suscripción cancelada exitosamente')
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Error al cancelar la suscripción')
    } finally {
      setActionLoading(null)
    }
  }

  const openModifyDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setModifyData({
      subscription_type: subscription.subscription_type,
      quantity: subscription.quantity,
      delivery_address: subscription.delivery_address || {
        street: '',
        city: '',
        state: '',
        postal_code: ''
      }
    })
    setModifyDialogOpen(true)
  }

  const openCancelDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setCancelDialogOpen(true)
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
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mis Suscripciones</h2>
          <p className="text-gray-600">Gestiona tus suscripciones activas</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {subscriptions.length} suscripción{subscriptions.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes suscripciones activas
            </h3>
            <p className="text-gray-600 mb-4">
              Explora nuestros productos y crea tu primera suscripción
            </p>
            <Button>
              Explorar Productos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      {subscription.product_image && (
                        <img
                          src={subscription.product_image}
                          alt={subscription.product_name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {subscription.product_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {SUBSCRIPTION_TYPE_LABELS[subscription.subscription_type]} • Cantidad: {subscription.quantity}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={STATUS_COLORS[subscription.status]}>
                            {STATUS_LABELS[subscription.status]}
                          </Badge>
                          {subscription.discount_percentage && (
                            <Badge variant="secondary">
                              {subscription.discount_percentage}% descuento
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(subscription.total_price)}
                      </p>
                      <p className="text-sm text-gray-600">
                        por {SUBSCRIPTION_TYPE_LABELS[subscription.subscription_type].toLowerCase()}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Próximo pago</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(subscription.next_payment_date)}
                        </p>
                      </div>
                    </div>

                    {subscription.payment_method && (
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Método de pago</p>
                          <p className="text-sm text-gray-600">
                            {subscription.payment_method.brand} •••• {subscription.payment_method.last_four}
                          </p>
                        </div>
                      </div>
                    )}

                    {subscription.delivery_address && (
                      <div className="flex items-center space-x-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Dirección</p>
                          <p className="text-sm text-gray-600">
                            {subscription.delivery_address.city}, {subscription.delivery_address.state}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {subscription.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseResume(subscription.id, 'pause')}
                          disabled={actionLoading === subscription.id}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </Button>
                      ) : subscription.status === 'paused' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseResume(subscription.id, 'resume')}
                          disabled={actionLoading === subscription.id}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Reanudar
                        </Button>
                      ) : null}

                      {(subscription.status === 'active' || subscription.status === 'paused') && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openModifyDialog(subscription)}
                            disabled={actionLoading === subscription.id}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Modificar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCancelDialog(subscription)}
                            disabled={actionLoading === subscription.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Creada el {formatDate(subscription.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modify Subscription Dialog */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modificar Suscripción</DialogTitle>
            <DialogDescription>
              Actualiza los detalles de tu suscripción. Los cambios se aplicarán en el próximo ciclo de facturación.
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subscription-type">Frecuencia de entrega</Label>
                <Select
                  value={modifyData.subscription_type}
                  onValueChange={(value) => 
                    setModifyData(prev => ({ ...prev, subscription_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBSCRIPTION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={modifyData.quantity}
                  onChange={(e) => 
                    setModifyData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>

              <div className="space-y-3">
                <Label>Dirección de entrega</Label>
                <Input
                  placeholder="Calle y número"
                  value={modifyData.delivery_address.street}
                  onChange={(e) => 
                    setModifyData(prev => ({
                      ...prev,
                      delivery_address: { ...prev.delivery_address, street: e.target.value }
                    }))
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Ciudad"
                    value={modifyData.delivery_address.city}
                    onChange={(e) => 
                      setModifyData(prev => ({
                        ...prev,
                        delivery_address: { ...prev.delivery_address, city: e.target.value }
                      }))
                    }
                  />
                  <Input
                    placeholder="Provincia"
                    value={modifyData.delivery_address.state}
                    onChange={(e) => 
                      setModifyData(prev => ({
                        ...prev,
                        delivery_address: { ...prev.delivery_address, state: e.target.value }
                      }))
                    }
                  />
                </div>
                <Input
                  placeholder="Código postal"
                  value={modifyData.delivery_address.postal_code}
                  onChange={(e) => 
                    setModifyData(prev => ({
                      ...prev,
                      delivery_address: { ...prev.delivery_address, postal_code: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModifyDialogOpen(false)}
              disabled={actionLoading === selectedSubscription?.id}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleModify}
              disabled={actionLoading === selectedSubscription?.id}
            >
              {actionLoading === selectedSubscription?.id ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Cancelar Suscripción</span>
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar esta suscripción? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Motivo de cancelación (opcional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Cuéntanos por qué cancelas tu suscripción..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={actionLoading === selectedSubscription?.id}
            >
              Mantener suscripción
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={actionLoading === selectedSubscription?.id}
            >
              {actionLoading === selectedSubscription?.id ? 'Cancelando...' : 'Cancelar suscripción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}