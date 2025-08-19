// Optimizaciones de consultas para evitar duplicación y mejorar rendimiento
import { SupabaseClient } from '@supabase/supabase-js'

// Tipos compartidos
export interface OptimizedOrder {
  id: string
  user_id: string
  total: number
  payment_status: string
  status: string
  created_at: string
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  items: any[]
  total_items: number
  source_table: string
  shipping_address?: any
}

export interface OptimizedSubscription {
  id: string
  user_id: string
  product_id: string
  status: string
  frequency: string
  price: number
  discount_amount: number
  next_billing_date?: string
  created_at: string
  source: string
  products?: any
  user_profile?: any
}

// Cache para evitar consultas repetidas
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos

// Función para obtener datos del cache o ejecutar consulta
export async function getCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  cacheDuration: number = CACHE_DURATION
): Promise<T> {
  const cached = queryCache.get(key)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < cacheDuration) {
    return cached.data
  }
  
  const data = await queryFn()
  queryCache.set(key, { data, timestamp: now })
  
  return data
}

// Función optimizada para obtener órdenes con items
export async function fetchOptimizedOrders(
  userId: string,
  supabase: SupabaseClient,
  useCache: boolean = true
): Promise<OptimizedOrder[]> {
  const cacheKey = `orders_${userId}`
  
  const queryFn = async () => {
    // Consulta optimizada: una sola query con JOIN
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            image,
            price
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching optimized orders:', error)
      return []
    }
    
    return ordersData?.map(order => {
      // Parsear shipping_address una sola vez
      let parsedShippingAddress = null
      let customerInfo = null
      
      if (order.shipping_address) {
        try {
          parsedShippingAddress = typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address
          
          if (parsedShippingAddress?.customer_data) {
            const customerData = parsedShippingAddress.customer_data
            customerInfo = {
              name: customerData.firstName && customerData.lastName
                ? `${customerData.firstName} ${customerData.lastName}`
                : customerData.firstName || customerData.name || 'Cliente anónimo',
              email: customerData.email || 'No especificado',
              phone: customerData.phone || 'No especificado'
            }
          }
        } catch (e) {
          console.warn('Error parsing shipping_address:', e)
        }
      }
      
      return {
        ...order,
        items: order.order_items || [],
        total_items: order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        customer_name: customerInfo?.name || 'Cliente anónimo',
        customer_email: customerInfo?.email || 'No especificado',
        customer_phone: customerInfo?.phone || 'No especificado',
        source_table: 'orders',
        shipping_address: parsedShippingAddress || {}
      }
    }) || []
  }
  
  return useCache ? getCachedQuery(cacheKey, queryFn) : queryFn()
}

// Función optimizada para obtener suscripciones
export async function fetchOptimizedSubscriptions(
  userId: string | null,
  supabase: SupabaseClient,
  useCache: boolean = true
): Promise<OptimizedSubscription[]> {
  const cacheKey = `subscriptions_${userId || 'all'}`
  
  const queryFn = async () => {
    // Consulta batch optimizada
    const [userSubscriptionsResult, pendingSubscriptionsResult] = await Promise.all([
      // Suscripciones activas
      userId ? 
        supabase
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
          .eq('user_id', userId)
          .not('mercadopago_subscription_id', 'is', null)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        :
        supabase
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
          .not('mercadopago_subscription_id', 'is', null)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      
      // Suscripciones pendientes válidas (incluir todas las pendientes, con o sin mercadopago_subscription_id)
      userId ?
        supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        :
        supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
    ])
    
    const userSubscriptions = userSubscriptionsResult.data || []
    const pendingSubscriptions = pendingSubscriptionsResult.data || []
    
    // Procesar suscripciones activas
    const processedActiveSubscriptions = userSubscriptions.map(sub => {
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
      
      // Estandarizar estado
      let standardizedStatus = sub.status || (sub.is_active ? 'active' : 'inactive')
      if (sub.cancelled_at) {
        standardizedStatus = 'cancelled'
      } else if (!sub.is_active) {
        standardizedStatus = 'inactive'
      } else if (sub.is_active) {
        standardizedStatus = 'active'
      }
      
      return {
        ...sub,
        status: standardizedStatus,
        frequency,
        discount_amount: discountAmount,
        source: 'user_subscriptions'
      }
    })
    
    // Procesar todas las suscripciones pendientes (sin filtro de expiración)
    // Las suscripciones solo cambian de estado cuando se procesa el pago vía webhook
    const validPendingSubscriptions = pendingSubscriptions
    
    // Obtener productos para suscripciones pendientes en una sola consulta
    const pendingProductIds = validPendingSubscriptions
      .map(sub => {
        try {
          let cartItems = []
          if (typeof sub.cart_items === 'string') {
            cartItems = JSON.parse(sub.cart_items)
          } else if (Array.isArray(sub.cart_items)) {
            cartItems = sub.cart_items
          } else if (sub.cart_items && typeof sub.cart_items === 'object') {
            cartItems = [sub.cart_items]
          }
          return cartItems[0]?.product_id
        } catch (error) {
          console.error('Error parsing cart_items for product_id:', error)
          return null
        }
      })
      .filter(Boolean)
    
    let pendingProductsData = []
    if (pendingProductIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, image, price')
        .in('id', pendingProductIds)
      
      pendingProductsData = productsData || []
    }
    
    const processedPendingSubscriptions = validPendingSubscriptions.map(sub => {
      // Parsear cart_items - puede ser string JSON, objeto, o array
      let cartItems = []
      try {
        if (typeof sub.cart_items === 'string') {
          // Si es string, intentar parsear como JSON
          cartItems = JSON.parse(sub.cart_items)
        } else if (Array.isArray(sub.cart_items)) {
          // Si ya es array, usarlo directamente
          cartItems = sub.cart_items
        } else if (sub.cart_items && typeof sub.cart_items === 'object') {
          // Si es objeto, convertir a array
          cartItems = [sub.cart_items]
        } else {
          cartItems = []
        }
      } catch (error) {
        console.error('Error parsing cart_items:', error, 'Raw data:', sub.cart_items)
        cartItems = []
      }
      
      const cartItem = cartItems[0] || {}
      const productData = pendingProductsData.find(p => p.id === cartItem.product_id)
      
      return {
        id: `pending_${sub.id}`,
        user_id: sub.user_id,
        product_id: cartItem.product_id || null,
        status: 'pending',
        frequency: getFrequencyFromType(sub.subscription_type),
        price: cartItem.price || 0,
        discount_amount: 0,
        next_billing_date: null,
        created_at: sub.created_at,
        source: 'pending_subscriptions',
        products: {
          id: cartItem.product_id || '',
          name: productData?.name || cartItem.product_name || 'Producto',
          image: productData?.image || cartItem.image || '/placeholder.svg',
          price: productData?.price || cartItem.price || 0
        }
      }
    })
    
    // Combinar y deduplicar
    const allSubscriptions = [...processedActiveSubscriptions, ...processedPendingSubscriptions]
    return allSubscriptions.filter((sub, index, self) =>
      index === self.findIndex(s => s.id === sub.id)
    )
  }
  
  return useCache ? getCachedQuery(cacheKey, queryFn) : queryFn()
}

