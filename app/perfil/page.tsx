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

import RealtimeStatus from "@/components/realtime-status"


import { fetchOptimizedOrders, fetchOptimizedSubscriptions, invalidateUserCache } from "@/lib/query-optimizations"
import { extractCustomerEmail, extractCustomerName } from '@/lib/email-utils'
import { SubscriptionCard } from '@/components/shared/SubscriptionCard'
import { 
  getBasePrice,
  getOriginalPrice,
  getDiscountedPrice,
  getDiscountAmount,
  getDiscountPercentage,
  getShippingCost,
  getTotalPrice,
  formatPrice as formatPriceHelper,
  formatDate as formatDateHelper,
  getNextPaymentDate
} from '@/utils/subscription-calculations'
import { 
  User, 
  Package,
  Save,
  Edit3,
  Calendar,
  DollarSign,
  MapPin,
  Receipt,
  Activity,
  Wifi,
  WifiOff
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
    weekly_discount?: number
    biweekly_discount?: number
    monthly_discount?: number
    quarterly_discount?: number
    annual_discount?: number
  }
  products?: {
    id: string
    name: string
    image: string
    price: number
    subscription_types?: string[]
    weekly_discount?: number
    biweekly_discount?: number
    monthly_discount?: number
    quarterly_discount?: number
    annual_discount?: number
  }
}

