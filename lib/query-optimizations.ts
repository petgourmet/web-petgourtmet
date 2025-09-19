// Optimizaciones de consultas para evitar duplicación y mejorar rendimiento
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

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
  last_billing_date?: string
  billing_info?: {
    payment_id?: string
    payment_method?: string
    status?: string
    amount?: number
  }
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
    console.log('🔍 Fetching optimized orders for user:', userId)
    
    // Consulta optimizada: una sola query con JOIN incluyendo más datos del producto
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price,
          size,
          product_name,
          products (
            id,
            name,
            image,
            price,
            description,
            category_id
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching optimized orders:', error)
      return []
    }
    
    console.log('✅ Orders fetched successfully:', ordersData?.length || 0, 'orders')
    
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
          console.warn('⚠️ Error parsing shipping_address:', e)
        }
      }
      
      // Procesar items con mejor manejo de productos
      const processedItems = (order.order_items || []).map((item: any) => {
        const product = item.products || {}
        return {
          ...item,
          // Usar el nombre del producto de la relación o el guardado en el item
          product_name: product.name || item.product_name || 'Producto sin nombre',
          // Asegurar que tenemos la imagen del producto
          product_image: product.image || null,
          // Descripción del producto
          product_description: product.description || null,
          // Categoría del producto
          product_category: product.category_id || null,
          // Precio unitario (usar el del item que es el precio al momento de la compra)
          unit_price: item.price || product.price || 0,
          // Total del item
          total_price: (item.price || product.price || 0) * (item.quantity || 1)
        }
      })
      
      console.log('📦 Processing order:', order.id, 'with', processedItems.length, 'items')
      
      return {
        ...order,
        items: processedItems,
        total_items: processedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
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
    // Consulta optimizada usando tabla unificada 'unified_subscriptions'
    const [subscriptionsResult, billingHistoryResult] = await Promise.all([
      // Todas las suscripciones de la tabla unificada
      userId ? 
        supabase
          .from('unified_subscriptions')
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
          .order('created_at', { ascending: false })
        :
        supabase
          .from('unified_subscriptions')
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
          .order('created_at', { ascending: false }),
      
      // Historial de facturación para validar pagos de webhooks
      userId ?
        supabase
          .from('subscription_billing_history')
          .select(`
            *,
            unified_subscriptions!inner (
              id,
              user_id,
              product_id,
              status,
              frequency,
              mercadopago_subscription_id,
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
            )
          `)
          .eq('unified_subscriptions.user_id', userId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
        :
        supabase
          .from('subscription_billing_history')
          .select(`
            *,
            unified_subscriptions!inner (
              id,
              user_id,
              product_id,
              status,
              frequency,
              mercadopago_subscription_id,
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
            )
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
    ])
    
    const subscriptions = subscriptionsResult.data || []
    const billingHistory = billingHistoryResult.data || []
    
    // Procesar todas las suscripciones de la tabla unificada
    const processedSubscriptions = subscriptions.map(sub => {
      const product = sub.products
      const frequency = sub.frequency || 'monthly'
      let expectedDiscount = 0
      
      if (product && frequency) {
        switch (frequency) {
          case 'weekly':
            expectedDiscount = product.weekly_discount || 0
            break
          case 'monthly':
            expectedDiscount = product.monthly_discount || 0
            break
          case 'quarterly':
            expectedDiscount = product.quarterly_discount || 0
            break
          case 'annual':
            expectedDiscount = product.annual_discount || 0
            break
          case 'biweekly':
            expectedDiscount = product.biweekly_discount || 0
            break
        }
      }
      
      // Descuento aplicado (si existe en el registro de suscripción), de lo contrario usar esperado
      const appliedDiscount = (typeof sub.discount_percentage === 'number' && !Number.isNaN(sub.discount_percentage))
        ? sub.discount_percentage
        : expectedDiscount
      
      const basePrice = (product?.price ?? sub.price ?? 0) as number
      const discountedPrice = Number((basePrice * (1 - (appliedDiscount || 0) / 100)).toFixed(2))
      
      // Estandarizar estado - priorizar el status de la base de datos
      let standardizedStatus = sub.status || 'inactive'
      
      // Solo marcar como cancelada si el status es explícitamente 'cancelled'
      // No usar cancelled_at como único criterio ya que puede haber intentos de cancelación fallidos
      if (sub.status === 'cancelled') {
        standardizedStatus = 'cancelled'
      } else if (sub.status === 'active') {
        standardizedStatus = 'active'
      }
      
      return {
        ...sub,
        status: standardizedStatus,
        frequency,
        discount_amount: appliedDiscount,
        discount_percentage: appliedDiscount,
        base_price: basePrice,
        discounted_price: discountedPrice,
        expected_discount_percentage: expectedDiscount,
        applied_discount_percentage: appliedDiscount,
        discount_valid: appliedDiscount === expectedDiscount,
        source: 'subscriptions'
      }
    })
    
    // Procesar suscripciones del historial de facturación (pagos validados por webhooks)
    const processedBillingSubscriptions = billingHistory
      .filter(billing => {
        // Solo incluir si no existe ya en subscriptions
        const existsInActive = subscriptions.some(sub => 
          sub.id === billing.subscriptions?.id ||
          sub.mercadopago_subscription_id === billing.subscriptions?.mercadopago_subscription_id
        )
        return !existsInActive && billing.subscriptions
      })
      .map(billing => {
        const subscription = billing.subscriptions
        const product = subscription.products
        const frequency = subscription.frequency || 'monthly'
        let expectedDiscount = 0
        
        if (product && frequency) {
          switch (frequency) {
            case 'weekly':
              expectedDiscount = product.weekly_discount || 0
              break
            case 'monthly':
              expectedDiscount = product.monthly_discount || 0
              break
            case 'quarterly':
              expectedDiscount = product.quarterly_discount || 0
              break
            case 'annual':
              expectedDiscount = product.annual_discount || 0
              break
            case 'biweekly':
              expectedDiscount = product.biweekly_discount || 0
              break
          }
        }
        
        // Descuento aplicado (si existe en el registro de suscripción), de lo contrario usar esperado
        const appliedDiscount = (typeof subscription.discount_percentage === 'number' && !Number.isNaN(subscription.discount_percentage))
          ? subscription.discount_percentage
          : expectedDiscount
        
        const basePrice = (product?.price ?? billing.amount ?? 0) as number
        const discountedPrice = Number((basePrice * (1 - (appliedDiscount || 0) / 100)).toFixed(2))
        
        return {
          id: `billing_${subscription.id}`,
          user_id: subscription.user_id,
          product_id: subscription.product_id,
          status: 'active', // Si tiene pagos aprobados, considerarla activa
          frequency,
          price: billing.amount,
          discount_amount: appliedDiscount,
          discount_percentage: appliedDiscount,
          base_price: basePrice,
          discounted_price: discountedPrice,
          expected_discount_percentage: expectedDiscount,
          applied_discount_percentage: appliedDiscount,
          discount_valid: appliedDiscount === expectedDiscount,
          next_billing_date: null, // Se puede calcular basado en la frecuencia
          created_at: billing.transaction_date,
          last_billing_date: billing.transaction_date,
          source: 'billing_history',
          products: product,
          billing_info: {
            payment_id: billing.mercadopago_payment_id,
            payment_method: billing.payment_method,
            status: billing.status,
            amount: billing.amount
          }
        }
      })
    
    // Combinar y deduplicar
    const allSubscriptions = [
      ...processedSubscriptions,
      ...processedBillingSubscriptions
    ]
    
    const uniqueSubscriptions = allSubscriptions.filter((sub, index, self) =>
      index === self.findIndex(s => s.id === sub.id)
    )
    
    // Obtener perfiles de usuario
    const userIds = [...new Set(uniqueSubscriptions.map(sub => sub.user_id))].filter(Boolean)
    const userProfiles = await fetchOptimizedUserProfiles(userIds, supabase, useCache)
    
    // Agregar información del perfil a cada suscripción
    const subscriptionsWithProfiles = uniqueSubscriptions.map(sub => ({
      ...sub,
      user_profile: userProfiles.find(profile => profile.id === sub.user_id)
    }))
    
    return subscriptionsWithProfiles
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
      .select('id, full_name, email, phone')
      .in('id', userIds)
    
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

/**
 * Versión para administradores que bypasea RLS
 * Obtiene todas las suscripciones del sistema sin filtros de usuario
 */
export async function fetchOptimizedSubscriptionsAdmin(
  _supabase?: SupabaseClient, // Parámetro opcional para compatibilidad
  includeInactive: boolean = false
): Promise<OptimizedSubscription[]> {
  try {
    // Usar cliente de servicio que bypassa RLS completamente
    const serviceClient = createServiceClient()
    
    let query = serviceClient
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        created_at,
        updated_at,
        stripe_subscription_id,
        stripe_customer_id,
        cancel_at_period_end,
        canceled_at,
        trial_end,
        profiles!inner (
          id,
          email,
          full_name,
          phone
        ),
        subscription_plans!inner (
          id,
          name,
          price,
          interval,
          features
        )
      `)
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.in('status', ['active', 'trialing', 'past_due'])
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching admin subscriptions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchOptimizedSubscriptionsAdmin:', error)
    throw error
  }
}

// Función optimizada para obtener TODAS las suscripciones (para admin) - Legacy
export async function fetchOptimizedSubscriptionsAdminLegacy(
  supabase: SupabaseClient,
  useCache: boolean = true
): Promise<OptimizedSubscription[]> {
  const cacheKey = 'subscriptions_admin_all'
  
  const queryFn = async () => {
    console.log('🔍 Fetching ALL subscriptions for admin (bypassing RLS)...')
    
    // Consulta optimizada para TODAS las suscripciones usando tabla unificada
    const [subscriptionsResult, billingHistoryResult] = await Promise.all([
      // Todas las suscripciones de la tabla unificada - SIN FILTRO DE USUARIO
      supabase
        .from('subscriptions')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            monthly_discount,
            quarterly_discount,
            annual_discount,
            biweekly_discount
          )
        `)
        .order('created_at', { ascending: false }),
      
      // Historial de facturación - SIN FILTRO DE USUARIO
      supabase
        .from('billing_history')
        .select(`
          *,
          products (
            id,
            name,
            image,
            price,
            monthly_discount,
            quarterly_discount,
            annual_discount,
            biweekly_discount
          )
        `)
        .eq('status', 'approved')
        .order('transaction_date', { ascending: false })
    ])
    
    if (subscriptionsResult.error) {
      console.error('Error fetching subscriptions (admin):', subscriptionsResult.error)
    }
    if (billingHistoryResult.error) {
      console.error('Error fetching billing history (admin):', billingHistoryResult.error)
    }
    
    const subscriptions = subscriptionsResult.data || []
    const billingHistory = billingHistoryResult.data || []
    
    console.log(`📊 Admin data loaded: ${subscriptions.length} subscriptions, ${billingHistory.length} billing records`)
    
    // Procesar todas las suscripciones de la tabla unificada
    const processedSubscriptions = subscriptions.map(subscription => {
      const product = subscription.products
      const frequency = getFrequencyFromType(subscription.subscription_type || subscription.frequency)
      
      let discountAmount = 0
      if (product) {
        switch (frequency) {
          case 'weekly':
            discountAmount = product.weekly_discount || 0
            break
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
        ...subscription,
        frequency,
        discount_amount: discountAmount,
        source: 'subscriptions',
        products: product
      }
    })
    
    // Procesar historial de facturación
    const processedBillingSubscriptions = billingHistory
      .filter(billing => {
        // Solo incluir si no existe ya en subscriptions
        const existsInActive = subscriptions.some(sub => 
          sub.user_id === billing.user_id && sub.product_id === billing.product_id
        )
        return !existsInActive
      })
      .map(billing => {
        const product = billing.products
        const frequency = getFrequencyFromType(billing.subscription_type)
        
        let discountAmount = 0
        if (product) {
          switch (frequency) {
            case 'weekly':
              discountAmount = product.weekly_discount || 0
              break
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
          id: `billing_${billing.id}`,
          user_id: billing.user_id,
          product_id: billing.product_id,
          status: 'active',
          frequency,
          price: billing.amount,
          discount_amount: discountAmount,
          next_billing_date: null,
          created_at: billing.transaction_date,
          last_billing_date: billing.transaction_date,
          source: 'billing_history',
          products: product,
          billing_info: {
            payment_id: billing.mercadopago_payment_id,
            payment_method: billing.payment_method,
            status: billing.status,
            amount: billing.amount
          }
        }
      })
    
    // Combinar y deduplicar
    const allSubscriptions = [
      ...processedSubscriptions,
      ...processedBillingSubscriptions
    ]
    
    const uniqueSubscriptions = allSubscriptions.filter((sub, index, self) =>
      index === self.findIndex(s => s.id === sub.id)
    )
    
    // Obtener perfiles de usuario para TODAS las suscripciones
    const userIds = [...new Set(uniqueSubscriptions.map(sub => sub.user_id))].filter(Boolean)
    const userProfiles = await fetchOptimizedUserProfiles(userIds, supabase, useCache)
    
    // Agregar información del perfil a cada suscripción
    const subscriptionsWithProfiles = uniqueSubscriptions.map(sub => ({
      ...sub,
      user_profile: userProfiles.find(profile => profile.id === sub.user_id)
    }))
    
    console.log(`✅ Admin subscriptions processed: ${subscriptionsWithProfiles.length} total subscriptions`)
    
    return subscriptionsWithProfiles
  }
  
  return useCache ? getCachedQuery(cacheKey, queryFn) : queryFn()
}

// Función para invalidar cache de suscripciones
export function invalidateSubscriptionsCache() {
  clearQueryCache('subscriptions_')
  clearQueryCache('subscriptions_admin_all')
}

// Función para invalidar cache cuando hay cambios
export function invalidateUserCache(userId: string) {
  clearQueryCache(userId)
}