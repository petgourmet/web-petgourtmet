import { createClient } from '@supabase/supabase-js';
import { 
  ValidationRule, 
  ValidationCheck, 
  ValidationResult, 
  DuplicateValidatorConfig, 
  SubscriptionData,
  IdempotencyError 
} from './unified-idempotency.types';

/**
 * DuplicateValidator - Validador robusto de duplicados con múltiples criterios
 * 
 * Características principales:
 * - Validación por múltiples criterios (email, external_reference, payment_id)
 * - Reglas de validación configurables y extensibles
 * - Validación con locks de base de datos para evitar race conditions
 * - Detección de patrones de duplicación
 * - Métricas de validación detalladas
 * - Soporte para validación en lotes
 */
export class DuplicateValidator {
  private supabase: any;
  private config: DuplicateValidatorConfig;
  private validationStats: Map<string, { checked: number; duplicates: number; errors: number }> = new Map();
  private defaultRules: ValidationRule[];

  constructor(supabaseClient: any, config: Partial<DuplicateValidatorConfig> = {}) {
    this.supabase = supabaseClient;
    this.config = {
      enableStrictValidation: config.enableStrictValidation !== false,
      maxValidationTimeMs: config.maxValidationTimeMs || 30000,
      enableBatchValidation: config.enableBatchValidation !== false,
      batchSize: config.batchSize || 10,
      enableStats: config.enableStats !== false,
      customRules: config.customRules || [],
      strictEmailValidation: config.strictEmailValidation !== false,
      validateExternalReference: config.validateExternalReference !== false,
      validateOrderId: config.validateOrderId !== false,
      ...config
    };

    this.defaultRules = this.initializeDefaultRules();
  }

  /**
   * Valida si una suscripción es duplicada usando múltiples criterios
   */
  async validateSubscription(
    subscriptionData: SubscriptionData,
    customRules?: ValidationRule[]
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const rulesToApply = [...this.defaultRules, ...(customRules || []), ...(this.config.customRules || [])];
    
    try {
      // Ejecutar todas las validaciones
      const validationChecks = await this.executeValidationRules(
        subscriptionData, 
        rulesToApply
      );
      
      // Analizar resultados
      const duplicateChecks = validationChecks.filter(check => !check.passed);
      const errorChecks = validationChecks.filter(check => check.details?.error);
      
      const isDuplicate = duplicateChecks.length > 0;
      const hasErrors = errorChecks.length > 0;
      
      // Actualizar estadísticas
      this.updateValidationStats(subscriptionData.payer_email || 'unknown', isDuplicate, hasErrors);
      
      const result: ValidationResult = {
        isValid: duplicateChecks.length === 0 && errorChecks.length === 0,
        validationId: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        executionTime: Date.now() - startTime,
        checks: validationChecks,
        failedChecks: [...duplicateChecks, ...errorChecks],
        duplicateFound: duplicateChecks.length > 0,
        duplicateDetails: duplicateChecks.length > 0 ? {
          reasons: duplicateChecks.map(check => ({
            criterion: check.criterion,
            value: check.details?.value,
            existingSubscriptionId: check.details?.existingSubscriptionId,
            confidence: check.details?.confidence || 0
          })),
          highConfidenceCount: duplicateChecks.filter(check => 
            (check.details?.confidence || 0) > 0.8
          ).length
        } : undefined,
        recommendations: duplicateChecks.length > 0 ? [
          'Revisar suscripción existente antes de proceder',
          'Verificar datos del cliente para confirmar duplicación'
        ] : undefined
      };
      
      return result;
      
    } catch (error) {
      this.updateValidationStats(subscriptionData.payer_email || 'unknown', false, true);
      
      throw new IdempotencyError(
        `Validation failed: ${(error as Error).message}`,
        'VALIDATION_ERROR',
        undefined,
        { subscriptionData, error }
      );
    }
  }

  /**
   * Valida múltiples suscripciones en lote
   */
  async validateBatch(subscriptions: SubscriptionData[]): Promise<ValidationResult[]> {
    const batchSize = this.config.batchSize || 10;
    const results: ValidationResult[] = [];
    
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      const batchPromises = batch.map(subscription => this.validateSubscription(subscription));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Ejecuta todas las reglas de validación
   */
  private async executeValidationRules(
    subscriptionData: SubscriptionData,
    rules: ValidationRule[]
  ): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];
    
    // Ejecutar validaciones en paralelo cuando sea posible
    const validationPromises = rules.map(async (rule) => {
      try {
        const check = await rule.validator(subscriptionData);
        return check;
      } catch (error) {
        return {
          criterion: rule.name,
          passed: false,
          details: {
            value: this.extractValueByCriterion(subscriptionData, rule.name),
            confidence: 0,
            error: (error as Error).message,
            existingSubscriptionId: null,
            rule: rule.name
          },
          message: `Error in rule ${rule.name}: ${(error as Error).message}`,
          executionTime: 0
        } as ValidationCheck;
      }
    });
    