// Funciones de utilidad
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatPrice(amount: number) {
  return formatCurrency(amount)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// Función para extraer items de la orden (similar a la página de admin)
function getOrderItems(order: Order): OrderItem[] {
  // Primero intentar obtener items desde shipping_address
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
  
  // Fallback a order_items o items
  return order.order_items || order.items || []
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
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [maxReconnectAttempts] = useState(5)
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Función para procesar URLs de imágenes
  const processImageUrl = (imageUrl: string | null | undefined): string => {
    console.log('🖼️ [PERFIL] processImageUrl llamada con:', imageUrl, 'tipo:', typeof imageUrl)
    
    if (!imageUrl || imageUrl.trim() === '') {
      console.log('🖼️ [PERFIL] URL vacía o null, devolviendo placeholder')
      return "/placeholder.svg"
    }
    
    // Si ya es una URL completa válida, devolverla tal como está
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      console.log('🖼️ [PERFIL] URL completa detectada:', imageUrl)
      return imageUrl
    }
    
    // Si es una ruta absoluta local, devolverla tal como está
    if (imageUrl.startsWith("/")) {
      console.log('🖼️ [PERFIL] Ruta absoluta local detectada:', imageUrl)
      return imageUrl
    }
    
    // Si es una ruta relativa en el bucket de Supabase, construir la URL completa
    try {
      console.log('🖼️ [PERFIL] Procesando ruta relativa de Supabase:', imageUrl)
      
      // Limpiar la ruta de imagen (remover barras iniciales si las hay)
      let cleanImagePath = imageUrl.replace(/^\/+/, '').trim()
      console.log('🖼️ [PERFIL] Ruta limpia:', cleanImagePath)
      
      // Validar que la ruta no esté vacía después de limpiar
      if (!cleanImagePath) {
        console.warn('🖼️ [PERFIL] Ruta de imagen vacía después de limpiar:', imageUrl)
        return "/placeholder.svg"
      }
      
      // Si la ruta no tiene extensión, agregar .jpg por defecto
      if (!cleanImagePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        console.log('🖼️ [PERFIL] Agregando extensión .jpg a:', cleanImagePath)
        cleanImagePath += '.jpg'
      }
      
      console.log('🖼️ [PERFIL] Ruta final para Supabase:', cleanImagePath)
      
      // Construir la URL pública usando la configuración de Supabase
      const { data } = supabase.storage.from("products").getPublicUrl(cleanImagePath)
      
      // Verificar que la URL se construyó correctamente
      if (data?.publicUrl) {
        console.log('🖼️ [PERFIL] URL de imagen generada exitosamente:', data.publicUrl, 'para imagen original:', imageUrl)
        return data.publicUrl
      } else {
        console.warn('🖼️ [PERFIL] URL de imagen no válida generada:', data?.publicUrl, 'para imagen:', imageUrl)
        return "/placeholder.svg"
      }
    } catch (error) {
      console.error('🖼️ [PERFIL] Error al obtener URL de imagen:', error, 'para imagen:', imageUrl)
      return "/placeholder.svg"
    }
  }

  // Manejar parámetro de verificación
  useEffect(() => {
    const verified = searchParams.get('verified')
    if (verified === 'true') {
      toast.success('¡Email verificado exitosamente! Bienvenido a PetGourmet.')
      // Limpiar el parámetro de la URL
      const url = new URL(window.location.href)
      url.searchParams.delete('verified')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  useEffect(() => {
    console.log('🔄 PerfilPage useEffect - loading:', loading, 'user:', !!user, 'user.id:', user?.id)
    
    if (!loading && user) {
      console.log('✅ Condiciones cumplidas, inicializando datos...')
      initializeData()
      setupRealtimeSubscriptions()
    } else if (!loading && !user) {
      console.log('❌ No hay usuario después de cargar, estableciendo isLoading a false')
      setIsLoading(false)
    }
    
    // Timeout de seguridad para evitar carga infinita
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('⚠️ Timeout de seguridad activado en PerfilPage, estableciendo isLoading a false')
        setIsLoading(false)
      }
    }, 15000) // 15 segundos
    
    // Detectar cambios en la conexión de red
    const handleOnline = () => {
      console.log('🌐 Conexión de red restaurada')
      if (realtimeStatus === 'disconnected') {
        setReconnectAttempts(0) // Reset contador
        setRealtimeStatus('connecting')
        setupRealtimeSubscriptions()
        toast.success('Conexión restaurada. Sincronizando datos...')
      }
    }

    const handleOffline = () => {
      console.log('📶 Conexión de red perdida')
      setRealtimeStatus('disconnected')
      cleanupRealtimeSubscriptions()
      toast.error('Sin conexión a internet. Los datos pueden no estar actualizados.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Cleanup function
    return () => {
      clearTimeout(safetyTimeout)
      cleanupRealtimeSubscriptions()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user?.id, loading])

  const setupRealtimeSubscriptions = () => {
    if (!user) return
    
    const supabase = createClient()
    setRealtimeStatus('connecting')
    
    // Canal para órdenes
    const ordersChannel = supabase
      .channel('user_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📦 Cambio en órdenes:', payload)
          setLastSyncTime(new Date())
          fetchOrders() // Recargar órdenes cuando hay cambios
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        (payload) => {
          console.log('📦 Cambio en items de órdenes:', payload)
          setLastSyncTime(new Date())
          fetchOrders() // Recargar órdenes cuando hay cambios en items
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal de órdenes en tiempo real conectado')
          setRealtimeStatus('connected')
          setReconnectAttempts(0) // Reset contador de reconexión
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Error en canal de órdenes en tiempo real')
          setRealtimeStatus('disconnected')
          handleRealtimeError('orders')
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Canal de órdenes cerrado')
          setRealtimeStatus('disconnected')
          handleRealtimeError('orders')
        }
      })
    
    // Canal para suscripciones de usuario
    const subscriptionsChannel = supabase
      .channel('subscriptions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unified_subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📦 Cambio en suscripciones:', payload)
          setLastSyncTime(new Date())
          fetchSubscriptions() // Recargar suscripciones cuando hay cambios
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal de suscripciones en tiempo real conectado')
          setRealtimeStatus('connected')
          setReconnectAttempts(0) // Reset contador de reconexión
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Error en canal de suscripciones en tiempo real')
          setRealtimeStatus('disconnected')
          handleRealtimeError('subscriptions')
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Canal de suscripciones cerrado')
          setRealtimeStatus('disconnected')
          handleRealtimeError('subscriptions')
        }
      })
    
    // Canal para perfiles de usuario
    const profileChannel = supabase
      .channel('user_profile_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('👤 Cambio en perfil:', payload)
          setLastSyncTime(new Date())
          fetchUserProfile() // Recargar perfil cuando hay cambios
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal de perfil en tiempo real conectado')
          setRealtimeStatus('connected')
          setReconnectAttempts(0) // Reset contador de reconexión
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Error en canal de perfil en tiempo real')
          setRealtimeStatus('disconnected')
          handleRealtimeError('profile')
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Canal de perfil cerrado')
          setRealtimeStatus('disconnected')
          handleRealtimeError('profile')
        }
      })
    
    // Guardar referencias para cleanup
    window.userOrdersRealtimeChannel = ordersChannel
    window.userSubscriptionsRealtimeChannel = subscriptionsChannel
    window.userProfileRealtimeChannel = profileChannel
  }

  const handleRealtimeError = (channelType: 'orders' | 'subscriptions' | 'profile') => {
    // Evitar múltiples intentos de reconexión simultáneos
    if (isReconnecting) {
      console.log(`⚠️ Ya hay un intento de reconexión en curso para ${channelType}, omitiendo...`)
      return
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn(`⚠️ Máximo número de intentos de reconexión alcanzado para ${channelType}`)
      toast.error('Error de conexión en tiempo real. Recarga la página para reconectar.')
      return
    }

    setIsReconnecting(true)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Backoff exponencial con máximo de 30s
    setReconnectAttempts(prev => prev + 1)
    
    console.log(`🔄 Reintentando conexión en tiempo real para ${channelType} en ${delay}ms (intento ${reconnectAttempts + 1}/${maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (user && !loading) {
        setRealtimeStatus('connecting')
        cleanupRealtimeSubscriptions()
        // Esperar un poco antes de reconectar para evitar conflictos
        setTimeout(() => {
          setupRealtimeSubscriptions()
          setIsReconnecting(false)
        }, 500)
      } else {
        setIsReconnecting(false)
      }
    }, delay)
  }
  
  const cleanupRealtimeSubscriptions = () => {
    if (window.userOrdersRealtimeChannel) {
      console.log('🧹 Limpiando canal de órdenes en tiempo real...')
      window.userOrdersRealtimeChannel.unsubscribe()
      window.userOrdersRealtimeChannel = null
    }
    
    if (window.userSubscriptionsRealtimeChannel) {
      console.log('🧹 Limpiando canal de suscripciones en tiempo real...')
      window.userSubscriptionsRealtimeChannel.unsubscribe()
      window.userSubscriptionsRealtimeChannel = null
    }
    
    if (window.userProfileRealtimeChannel) {
      console.log('🧹 Limpiando canal de perfil en tiempo real...')
      window.userProfileRealtimeChannel.unsubscribe()
      window.userProfileRealtimeChannel = null
    }
  }

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
      
      // Verificar si es un error de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setRealtimeStatus('disconnected')
      }
    }
  }

  const fetchOrders = async (retryCount = 0) => {
    if (!user) return
    
    try {
      const supabase = createClient()
      
      // Usar función optimizada
      const optimizedOrders = await fetchOptimizedOrders(user.id, supabase, true)
      
      if (optimizedOrders.length > 0) {
        setOrders(optimizedOrders)
        return
      }
      
      // Fallback al método alternativo si no hay órdenes directas
      await fetchOrdersFromItems()
      
    } catch (error) {
      console.error('Error loading orders:', error)
      
      // Verificar si es un error de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setRealtimeStatus('disconnected')
      }
      
      // Retry logic (consistente con admin)
      if (retryCount < 3) {
        console.log(`Reintentando obtener órdenes... Intento ${retryCount + 1}/3`)
        setTimeout(() => {
          fetchOrders(retryCount + 1)
        }, 1000 * (retryCount + 1)) // Backoff exponencial
        return
      }
      
      toast.error('No se pudieron cargar las compras')
    }
  }

  // Método alternativo para buscar órdenes desde order_items
  const fetchOrdersFromItems = async () => {
    if (!user) return
    
    try {
      const supabase = createClient()
      
      // Obtener todas las órdenes y filtrar por email en shipping_address
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Error fetching all orders:', ordersError)
        setOrders([])
        return
      }

      if (!allOrders || allOrders.length === 0) {
        setOrders([])
        return
      }
      
      // Filtrar órdenes que pertenezcan al usuario actual
      const userOrders = allOrders.filter(order => {
        // Verificar user_id directo
        if (order.user_id === user.id) {
          return true
        }
        
        // Verificar email en shipping_address
        if (order.shipping_address) {
          try {
            const parsedShipping = typeof order.shipping_address === 'string' 
              ? JSON.parse(order.shipping_address) 
              : order.shipping_address
            
            // Buscar email en diferentes ubicaciones posibles
            const customerEmail = parsedShipping?.email || parsedShipping?.customer_data?.email
            return customerEmail === user.email
          } catch (e) {
            console.warn('Error parsing shipping_address:', e)
          }
        }
        
        return false
      })

      if (userOrders.length === 0) {
        setOrders([])
        return
      }

      const orderIds = userOrders.map(order => order.id)
      
      // Ahora buscar order_items para esas órdenes
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
        setOrders([])
        return
      }

      if (!orderItemsData || orderItemsData.length === 0) {
        setOrders([])
        return
      }

      // Agrupar order_items por order_id
      const orderGroups = orderItemsData.reduce((groups, item) => {
        const orderId = item.order_id
        if (!groups[orderId]) {
          groups[orderId] = []
        }
        groups[orderId].push(item)
        return groups
      }, {} as Record<string, any[]>)

      // Reconstruir órdenes desde los grupos de items
      const processedOrders = Object.entries(orderGroups).map(([orderId, items]) => {
        const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
        const firstItem = items[0]
        
        return {
          id: orderId,
          user_id: user.id,
          total: total,
          payment_status: 'completed',
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
      console.error('Error in fetchOrdersFromItems:', error)
      setOrders([])
    }
  }

  const fetchSubscriptions = async (retryCount = 0) => {
    if (!user) return
    try {
      const supabase = createClient()
      
      // Usar función optimizada
      const optimizedSubscriptions = await fetchOptimizedSubscriptions(user.id, supabase, true)
      setSubscriptions(optimizedSubscriptions)
      
    } catch (error) {
      console.error('Error cargando suscripciones:', error)
      
      // Verificar si es un error de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setRealtimeStatus('disconnected')
      }
      
      // Retry logic (consistente con admin)
      if (retryCount < 3) {
        console.log(`Reintentando obtener suscripciones... Intento ${retryCount + 1}/3`)
        setTimeout(() => {
          fetchSubscriptions(retryCount + 1)
        }, 1000 * (retryCount + 1)) // Backoff exponencial
        return
      }
      
      toast.error('No se pudieron cargar las suscripciones')
      setSubscriptions([])
    }
  }

  // Función auxiliar para convertir subscription_type a frequency
  const getFrequencyFromType = (subscriptionType: string): string => {
    switch (subscriptionType) {
      case 'weekly': return 'weekly'
      case 'biweekly': return 'biweekly'
      case 'monthly': return 'monthly'
      case 'quarterly': return 'quarterly'
      case 'annual': return 'annual'
      default: return 'monthly'
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

  const formatPrice = (price: number | null | undefined) => {
    // Manejar valores null, undefined o NaN
    if (price == null || isNaN(Number(price))) {
      return '$0.00'
    }
    
    // Asegurar que sea un número válido
    const validPrice = Number(price)
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(validPrice)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Funciones de cálculo de precios para suscripciones
  const getOriginalPrice = (subscription: Subscription): number => {
    // Usar base_price si está disponible, sino usar transaction_amount
    return subscription.base_price || subscription.transaction_amount || subscription.price || 0
  }

  const getDiscountPercentage = (subscription: Subscription): number => {
    return subscription.discount_percentage || 0
  }

  const getDiscountAmount = (subscription: Subscription): number => {
    const originalPrice = getOriginalPrice(subscription)
    const discountPercentage = getDiscountPercentage(subscription)
    return (originalPrice * discountPercentage) / 100
  }

  const getDiscountedPrice = (subscription: Subscription): number => {
    // Usar discounted_price si está disponible, sino calcular
    if (subscription.discounted_price) {
      return subscription.discounted_price
    }
    const originalPrice = getOriginalPrice(subscription)
    const discountAmount = getDiscountAmount(subscription)
    return originalPrice - discountAmount
  }

  const getShippingCost = (subscription: Subscription): number => {
    // Envío gratis para suscripciones o basado en el monto
    const discountedPrice = getDiscountedPrice(subscription)
    return discountedPrice >= 1000 ? 0 : 100
  }

  const getTotalPrice = (subscription: Subscription): number => {
    // Usar transaction_amount si está disponible, sino calcular
    if (subscription.transaction_amount) {
      return subscription.transaction_amount
    }
    const discountedPrice = getDiscountedPrice(subscription)
    const shippingCost = getShippingCost(subscription)
    return discountedPrice + shippingCost
  }

  // Funciones helper para formateo
  const formatPriceHelper = (price: number | null | undefined) => {
    return formatPrice(price)
  }

  const formatDateHelper = (dateString: string) => {
    return formatDate(dateString)
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
              <div className="flex items-center gap-2">
                <RealtimeStatus />
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100">
                  {realtimeStatus === 'connected' ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : realtimeStatus === 'connecting' ? (
                    <Activity className="h-3 w-3 text-yellow-500 animate-pulse" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`${
                    realtimeStatus === 'connected' ? 'text-green-700' :
                    realtimeStatus === 'connecting' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {realtimeStatus === 'connected' ? 'Sincronizado' :
                     realtimeStatus === 'connecting' ? 'Conectando...' :
                     'Desconectado'}
                  </span>
                  {lastSyncTime && realtimeStatus === 'connected' && (
                    <span className="text-gray-500 ml-1">
                      {new Date(lastSyncTime).toLocaleTimeString('es-MX', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación de pestañas responsive */}
         <div className="mb-6">
           <div className="flex flex-col sm:flex-row gap-2 sm:gap-1">
             <Button
               variant={activeTab === 'profile' ? 'default' : 'outline'}
               onClick={() => setActiveTab('profile')}
               className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
             >
               <User className="h-4 w-4" />
               <span className="hidden sm:inline">Perfil</span>
               <span className="sm:hidden">Mi Perfil</span>
             </Button>
             <Button
               variant={activeTab === 'orders' ? 'default' : 'outline'}
               onClick={() => setActiveTab('orders')}
               className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
             >
               <Package className="h-4 w-4" />
               <span className="hidden sm:inline">Mis Compras ({orders.length})</span>
               <span className="sm:hidden">Compras ({orders.length})</span>
             </Button>
             <Button
               variant={activeTab === 'subscriptions' ? 'default' : 'outline'}
               onClick={() => setActiveTab('subscriptions')}
               className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
             >
               <Calendar className="h-4 w-4" />
               <span className="hidden sm:inline">Suscripciones ({subscriptions.length})</span>
               <span className="sm:hidden">Suscripciones ({subscriptions.length})</span>
             </Button>
           </div>
         </div>

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Estadísticas del perfil - Layout responsive mejorado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Total Compras</p>
                      <p className="text-lg sm:text-xl font-semibold">{orders.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Suscripciones</p>
                      <p className="text-sm sm:text-lg font-semibold leading-tight">
                        <span className="block">{subscriptions.filter(s => s.status === 'active').length} activas</span>
                        {subscriptions.filter(s => s.status === 'pending').length > 0 && (
                          <span className="text-xs sm:text-sm text-gray-500">
                            {subscriptions.filter(s => s.status === 'pending').length} pendientes
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Total Gastado</p>
                      <p className="text-lg sm:text-xl font-semibold">
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
              <div className="grid gap-4 sm:gap-6">
                {orders.map((order) => (
                  <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                    {/* Header de la orden - Responsive */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-3 sm:py-4 border-b">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <h3 className="font-bold text-lg sm:text-xl text-gray-900">Orden #{String(order.id).slice(-8)}</h3>
                              <Badge 
                                variant={order.payment_status === 'approved' ? 'default' : 'secondary'}
                                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold w-fit ${
                                  order.payment_status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                  order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  order.payment_status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                  order.payment_status === 'in_process' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  order.payment_status === 'cancelled' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                  order.payment_status === 'refunded' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }`}
                              >
                                {order.payment_status === 'approved' ? '✅ Pagado' : 
                                 order.payment_status === 'pending' ? '⏳ Pendiente' :
                                 order.payment_status === 'rejected' ? '❌ Rechazado' :
                                 order.payment_status === 'in_process' ? '🔄 En Proceso' :
                                 order.payment_status === 'cancelled' ? '❌ Cancelado' :
                                 order.payment_status === 'refunded' ? '💰 Reembolsado' :
                                 order.payment_status}
                              </Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                {formatDate(order.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                                {order.total_items} producto{order.total_items !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xl sm:text-2xl font-bold text-indigo-600">
                              {formatPrice(order.total)}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">Total</p>
                          </div>
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
                           <p className="text-gray-900">{extractCustomerName(order) || 'No disponible'}</p>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Email:</span>
                           <p className="text-gray-900">{extractCustomerEmail(order) || 'No disponible'}</p>
                         </div>
                         {order.shipping_address && (() => {
                           try {
                             const shippingData = typeof order.shipping_address === 'string' 
                               ? JSON.parse(order.shipping_address) 
                               : order.shipping_address
                             return (
                               <>
                                 {shippingData.phone && (
                                   <div>
                                     <span className="font-medium text-gray-700">Teléfono:</span>
                                     <p className="text-gray-900">{shippingData.phone}</p>
                                   </div>
                                 )}
                                 {(shippingData.address || shippingData.street) && (
                                   <div className="md:col-span-2">
                                     <span className="font-medium text-gray-700">Dirección:</span>
                                     <p className="text-gray-900">
                                       {shippingData.address || 
                                        `${shippingData.street || ''} ${shippingData.city || ''} ${shippingData.state || ''} ${shippingData.zipCode || ''}`.trim()}
                                     </p>
                                   </div>
                                 )}
                               </>
                             )
                           } catch (e) {
                             return null
                           }
                         })()}
                       </div>
                     </CardContent>

                     {/* Información de Pago MercadoPago */}
                     {(order.payment_id || order.external_reference || order.preference_id) && (
                       <CardContent className="p-6 border-b">
                         <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                           <DollarSign className="h-4 w-4" />
                           Información de Pago
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                           {order.payment_id && (
                             <div>
                               <span className="font-medium text-gray-700">Payment ID:</span>
                               <p className="text-gray-900 font-mono text-xs">{order.payment_id}</p>
                             </div>
                           )}
                           {order.external_reference && (
                             <div>
                               <span className="font-medium text-gray-700">External Reference:</span>
                               <p className="text-gray-900 font-mono text-xs">{order.external_reference}</p>
                             </div>
                           )}
                           {order.preference_id && (
                             <div>
                               <span className="font-medium text-gray-700">Preference ID:</span>
                               <p className="text-gray-900 font-mono text-xs">{order.preference_id}</p>
                             </div>
                           )}
                           {order.payment_type && (
                             <div>
                               <span className="font-medium text-gray-700">Tipo de Pago:</span>
                               <p className="text-gray-900">{order.payment_type}</p>
                             </div>
                           )}
                           {order.collection_id && (
                             <div>
                               <span className="font-medium text-gray-700">Collection ID:</span>
                               <p className="text-gray-900 font-mono text-xs">{order.collection_id}</p>
                             </div>
                           )}
                           {order.merchant_order_id && (
                             <div>
                               <span className="font-medium text-gray-700">Merchant Order ID:</span>
                               <p className="text-gray-900 font-mono text-xs">{order.merchant_order_id}</p>
                             </div>
                           )}
                         </div>
                       </CardContent>
                     )}

                     {/* Tabla de Productos */}
                     <CardContent className="p-6 border-b">
                       <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                         <Package className="h-4 w-4" />
                         Productos
                       </h4>
                       {(() => {
                         const items = getOrderItems(order)
                         return items.length > 0 ? (
                           <div className="overflow-x-auto">
                             <table className="w-full border-collapse">
                               <thead>
                                 <tr className="border-b border-gray-200">
                                   <th className="text-left py-3 px-2 font-medium text-gray-700">Producto</th>
                                   <th className="text-center py-3 px-2 font-medium text-gray-700">Cantidad</th>
                                   <th className="text-right py-3 px-2 font-medium text-gray-700">Precio</th>
                                   <th className="text-right py-3 px-2 font-medium text-gray-700">Subtotal</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {items.map((item, index) => {
                                   const quantity = item.quantity || 1
                                   const price = item.unit_price || item.price || 0
                                   const subtotal = quantity * price
                                   
                                   return (
                                     <tr key={item.id || index} className="border-b border-gray-100">
                                       <td className="py-3 px-2">
                                         <div className="flex items-center gap-3">
                                           {(item.product_image || item.products?.image) ? (
                                             <img
                                               src={item.product_image || item.products?.image}
                                               alt={item.product_name || 'Producto'}
                                               className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                             />
                                           ) : (
                                             <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-lg flex items-center justify-center border border-gray-200">
                                               <Package className="w-6 h-6 text-blue-600" />
                                             </div>
                                           )}
                                           <div>
                                             <p className="font-medium text-gray-900">
                                               {item.title || item.name || item.product_name || 'Producto sin nombre'}
                                             </p>
                                             {item.size && (
                                               <p className="text-sm text-gray-500">Tamaño: {item.size}</p>
                                             )}
                                           </div>
                                         </div>
                                       </td>
                                       <td className="py-3 px-2 text-center">
                                         <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                                           {quantity}
                                         </span>
                                       </td>
                                       <td className="py-3 px-2 text-right font-medium">
                                         {formatCurrency(price)}
                                       </td>
                                       <td className="py-3 px-2 text-right font-bold">
                                         {formatCurrency(subtotal)}
                                       </td>
                                     </tr>
                                   )
                                 })}
                               </tbody>
                             </table>
                           </div>
                         ) : (
                           <div className="text-center py-8 text-gray-500">
                             <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                             <p>No se encontraron productos en esta orden</p>
                           </div>
                         )
                       })()}
                     </CardContent>

                     {/* Resumen de Totales */}
                     <CardContent className="p-6">
                       <div className="space-y-3">
                         {(() => {
                           const items = getOrderItems(order)
                           const subtotal = items.reduce((sum, item) => {
                             const quantity = item.quantity || 1
                             const price = item.unit_price || item.price || 0
                             return sum + (quantity * price)
                           }, 0)
                           const shipping = subtotal >= 1000 ? 0 : 100 // Envío gratis si subtotal >= $1000, sino $100
                           const discount = 0 // Asumiendo sin descuento por defecto
                           
                           return (
                             <>
                               <div className="flex justify-between text-sm">
                                 <span className="text-gray-600">Subtotal:</span>
                                 <span className="font-medium">{formatCurrency(subtotal)}</span>
                               </div>
                               <div className="flex justify-between text-sm">
                                 <span className="text-gray-600">Envío:</span>
                                 <span className="font-medium">{shipping > 0 ? formatCurrency(shipping) : 'Gratis'}</span>
                               </div>
                               {discount > 0 && (
                                 <div className="flex justify-between text-sm">
                                   <span className="text-gray-600">Descuento:</span>
                                   <span className="font-medium text-green-600">-{formatCurrency(discount)}</span>
                                 </div>
                               )}
                               <div className="border-t pt-3">
                                 <div className="flex justify-between text-lg font-bold">
                                   <span>Total:</span>
                                   <span className="text-indigo-600">{formatCurrency(subtotal + shipping - discount)}</span>
                                 </div>
                               </div>
                             </>
                           )
                         })()}
                       </div>
                     </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
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
                    📦 Productos Suscritos ({subscriptions.length})
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Gestiona tus suscripciones activas y próximos envíos
                  </p>
                </div>
                {subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    formatPrice={formatPriceHelper}
                    formatDate={formatDateHelper}
                    getStatusBadge={(sub) => {
                      const status = sub.status?.toLowerCase()
                      if (status === 'active') {
                        return <Badge className="bg-green-100 text-green-800">Activa</Badge>
                      } else if (status === 'cancelled') {
                        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>
                      } else if (status === 'paused') {
                        return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>
                      }
                      return <Badge variant="outline">{status || 'Desconocido'}</Badge>
                    }}
                    getFrequencyLabel={(sub) => {
                      // Determinar frecuencia basada en los datos de la suscripción
                      const metadata = sub.metadata || {}
                      const originalCartItems = metadata.original_cart_items || []
                      const firstCartItem = originalCartItems[0] || {}
                      const subscriptionType = sub.subscription_type || firstCartItem.subscriptionType || 'monthly'
                      const frequencyType = sub.frequency_type || 'weeks'
                      const frequencyValue = sub.frequency || 1
                      
                      if (subscriptionType === 'weekly' || (frequencyType === 'weeks' && frequencyValue === 1)) {
                        return 'Semanal'
                      } else if (subscriptionType === 'biweekly' || (frequencyType === 'weeks' && frequencyValue === 2)) {
                        return 'Quincenal'
                      } else if (subscriptionType === 'monthly' || (frequencyType === 'months' && frequencyValue === 1)) {
                        return 'Mensual'
                      } else if (subscriptionType === 'quarterly' || (frequencyType === 'months' && frequencyValue === 3)) {
                        return 'Trimestral'
                      } else if (subscriptionType === 'annual' || (frequencyType === 'months' && frequencyValue === 12)) {
                        return 'Anual'
                      }
                      return 'Mensual'
                    }}
                    getDiscountPercentage={getDiscountPercentage}
                    getOriginalPrice={getOriginalPrice}
                    getDiscountAmount={getDiscountAmount}
                    getDiscountedPrice={getDiscountedPrice}
                    getShippingCost={getShippingCost}
                    getTotalPrice={getTotalPrice}
                    getNextPaymentDate={(sub) => sub.next_billing_date ? new Date(sub.next_billing_date) : null}
                    processImageUrl={processImageUrl}
                  />
                ))}
              </div>
            )}
          </div>
        )}


      </div>
      
      {/* Componentes de debugging para diagnosticar problemas */}
      <div className="mt-8 space-y-6">

      </div>
    </div>
  )
}

export default function PerfilPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando perfil...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <PerfilPageContent />
    </Suspense>
  )
}