import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface IdempotencyConfig {
  key: string;
  ttlSeconds: number;
  maxRetries: number;
  enablePreValidation: boolean;
  subscriptionData: {
    userId?: string;
    productId?: number;
    externalReference?: string;
    payerEmail?: string;
    planId?: string;
  };
}

interface IdempotencyResult {
  isProcessed: boolean;
  result?: any;
  lockAcquired: boolean;
  duplicateFound: boolean;
  validationErrors: string[];
}

interface DuplicateCheckCriteria {
  external_reference?: string;
  user_id?: string;
  product_id?: number;
  payer_email?: string;
}

export class AdvancedIdempotencyService {
  private static instance: AdvancedIdempotencyService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  static getInstance(): AdvancedIdempotencyService {
    if (!AdvancedIdempotencyService.instance) {
      AdvancedIdempotencyService.instance = new AdvancedIdempotencyService();
    }
    return AdvancedIdempotencyService.instance;
  }

  /**
   * Ejecuta una operación con idempotencia avanzada usando múltiples criterios
   */
  async executeWithIdempotency<T>(
    operation: () => Promise<T>,
    config: IdempotencyConfig
  ): Promise<IdempotencyResult & { result?: T }> {
    const startTime = Date.now();
    const lockKey = this.generateLockKey(config);
    const validationErrors: string[] = [];

    try {
      // 1. Validación previa si está habilitada
      if (config.enablePreValidation) {
        const preValidation = await this.performPreValidation(config.subscriptionData);
        if (!preValidation.isValid) {
          return {
            isProcessed: false,
            lockAcquired: false,
            duplicateFound: preValidation.duplicateFound,
            validationErrors: preValidation.errors
          };
        }
      }

      // 2. Verificar si ya existe un resultado previo
      const existingResult = await this.getExistingResult(config.key);
      if (existingResult) {
        await this.logIdempotencyEvent('result_retrieved', {
          key: config.key,
          lockKey,
          executionTime: Date.now() - startTime
        });
        return {
          isProcessed: true,
          result: existingResult.result,
          lockAcquired: false,
          duplicateFound: false,
          validationErrors: []
        };
      }

      // 3. Intentar adquirir el lock
      const lockAcquired = await this.acquireLock(lockKey, config.ttlSeconds);
      if (!lockAcquired) {
        // Esperar y reintentar
        await this.waitForLockRelease(lockKey, config.maxRetries);
        const retryResult = await this.getExistingResult(config.key);
        if (retryResult) {
          return {
            isProcessed: true,
            result: retryResult.result,
            lockAcquired: false,
            duplicateFound: false,
            validationErrors: []
          };
        }
        return {
          isProcessed: false,
          lockAcquired: false,
          duplicateFound: false,
          validationErrors: ['Failed to acquire lock after retries']
        };
      }

      try {
        // 4. Verificación final de duplicados antes de ejecutar
        const finalDuplicateCheck = await this.checkForDuplicates(config.subscriptionData);
        if (finalDuplicateCheck.found) {
          await this.releaseLock(lockKey);
          return {
            isProcessed: false,
            lockAcquired: true,
            duplicateFound: true,
            validationErrors: [`Duplicate found: ${finalDuplicateCheck.reason}`]
          };
        }

        // 5. Ejecutar la operación
        const result = await operation();

        // 6. Guardar el resultado
        await this.storeResult(config.key, result, config.ttlSeconds);

        // 7. Log del evento exitoso
        await this.logIdempotencyEvent('operation_completed', {
          key: config.key,
          lockKey,
          executionTime: Date.now() - startTime,
          subscriptionData: config.subscriptionData
        });

        return {
          isProcessed: true,
          result,
          lockAcquired: true,
          duplicateFound: false,
          validationErrors: []
        };
      } finally {
        // Liberar el lock
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      await this.logIdempotencyEvent('operation_failed', {
        key: config.key,
        lockKey,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Validación previa usando múltiples criterios
   */
  private async performPreValidation(subscriptionData: IdempotencyConfig['subscriptionData']) {
    const errors: string[] = [];
    let duplicateFound = false;

    // Validar datos requeridos
    if (!subscriptionData.externalReference && !subscriptionData.userId) {
      errors.push('Se requiere external_reference o user_id para validación');
    }

    // Verificar duplicados por múltiples criterios
    const duplicateCheck = await this.checkForDuplicates(subscriptionData);
    if (duplicateCheck.found) {
      duplicateFound = true;
      errors.push(`Suscripción duplicada encontrada: ${duplicateCheck.reason}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      duplicateFound
    };
  }

  /**
   * Verificación de duplicados usando múltiples criterios
   */
  private async checkForDuplicates(subscriptionData: IdempotencyConfig['subscriptionData']) {
    const criteria: DuplicateCheckCriteria = {};
    
    if (subscriptionData.externalReference) {
      criteria.external_reference = subscriptionData.externalReference;
    }
    if (subscriptionData.userId) {
      criteria.user_id = subscriptionData.userId;
    }
    if (subscriptionData.productId) {
      criteria.product_id = subscriptionData.productId;
    }
    if (subscriptionData.payerEmail) {
      criteria.payer_email = subscriptionData.payerEmail;
    }

    // Buscar por external_reference primero (criterio más fuerte)
    if (criteria.external_reference) {
      const { data: existingByRef } = await this.supabase
        .from('unified_subscriptions')
        .select('id, status, external_reference')
        .eq('external_reference', criteria.external_reference)
        .in('status', ['active', 'processing', 'completed'])
        .limit(1);

      if (existingByRef && existingByRef.length > 0) {
        return {
          found: true,
          reason: `External reference ${criteria.external_reference} ya existe`,
          subscription: existingByRef[0]
        };
      }
    }

    // Buscar por combinación user_id + product_id + email
    if (criteria.user_id && criteria.product_id) {
      let query = this.supabase
        .from('unified_subscriptions')
        .select('id, status, user_id, product_id')
        .eq('user_id', criteria.user_id)
        .eq('product_id', criteria.product_id)
        .in('status', ['active', 'processing']);

      // Si tenemos email del pagador, agregarlo como criterio adicional
      if (criteria.payer_email) {
        query = query.contains('customer_data', { email: criteria.payer_email });
      }

      const { data: existingByUserProduct } = await query.limit(1);

      if (existingByUserProduct && existingByUserProduct.length > 0) {
        return {
          found: true,
          reason: `Usuario ${criteria.user_id} ya tiene suscripción activa para producto ${criteria.product_id}`,
          subscription: existingByUserProduct[0]
        };
      }
    }

    return { found: false, reason: null, subscription: null };
  }

  /**
   * Generar clave de lock única
   */
  private generateLockKey(config: IdempotencyConfig): string {
    const data = JSON.stringify({
      key: config.key,
      userId: config.subscriptionData.userId,
      productId: config.subscriptionData.productId,
      externalReference: config.subscriptionData.externalReference
    });
    return `lock:${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  /**
   * Adquirir lock de base de datos
   */
  private async acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    try {
      const { error } = await this.supabase
        .from('idempotency_locks')
        .insert({
          lock_key: lockKey,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });

      return !error;
    } catch (error) {
      // Si hay error de constraint único, el lock ya existe
      return false;
    }
  }

  /**
   * Liberar lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    await this.supabase
      .from('idempotency_locks')
      .delete()
      .eq('lock_key', lockKey);
  }

  /**
   * Esperar a que se libere el lock
   */
  private async waitForLockRelease(lockKey: string, maxRetries: number): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000 + i * 500)); // Backoff exponencial
      
      const { data } = await this.supabase
        .from('idempotency_locks')
        .select('expires_at')
        .eq('lock_key', lockKey)
        .single();

      if (!data || new Date(data.expires_at) < new Date()) {
        // Lock liberado o expirado
        break;
      }
    }
  }

  /**
   * Obtener resultado existente
   */
  private async getExistingResult(key: string): Promise<any> {
    const { data } = await this.supabase
      .from('idempotency_results')
      .select('result, expires_at')
      .eq('key', key)
      .single();

    if (data && new Date(data.expires_at) > new Date()) {
      return { result: data.result };
    }
    return null;
  }

  /**
   * Almacenar resultado
   */
  private async storeResult(key: string, result: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await this.supabase
      .from('idempotency_results')
      .upsert({
        key,
        result,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
  }

  /**
   * Registrar evento de idempotencia
   */
  private async logIdempotencyEvent(eventType: string, data: any): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          operation: `idempotency_${eventType}`,
          details: data,
          status: 'completed',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging idempotency event:', error);
    }
  }

  /**
   * Limpiar locks y resultados expirados
   */
  async cleanupExpired(): Promise<void> {
    const now = new Date().toISOString();
    
    // Limpiar locks expirados
    await this.supabase
      .from('idempotency_locks')
      .delete()
      .lt('expires_at', now);

    // Limpiar resultados expirados
    await this.supabase
      .from('idempotency_results')
      .delete()
      .lt('expires_at', now);
  }
}

// Instancia singleton
export const advancedIdempotencyService = AdvancedIdempotencyService.getInstance();