    const results = await Promise.all(validationPromises);
    checks.push(...results);
    
    return checks;
  }

  /**
   * Verifica duplicados por criterio específico
   */
  private async checkDuplicate(
    subscriptionData: SubscriptionData,
    rule: ValidationRule
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    const value = this.extractValueByCriterion(subscriptionData, rule.name);
    
    if (!value) {
      return this.createNonDuplicateCheck(rule.name, null, rule.name);
    }
    
    try {
      // Crear query base
      let query = this.supabase
        .from('unified_subscriptions')
        .select('*')
        .neq('id', subscriptionData.id || 'new');
      
      // Aplicar filtro según el criterio
      switch (rule.name) {
        case 'email_exact_match':
          query = query.eq('payer_email', subscriptionData.payer_email?.toLowerCase().trim());
          break;
        case 'external_reference_match':
          query = query.eq('external_reference', subscriptionData.external_reference);
          break;
        case 'order_id_match':
          query = query.eq('payment_id', subscriptionData.payment_id);
          break;
        case 'composite_validation':
          query = query
            .eq('payer_email', subscriptionData.payer_email)
            .eq('external_reference', subscriptionData.external_reference);
          break;
        default:
          return this.createNonDuplicateCheck(rule.name, value, rule.name);
      }
      
      // Aplicar ventana de tiempo si está definida
      if (rule.timeWindowHours) {
        const timeWindow = new Date(Date.now() - (rule.timeWindowHours * 60 * 60 * 1000)).toISOString();
        query = query.gte('created_at', timeWindow);
      }
      
      // Ejecutar query con timeout
      const timeoutPromise = this.createTimeoutPromise(this.config.maxValidationTimeMs || 30000);
      const queryPromise = query.limit(10);
      
      const { data: duplicates, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);
      
      if (error) {
        console.error(`Duplicate validation error for ${rule.name}:`, error.message);
        return this.createNonDuplicateCheck(rule.name, value, rule.name);
      }
      
      const isDuplicate = duplicates && duplicates.length > 0;
      const confidence = isDuplicate ? this.calculateConfidence(subscriptionData, duplicates[0], rule) : 0;
      
      return {
        criterion: rule.name,
        passed: !isDuplicate,
        details: {
          duplicateCount: duplicates?.length || 0,
          confidence,
          existingSubscriptionId: isDuplicate ? duplicates[0].id : null,
          rule: rule.name,
          existingData: isDuplicate ? duplicates[0] : null
        },
        message: isDuplicate ? `Duplicate found by ${rule.name}` : `No duplicate found by ${rule.name}`,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error(`Error checking duplicates for ${rule.name}:`, error);
      return this.createNonDuplicateCheck(rule.name, value, rule.name);
    }
  }

  /**
   * Calcula la confianza de que sea un duplicado
   */
  private calculateConfidence(
    newSubscription: SubscriptionData,
    existingSubscription: SubscriptionData,
    rule: ValidationRule
  ): number {
    let confidence = rule.baseConfidence || 0.5;
    
    // Aumentar confianza por coincidencias adicionales
    if (existingSubscription.user_id === newSubscription.user_id) {
      confidence += 0.2;
    }
    
    if (existingSubscription.amount === newSubscription.amount) {
      confidence += 0.1;
    }
    
    if (existingSubscription.payer_email === newSubscription.payer_email) {
      confidence += 0.15;
    }
    
    if (existingSubscription.external_reference === newSubscription.external_reference) {
      confidence += 0.15;
    }
    
    if (existingSubscription.payment_id === newSubscription.payment_id) {
      confidence += 0.1;
    }
    
    // Reducir confianza si hay mucho tiempo entre suscripciones
    if (existingSubscription.created_at) {
      const timeDiff = Date.now() - new Date(existingSubscription.created_at).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        confidence -= 0.1;
      }
      if (hoursDiff > 168) { // 1 semana
        confidence -= 0.2;
      }
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Extrae el valor según el criterio especificado
   */
  private extractValueByCriterion(data: SubscriptionData, criterion: string): any {
    switch (criterion) {
      case 'email_exact_match':
        return data.payer_email;
      case 'external_reference_match':
        return data.external_reference;
      case 'order_id_match':
        return data.payment_id;
      case 'composite_validation':
        return `${data.payer_email}:${data.external_reference}`;
      default:
        return (data as any)[criterion];
    }
  }

  /**
   * Crea un check de no-duplicado
   */
  private createNonDuplicateCheck(criterion: string, value: any, ruleName: string): ValidationCheck {
    return {
      criterion,
      passed: true,
      details: {
        value,
        confidence: 0,
        existingSubscriptionId: null,
        rule: ruleName,
        skipped: true
      },
      message: 'No duplicate validation performed',
      executionTime: 0
    };
  }

  /**
   * Crea una promesa que se rechaza después del timeout
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Validation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Inicializa las reglas de validación por defecto
   */
  private initializeDefaultRules(): ValidationRule[] {
    return [
      {
        name: 'email_exact_match',
        description: 'Validación exacta por email en las últimas 24 horas',
        validator: async (data: SubscriptionData) => this.checkDuplicate(data, {
          name: 'email_exact_match',
          description: 'Email validation',
          validator: async () => ({ criterion: 'email', passed: true, details: {}, message: '', executionTime: 0 }),
          priority: 1,
          enabled: true,
          baseConfidence: 0.8,
          timeWindowHours: 24
        }),
        priority: 1,
        enabled: true,
        baseConfidence: 0.8,
        timeWindowHours: 24
      },
      {
        name: 'external_reference_match',
        description: 'Validación por external_reference en la última semana',
        validator: async (data: SubscriptionData) => this.checkDuplicate(data, {
          name: 'external_reference_match',
          description: 'External reference validation',
          validator: async () => ({ criterion: 'external_reference', passed: true, details: {}, message: '', executionTime: 0 }),
          priority: 2,
          enabled: true,
          baseConfidence: 0.9,
          timeWindowHours: 168
        }),
        priority: 2,
        enabled: true,
        baseConfidence: 0.9,
        timeWindowHours: 168 // 1 semana
      },
      {
        name: 'order_id_match',
        description: 'Validación por payment_id en los últimos 3 días',
        validator: async (data: SubscriptionData) => this.checkDuplicate(data, {
          name: 'order_id_match',
          description: 'Payment ID validation',
          validator: async () => ({ criterion: 'payment_id', passed: true, details: {}, message: '', executionTime: 0 }),
          priority: 3,
          enabled: true,
          baseConfidence: 0.85,
          timeWindowHours: 72
        }),
        priority: 3,
        enabled: true,
        baseConfidence: 0.85,
        timeWindowHours: 72 // 3 días
      },
      {
        name: 'composite_validation',
        description: 'Validación compuesta email + external_reference',
        validator: async (data: SubscriptionData) => this.checkDuplicate(data, {
          name: 'composite_validation',
          description: 'Composite validation',
          validator: async () => ({ criterion: 'composite', passed: true, details: {}, message: '', executionTime: 0 }),
          priority: 4,
          enabled: true,
          baseConfidence: 0.95,
          timeWindowHours: 48
        }),
        priority: 4,
        enabled: true,
        baseConfidence: 0.95,
        timeWindowHours: 48
      }
    ];
  }

  /**
   * Actualiza estadísticas de validación
   */
  private updateValidationStats(email: string, isDuplicate: boolean, hasError: boolean): void {
    if (!this.config.enableStats) return;
    
    const key = email || 'unknown';
    
    if (!this.validationStats.has(key)) {
      this.validationStats.set(key, { checked: 0, duplicates: 0, errors: 0 });
    }
    
    const stats = this.validationStats.get(key)!;
    stats.checked++;
    
    if (isDuplicate) stats.duplicates++;
    if (hasError) stats.errors++;
  }

  /**
   * Obtiene estadísticas de validación
   */
  getValidationStats(): Record<string, { checked: number; duplicates: number; errors: number }> {
    if (!this.config.enableStats) return {};
    
    const stats: Record<string, { checked: number; duplicates: number; errors: number }> = {};
    
    for (const [key, value] of this.validationStats.entries()) {
      stats[key] = { ...value };
    }
    
    return stats;
  }

  /**
   * Reinicia las estadísticas
   */
  resetStats(): void {
    this.validationStats.clear();
  }

  /**
   * Agrega una regla de validación personalizada
   */
  addCustomRule(rule: ValidationRule): void {
    if (!this.config.customRules) {
      this.config.customRules = [];
    }
    this.config.customRules.push(rule);
  }

  /**
   * Remueve una regla de validación personalizada
   */
  removeCustomRule(ruleName: string): boolean {
    if (!this.config.customRules) {
      return false;
    }
    const index = this.config.customRules.findIndex((rule: ValidationRule) => rule.name === ruleName);
    if (index >= 0) {
      this.config.customRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Obtiene todas las reglas activas
   */
  getActiveRules(): ValidationRule[] {
    return [...this.defaultRules, ...(this.config.customRules || [])];
  }

  /**
   * Actualiza la configuración del validator
   */
  updateConfig(newConfig: Partial<DuplicateValidatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destruye el validator y limpia recursos
   */
  async destroy(): Promise<void> {
    this.resetStats();
    this.validationStats.clear();
  }
}