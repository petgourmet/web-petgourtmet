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
import UserBillingHistory from "@/components/user-billing-history"
import RealtimeStatus from "@/components/realtime-status"
import { 
  User, 
  Package,
  Save,
  Edit3,
  Calendar,
  DollarSign,
  MapPin,
  Receipt
} from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  address?: string
}

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  size?: string
  product_name?: string
  products?: {
    id: string
    name: string
    image: string
    price: number
  }
}

interface Order {
  id: string
  user_id?: string
  total: number
  payment_status: string
  status: string
  created_at: string
  customer_name?: string
  customer_email?: string
  payer_email?: string
  shipping_address?: any
  order_items?: OrderItem[]
  items?: OrderItem[]
  total_items?: number
  external_reference?: string
  preference_id?: string
  collection_id?: string
  collection_status?: string
  payment_id?: string
  payment_type?: string
  merchant_order_id?: string
  currency?: string
  source_table?: string
}

interface Subscription {
  id: string
  user_id: string
  product_id: string
  status: string
  frequency: string
  price: number
  discount_amount?: number
  next_billing_date: string
  created_at: string
  source?: string
  quantity?: number
  size?: string
  last_billing_date?: string
  cancelled_at?: string
  product?: {
    id: string
    name: string
    image: string
    price: number
    subscription_types?: string[]
    monthly_discount?: number
    quarterly_discount?: number
    annual_discount?: number
    biweekly_discount?: number
  }
  products?: {
    id: string
    name: string
    image: string
    price: number
    subscription_types?: string[]
    monthly_discount?: number
    quarterly_discount?: number
    annual_discount?: number
    biweekly_discount?: number
  }
}

