import { createClient } from '@supabase/supabase-js';
import { 
  SearchCriteria, 
  SubscriptionMatch, 
  SearchStrategy, 
  SmartSubscriptionFinderConfig, 
  SubscriptionData,
  IdempotencyError 
} from './unified-idempotency.types';

/**
 * SmartSubscriptionFinder - Buscador inteligente de suscripciones con múltiples estrategias
 * 
 * Características principales:
 * - Búsqueda multi-criterio con diferentes estrategias
 * - Algoritmos de matching inteligente con scoring
 * - Búsqueda fuzzy para casos edge
 * - Cache de resultados para optimización
 * - Métricas de rendimiento detalladas
 * - Soporte para búsqueda por lotes
 */
export class SmartSubscriptionFinder {
  private supabase: any;
  private config: SmartSubscriptionFinderConfig;
  private searchCache: Map<string, { result: SubscriptionMatch[]; timestamp: number }> = new Map();
  private searchStats: Map<string, { searches: number; hits: number; misses: number; avgTime: number }> = new Map();

  constructor(supabaseClient: any, config: Partial<SmartSubscriptionFinderConfig> = {}) {
    this.supabase = supabaseClient;
    this.config = {
      enabledStrategies: config.enabledStrategies || ['exact', 'fuzzy', 'composite', 'smart'],
      confidenceThreshold: config.confidenceThreshold || 0.8,
      maxSearchTime: config.maxSearchTime || 5000,
      enableFuzzySearch: config.enableFuzzySearch !== false,
      fuzzySearchThreshold: config.fuzzySearchThreshold || 0.7,
      cacheResults: config.cacheResults !== false,
      cacheTimeoutMs: config.cacheTimeoutMs || 300000,
      defaultStrategy: config.defaultStrategy || 'exact',
      fuzzyThreshold: config.fuzzyThreshold || 0.8,
      maxResults: config.maxResults || 50,
      enableCache: config.enableCache !== false,
      cacheExpiryMs: config.cacheExpiryMs || 300000, // 5 minutos
      enableStats: config.enableStats !== false,
      searchTimeoutMs: config.searchTimeoutMs || 10000,
      enableBatchSearch: config.enableBatchSearch !== false,
      batchSize: config.batchSize || 20,
      ...config
    };

    // Limpiar cache periódicamente
    if (this.config.enableCache) {
      this.startCacheCleanup();
    }
  }

  /**
   * Busca suscripciones usando criterios inteligentes
   */
  async findSubscriptions(
    criteria: SearchCriteria,
    strategy?: SearchStrategy
  ): Promise<SubscriptionMatch[]> {
    const startTime = Date.now();
    const searchStrategy = strategy || this.config.defaultStrategy || 'exact';
    const cacheKey = this.generateCacheKey(criteria, searchStrategy);
    
    try {
      // Verificar cache primero
      if (this.config.enableCache) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          this.updateSearchStats(cacheKey, true, Date.now() - startTime);
          return cached;
        }
      }
      
      // Ejecutar búsqueda según la estrategia
      let results: SubscriptionMatch[] = [];
      
      switch (searchStrategy) {
        case 'exact':
          results = await this.exactSearch(criteria);
          break;
          
        case 'fuzzy':
          results = await this.fuzzySearch(criteria);
          break;
          
        case 'composite':
          results = await this.compositeSearch(criteria);
          break;
          
        case 'smart':
          results = await this.smartSearch(criteria);
          break;
          
        default:
          throw new Error(`Unsupported search strategy: ${searchStrategy}`);
      }
      
      // Aplicar scoring y ordenamiento
      results = this.scoreAndSortResults(results, criteria);
      
      // Limitar resultados
      if (results.length > this.config.maxResults) {
        results = results.slice(0, this.config.maxResults);
      }
      
      // Guardar en cache
      if (this.config.enableCache) {
        this.setCachedResult(cacheKey, results);
      }
      
      // Actualizar estadísticas
      this.updateSearchStats(cacheKey, false, Date.now() - startTime);
      