// Función optimizada para obtener perfiles de usuario
export async function fetchOptimizedUserProfiles(
  userIds: string[],
  supabase: SupabaseClient,
  useCache: boolean = true
): Promise<any[]> {
  if (userIds.length === 0) return []
  
  const cacheKey = `profiles_${userIds.sort().join('_')}`
  
  const queryFn = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, auth_users_id, full_name, email, phone')
      .in('auth_users_id', userIds)
    
    return profilesData || []
  }
  
  return useCache ? getCachedQuery(cacheKey, queryFn) : queryFn()
}

// Función auxiliar
function getFrequencyFromType(subscriptionType: string): string {
  switch (subscriptionType) {
    case 'weekly': return 'weekly'
    case 'biweekly': return 'biweekly'
    case 'monthly': return 'monthly'
    case 'quarterly': return 'quarterly'
    case 'annual': return 'annual'
    default: return 'monthly'
  }
}

// Función para limpiar cache
export function clearQueryCache(pattern?: string) {
  if (pattern) {
    const keysToDelete: string[] = []
    queryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => queryCache.delete(key))
  } else {
    queryCache.clear()
  }
}

// Función optimizada para obtener TODAS las órdenes (para admin)
export async function fetchOptimizedOrdersAdmin(
  supabase: SupabaseClient,
  useCache: boolean = true
): Promise<OptimizedOrder[]> {
  const cacheKey = 'orders_admin_all'
  
  const queryFn = async () => {
    // Consulta optimizada: una sola query con JOIN para todas las órdenes
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            image,
            price
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching optimized orders (admin):', error)
      return []
    }
    
    return ordersData?.map(order => {
      // Parsear shipping_address una sola vez
      let parsedShippingAddress = null
      let customerInfo = null
      
      if (order.shipping_address) {
        try {
          parsedShippingAddress = typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address
          
          if (parsedShippingAddress?.customer_data) {
            const customerData = parsedShippingAddress.customer_data
            customerInfo = {
              name: customerData.firstName && customerData.lastName
                ? `${customerData.firstName} ${customerData.lastName}`
                : customerData.firstName || customerData.name || 'Cliente anónimo',
              email: customerData.email || 'No especificado',
              phone: customerData.phone || 'No especificado'
            }
          }
        } catch (e) {
          console.warn('Error parsing shipping_address:', e)
        }
      }
      
      return {
        ...order,
        items: order.order_items || [],
        total_items: order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        customer_name: customerInfo?.name || 'Cliente anónimo',
        customer_email: customerInfo?.email || 'No especificado',
        customer_phone: customerInfo?.phone || 'No especificado',
        source_table: 'orders',
        shipping_address: parsedShippingAddress || {}
      }
    }) || []
  }
  
  return useCache ? getCachedQuery(cacheKey, queryFn) : queryFn()
}

// Función para invalidar cache de órdenes admin
export function invalidateOrdersCache() {
  clearQueryCache('orders_admin_all')
  clearQueryCache('orders_')
}

// Función para invalidar cache de suscripciones
export function invalidateSubscriptionsCache() {
  clearQueryCache('subscriptions_')
}

// Función para invalidar cache cuando hay cambios
export function invalidateUserCache(userId: string) {
  clearQueryCache(userId)
}