export default function PerfilPage() {
  const { user, loading } = useClientAuth()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingSubscription, setUpdatingSubscription] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'subscriptions' | 'billing'>('profile')

  useEffect(() => {
    console.log('🔍 useEffect del perfil - Estado:', { loading, hasUser: !!user, userId: user?.id })
    if (!loading && user) {
      console.log('✅ Iniciando carga de datos para usuario:', user.id)
      initializeData()
    } else {
      console.log('⏳ Esperando autenticación...', { loading, hasUser: !!user })
    }
  }, [user?.id, loading])

  const initializeData = async () => {
    setIsLoading(true)
    console.log('🔄 Iniciando carga de datos del perfil...')
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchOrders(),
        fetchSubscriptions()
      ])
      console.log('✅ Carga de datos completada')
    } catch (error) {
      console.error('❌ Error en initializeData:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        if (error.code === 'PGRST116') {
          const newProfile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            phone: user.user_metadata?.phone || '',
            address: ''
          }
          setProfile(newProfile)
        }
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  const fetchOrders = async () => {
    if (!user) return
    
    try {
      const supabase = createClient()
      // Cargar órdenes del usuario desde las tablas 'orders' y 'order_items'
      // Primero obtener las órdenes del usuario desde la tabla 'orders'
      const { data: userOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)

      if (ordersError) {
        console.error('Error fetching user orders:', ordersError)
        setOrders([])
        return
      }

      if (!userOrders || userOrders.length === 0) {
        console.log('No se encontraron órdenes para el usuario')
        setOrders([])
        return
      }

      const orderIds = userOrders.map(order => order.id)
      console.log(`Órdenes del usuario encontradas: ${orderIds.length}`, orderIds)

      // Ahora cargar order_items para esas órdenes específicas
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price
          )
        `)
        .in('order_id', orderIds)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        // No hacer return, continuar con array vacío
        setOrders([])
        return
      }

      console.log(`✅ Order items cargados: ${orderItemsData?.length || 0}`)

      // Agrupar order_items por order_id para reconstruir órdenes
      const orderGroups = orderItemsData?.reduce((groups, item) => {
        const orderId = item.order_id
        if (!groups[orderId]) {
          groups[orderId] = []
        }
        groups[orderId].push(item)
        return groups
      }, {} as Record<string, any[]>) || {}

      // Reconstruir órdenes desde los grupos de items
      const processedOrders = Object.entries(orderGroups).map(([orderId, items]) => {
        // Calcular total de la orden
        const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
        
        // Calcular total de items
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

        // Usar información del primer item para datos de la orden
        const firstItem = items[0]
        
        return {
          id: orderId,
          user_id: user.id,
          total: total,
          payment_status: 'completed', // Asumir completado si existe en order_items
          status: 'completed',
          created_at: firstItem.created_at || new Date().toISOString(),
          customer_email: user.email,
          items: items,
          total_items: totalItems,
          source_table: 'order_items'
        }
      })

      // Ordenar por fecha de creación (más recientes primero)
      processedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setOrders(processedOrders)
      
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('No se pudieron cargar las compras')
    }
  }

  const fetchSubscriptions = async () => {
    if (!user) return
    try {
      const supabase = createClient()
      console.log('Buscando suscripciones para usuario:', user.id)
      console.log('Email del usuario:', user.email)
      
      const { data: userSubscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            subscription_types,
            monthly_discount,
            quarterly_discount,
            annual_discount,
            biweekly_discount
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      console.log('Resultado de user_subscriptions:', {
        error: subscriptionsError,
        count: userSubscriptionsData?.length || 0,
        data: userSubscriptionsData
      })

      if (subscriptionsError) {
        console.error('Error al obtener user_subscriptions:', subscriptionsError)
        // No hacer return, continuar con array vacío
        setSubscriptions([])
        return
      }

      const subscriptionsWithBilling = userSubscriptionsData?.map(sub => {
        const product = sub.products
        const frequency = sub.frequency || 'monthly'
        let discountAmount = 0

        if (product && frequency) {
          switch (frequency) {
            case 'monthly':
              discountAmount = product.monthly_discount || 0
              break
            case 'quarterly':
              discountAmount = product.quarterly_discount || 0
              break
            case 'annual':
              discountAmount = product.annual_discount || 0
              break
            case 'biweekly':
              discountAmount = product.biweekly_discount || 0
              break
          }
        }

        return {
          ...sub,
          discount_amount: discountAmount,
          source: 'user_subscriptions'
        }
      }) || []

      const uniqueSubscriptions = subscriptionsWithBilling.filter((sub, index, self) => 
        index === self.findIndex(s => s.id === sub.id)
      )

      console.log(`Total de suscripciones encontradas: ${uniqueSubscriptions.length}`)
      setSubscriptions(uniqueSubscriptions)
      
    } catch (error) {
      console.error('Error cargando suscripciones:', error)
      toast.error('No se pudieron cargar las suscripciones')
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !user) return
    
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.phone
        }
      })

      if (authError) {
        console.error('Error updating auth metadata:', authError)
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Error updating profile:', profileError)
        toast.error('Error al guardar el perfil')
        return
      }

      toast.success('Perfil actualizado correctamente')
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Error al guardar el perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const updateProfileField = (field: keyof UserProfile, value: string) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: 'pause' | 'cancel' | 'reactivate') => {
    setUpdatingSubscription(subscriptionId)
    try {
      const supabase = createClient()
      let updateData: any = {}
      
      switch (action) {
        case 'pause':
          updateData = { status: 'paused' }
          break
        case 'cancel':
          updateData = { 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          }
          break
        case 'reactivate':
          updateData = { 
            status: 'active',
            cancelled_at: null
          }
          break
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)

      if (error) {
        console.error('Error updating subscription:', error)
        toast.error('Error al actualizar la suscripción')
        return
      }

      // Actualizar el estado local
      setSubscriptions(prev => prev.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, ...updateData }
          : sub
      ))

      const actionText = action === 'pause' ? 'pausada' : 
                        action === 'cancel' ? 'cancelada' : 'reactivada'
      toast.success(`Suscripción ${actionText} correctamente`)
      
    } catch (error) {
      console.error('Error in handleSubscriptionAction:', error)
      toast.error('Error al actualizar la suscripción')
    } finally {
      setUpdatingSubscription(null)
    }
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
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
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">
                Gestiona tu información personal y revisa tus compras
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                <User className="h-3 w-3" />
                {profile?.email}
              </Badge>
              <RealtimeStatus />
            </div>
          </div>
        </div>

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
          <Button
            variant={activeTab === 'billing' ? 'default' : 'outline'}
            onClick={() => setActiveTab('billing')}
            className="flex items-center gap-2"
          >
            <Receipt className="h-4 w-4" />
            Facturación
          </Button>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Compras</p>
                      <p className="text-lg font-semibold">{orders.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Suscripciones Activas</p>
                      <p className="text-lg font-semibold">
                        {subscriptions.filter(s => s.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Gastado</p>
                      <p className="text-lg font-semibold">
                        {formatPrice(orders.reduce((total, order) => total + order.total, 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
          </div>
        )}

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
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">Orden #{String(order.id).slice(-8)}</h3>
                            <Badge variant={order.payment_status === 'approved' ? 'default' : 'secondary'}>
                              {order.payment_status === 'approved' ? 'Pagado' : order.payment_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(order.created_at)} • {order.total_items} productos
                          </p>
                          <div className="text-sm text-gray-500">
                            {order.items?.map((item, index) => (
                              <span key={item.id}>
                                {item.products?.name || item.product_name} (x{item.quantity})
                                {index < (order.items?.length || 0) - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {formatPrice(order.total)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

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
                    Suscríbete a "Repetir compra" desde nuestros productos
                  </p>
                  <Button onClick={() => window.location.href = '/productos'}>
                    Ver Productos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    🔄 Productos Suscritos ({subscriptions.length})
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Gestiona tus suscripciones activas y próximos envíos
                  </p>
                </div>
                {subscriptions.map((subscription) => {
                  const product = subscription.product || subscription.products
                  const frequency = subscription.frequency || 'monthly'
                  const price = subscription.price || (product?.price || 0)
                  const discountAmount = subscription.discount_amount || 0
                  const finalPrice = price - discountAmount
                
                  return (
                    <Card key={subscription.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                          {product?.image && (
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="space-y-3">
                                <div>
                                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                    {product?.name || 'Producto no encontrado'}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    ID: {String(subscription.id).slice(-8)}
                                  </p>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  <Badge 
                                    variant={subscription.status === 'active' ? 'default' : 
                                            subscription.cancelled_at ? 'destructive' : 'secondary'}
                                  >
                                    {subscription.cancelled_at ? '❌ Cancelada' :
                                     subscription.status === 'active' ? '✅ Activa' : 
                                     subscription.status === 'paused' ? '⏸️ Pausada' :
                                     '⏳ Inactiva'}
                                  </Badge>
                                  
                                  <Badge variant="outline">
                                    🔄 {frequency === 'monthly' ? 'Mensual' :
                                         frequency === 'biweekly' ? 'Quincenal' :
                                         frequency === 'quarterly' ? 'Trimestral' :
                                         frequency === 'annual' ? 'Anual' :
                                         frequency}
                                  </Badge>
                                  
                                  {subscription.size && (
                                    <Badge variant="outline">
                                      📦 {subscription.size}
                                    </Badge>
                                  )}
                                  
                                  {subscription.quantity && subscription.quantity > 1 && (
                                    <Badge variant="outline">
                                      ✖️ {subscription.quantity}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-sm text-gray-600 space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-blue-500" />
                                      <div>
                                        <span className="font-medium">Próximo envío:</span>
                                        <br />
                                        <span className="text-blue-600">
                                          {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'No programado'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {subscription.last_billing_date && (
                                      <div className="flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-green-500" />
                                        <div>
                                          <span className="font-medium">Último envío:</span>
                                          <br />
                                          <span className="text-green-600">
                                            {formatDate(subscription.last_billing_date)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>Creada: {formatDate(subscription.created_at)}</span>
                                    {subscription.cancelled_at && (
                                      <span className="text-red-500">• Cancelada: {formatDate(subscription.cancelled_at)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right space-y-2">
                                <div className="space-y-1">
                                  {discountAmount > 0 ? (
                                    <>
                                      <div className="text-sm text-gray-500 line-through">
                                        {formatPrice(price)}
                                      </div>
                                      <div className="flex items-center gap-1 justify-end">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                        <span className="text-lg font-semibold text-green-600">
                                          {formatPrice(finalPrice)}
                                        </span>
                                      </div>
                                      <div className="text-xs text-green-600">
                                        Ahorras {formatPrice(discountAmount)}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-1 justify-end">
                                      <DollarSign className="h-4 w-4 text-gray-600" />
                                      <span className="text-lg font-semibold">
                                        {formatPrice(price)}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="text-sm text-gray-500">
                                    cada {frequency === 'monthly' ? 'mes' :
                                          frequency === 'biweekly' ? 'quincena' :
                                          frequency === 'quarterly' ? 'trimestre' :
                                          frequency === 'annual' ? 'año' :
                                          'período'}
                                  </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 mt-4">
                                  {subscription.status === 'active' ? (
                                    <>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="text-xs"
                                        onClick={() => handleSubscriptionAction(subscription.id, 'pause')}
                                        disabled={updatingSubscription === subscription.id}
                                      >
                                        {updatingSubscription === subscription.id ? '⏳' : '⏸️'} Pausar
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="text-xs text-red-600 hover:text-red-700"
                                        onClick={() => handleSubscriptionAction(subscription.id, 'cancel')}
                                        disabled={updatingSubscription === subscription.id}
                                      >
                                        {updatingSubscription === subscription.id ? '⏳' : '❌'} Cancelar
                                      </Button>
                                    </>
                                  ) : subscription.cancelled_at ? (
                                    <Button size="sm" variant="outline" disabled className="text-xs">
                                      Cancelada
                                    </Button>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-xs"
                                      onClick={() => handleSubscriptionAction(subscription.id, 'reactivate')}
                                      disabled={updatingSubscription === subscription.id}
                                    >
                                      {updatingSubscription === subscription.id ? '⏳' : '▶️'} Reactivar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'billing' && user && (
          <UserBillingHistory 
            userId={user.id} 
            userEmail={user.email || undefined}
          />
        )}
      </div>
    </div>
  )
}
