/**
 * ✅ OPTIMIZACIÓN: Sistema de cache mejorado para productos
 * Implementa estrategias de cache más robustas con TTL, invalidación inteligente y persistencia
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live en milisegundos
  version: string
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  lastCleanup: number
}

class EnhancedCacheService {
  private cache = new Map<string, CacheItem<any>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    lastCleanup: Date.now()
  }
  
  // TTL por defecto: 5 minutos para productos, 10 minutos para categorías
  private readonly DEFAULT_TTL = {
    products: 5 * 60 * 1000, // 5 minutos
    categories: 10 * 60 * 1000, // 10 minutos
    user_session: 30 * 60 * 1000, // 30 minutos
    default: 5 * 60 * 1000 // 5 minutos
  }

  private readonly MAX_CACHE_SIZE = 100 // Máximo 100 entradas
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000 // Limpiar cada 2 minutos
  private readonly CACHE_VERSION = '1.0.0'

  constructor() {
    // Configurar limpieza automática
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
      
      // Cargar cache desde localStorage al inicializar
      this.loadFromStorage()
      
      // Guardar cache antes de cerrar la página
      window.addEventListener('beforeunload', () => this.saveToStorage())
    }
  }

  /**
   * Obtener un elemento del cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      console.log(`🔍 [Cache] MISS: ${key}`)
      return null
    }

    // Verificar si el elemento ha expirado
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      console.log(`⏰ [Cache] EXPIRED: ${key}`)
      return null
    }

    // Verificar versión del cache
    if (item.version !== this.CACHE_VERSION) {
      this.cache.delete(key)
      this.stats.misses++
      console.log(`🔄 [Cache] VERSION_MISMATCH: ${key}`)
      return null
    }

    this.stats.hits++
    console.log(`✅ [Cache] HIT: ${key}`)
    return item.data
  }

  /**
   * Guardar un elemento en el cache
   */
  set<T>(key: string, data: T, customTtl?: number): void {
    // Determinar TTL basado en el tipo de clave
    let ttl = customTtl || this.DEFAULT_TTL.default
    
    if (key.includes('products')) {
      ttl = this.DEFAULT_TTL.products
    } else if (key.includes('categories')) {
      ttl = this.DEFAULT_TTL.categories
    } else if (key.includes('user_session')) {
      ttl = this.DEFAULT_TTL.user_session
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.CACHE_VERSION
    }

    this.cache.set(key, item)
    this.stats.size = this.cache.size

    console.log(`💾 [Cache] SET: ${key} (TTL: ${ttl}ms)`)

    // Limpiar cache si excede el tamaño máximo
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.evictOldest()
    }
  }

  /**
   * Invalidar elementos del cache por patrón
   */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      console.log(`🗑️ [Cache] INVALIDATED: ${key}`)
    })

    this.stats.size = this.cache.size
  }

  /**
   * Limpiar elementos expirados
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl || item.version !== this.CACHE_VERSION) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      console.log(`🧹 [Cache] CLEANED: ${key}`)
    })

    this.stats.size = this.cache.size
    this.stats.lastCleanup = now

    if (keysToDelete.length > 0) {
      console.log(`🧹 [Cache] Cleanup completed: ${keysToDelete.length} items removed`)
    }
  }

  /**
   * Eliminar el elemento más antiguo (LRU)
   */
  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      console.log(`🚮 [Cache] EVICTED: ${oldestKey}`)
    }
  }

  /**
   * Guardar cache en localStorage
   */
  private saveToStorage(): void {
    try {
      const cacheData = Array.from(this.cache.entries())
      localStorage.setItem('petgourmet_cache', JSON.stringify({
        data: cacheData,
        version: this.CACHE_VERSION,
        timestamp: Date.now()
      }))
      console.log('💾 [Cache] Saved to localStorage')
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to save to localStorage:', error)
    }
  }

  /**
   * Cargar cache desde localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('petgourmet_cache')
      if (!stored) return

      const { data, version, timestamp } = JSON.parse(stored)
      
      // Verificar versión y que no sea muy antiguo (máximo 1 hora)
      if (version !== this.CACHE_VERSION || Date.now() - timestamp > 60 * 60 * 1000) {
        localStorage.removeItem('petgourmet_cache')
        console.log('🔄 [Cache] Cleared outdated localStorage cache')
        return
      }

      // Restaurar cache
      this.cache = new Map(data)
      this.stats.size = this.cache.size
      console.log(`📥 [Cache] Loaded ${this.cache.size} items from localStorage`)
      
      // Limpiar elementos expirados después de cargar
      this.cleanup()
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to load from localStorage:', error)
      localStorage.removeItem('petgourmet_cache')
    }
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      lastCleanup: Date.now()
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('petgourmet_cache')
    }
    
    console.log('🧹 [Cache] Cleared all cache')
  }

  /**
   * Métodos específicos para productos (compatibilidad con cache existente)
   */
  getProducts(categorySlug: string) {
    return this.get(`products_category_${categorySlug}`)
  }

  setProducts(products: any[], categorySlug: string) {
    this.set(`products_category_${categorySlug}`, products)
  }

  getCategories() {
    return this.get('categories')
  }

  setCategories(categories: any[]) {
    this.set('categories', categories)
  }

  getCurrentUserSession() {
    return this.get('user_session_current')
  }

  setCurrentUserSession(session: any) {
    this.set('user_session_current', session)
  }

  /**
   * Cache específico para sesiones de usuario
   */
  getUserSession(userId: string): any | null {
    return this.get(`user_session_${userId}`)
  }

  setUserSession(userId: string, session: any, customTtl?: number): void {
    this.set(`user_session_${userId}`, session, customTtl)
  }

  /**
   * Cache específico para roles de usuario
   */
  getUserRole(userId: string): string | null {
    return this.get(`user_role_${userId}`)
  }

  setUserRole(userId: string, role: string, customTtl?: number): void {
    this.set(`user_role_${userId}`, role, customTtl)
  }

  /**
   * Cache con función de respaldo (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    customTtl?: number
  ): Promise<T> {
    // Intentar obtener del cache primero
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Si no está en cache, ejecutar función y guardar resultado
    try {
      console.log(`🔄 [Cache] Fetching data for: ${key}`)
      const data = await fetchFunction()
      this.set(key, data, customTtl)
      return data
    } catch (error) {
      console.error(`❌ [Cache] Failed to fetch data for: ${key}`, error)
      throw error
    }
  }
}

// Exportar instancia singleton
export const enhancedCacheService = new EnhancedCacheService()

// Exportar para debugging en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).cacheService = enhancedCacheService
}