      return results;
      
    } catch (error) {
      this.updateSearchStats(cacheKey, false, Date.now() - startTime, true);
      
      throw new IdempotencyError(
        `Search failed: ${(error as Error).message}`,
        'SEARCH_ERROR',
        undefined,
        { criteria, strategy: searchStrategy, error }
      );
    }
  }

  /**
   * Búsqueda exacta por criterios específicos
   */
  private async exactSearch(criteria: SearchCriteria): Promise<SubscriptionMatch[]> {
    let query = this.supabase
      .from('unified_subscriptions')
      .select('*');
    
    // Aplicar filtros exactos
    if (criteria.email) {
      query = query.eq('email', criteria.email.toLowerCase().trim());
    }
    
    if (criteria.external_reference) {
      query = query.eq('external_reference', criteria.external_reference);
    }
    
    if (criteria.order_id) {
      query = query.eq('order_id', criteria.order_id);
    }
    
    if (criteria.phone) {
      const normalizedPhone = this.normalizePhone(criteria.phone);
      query = query.eq('phone', normalizedPhone);
    }
    
    if (criteria.user_id) {
      query = query.eq('user_id', criteria.user_id);
    }
    
    // Aplicar filtros de tiempo
    if (criteria.dateRange) {
      if (criteria.dateRange.from) {
        query = query.gte('created_at', criteria.dateRange.from.toISOString());
      }
      if (criteria.dateRange.to) {
        query = query.lte('created_at', criteria.dateRange.to.toISOString());
      }
    }
    
    // Aplicar filtros de estado
    if (criteria.status) {
      query = query.in('status', criteria.status);
    }
    
    const { data, error } = await this.executeWithTimeout(query);
    
    if (error) {
      throw new IdempotencyError(
        `Exact search failed: ${error.message}`,
        'EXACT_SEARCH_ERROR',
        undefined,
        { criteria, error }
      );
    }
    
    return this.convertToSubscriptionMatches(data || [], 'exact');
  }

  /**
   * Búsqueda fuzzy para casos donde la búsqueda exacta no encuentra resultados
   */
  private async fuzzySearch(criteria: SearchCriteria): Promise<SubscriptionMatch[]> {
    const results: SubscriptionMatch[] = [];
    
    // Búsqueda fuzzy por email
    if (criteria.email) {
      const emailResults = await this.fuzzyEmailSearch(criteria.email);
      results.push(...emailResults);
    }
    
    // Búsqueda fuzzy por external_reference (variaciones comunes)
    if (criteria.external_reference) {
      const refResults = await this.fuzzyReferenceSearch(criteria.external_reference);
      results.push(...refResults);
    }
    
    // Búsqueda por patrones de teléfono
    if (criteria.phone) {
      const phoneResults = await this.fuzzyPhoneSearch(criteria.phone);
      results.push(...phoneResults);
    }
    
    // Eliminar duplicados y aplicar threshold
    const uniqueResults = this.removeDuplicateMatches(results);
    return uniqueResults.filter(match => match.confidence >= (this.config.fuzzyThreshold || 0.5));
  }

  /**
   * Búsqueda compuesta que combina múltiples criterios
   */
  private async compositeSearch(criteria: SearchCriteria): Promise<SubscriptionMatch[]> {
    const results: SubscriptionMatch[] = [];
    
    // Búsqueda por combinación email + external_reference
    if (criteria.email && criteria.external_reference) {
      const compositeResults = await this.searchByComposite(
        criteria.email, 
        criteria.external_reference
      );
      results.push(...compositeResults);
    }
    
    // Búsqueda por email + order_id
    if (criteria.email && criteria.order_id) {
      const emailOrderResults = await this.searchByEmailAndOrder(
        criteria.email, 
        criteria.order_id
      );
      results.push(...emailOrderResults);
    }
    
    // Búsqueda por external_reference + order_id
    if (criteria.external_reference && criteria.order_id) {
      const refOrderResults = await this.searchByReferenceAndOrder(
        criteria.external_reference, 
        criteria.order_id
      );
      results.push(...refOrderResults);
    }
    
    return this.removeDuplicateMatches(results);
  }

  /**
   * Búsqueda inteligente que adapta la estrategia según los criterios
   */
  private async smartSearch(criteria: SearchCriteria): Promise<SubscriptionMatch[]> {
    // Primero intentar búsqueda exacta
    let results = await this.exactSearch(criteria);
    
    // Si no hay resultados y fuzzy está habilitado, intentar fuzzy
    if (results.length === 0 && this.config.enableFuzzySearch) {
      results = await this.fuzzySearch(criteria);
    }
    
    // Si aún no hay resultados, intentar búsqueda compuesta
    if (results.length === 0) {
      results = await this.compositeSearch(criteria);
    }
    
    // Si hay múltiples criterios, intentar búsquedas parciales
    if (results.length === 0 && this.hasMultipleCriteria(criteria)) {
      results = await this.partialCriteriaSearch(criteria);
    }
    
    return results;
  }

  /**
   * Búsqueda fuzzy por email
   */
  private async fuzzyEmailSearch(email: string): Promise<SubscriptionMatch[]> {
    const variations = this.generateEmailVariations(email);
    const results: SubscriptionMatch[] = [];
    
    for (const variation of variations) {
      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .ilike('email', `%${variation}%`)
        .limit(10);
      
      if (!error && data) {
        const matches = this.convertToSubscriptionMatches(data, 'fuzzy');
        results.push(...matches);
      }
    }
    
    return results;
  }

  /**
   * Búsqueda fuzzy por external_reference
   */
  private async fuzzyReferenceSearch(reference: string): Promise<SubscriptionMatch[]> {
    const patterns = this.generateReferencePatterns(reference);
    const results: SubscriptionMatch[] = [];
    
    for (const pattern of patterns) {
      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .ilike('external_reference', pattern)
        .limit(10);
      
      if (!error && data) {
        const matches = this.convertToSubscriptionMatches(data, 'fuzzy');
        results.push(...matches);
      }
    }
    
    return results;
  }

  /**
   * Búsqueda fuzzy por teléfono
   */
  private async fuzzyPhoneSearch(phone: string): Promise<SubscriptionMatch[]> {
    const normalizedPhone = this.normalizePhone(phone);
    const phoneVariations = this.generatePhoneVariations(normalizedPhone);
    const results: SubscriptionMatch[] = [];
    
    for (const variation of phoneVariations) {
      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .ilike('phone', `%${variation}%`)
        .limit(5);
      
      if (!error && data) {
        const matches = this.convertToSubscriptionMatches(data, 'fuzzy');
        results.push(...matches);
      }
    }
    
    return results;
  }

  /**
   * Búsqueda con criterios parciales
   */
  private async partialCriteriaSearch(criteria: SearchCriteria): Promise<SubscriptionMatch[]> {
    const results: SubscriptionMatch[] = [];
    
    // Buscar solo por email si existe
    if (criteria.email) {
      const emailCriteria: SearchCriteria = {
        strategy: 'exact' as SearchStrategy,
        field: 'email',
        value: criteria.email,
        email: criteria.email
      };
      const emailOnly = await this.exactSearch(emailCriteria);
      results.push(...emailOnly.map(match => ({ ...match, confidence: match.confidence * 0.7 })));
    }
    
    // Buscar solo por external_reference si existe
    if (criteria.external_reference) {
      const refCriteria: SearchCriteria = {
        strategy: 'exact' as SearchStrategy,
        field: 'external_reference',
        value: criteria.external_reference,
        external_reference: criteria.external_reference
      };
      const refOnly = await this.exactSearch(refCriteria);
      results.push(...refOnly.map(match => ({ ...match, confidence: match.confidence * 0.8 })));
    }
    
    // Buscar solo por order_id si existe
    if (criteria.order_id) {
      const orderCriteria: SearchCriteria = {
        strategy: 'exact' as SearchStrategy,
        field: 'order_id',
        value: criteria.order_id,
        order_id: criteria.order_id
      };
      const orderOnly = await this.exactSearch(orderCriteria);
      results.push(...orderOnly.map(match => ({ ...match, confidence: match.confidence * 0.6 })));
    }
    
    return this.removeDuplicateMatches(results);
  }

  /**
   * Convierte datos de base de datos a SubscriptionMatch
   */
  private convertToSubscriptionMatches(
    data: any[], 
    searchType: 'exact' | 'fuzzy' | 'composite'
  ): SubscriptionMatch[] {
    return data.map(subscription => ({
      subscription,
      matchStrategy: searchType as SearchStrategy,
      confidence: this.calculateMatchConfidence(subscription, searchType),
      searchId: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      matchedFields: this.identifyMatchedFields(subscription),
      searchTime: Date.now()
    }));
  }

  /**
   * Calcula la confianza del match
   */
  private calculateMatchConfidence(subscription: any, searchType: string): number {
    let baseConfidence = 0.5;
    
    switch (searchType) {
      case 'exact':
        baseConfidence = 0.95;
        break;
      case 'fuzzy':
        baseConfidence = 0.7;
        break;
      case 'composite':
        baseConfidence = 0.85;
        break;
    }
    
    // Ajustar confianza basada en completitud de datos
    let completenessBonus = 0;
    const fields = ['email', 'external_reference', 'order_id', 'phone'];
    const filledFields = fields.filter(field => subscription[field]);
    completenessBonus = (filledFields.length / fields.length) * 0.1;
    
    return Math.min(1, baseConfidence + completenessBonus);
  }

  /**
   * Identifica los campos que coincidieron
   */
  private identifyMatchedFields(subscription: any): string[] {
    const matchedFields: string[] = [];
    
    if (subscription.email) matchedFields.push('email');
    if (subscription.external_reference) matchedFields.push('external_reference');
    if (subscription.order_id) matchedFields.push('order_id');
    if (subscription.phone) matchedFields.push('phone');
    if (subscription.user_id) matchedFields.push('user_id');
    
    return matchedFields;
  }

  /**
   * Aplica scoring y ordena los resultados
   */
  private scoreAndSortResults(
    results: SubscriptionMatch[], 
    criteria: SearchCriteria
  ): SubscriptionMatch[] {
    return results
      .map(match => ({
        ...match,
        confidence: this.enhanceConfidenceScore(match, criteria)
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Mejora el score de confianza basado en criterios adicionales
   */
  private enhanceConfidenceScore(
    match: SubscriptionMatch, 
    criteria: SearchCriteria
  ): number {
    let enhancedScore = match.confidence;
    
    // Bonus por coincidencia de múltiples campos
    const matchingFields = match.matchedFields?.length || 0;
    if (matchingFields > 1) {
      enhancedScore += (matchingFields - 1) * 0.05;
    }
    
    // Bonus por recencia
    if (match.subscription.created_at) {
      const age = Date.now() - new Date(match.subscription.created_at).getTime();
      const daysSinceCreation = age / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation < 1) {
        enhancedScore += 0.1; // Muy reciente
      } else if (daysSinceCreation < 7) {
        enhancedScore += 0.05; // Reciente
      }
    }
    
    return Math.min(1, enhancedScore);
  }

  /**
   * Genera variaciones de email para búsqueda fuzzy
   */
  private generateEmailVariations(email: string): string[] {
    const [localPart, domain] = email.toLowerCase().split('@');
    const variations = [localPart];
    
    // Variaciones comunes
    if (localPart.includes('.')) {
      variations.push(localPart.replace(/\./g, ''));
    }
    if (localPart.includes('_')) {
      variations.push(localPart.replace(/_/g, '.'));
    }
    
    return variations;
  }

  /**
   * Genera patrones de external_reference
   */
  private generateReferencePatterns(reference: string): string[] {
    return [
      `%${reference}%`,
      `${reference}%`,
      `%${reference}`,
      reference.toUpperCase(),
      reference.toLowerCase()
    ];
  }

  /**
   * Genera variaciones de teléfono
   */
  private generatePhoneVariations(phone: string): string[] {
    const variations = [phone];
    
    if (phone.length >= 10) {
      // Últimos 10 dígitos
      variations.push(phone.slice(-10));
      // Últimos 8 dígitos
      variations.push(phone.slice(-8));
    }
    
    return variations;
  }

  /**
   * Normaliza números de teléfono
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Remueve matches duplicados
   */
  private removeDuplicateMatches(matches: SubscriptionMatch[]): SubscriptionMatch[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      const key = match.subscription.id || `temp_${Math.random()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Verifica si hay múltiples criterios
   */
  private hasMultipleCriteria(criteria: SearchCriteria): boolean {
    const criteriaCount = Object.values(criteria).filter(value => 
      value !== undefined && value !== null
    ).length;
    return criteriaCount > 1;
  }

  /**
   * Ejecuta query con timeout
   */
  private async executeWithTimeout(query: any): Promise<any> {
    return Promise.race([
      query,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), this.config.searchTimeoutMs || 30000)
      )
    ]);
  }

  /**
   * Genera clave de cache
   */
  private generateCacheKey(criteria: SearchCriteria, strategy: SearchStrategy): string {
    return `${strategy}:${JSON.stringify(criteria)}`;
  }

  /**
   * Obtiene resultado del cache
   */
  private getCachedResult(key: string): SubscriptionMatch[] | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < (this.config.cacheExpiryMs || this.config.cacheTimeoutMs)) {
      return cached.result;
    }
    return null;
  }

  /**
   * Guarda resultado en cache
   */
  private setCachedResult(key: string, result: SubscriptionMatch[]): void {
    this.searchCache.set(key, {
      result: [...result],
      timestamp: Date.now()
    });
  }

  /**
   * Actualiza estadísticas de búsqueda
   */
  private updateSearchStats(
    key: string, 
    wasHit: boolean, 
    executionTime: number, 
    hasError: boolean = false
  ): void {
    if (!this.config.enableStats) return;
    
    const statsKey = key.split(':')[0]; // Solo la estrategia
    
    if (!this.searchStats.has(statsKey)) {
      this.searchStats.set(statsKey, { searches: 0, hits: 0, misses: 0, avgTime: 0 });
    }
    
    const stats = this.searchStats.get(statsKey)!;
    stats.searches++;
    
    if (wasHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    
    // Actualizar tiempo promedio
    stats.avgTime = (stats.avgTime * (stats.searches - 1) + executionTime) / stats.searches;
  }

  /**
   * Inicia limpieza automática del cache
   */
  private startCacheCleanup(): void {
    const cacheExpiry = this.config.cacheExpiryMs || this.config.cacheTimeoutMs;
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.searchCache.entries()) {
        if (now - cached.timestamp > cacheExpiry) {
          this.searchCache.delete(key);
        }
      }
    }, cacheExpiry);
  }

  /**
   * Obtiene estadísticas de búsqueda
   */
  getSearchStats(): Record<string, { searches: number; hits: number; misses: number; avgTime: number }> {
    if (!this.config.enableStats) return {};
    
    const stats: Record<string, { searches: number; hits: number; misses: number; avgTime: number }> = {};
    
    for (const [key, value] of this.searchStats.entries()) {
      stats[key] = { ...value };
    }
    
    return stats;
  }

  /**
   * Limpia el cache manualmente
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Reinicia estadísticas
   */
  resetStats(): void {
    this.searchStats.clear();
  }

  // Métodos de búsqueda compuesta específicos
  private async searchByComposite(email: string, externalRef: string): Promise<SubscriptionMatch[]> {
    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('external_reference', externalRef);
    
    if (error) throw error;
    return this.convertToSubscriptionMatches(data || [], 'composite');
  }

  private async searchByEmailAndOrder(email: string, orderId: string): Promise<SubscriptionMatch[]> {
    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('order_id', orderId);
    
    if (error) throw error;
    return this.convertToSubscriptionMatches(data || [], 'composite');
  }

  private async searchByReferenceAndOrder(externalRef: string, orderId: string): Promise<SubscriptionMatch[]> {
    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalRef)
      .eq('order_id', orderId);
    
    if (error) throw error;
    return this.convertToSubscriptionMatches(data || [], 'composite');
  }

  /**
   * Actualiza la configuración del finder
   */
  updateConfig(newConfig: Partial<SmartSubscriptionFinderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destruye el finder y limpia recursos
   */
  async destroy(): Promise<void> {
    this.clearCache();
    this.resetStats();
  }
}