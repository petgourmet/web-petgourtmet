"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
// ✅ SISTEMA DE CACHE PARA OPTIMIZACIÓN - FASE 2
class CacheService {
    constructor() {
        this.cache = new Map();
        this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
        this.MAX_CACHE_SIZE = 1000;
        // Importar el cliente configurado correctamente
        const { supabase } = require('./supabase/client');
        this.supabase = supabase;
        // Limpiar cache expirado cada 10 minutos
        setInterval(() => this.cleanExpiredEntries(), 10 * 60 * 1000);
    }
    // 🚀 CACHE PARA PRODUCTOS
    async getProducts(useCache = true) {
        const cacheKey = 'products:all';
        if (useCache) {
            const cached = this.get(cacheKey);
            if (cached) {
                console.log(`📦 Cache hit para productos`);
                return cached;
            }
        }
        console.log(`🔍 Consultando productos desde base de datos`);
        const { data: products, error } = await this.supabase
            .from('products')
            .select(`
        *,
        product_images(*),
        product_categories(*)
      `)
            .eq('active', true)
            .order('created_at', { ascending: false });
        if (error) {
            console.error(`❌ Error al obtener productos:`, error.message);
            throw error;
        }
        // Cache por 10 minutos
        this.set(cacheKey, products || [], 10 * 60 * 1000);
        return products || [];
    }
    // 🚀 CACHE PARA SUSCRIPCIONES ACTIVAS
    async getActiveSubscriptions(userId, useCache = true) {
        const cacheKey = userId ? `subscriptions:user:${userId}` : 'subscriptions:active:all';
        if (useCache) {
            const cached = this.get(cacheKey);
            if (cached) {
                console.log(`📦 Cache hit para suscripciones activas`);
                return cached;
            }
        }
        console.log(`🔍 Consultando suscripciones activas desde base de datos`);
        let query = this.supabase
            .from('unified_subscriptions')
            .select(`
        *,
        profiles!inner(email, full_name),
        products!inner(id, name, price),
        user_payment_methods!inner(*)
      `)
            .eq('status', 'active');
        if (userId) {
            query = query.eq('user_id', userId);
        }
        const { data: subscriptions, error } = await query.order('created_at', { ascending: false });
        if (error) {
            console.error(`❌ Error al obtener suscripciones activas:`, error.message);
            throw error;
        }
        // Cache por 2 minutos (datos más dinámicos)
        this.set(cacheKey, subscriptions || [], 2 * 60 * 1000);
        return subscriptions || [];
    }
    // 🚀 CACHE PARA DESCUENTOS POR PERÍODO
    async getDiscountForPeriod(productId, frequency, useCache = true) {
        const cacheKey = `discount:${productId}:${frequency}`;
        if (useCache) {
            const cached = this.get(cacheKey);
            if (cached !== null && cached !== undefined) {
                console.log(`📦 Cache hit para descuento: ${productId}-${frequency}`);
                return cached;
            }
        }
        console.log(`🔍 Consultando descuento desde base de datos: ${productId}-${frequency}`);
        // Lógica de descuentos por frecuencia
        const discountMap = {
            monthly: 0,
            quarterly: 10,
            yearly: 20
        };
        const discount = discountMap[frequency] || 0;
        // Cache por 30 minutos (datos estáticos)
        this.set(cacheKey, discount, 30 * 60 * 1000);
        return discount;
    }
    // 🚀 CACHE PARA ESTADÍSTICAS DE ADMINISTRADOR
    async getAdminStats(useCache = true) {
        const cacheKey = 'admin:stats';
        if (useCache) {
            const cached = this.get(cacheKey);
            if (cached) {
                console.log(`📦 Cache hit para estadísticas de admin`);
                return cached;
            }
        }
        console.log(`🔍 Calculando estadísticas de admin desde base de datos`);
        const [subscriptionsResult, usersResult, revenueResult] = await Promise.allSettled([
            this.supabase.from('unified_subscriptions').select('status', { count: 'exact' }),
            this.supabase.from('profiles').select('id', { count: 'exact' }),
            this.supabase.from('unified_subscriptions')
                .select('amount')
                .eq('status', 'active')
        ]);
        const stats = {
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            totalUsers: 0,
            monthlyRevenue: 0,
            lastUpdated: new Date().toISOString()
        };
        // Procesar resultados
        if (subscriptionsResult.status === 'fulfilled' && subscriptionsResult.value.data) {
            stats.totalSubscriptions = subscriptionsResult.value.count || 0;
            stats.activeSubscriptions = subscriptionsResult.value.data.filter(s => s.status === 'active').length;
        }
        if (usersResult.status === 'fulfilled') {
            stats.totalUsers = usersResult.value.count || 0;
        }
        if (revenueResult.status === 'fulfilled' && revenueResult.value.data) {
            stats.monthlyRevenue = revenueResult.value.data.reduce((sum, sub) => sum + (sub.amount || 0), 0);
        }
        // Cache por 5 minutos
        this.set(cacheKey, stats, 5 * 60 * 1000);
        return stats;
    }
    // 🚀 CACHE PARA CONSULTAS PERSONALIZADAS
    async getCachedQuery(cacheKey, queryFn, ttl = this.DEFAULT_TTL, useCache = true) {
        if (useCache) {
            const cached = this.get(cacheKey);
            if (cached) {
                console.log(`📦 Cache hit para consulta personalizada: ${cacheKey}`);
                return cached;
            }
        }
        console.log(`🔍 Ejecutando consulta personalizada: ${cacheKey}`);
        const result = await queryFn();
        this.set(cacheKey, result, ttl);
        return result;
    }
    // 🗑️ INVALIDACIÓN DE CACHE
    invalidatePattern(pattern) {
        console.log(`🗑️ Invalidando cache con patrón: ${pattern}`);
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Eliminadas ${keysToDelete.length} entradas de cache`);
    }
    invalidateUser(userId) {
        this.invalidatePattern(`user:${userId}`);
    }
    invalidateSubscriptions() {
        this.invalidatePattern('subscriptions:');
        this.invalidatePattern('admin:stats');
    }
    invalidateProducts() {
        this.invalidatePattern('products:');
    }
    // 📊 MÉTODOS BÁSICOS DE CACHE
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        // Actualizar último acceso
        entry.lastAccessed = Date.now();
        return entry.data;
    }
    set(key, data, ttl = this.DEFAULT_TTL) {
        // Limpiar cache si está lleno
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictLeastRecentlyUsed();
        }
        const entry = {
            data,
            expiresAt: Date.now() + ttl,
            lastAccessed: Date.now(),
            createdAt: Date.now()
        };
        this.cache.set(key, entry);
        console.log(`💾 Cache actualizado: ${key} (TTL: ${ttl}ms)`);
    }
    // 🧹 LIMPIEZA DE CACHE
    cleanExpiredEntries() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 Limpieza automática de cache: ${cleanedCount} entradas eliminadas`);
        }
    }
    evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
            console.log(`🗑️ Entrada LRU eliminada: ${oldestKey}`);
        }
    }
    // 📊 ESTADÍSTICAS DE CACHE
    getStats() {
        const now = Date.now();
        let expiredCount = 0;
        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) {
                expiredCount++;
            }
        }
        return {
            totalEntries: this.cache.size,
            expiredEntries: expiredCount,
            activeEntries: this.cache.size - expiredCount,
            maxSize: this.MAX_CACHE_SIZE,
            utilizationPercent: Math.round((this.cache.size / this.MAX_CACHE_SIZE) * 100)
        };
    }
    // 🗑️ LIMPIAR TODO EL CACHE
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🗑️ Cache completamente limpiado: ${size} entradas eliminadas`);
    }
}
exports.CacheService = CacheService;
// 🚀 INSTANCIA SINGLETON
exports.cacheService = new CacheService();
