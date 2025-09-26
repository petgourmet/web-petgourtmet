import { createServiceClient } from '@/lib/supabase/service';
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

export class AdvancedIdempotencyServiceServer {
  private supabase: any;

  constructor() {
    this.supabase = createServiceClient();
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

  private generateLockKey(config: IdempotencyConfig): string {
    const data = `${config.key}-${JSON.stringify(config.subscriptionData)}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async performPreValidation(subscriptionData: IdempotencyConfig['subscriptionData']) {
    const errors: string[] = [];
    let duplicateFound = false;

    if (!subscriptionData.externalReference && !subscriptionData.userId) {
      errors.push('Se requiere external_reference o user_id para validación');
    }

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

    try {
      let query = this.supabase.from('unified_subscriptions').select('id, external_reference, user_id, product_id, customer_data');
      
      if (criteria.external_reference) {
        const { data } = await query.eq('external_reference', criteria.external_reference);
        if (data && data.length > 0) {
          return { found: true, reason: 'external_reference match' };
        }
      }

      if (criteria.user_id && criteria.product_id) {
        const { data } = await query.eq('user_id', criteria.user_id).eq('product_id', criteria.product_id);
        if (data && data.length > 0) {
          return { found: true, reason: 'user_id + product_id match' };
        }
      }

      return { found: false, reason: null };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { found: false, reason: null };
    }
  }

  private async getExistingResult(key: string) {
    try {
      const { data } = await this.supabase
        .from('idempotency_results')
        .select('result')
        .eq('key', key)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      return data;
    } catch (error) {
      return null;
    }
  }

  private async acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      
      const { error } = await this.supabase
        .from('idempotency_locks')
        .insert({
          lock_key: lockKey,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        });
      
      return !error;
    } catch (error) {
      return false;
    }
  }

  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.supabase
        .from('idempotency_locks')
        .delete()
        .eq('lock_key', lockKey);
    } catch (error) {
      console.error('Error releasing lock:', error);
    }
  }

  private async waitForLockRelease(lockKey: string, maxRetries: number): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data } = await this.supabase
        .from('idempotency_locks')
        .select('expires_at')
        .eq('lock_key', lockKey)
        .single();
      
      if (!data || new Date(data.expires_at) < new Date()) {
        return;
      }
    }
  }

  private async storeResult(key: string, result: any, ttlSeconds: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      
      await this.supabase
        .from('idempotency_results')
        .insert({
          key,
          result,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing result:', error);
    }
  }

  private async logIdempotencyEvent(event: string, data: any): Promise<void> {
    try {
      await this.supabase
        .from('idempotency_logs')
        .insert({
          event,
          data,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }
}

// Factory function para crear instancias del servidor
export function createAdvancedIdempotencyServiceServer(): AdvancedIdempotencyServiceServer {
  return new AdvancedIdempotencyServiceServer();
}