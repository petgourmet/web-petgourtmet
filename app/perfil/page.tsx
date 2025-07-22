'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useClientAuth } from "@/hooks/use-client-auth"
import { createClient } from "@/lib/supabase/client"
import { 
  User, 
  Package,
  Save,
  Edit3,
  Calendar,
  DollarSign,
  MapPin
} from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  address?: string
}

interface Order {
  id: string
  total: number
  payment_status: string
  created_at: string
  shipping_address: any
  items?: any[]
}

export default function PerfilPage() {
  const { user, loading } = useClientAuth()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'subscriptions'>('profile')

  useEffect(() => {
    if (user && !loading) {
      initializeData()
    }
  }, [user, loading])

  const initializeData = async () => {
    setIsLoading(true)
    try {
      if (user) {
        const initialProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || '',
          address: user.user_metadata?.address || '',
        }
        setProfile(initialProfile)
        
        await Promise.all([
          fetchOrders(),
          fetchSubscriptions()
        ])
      }
    } catch (error) {
      console.error("Error inicializando datos:", error)
      toast.error("No se pudo cargar la información del perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOrders = async () => {
    if (!user?.email) return
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`user_id.eq.${user.id},customer_name.ilike.%${user.email}%`)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      
      const processedOrders = (data || []).map(order => {
        let orderData = null
        if (order.shipping_address) {
          try {
            orderData = typeof order.shipping_address === 'string' 
              ? JSON.parse(order.shipping_address) 
              : order.shipping_address
          } catch (e) {
            console.error('Error parsing order data:', e)
          }
        }
        
        return {
          ...order,
          items: orderData?.items || []
        }
      })
      
      setOrders(processedOrders)
    } catch (error) {
      console.error("Error cargando órdenes:", error)
      toast.error("No se pudieron cargar las compras")
    }
  }

  const fetchSubscriptions = async () => {
    if (!user?.email) return
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`user_id.eq.${user.id},customer_name.ilike.%${user.email}%`)
        .order("created_at", { ascending: false })

      if (error) throw error
      
      const subscriptionOrders = (data || []).filter(order => {
        if (!order.shipping_address) return false
        try {
          const orderData = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address
          
          return orderData?.items?.some((item: any) => item.isSubscription || item.subscription)
        } catch (e) {
          return false
        }
      }).map(order => {
        const orderData = typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address
        
        return {
          ...order,
          orderData,
          subscriptionItems: orderData?.items?.filter((item: any) => item.isSubscription || item.subscription) || []
        }
      })
      
      setSubscriptions(subscriptionOrders)
    } catch (error) {
      console.error("Error cargando suscripciones:", error)
      toast.error("No se pudieron cargar las suscripciones")
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !user) return
    
    setIsSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        }
      })

      if (error) throw error

      setIsEditing(false)
      toast.success("Perfil actualizado exitosamente")
    } catch (error) {
      console.error("Error guardando perfil:", error)
      toast.error("No se pudo guardar el perfil")
    } finally {
      setIsSaving(false)
    }
  }

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acceso Requerido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Debes iniciar sesión para ver tu perfil</p>
            <Button onClick={() => window.location.href = '/auth/login'}>
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">
                Gestiona tu información personal y revisa tus compras
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
              <User className="h-3 w-3" />
              {profile?.email}
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Perfil
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            onClick={() => setActiveTab('orders')}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Mis Compras ({orders.length})
          </Button>
          <Button
            variant={activeTab === 'subscriptions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('subscriptions')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Suscripciones ({subscriptions.length})
          </Button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
                <Button
                  variant={isEditing ? "destructive" : "outline"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancelar" : (
                    <>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre completo</Label>
                  <Input
                    id="full_name"
                    value={profile?.full_name || ''}
                    onChange={(e) => updateProfileField('full_name', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={profile?.phone || ''}
                    onChange={(e) => updateProfileField('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={profile?.address || ''}
                    onChange={(e) => updateProfileField('address', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tu dirección completa"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No tienes compras aún
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Explora nuestros productos y haz tu primera compra
                  </p>
                  <Button onClick={() => window.location.href = '/productos'}>
                    Ver Productos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Orden #{order.id}</h3>
                          <Badge 
                            variant={
                              order.payment_status === 'completed' ? 'default' : 
                              order.payment_status === 'pending' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {order.payment_status === 'completed' ? 'Completado' :
                             order.payment_status === 'pending' ? 'Pendiente' : 
                             order.payment_status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.created_at)}
                        </p>
                        {order.items && order.items.length > 0 && (
                          <p className="text-sm text-gray-500">
                            {order.items.length} producto{order.items.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <DollarSign className="h-4 w-4 text-gray-600" />
                          <span className="text-lg font-semibold">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No tienes suscripciones activas
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Suscríbete directamente desde nuestros productos
                  </p>
                  <Button onClick={() => window.location.href = '/productos'}>
                    Ver Productos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Suscripción #{subscription.id}</h3>
                          <Badge variant="default">Activa</Badge>
                        </div>
                        <p className="text-gray-600 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Desde: {formatDate(subscription.created_at)}
                        </p>
                        {subscription.subscriptionItems && (
                          <p className="text-sm text-gray-500">
                            {subscription.subscriptionItems.length} producto{subscription.subscriptionItems.length > 1 ? 's' : ''} en suscripción
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <DollarSign className="h-4 w-4 text-gray-600" />
                          <span className="text-lg font-semibold">
                            {formatPrice(subscription.total)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">mensual</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
