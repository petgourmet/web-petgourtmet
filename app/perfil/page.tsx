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
  // Campos adicionales de MercadoPago
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
  const supabase = createClient()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'subscriptions' | 'billing'>('profile')

  useEffect(() => {
    if (user && !loading) {
      initializeData()
    }
  }, [user, loading])

  const initializeData = async () => {
    setIsLoading(true)
    try {
      if (user) {
        await Promise.all([
          fetchUserProfile(),
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

  const fetchUserProfile = async () => {
    if (!user) return
    
    try {
      console.log("🔍 Fetching profile for user:", user.id, user.email)
      
      // Intentar obtener el perfil desde la tabla profiles usando auth_users_id
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_users_id", user.id)
        .maybeSingle() // Usar maybeSingle en lugar de single para evitar error si no existe

      if (profileError) {
        console.warn("Error al obtener perfil de profiles table:", profileError)
        console.log("Esto puede ser normal si el usuario no tiene perfil en la tabla profiles")
      } else if (profileData) {
        console.log("✅ Perfil encontrado en tabla profiles:", profileData)
      } else {
        console.log("ℹ️ No se encontró perfil en tabla profiles para user_id:", user.id)
      }

      // Usar datos de la base de datos si están disponibles, sino usar metadata de auth
      const userProfileData: UserProfile = {
        id: user.id,
        email: profileData?.email || user.email || '',
        full_name: profileData?.full_name || user.user_metadata?.full_name || '',
        phone: profileData?.phone || user.user_metadata?.phone || '',
        address: profileData?.address || user.user_metadata?.address || '',
      }

      console.log("📋 Profile data assembled:", userProfileData)
      setProfile(userProfileData)
      
    } catch (error) {
      console.error("Error general al obtener perfil:", error)
      
      // Fallback completo a metadata de auth
      const fallbackProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        phone: user.user_metadata?.phone || '',
        address: user.user_metadata?.address || '',
      }
      
      console.log("🔄 Using fallback profile:", fallbackProfile)
      setProfile(fallbackProfile)
    }
  }

  const fetchOrders = async () => {
    if (!user?.email) return
    try {
      console.log("🔍 Buscando órdenes para usuario:")
      console.log("  - Email:", user.email)
      console.log("  - User ID:", user.id)
      
      let allOrders: any[] = []

      // 1. Buscar en la tabla principal 'orders' (la que usa el admin)
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200) // Aumentar límite para buscar más órdenes

        if (!ordersError && ordersData) {
          console.log(`Encontradas ${ordersData.length} órdenes en tabla orders`)
          
          // Filtrar por usuario y procesar órdenes
          const userOrders = ordersData
            .filter(order => {
              // Verificar primero user_id directo
              if (order.user_id === user.id) {
                console.log(`✅ Orden ${order.id} coincide por user_id`)
                return true
              }
              
              // Verificar emails directos
              if (order.user_email === user.email || order.customer_email === user.email) {
                console.log(`✅ Orden ${order.id} coincide por email directo`)
                return true
              }
              
              // Verificar email en shipping_address
              try {
                if (order.shipping_address) {
                  const parsedShipping = JSON.parse(order.shipping_address)
                  const customerEmail = parsedShipping.customer_data?.email
                  if (customerEmail === user.email) {
                    console.log(`✅ Orden ${order.id} coincide por email en shipping_address: ${customerEmail}`)
                    return true
                  }
                }
              } catch (e) {
                // Si no se puede parsear, continuar
              }
              
              return false
            })
            .map(order => {
              let customerInfo = null
              let orderItems = []
              
              try {
                if (order.shipping_address) {
                  const parsedShipping = JSON.parse(order.shipping_address)
                  customerInfo = parsedShipping.customer_data
                  orderItems = parsedShipping.items || []
                }
              } catch (e) {
                console.log('Error parsing shipping_address for order:', order.id, e)
              }

              return {
                id: `order_${order.id}`,
                total: order.total || 0,
                payment_status: order.payment_status || order.status || 'unknown',
                status: order.status || order.payment_status || 'unknown',
                created_at: order.created_at,
                customer_name: customerInfo?.firstName && customerInfo?.lastName 
                  ? `${customerInfo.firstName} ${customerInfo.lastName}`
                  : order.customer_name || 'Orden',
                customer_email: customerInfo?.email || order.user_email || user.email,
                external_reference: customerInfo?.orderNumber || `#PG${order.id}`,
                payment_type: 'online_payment',
                order_items: orderItems,
                items: orderItems,
                total_items: orderItems.length,
                source_table: 'orders'
              }
            })

          console.log(`✅ Órdenes filtradas para el usuario: ${userOrders.length}`)
          if (userOrders.length > 0) {
            console.log("📋 Primeras órdenes encontradas:", userOrders.slice(0, 2))
          }
          allOrders.push(...userOrders)
        }
      } catch (ordersError) {
        console.log("❌ Error al obtener orders:", ordersError)
      }

      // 2. Buscar en subscription_billing_history (pagos de suscripciones)
      try {
        const { data: billingData, error: billingError } = await supabase
          .from('subscription_billing_history')
          .select(`
            *,
            user_subscriptions!inner (
              id,
              product_id,
              products (
                id,
                name,
                image,
                price
              )
            )
          `)
          .eq('user_id', user.id)
          .order('billing_date', { ascending: false })
          .limit(50)

        if (!billingError && billingData && billingData.length > 0) {
          console.log(`Encontrados ${billingData.length} pagos de suscripción`)
          const billingOrders = billingData.map(billing => ({
            id: `billing_${billing.id}`,
            total: billing.amount || 0,
            payment_status: billing.status || billing.payment_status || 'completed',
            status: billing.status || 'completed',
            created_at: billing.billing_date || billing.created_at,
            customer_email: user.email,
            customer_name: 'Suscripción',
            payment_type: billing.payment_provider || 'subscription',
            external_reference: `SUB-${billing.subscription_id}`,
            currency: billing.currency || 'MXN',
            order_items: billing.user_subscriptions?.products ? [{
              id: billing.user_subscriptions.id,
              product_id: billing.user_subscriptions.product_id,
              quantity: 1,
              price: billing.amount || 0,
              product_name: billing.user_subscriptions.products.name,
              products: billing.user_subscriptions.products
            }] : [],
            source_table: 'subscription_billing_history'
          }))
          allOrders.push(...billingOrders)
        }
      } catch (billingError) {
        console.log("Error al obtener subscription_billing_history:", billingError)
      }

      // 3. Buscar en subscription_payments (pagos procesados de MercadoPago)
      try {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('subscription_payments')
          .select(`
            *,
            user_subscriptions!inner (
              id,
              user_id,
              product_id,
              products (
                id,
                name,
                image,
                price
              )
            )
          `)
          .eq('user_subscriptions.user_id', user.id)
          .order('payment_date', { ascending: false })
          .limit(50)

        if (!paymentsError && paymentsData && paymentsData.length > 0) {
          console.log(`Encontrados ${paymentsData.length} pagos de MercadoPago`)
          const mpOrders = paymentsData.map(payment => ({
            id: `mp_${payment.id}`,
            total: payment.amount || 0,
            payment_status: payment.status || 'completed',
            status: payment.status || 'completed',
            created_at: payment.payment_date || payment.created_at,
            customer_email: user.email,
            customer_name: 'Pago Suscripción',
            payment_type: 'mercadopago',
            payment_id: payment.mercadopago_payment_id,
            external_reference: payment.external_reference,
            currency: payment.currency_id || 'MXN',
            order_items: payment.user_subscriptions?.products ? [{
              id: payment.user_subscriptions.id,
              product_id: payment.user_subscriptions.product_id,
              quantity: 1,
              price: payment.amount || 0,
              product_name: payment.user_subscriptions.products.name,
              products: payment.user_subscriptions.products
            }] : [],
            source_table: 'subscription_payments'
          }))
          allOrders.push(...mpOrders)
        }
      } catch (paymentsError) {
        console.log("Error al obtener subscription_payments:", paymentsError)
      }

      // 4. Buscar en order_items (compras directas)
      try {
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select(`
            *,
            products (
              id,
              name,
              image,
              price
            )
          `)
          .order("id", { ascending: false })
          .limit(50)

        if (!orderItemsError && orderItemsData) {
          console.log(`Encontrados ${orderItemsData.length} items en order_items`)
          
          // Convertir order_items a formato de órdenes
          const orderItemsAsOrders = orderItemsData.map(item => ({
            id: `order_${item.id}`,
            total: (item.price || 0) * (item.quantity || 1),
            payment_status: 'completed',
            status: 'completed',
            created_at: new Date().toISOString(),
            customer_email: user.email,
            customer_name: item.product_name || 'Compra',
            payment_type: 'direct_purchase',
            order_items: [item],
            items: [item],
            total_items: 1,
            source_table: 'order_items'
          }))

          allOrders.push(...orderItemsAsOrders)
        }
      } catch (itemsError) {
        console.error("Error al obtener order_items:", itemsError)
      }

      // Procesar y formatear todas las órdenes encontradas
      const processedOrders = allOrders.map(order => {
        // Normalizar campos comunes
        const normalizedOrder = {
          id: order.id || order.payment_id || order.collection_id || 'unknown',
          user_id: order.user_id,
          total: order.total || order.transaction_amount || order.amount || 0,
          payment_status: order.payment_status || order.status || order.collection_status || 'unknown',
          status: order.status || order.payment_status || order.collection_status || 'unknown',
          created_at: order.created_at || order.date_created || new Date().toISOString(),
          customer_name: order.customer_name || order.payer_name || order.client_name || 'Cliente',
          customer_email: order.customer_email || order.payer_email || order.email || user.email,
          external_reference: order.external_reference,
          preference_id: order.preference_id,
          collection_id: order.collection_id,
          payment_id: order.payment_id,
          payment_type: order.payment_type,
          source_table: order.source_table,
          order_items: order.order_items || [],
          items: order.items || order.order_items || [],
          total_items: order.order_items?.length || 1
        }

        return normalizedOrder
      })

      // Eliminar duplicados por ID
      const uniqueOrders = processedOrders.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      )

      // Ordenar por fecha
      const sortedOrders = uniqueOrders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      console.log(`🎯 RESUMEN FINAL:`)
      console.log(`  - Total de órdenes procesadas: ${sortedOrders.length}`)
      console.log(`  - Fuentes: ${[...new Set(sortedOrders.map(o => o.source_table))].join(', ')}`)
      if (sortedOrders.length > 0) {
        console.log(`  - Primera orden: ${sortedOrders[0].external_reference} (${sortedOrders[0].source_table})`)
      }
      
      setOrders(sortedOrders)

    } catch (error) {
      console.error("❌ Error cargando órdenes:", error)
      toast.error("No se pudieron cargar las compras")
    }
  }

  const fetchSubscriptions = async () => {
    if (!user) return
    try {
      console.log("Buscando suscripciones para usuario:", user.id)
      
      // 1. Obtener suscripciones activas del usuario desde user_subscriptions
      const { data: userSubscriptionsData, error: subscriptionsError } = await supabase
        .from("user_subscriptions")
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (subscriptionsError) {
        console.error("Error al obtener user_subscriptions:", subscriptionsError)
      }

      // 2. También obtener información del historial de facturación para cada suscripción
      let subscriptionsWithBilling: Subscription[] = []
      
      if (userSubscriptionsData && userSubscriptionsData.length > 0) {
        for (const sub of userSubscriptionsData) {
          // Obtener el último pago para esta suscripción
          const { data: lastBilling } = await supabase
            .from("subscription_billing_history")
            .select("*")
            .eq("subscription_id", sub.id)
            .order("billing_date", { ascending: false })
            .limit(1)
            .single()

          // Calcular descuento basado en el tipo de suscripción
          let discountAmount = 0
          if (sub.products && sub.subscription_type) {
            const basePrice = sub.products.price || 0
            switch (sub.subscription_type) {
              case 'monthly':
                discountAmount = (sub.products.monthly_discount || 0) / 100 * basePrice
                break
              case 'biweekly':
                discountAmount = (sub.products.biweekly_discount || 0) / 100 * basePrice
                break
              case 'quarterly':
                discountAmount = (sub.products.quarterly_discount || 0) / 100 * basePrice
                break
              case 'annual':
                discountAmount = (sub.products.annual_discount || 0) / 100 * basePrice
                break
            }
          }

          const subscription: Subscription = {
            id: sub.id,
            user_id: sub.user_id,
            product_id: sub.product_id,
            status: sub.status || (sub.is_active ? 'active' : 'inactive'),
            frequency: sub.subscription_type || 'monthly',
            price: sub.products?.price || 0,
            discount_amount: discountAmount,
            next_billing_date: sub.next_billing_date || '',
            created_at: sub.created_at,
            source: 'user_subscriptions',
            product: sub.products,
            quantity: sub.quantity || 1,
            size: sub.size,
            last_billing_date: lastBilling?.billing_date || sub.last_billing_date,
            cancelled_at: sub.cancelled_at
          }

          subscriptionsWithBilling.push(subscription)
        }
      }

      // 3. También obtener suscripciones de la tabla subscriptions (por compatibilidad)
      const { data: subscriptionsData, error: subscriptionsError2 } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (!subscriptionsError2 && subscriptionsData) {
        const legacySubscriptions = subscriptionsData.map(sub => ({
          ...sub,
          source: 'subscriptions',
          product: null,
          next_billing_date: sub.current_period_end || '',
          frequency: 'monthly', // Valor por defecto
          price: 0, // Valor por defecto
          discount_amount: 0
        }))
        
        subscriptionsWithBilling.push(...legacySubscriptions)
      }

      // Eliminar duplicados y ordenar
      const uniqueSubscriptions = subscriptionsWithBilling.filter((sub, index, self) => 
        index === self.findIndex(s => s.id === sub.id)
      )

      console.log(`Total de suscripciones encontradas: ${uniqueSubscriptions.length}`)
      setSubscriptions(uniqueSubscriptions)
      
    } catch (error) {
      console.error("Error cargando suscripciones:", error)
      toast.error("No se pudieron cargar las suscripciones")
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !user) return
    
    setIsSaving(true)
    try {
      // Actualizar metadata de auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        }
      })

      if (authError) throw authError

      // Intentar actualizar/insertar en la tabla profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          auth_users_id: user.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'auth_users_id'
        })

      if (profileError) {
        console.error("Error al actualizar tabla profiles:", profileError)
        // No fallar si solo falla la tabla profiles, ya que auth se actualizó
      }

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
          <Button
            variant={activeTab === 'billing' ? 'default' : 'outline'}
            onClick={() => setActiveTab('billing')}
            className="flex items-center gap-2"
          >
            <Receipt className="h-4 w-4" />
            Facturación
          </Button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
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

            {/* Profile Information Card */}
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
              orders.map((order) => {
                const orderItems = order.order_items || order.items || []
                
                return (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Order Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">
                                {order.external_reference || `Orden #${order.id.toString().slice(-8)}`}
                              </h3>
                              <Badge 
                                variant={
                                  order.payment_status === 'approved' || order.status === 'completed' ? 'default' : 
                                  order.payment_status === 'pending' || order.status === 'pending' ? 'secondary' : 
                                  order.payment_status === 'cancelled' || order.status === 'cancelled' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {order.payment_status === 'approved' || order.status === 'completed' ? 'Aprobado' :
                                 order.payment_status === 'pending' || order.status === 'pending' ? 'Pendiente' : 
                                 order.payment_status === 'cancelled' || order.status === 'cancelled' ? 'Cancelado' :
                                 order.payment_status || order.status || 'Desconocido'}
                              </Badge>
                              {order.source_table && (
                                <Badge variant="outline" className="text-xs">
                                  {order.source_table}
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(order.created_at)}
                            </p>
                            <div className="text-sm text-gray-500 space-y-1">
                              {order.customer_email && (
                                <p>Email: {order.customer_email}</p>
                              )}
                              {order.payment_id && (
                                <p>ID Pago: {order.payment_id}</p>
                              )}
                              {order.collection_id && (
                                <p>ID Cobro: {order.collection_id}</p>
                              )}
                              {orderItems.length > 0 && (
                                <p>{orderItems.length} producto{orderItems.length > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <DollarSign className="h-4 w-4 text-gray-600" />
                              <span className="text-lg font-semibold">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                            {order.payment_type && (
                              <p className="text-sm text-gray-500">
                                {order.payment_type}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        {orderItems.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-medium mb-3 text-gray-700">Productos:</h4>
                            <div className="grid gap-3">
                              {orderItems.slice(0, 3).map((item: OrderItem, index: number) => (
                                <div key={item.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  {item.products?.image && (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
                                      <img
                                        src={item.products.image}
                                        alt={item.products.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {item.products?.name || item.product_name || 'Producto'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Cantidad: {item.quantity}
                                      {item.size && ` • Tamaño: ${item.size}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-sm">
                                      {formatPrice(item.price * item.quantity)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {orderItems.length > 3 && (
                                <p className="text-sm text-gray-500 text-center">
                                  +{orderItems.length - 3} producto{orderItems.length - 3 > 1 ? 's' : ''} más
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
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
                    Suscríbete a "Repetir compra" desde nuestros productos
                  </p>
                  <Button onClick={() => window.location.href = '/productos'}>
                    Ver Productos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              subscriptions.map((subscription) => {
                const product = subscription.product || subscription.products
                const frequency = subscription.frequency || 'monthly'
                const price = subscription.price || (product?.price || 0)
                
                return (
                  <Card key={subscription.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Product Image */}
                        {product?.image && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Subscription Details */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              {product?.name || 'Producto'}
                            </h3>
                            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                              {subscription.status === 'active' ? 'Activa' : 
                               subscription.status === 'cancelled' ? 'Cancelada' :
                               subscription.status === 'paused' ? 'Pausada' : subscription.status}
                            </Badge>
                            <Badge variant="outline">
                              {frequency === 'biweekly' ? 'Quincenal' :
                               frequency === 'monthly' ? 'Mensual' :
                               frequency === 'quarterly' ? 'Trimestral' :
                               frequency === 'annual' ? 'Anual' : frequency}
                            </Badge>
                            {subscription.source && (
                              <Badge variant="outline" className="text-xs">
                                {subscription.source}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <p className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Iniciada: {formatDate(subscription.created_at)}
                            </p>
                            {subscription.next_billing_date && (
                              <p className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Próximo cargo: {formatDate(subscription.next_billing_date)}
                              </p>
                            )}
                            {subscription.last_billing_date && (
                              <p className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Último cargo: {formatDate(subscription.last_billing_date)}
                              </p>
                            )}
                          </div>

                          {/* Additional subscription info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {subscription.quantity && subscription.quantity > 1 && (
                              <p className="text-gray-600">
                                <span className="font-medium">Cantidad:</span> {subscription.quantity}
                              </p>
                            )}
                            {subscription.size && (
                              <p className="text-gray-600">
                                <span className="font-medium">Tamaño:</span> {subscription.size}
                              </p>
                            )}
                            {subscription.discount_amount && subscription.discount_amount > 0 && (
                              <p className="text-green-600">
                                <span className="font-medium">Descuento:</span> {formatPrice(subscription.discount_amount)}
                              </p>
                            )}
                            {subscription.cancelled_at && (
                              <p className="text-red-600">
                                <span className="font-medium">Cancelada:</span> {formatDate(subscription.cancelled_at)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <DollarSign className="h-4 w-4 text-gray-600" />
                            <span className="text-lg font-semibold">
                              {formatPrice(price)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {frequency === 'biweekly' ? 'cada 15 días' :
                             frequency === 'monthly' ? 'mensual' :
                             frequency === 'quarterly' ? 'trimestral' :
                             frequency === 'annual' ? 'anual' : frequency}
                          </p>
                          {subscription.discount_amount && subscription.discount_amount > 0 && (
                            <p className="text-xs text-green-600">
                              (Precio original: {formatPrice(price + subscription.discount_amount)})
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Billing Tab */}
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
