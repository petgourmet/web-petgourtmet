import { supabase } from '@/lib/supabase/client'

// 🔧 INTERFACES Y TIPOS
interface Product {
  id: string
  name: string
  price: number
  active: boolean
  created_at: string
  product_images?: any[]
  product_categories?: any[]
}

interface Subscription {
  id: string
  user_id: string
  status: string
  amount: number
  created_at: string
  profiles?: {
    email: string
    full_name: string
  }
  products?: {
    id: string
    name: string
    price: number
  }
  user_payment_methods?: any
}

interface CacheEntry {
  data: any
  expiresAt: number
  lastAccessed: number
  createdAt: number
}

interface AdminStats {
  totalSubscriptions: number
  activeSubscriptions: number
  totalUsers: number
  monthlyRevenue: number
  lastUpdated: string
}

interface CacheStats {
  totalEntries: number
  expiredEntries: number
  activeEntries: number
  maxSize: number
  utilizationPercent: number
}

// ✅ SISTEMA DE CACHE PARA OPTIMIZACIÓN - FASE 2
export class CacheService {
  private cache: Map<string, CacheEntry> = new Map()
  private supabase
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos
  private readonly MAX_CACHE_SIZE = 1000
  
  constructor() {
    this.supabase = supabase
    
    // Limpiar cache expirado cada 10 minutos
    setInterval(() => this.cleanExpiredEntries(), 10 * 60 * 1000)
  }
  
  // 🚀 CACHE PARA PRODUCTOS
  async getProducts(useCache: boolean = true): Promise<Product[]> {
    const cacheKey = 'products:all'
    
    if (useCache) {
      const cached = this.get(cacheKey)
      if (cached) {
        console.log(`📦 Cache hit para productos`)
        return cached
      }
    }
    
    console.log(`🔍 Consultando productos desde base de datos`)
    const { data: products, error } = await this.supabase
      .from('products')
      .select(`
        *,
        product_images(*),
        product_categories(*)
      `)
      .eq('active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error(`❌ Error al obtener productos:`, error.message)
      throw error
    }
    
    // Cache por 10 minutos
    this.set(cacheKey, products || [], 10 * 60 * 1000)
    return products || []
  }
  
  // 🚀 CACHE PARA SUSCRIPCIONES ACTIVAS
  async getActiveSubscriptions(userId?: string, useCache: boolean = true): Promise<Subscription[]> {
    const cacheKey = userId ? `subscriptions:user:${userId}` : 'subscriptions:active:all'
    
    if (useCache) {
      const cached = this.get(cacheKey)
      if (cached) {
        console.log(`📦 Cache hit para suscripciones activas`)
        return cached
      }
    }
    
    console.log(`🔍 Consultando suscripciones activas desde base de datos`)
    let query = this.supabase
      .from('unified_subscriptions')
      .select(`
        *,
        profiles!inner(email, full_name),
        products!inner(id, name, price),
        user_payment_methods!inner(*)
      `)
      .eq('status', 'active')
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data: subscriptions, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error(`❌ Error al obtener suscripciones activas:`, error.message)
      throw error
    }
    
