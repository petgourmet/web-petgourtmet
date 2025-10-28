'use client'

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useClientAuth } from "@/hooks/use-client-auth"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

import { 
  User, 
  Package,
  Save,
  Edit3,
  Calendar,
  DollarSign,
  Truck,
  RefreshCw,
  Clock
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
  product_image?: string
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
  shipping_address?: any
  stripe_session_id?: string
  stripe_payment_intent?: string
  items?: OrderItem[]
}

interface Subscription {
  id: string
  user_id?: string
  customer_email?: string
  customer_name?: string
  product_id?: number
  product_name?: string
  product_image?: string
  subscription_type: string
  status: string
  base_price?: number
  discounted_price?: number
  discount_percentage?: number
  transaction_amount?: number
  size?: string
  frequency?: number
  frequency_type?: string
  next_billing_date?: string
  last_billing_date?: string
  current_period_start?: string
  current_period_end?: string
  stripe_subscription_id?: string
  stripe_customer_id?: string
  stripe_price_id?: string
  currency?: string
  shipping_address?: any
  cart_items?: any[]
  metadata?: any
  created_at: string
  updated_at?: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getOrderItems(order: Order): OrderItem[] {
  // Intentar obtener items desde shipping_address.items
  if (order.shipping_address && typeof order.shipping_address === 'object') {
    try {
      const shippingData = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address
      
      if (shippingData.items && Array.isArray(shippingData.items)) {
        return shippingData.items
      }
    } catch (e) {
      console.warn('Error parsing shipping_address items:', e)
    }
  }
  
  // Fallback a order.items
  return order.items || []
}

function getCustomerName(order: Order): string {
  if (order.customer_name) return order.customer_name
  
  // Intentar extraer desde shipping_address
  if (order.shipping_address) {
    try {
      const shippingData = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address
      
      if (shippingData.customer_data?.name) {
        return shippingData.customer_data.name
      }
      if (shippingData.customer?.name) {
        return shippingData.customer.name
      }
    } catch (e) {
      console.warn('Error parsing customer name:', e)
    }
  }
  
  return 'Cliente anónimo'
}

function getCustomerEmail(order: Order): string {
  if (order.customer_email) return order.customer_email
  
  // Intentar extraer desde shipping_address
  if (order.shipping_address) {
    try {
      const shippingData = typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address
      
      if (shippingData.customer_data?.email) {
        return shippingData.customer_data.email
      }
      if (shippingData.customer?.email) {
        return shippingData.customer.email
      }
    } catch (e) {
      console.warn('Error parsing customer email:', e)
    }
  }
  
  return 'No especificado'
}

function formatShippingAddress(shippingAddress: any): string {
  if (!shippingAddress) return 'No disponible'
  
  try {
    const shippingData = typeof shippingAddress === 'string' 
      ? JSON.parse(shippingAddress) 
      : shippingAddress
    
    // Formato: calle, ciudad, estado CP, país
    const parts = []
    
    if (shippingData.address) {
      parts.push(shippingData.address)
    } else if (shippingData.shipping?.address) {
      parts.push(shippingData.shipping.address)
    } else if (shippingData.street) {
      parts.push(shippingData.street)
    }
    
    const city = shippingData.city || shippingData.shipping?.city
    const state = shippingData.state || shippingData.shipping?.state
    const postalCode = shippingData.postalCode || shippingData.shipping?.postalCode
    const country = shippingData.country || shippingData.shipping?.country
    
    if (city) {
      parts.push(city)
    }
    
    if (state && postalCode) {
      parts.push(`${state} ${postalCode}`)
    } else if (state) {
      parts.push(state)
    } else if (postalCode) {
      parts.push(postalCode)
    }
    
    if (country) {
      parts.push(country)
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No disponible'
  } catch (e) {
    console.warn('Error parsing shipping address:', e)
    return 'No disponible'
  }
}

function getShippingAddress(order: Order): string {
  return formatShippingAddress(order.shipping_address)
}

function PerfilPageContent() {
  const { user, loading } = useClientAuth()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'subscriptions'>('profile')

  useEffect(() => {
    const verified = searchParams.get('verified')
    if (verified === 'true') {
      toast.success('¡Email verificado exitosamente! Bienvenido a PetGourmet.')
      const url = new URL(window.location.href)
      url.searchParams.delete('verified')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  useEffect(() => {
    if (!loading && user) {
      initializeData()
    } else if (!loading && !user) {
      setIsLoading(false)
    }
  }, [user?.id, loading])

  const initializeData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchOrders(),
        fetchSubscriptions()
      ])
    } catch (error) {
      console.error('Error en initializeData:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return
    
    try {
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
      // Obtener órdenes del usuario (por user_id o email en shipping_address)
      const { data: userOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        setOrders([])
        return
      }

      if (!userOrders || userOrders.length === 0) {
        setOrders([])
        return
      }

      // Obtener items para todas las órdenes
      const orderIds = (userOrders as any[]).map((o: any) => o.id)
      const { data: orderItems, error: itemsError } = await supabase
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
      }

      // Agrupar items por orden
      const itemsByOrder: Record<string, OrderItem[]> = {}
      if (orderItems) {
        (orderItems as any[]).forEach((item: any) => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = []
          }
          itemsByOrder[item.order_id].push({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
            product_name: item.products?.name || item.product_name,
            product_image: item.products?.image
          })
        })
      }

      // Combinar órdenes con sus items
      const ordersWithItems = (userOrders as any[]).map((order: any) => ({
        ...order,
        items: itemsByOrder[order.id] || []
      }))

      setOrders(ordersWithItems)
      
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('No se pudieron cargar las compras')
    }
  }

