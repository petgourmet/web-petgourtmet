/**
 * Servicio de cache optimizado para mejorar el rendimiento de la aplicación
 * Maneja cache en memoria y localStorage con TTL configurable
 */

interface CacheItem {
  data: any
  timestamp: number
  ttl: number
}

class CacheService {
  private memoryCache = new Map<string, CacheItem>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos
  private readonly MAX_MEMORY_ITEMS = 100

  /**
   * Obtiene un item del cache (memoria primero, luego localStorage)
   */
  get(key: string): any | null {
    // Intentar memoria primero (más rápido)
    const memoryItem = this.memoryCache.get(key)
    if (memoryItem && this.isValid(memoryItem)) {
      console.log(`📦 [Cache] Hit en memoria: ${key}`)
      return memoryItem.data
    }

    // Intentar localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`)
      if (stored) {
        const item: CacheItem = JSON.parse(stored)
        if (this.isValid(item)) {
          console.log(`📦 [Cache] Hit en localStorage: ${key}`)
          // Promover a memoria para acceso más rápido
          this.setMemoryCache(key, item)
          return item.data
        } else {
          // Limpiar item expirado
          localStorage.removeItem(`cache_${key}`)
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error leyendo localStorage para ${key}:`, error)
    }

    console.log(`❌ [Cache] Miss: ${key}`)
    return null
  }

  /**
   * Guarda un item en el cache
   */
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl
    }

    // Guardar en memoria
    this.setMemoryCache(key, item)

    // Guardar en localStorage para persistencia
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item))
      console.log(`💾 [Cache] Guardado: ${key} (TTL: ${ttl}ms)`)
    } catch (error) {
      console.warn(`⚠️ [Cache] Error guardando en localStorage ${key}:`, error)
    }
  }

  /**
   * Elimina un item del cache
   */
  delete(key: string): void {
    this.memoryCache.delete(key)
    try {
      localStorage.removeItem(`cache_${key}`)
      console.log(`🗑️ [Cache] Eliminado: ${key}`)
    } catch (error) {
      console.warn(`⚠️ [Cache] Error eliminando ${key}:`, error)
    }
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.memoryCache.clear()
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key)
        }
      })
      console.log('🧹 [Cache] Cache limpiado completamente')
    } catch (error) {
      console.warn('⚠️ [Cache] Error limpiando localStorage:', error)
    }
  }

  /**
   * Limpia items expirados
   */
  cleanup(): void {
    let cleaned = 0

    // Limpiar memoria
    for (const [key, item] of this.memoryCache.entries()) {
      if (!this.isValid(item)) {
        this.memoryCache.delete(key)
        cleaned++
      }
    }

    // Limpiar localStorage
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const item: CacheItem = JSON.parse(stored)
              if (!this.isValid(item)) {
                localStorage.removeItem(key)
                cleaned++
              }
            }
          } catch (error) {
            // Eliminar items corruptos
            localStorage.removeItem(key)
            cleaned++
          }
        }
      })
    } catch (error) {
      console.warn('⚠️ [Cache] Error durante cleanup:', error)
    }

    if (cleaned > 0) {
      console.log(`🧹 [Cache] Limpiados ${cleaned} items expirados`)
    }
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): { memoryItems: number; localStorageItems: number } {
    let localStorageItems = 0
    try {
      const keys = Object.keys(localStorage)
      localStorageItems = keys.filter(key => key.startsWith('cache_')).length
    } catch (error) {
      console.warn('⚠️ [Cache] Error obteniendo stats:', error)
    }

    return {
      memoryItems: this.memoryCache.size,
      localStorageItems
    }
  }

  // Métodos específicos para diferentes tipos de datos

  /**
   * Cache específico para productos
   */
  getProducts(categoryId?: string): any[] | null {
    const key = categoryId ? `products_category_${categoryId}` : 'products_all'
    return this.get(key)
  }

  setProducts(products: any[], categoryId?: string, ttl: number = 5 * 60 * 1000): void {
    const key = categoryId ? `products_category_${categoryId}` : 'products_all'
    this.set(key, products, ttl)
  }

  /**
   * Cache específico para categorías
   */
  getCategories(): any[] | null {
    return this.get('categories')
  }

  setCategories(categories: any[], ttl: number = 10 * 60 * 1000): void {
    this.set('categories', categories, ttl)
  }

  /**
   * Cache específico para sesiones de usuario
   */
  getUserSession(userId: string): any | null {
    return this.get(`user_session_${userId}`)
  }

  setUserSession(userId: string, session: any, ttl: number = 10 * 60 * 1000): void {
    this.set(`user_session_${userId}`, session, ttl)
  }

  /**
   * Cache específico para roles de usuario
   */
  getUserRole(userId: string): string | null {
    return this.get(`user_role_${userId}`)
  }

  setUserRole(userId: string, role: string, ttl: number = 10 * 60 * 1000): void {
    this.set(`user_role_${userId}`, role, ttl)
  }

  // Métodos privados

  private isValid(item: CacheItem): boolean {
    return Date.now() - item.timestamp < item.ttl
  }

  private setMemoryCache(key: string, item: CacheItem): void {
    // Limpiar cache si está lleno
    if (this.memoryCache.size >= this.MAX_MEMORY_ITEMS) {
      const oldestKey = this.memoryCache.keys().next().value
      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
      }
    }
    this.memoryCache.set(key, item)
  }
}

// Instancia singleton
export const cacheService = new CacheService()

// Limpiar cache expirado cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheService.cleanup()
  }, 5 * 60 * 1000)
}

export default cacheService