    // Cache por 2 minutos (datos más dinámicos)
    this.set(cacheKey, subscriptions || [], 2 * 60 * 1000)
    return subscriptions || []
  }
  
  // 🚀 CACHE PARA DESCUENTOS POR PERÍODO
  async getDiscountForPeriod(productId: string, frequency: string, useCache: boolean = true): Promise<number> {
    const cacheKey = `discount:${productId}:${frequency}`
    
    if (useCache) {
      const cached = this.get(cacheKey)
      if (cached !== null && cached !== undefined) {
        console.log(`📦 Cache hit para descuento: ${productId}-${frequency}`)
        return cached
      }
    }
    
    console.log(`🔍 Consultando descuento desde base de datos: ${productId}-${frequency}`)
    
    // Lógica de descuentos por frecuencia
    const discountMap = {
      monthly: 0,
      quarterly: 10,
      yearly: 20
    }
    
    const discount = discountMap[frequency as keyof typeof discountMap] || 0
    
    // Cache por 30 minutos (datos estáticos)
    this.set(cacheKey, discount, 30 * 60 * 1000)
    return discount
  }
  
  // 🚀 CACHE PARA ESTADÍSTICAS DE ADMINISTRADOR
  async getAdminStats(useCache: boolean = true): Promise<AdminStats> {
    const cacheKey = 'admin:stats'
    
    if (useCache) {
      const cached = this.get(cacheKey)
      if (cached) {
        console.log(`📦 Cache hit para estadísticas de admin`)
        return cached
      }
    }
    
    console.log(`🔍 Calculando estadísticas de admin desde base de datos`)
    
    const [subscriptionsResult, usersResult, revenueResult] = await Promise.allSettled([
      this.supabase.from('unified_subscriptions').select('status', { count: 'exact' }),
      this.supabase.from('profiles').select('id', { count: 'exact' }),
      this.supabase.from('unified_subscriptions')
        .select('amount')
        .eq('status', 'active')
    ])
    
    const stats: AdminStats = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalUsers: 0,
      monthlyRevenue: 0,
      lastUpdated: new Date().toISOString()
    }
    
    // Procesar resultados
    if (subscriptionsResult.status === 'fulfilled' && subscriptionsResult.value.data) {
      stats.totalSubscriptions = subscriptionsResult.value.count || 0
      stats.activeSubscriptions = subscriptionsResult.value.data.filter(s => s.status === 'active').length
    }
    
    if (usersResult.status === 'fulfilled') {
      stats.totalUsers = usersResult.value.count || 0
    }
    
    if (revenueResult.status === 'fulfilled' && revenueResult.value.data) {
      stats.monthlyRevenue = revenueResult.value.data.reduce((sum, sub) => sum + (sub.amount || 0), 0)
    }
    
    // Cache por 5 minutos
    this.set(cacheKey, stats, 5 * 60 * 1000)
    return stats
  }
  
  // 🚀 CACHE PARA CONSULTAS PERSONALIZADAS
  async getCachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
    useCache: boolean = true
  ): Promise<T> {
    if (useCache) {
      const cached = this.get(cacheKey)
      if (cached) {
        console.log(`📦 Cache hit para consulta personalizada: ${cacheKey}`)
        return cached
      }
    }
    
    console.log(`🔍 Ejecutando consulta personalizada: ${cacheKey}`)
    const result = await queryFn()
    this.set(cacheKey, result, ttl)
    return result
  }
  
  // 🗑️ INVALIDACIÓN DE CACHE
  invalidatePattern(pattern: string): void {
    console.log(`🗑️ Invalidando cache con patrón: ${pattern}`)
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    console.log(`🗑️ Eliminadas ${keysToDelete.length} entradas de cache`)
  }
  
  invalidateUser(userId: string): void {
    this.invalidatePattern(`user:${userId}`)
  }
  
  invalidateSubscriptions(): void {
    this.invalidatePattern('subscriptions:')
    this.invalidatePattern('admin:stats')
  }
  
  invalidateProducts(): void {
    this.invalidatePattern('products:')
  }
  
  // 📊 MÉTODOS BÁSICOS DE CACHE
  private get(key: string): any {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    // Actualizar último acceso
    entry.lastAccessed = Date.now()
    return entry.data
  }
  
  private set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    // Limpiar cache si está lleno
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed()
    }
    
    const entry: CacheEntry = {
      data,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
      createdAt: Date.now()
    }
    
    this.cache.set(key, entry)
    console.log(`💾 Cache actualizado: ${key} (TTL: ${ttl}ms)`)
  }
  
  // 🧹 LIMPIEZA DE CACHE
  private cleanExpiredEntries(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Limpieza automática de cache: ${cleanedCount} entradas eliminadas`)
    }
  }
  
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      console.log(`🗑️ Entrada LRU eliminada: ${oldestKey}`)
    }
  }
  
  // 📊 ESTADÍSTICAS DE CACHE
  getStats(): CacheStats {
    const now = Date.now()
    let expiredCount = 0
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++
      }
    }
    
    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      activeEntries: this.cache.size - expiredCount,
      maxSize: this.MAX_CACHE_SIZE,
      utilizationPercent: Math.round((this.cache.size / this.MAX_CACHE_SIZE) * 100)
    }
  }
  
  // 🗑️ LIMPIAR TODO EL CACHE
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`🗑️ Cache completamente limpiado: ${size} entradas eliminadas`)
  }
}

// 🚀 INSTANCIA SINGLETON
export const cacheService = new CacheService()