  const fetchSubscriptions = async () => {
    if (!user) return
    
    try {
      // Usar cliente de Supabase directamente
      const { data: subscriptionsData, error } = await supabase
        .from('unified_subscriptions')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching subscriptions:', error)
        setSubscriptions([])
        return
      }

      console.log('✅ Suscripciones cargadas:', subscriptionsData?.length || 0)
      setSubscriptions(subscriptionsData || [])
    } catch (error) {
      console.error('Error loading subscriptions:', error)
      toast.error('No se pudieron cargar las suscripciones')
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !user) return
    
    setIsSaving(true)
    try {
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
        } as any)

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
            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
              <User className="h-3 w-3" />
              {profile?.email}
            </Badge>
          </div>
        </div>

        {/* Navegación de pestañas */}
        <div className="mb-6">
          <div className="flex gap-2">
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
              <RefreshCw className="h-4 w-4" />
              Suscripciones ({subscriptions.length})
            </Button>
          </div>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Estadísticas del perfil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Compras</p>
                      <p className="text-xl font-semibold">{orders.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Gastado</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(orders.reduce((total, order) => total + order.total, 0))}
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
          <div className="space-y-6">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    No tienes compras aún
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Explora nuestros productos premium para mascotas y haz tu primera compra
                  </p>
                  <Button onClick={() => window.location.href = '/productos'} size="lg">
                    <Package className="h-4 w-4 mr-2" />
                    Ver Productos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {orders.map((order) => {
                  const items = getOrderItems(order)
                  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
                  // El envío ya está incluido en order.total, solo calculamos para mostrarlo
                  const shipping = order.total - subtotal
                  
                  return (
                    <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                      {/* Header de la orden */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-xl text-gray-900">
                                Orden #{String(order.id).slice(-8)}
                              </h3>
                              <Badge 
                                variant={order.payment_status === 'paid' ? 'default' : 'secondary'}
                                className={`${
                                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {order.payment_status === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(order.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {items.length} producto{items.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-2xl font-bold text-indigo-600">
                              {formatCurrency(order.total)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Total</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Información del Cliente */}
                      <CardContent className="p-6 border-b">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Información del Cliente
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Nombre:</span>
                            <p className="text-gray-900">{getCustomerName(order)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Email:</span>
                            <p className="text-gray-900">{getCustomerEmail(order)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium text-gray-700 flex items-center gap-1">
                              <Truck className="h-4 w-4" />
                              Dirección de Envío:
                            </span>
                            <p className="text-gray-900">{getShippingAddress(order)}</p>
                          </div>
                        </div>
                      </CardContent>

                      {/* Productos */}
                      <CardContent className="p-6 border-b">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Productos
                        </h4>
                        {items.length > 0 ? (
                          <div className="space-y-3">
                            {items.map((item, index) => (
                              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                  {item.product_image ? (
                                    <Image 
                                      src={item.product_image} 
                                      alt={item.product_name || 'Producto'} 
                                      fill 
                                      className="object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                                      <Package className="w-8 h-8 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {item.product_name || 'Producto'}
                                  </p>
                                  {item.size && (
                                    <p className="text-sm text-gray-500">Tamaño: {item.size}</p>
                                  )}
                                  <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(item.price)}</p>
                                  <p className="text-sm text-gray-500">c/u</p>
                                </div>
                                <div className="text-right font-bold">
                                  {formatCurrency(item.quantity * item.price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No se encontraron productos en esta orden</p>
                          </div>
                        )}
                      </CardContent>

                      {/* Resumen de Totales */}
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Envío:</span>
                            <span className="font-medium">
                              {shipping > 0 ? formatCurrency(shipping) : 'Gratis'}
                            </span>
                          </div>
                          <div className="border-t pt-3">
                            <div className="flex justify-between text-lg font-bold">
                              <span>Total:</span>
                              <span className="text-indigo-600">{formatCurrency(order.total)}</span>
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

        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {subscriptions.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <RefreshCw className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    No tienes suscripciones activas
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Suscríbete a productos para recibirlos periódicamente con descuentos especiales
                  </p>
                  <Button onClick={() => window.location.href = '/productos'} size="lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ver Productos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {subscriptions.map((subscription) => {
                  const cartItems = subscription.cart_items || []
                  const nextBilling = subscription.next_billing_date 
                    ? new Date(subscription.next_billing_date)
                    : null
                  
                  return (
                    <Card key={subscription.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
                      {/* Header de la suscripción */}
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-xl text-gray-900">
                                Suscripción #{String(subscription.id).slice(-8)}
                              </h3>
                              <Badge 
                                variant={subscription.status === 'active' ? 'default' : 'secondary'}
                                className={`${
                                  subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                                  subscription.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                              >
                                {subscription.status === 'active' ? '✅ Activa' : 
                                 subscription.status === 'paused' ? '⏸️ Pausada' : 
                                 '❌ Cancelada'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Desde {formatDate(subscription.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-4 w-4" />
                                {subscription.subscription_type === 'weekly' ? 'Semanal' :
                                 subscription.subscription_type === 'biweekly' ? 'Quincenal' :
                                 subscription.subscription_type === 'monthly' ? 'Mensual' :
                                 subscription.subscription_type === 'quarterly' ? 'Trimestral' :
                                 subscription.subscription_type === 'annual' ? 'Anual' : 
                                 subscription.subscription_type}
                              </span>
                            </div>
                            {nextBilling && subscription.status === 'active' && (
                              <div className="flex items-center gap-1 text-sm text-orange-600 font-medium">
                                <Clock className="h-4 w-4" />
                                Próximo pago: {formatDate(nextBilling.toISOString())}
                              </div>
                            )}
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-2xl font-bold text-orange-600">
                              {formatCurrency(subscription.discounted_price || subscription.transaction_amount || 0)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">por período</p>
                            {subscription.discount_percentage && subscription.discount_percentage > 0 && (
                              <p className="text-sm text-green-600 font-medium">
                                {subscription.discount_percentage}% de descuento
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Información del Cliente */}
                      <CardContent className="p-6 border-b">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Información
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Nombre:</span>
                            <p className="text-gray-900">{subscription.customer_name || 'No especificado'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Email:</span>
                            <p className="text-gray-900">{subscription.customer_email}</p>
                          </div>
                          {subscription.shipping_address && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-700 flex items-center gap-1">
                                <Truck className="h-4 w-4" />
                                Dirección de Envío:
                              </span>
                              <p className="text-gray-900">
                                {formatShippingAddress(subscription.shipping_address)}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      {/* Productos */}
                      <CardContent className="p-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Productos
                        </h4>
                        {cartItems.length > 0 ? (
                          <div className="space-y-3">
                            {cartItems.map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                  {item.image || item.product_image ? (
                                    <Image 
                                      src={item.image || item.product_image} 
                                      alt={item.name || item.product_name || 'Producto'} 
                                      fill 
                                      className="object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center">
                                      <Package className="w-8 h-8 text-orange-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {item.name || item.product_name || subscription.product_name || 'Producto'}
                                  </p>
                                  {item.size && (
                                    <p className="text-sm text-gray-500">Tamaño: {item.size}</p>
                                  )}
                                  <p className="text-sm text-gray-600">
                                    Cantidad: {item.quantity || 1}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatCurrency(item.price || 0)}</p>
                                  <p className="text-sm text-gray-500">c/u</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : subscription.product_name ? (
                          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              {subscription.product_image ? (
                                <Image 
                                  src={subscription.product_image} 
                                  alt={subscription.product_name} 
                                  fill 
                                  className="object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center">
                                  <Package className="w-8 h-8 text-orange-600" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {subscription.product_name}
                              </p>
                              {subscription.size && (
                                <p className="text-sm text-gray-500">Tamaño: {subscription.size}</p>
                              )}
                            </div>
                            <div className="text-right font-bold">
                              {formatCurrency(subscription.discounted_price || subscription.transaction_amount || 0)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No se encontró información del producto</p>
                          </div>
                        )}
                      </CardContent>

                      {/* Desglose de Precios */}
                      <CardContent className="p-6 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Desglose del Precio
                        </h4>
                        {(() => {
                          const basePrice = subscription.base_price || 0
                          const discountPercentage = subscription.discount_percentage || 0
                          const discountAmount = basePrice * (discountPercentage / 100)
                          const priceAfterDiscount = basePrice - discountAmount
                          const shippingCost = basePrice >= 1000 ? 0 : 100
                          const totalPerPeriod = priceAfterDiscount + shippingCost
                          
                          return (
                            <div className="space-y-3">
                              {basePrice > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Precio base:</span>
                                  <span className="font-medium">{formatCurrency(basePrice)}</span>
                                </div>
                              )}
                              {discountPercentage > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-green-600">Descuento ({discountPercentage}%):</span>
                                  <span className="font-medium text-green-600">
                                    -{formatCurrency(discountAmount)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  Envío:
                                </span>
                                <span className="font-medium">
                                  {shippingCost === 0 ? (
                                    <span className="text-green-600">Gratis</span>
                                  ) : (
                                    formatCurrency(shippingCost)
                                  )}
                                </span>
                              </div>
                              <div className="border-t pt-3">
                                <div className="flex justify-between">
                                  <span className="font-bold text-gray-900">Total por período:</span>
                                  <span className="font-bold text-orange-600 text-lg">
                                    {formatCurrency(totalPerPeriod)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PerfilPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    }>
      <PerfilPageContent />
    </Suspense>
  )
}
