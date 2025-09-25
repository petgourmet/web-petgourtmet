import { createClient } from '@supabase/supabase-js';
import { 
  LockResult, 
  LockInfo, 
  DatabaseLockConfig, 
  IdempotencyError 
} from './unified-idempotency.types';

/**
 * DatabaseLockManager - Gestor de locks distribuidos para operaciones idempotentes
 * 
 * Características principales:
 * - Locks distribuidos con TTL automático
 * - Retry automático con backoff exponencial
 * - Detección y limpieza de locks expirados
 * - Estadísticas de rendimiento
 * - Manejo robusto de errores
 */
export class DatabaseLockManager {
  private supabase: any;
  private config: DatabaseLockConfig;
  private lockStats: Map<string, { acquired: number; failed: number; expired: number }> = new Map();

  constructor(supabaseClient: any, config: Partial<DatabaseLockConfig> = {}) {
    this.supabase = supabaseClient;
    this.config = {
      defaultTtlSeconds: config.defaultTtlSeconds || 300, // 5 minutos
      maxRetries: config.maxRetries || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      backoffMultiplier: config.backoffMultiplier || 2,
      cleanupIntervalMs: config.cleanupIntervalMs || 60000, // 1 minuto
      enableStats: config.enableStats !== false,
      lockPrefix: 'idempotency_lock',
      ...config
    };

    // Iniciar limpieza automática de locks expirados
    if (this.config.cleanupIntervalMs > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Adquiere un lock distribuido con retry automático
   */
  async acquireLock(
    lockKey: string, 
    ttlSeconds?: number, 
    metadata?: Record<string, any>
  ): Promise<LockResult> {
    const fullLockKey = `idempotency_lock:${lockKey}`;
    const lockTtl = ttlSeconds || this.config.defaultTtlSeconds;
    const expiresAt = new Date(Date.now() + (lockTtl * 1000));
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.attemptLockAcquisition(
          fullLockKey, 
          expiresAt, 
          metadata
        );
        
        if (result.acquired) {
          this.updateStats(lockKey, 'acquired');
          return result;
        }
        
        // Si no es el último intento, esperar antes del retry
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
        
      } catch (error) {
        lastError = error as Error;
        
        // Si es un error crítico, no reintentar
        if (this.isCriticalError(error)) {
          break;
        }
        
        // Si no es el último intento, esperar antes del retry
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }
    
    this.updateStats(lockKey, 'failed');
    
    return {
      acquired: false,
      lockId: undefined,
      error: lastError?.message || 'Failed to acquire lock after retries',
      expiresAt: undefined
    };
  }

  /**
   * Intenta adquirir un lock en la base de datos
   */
  private async attemptLockAcquisition(
    lockKey: string, 
    expiresAt: Date, 
    metadata?: Record<string, any>
  ): Promise<LockResult> {
    try {
      // Primero, limpiar locks expirados para esta clave
      await this.cleanupExpiredLock(lockKey);
      
      // Intentar insertar el nuevo lock
      const { data, error } = await this.supabase
        .from('idempotency_locks')
        .insert({
          lock_key: lockKey,
          expires_at: expiresAt.toISOString(),
          metadata: metadata || {},
          created_at: new Date().toISOString()
        })
        .select('id, lock_key, expires_at, metadata')
        .single();
      
      if (error) {
        // Si es un error de duplicado, el lock ya existe
        if (error.code === '23505') { // unique_violation
          return {
            acquired: false,
            lockId: undefined,
            error: 'Lock already exists',
            expiresAt: undefined,
            attempt: 1
          };
        }
        
        throw new IdempotencyError(
          `Failed to acquire lock: ${error.message}`,
          'LOCK_ACQUISITION_FAILED',
          undefined,
          { lockKey, error: error.message }
        );
      }
      
      return {
        acquired: true,
        lockId: data.id,
        error: undefined,
        expiresAt,
        attempt: 1
      };
      
    } catch (error) {
      if (error instanceof IdempotencyError) {
        throw error;
      }
      
      throw new IdempotencyError(
        `Database error during lock acquisition: ${(error as Error).message}`,
        'DATABASE_ERROR',
        undefined,
        { lockKey, error: (error as Error).message }
      );
    }
  }

  /**
   * Libera un lock específico
   */
  async releaseLock(lockId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('idempotency_locks')
        .delete()
        .eq('id', lockId);
      
      if (error) {
        throw new IdempotencyError(
          `Failed to release lock: ${error.message}`,
          'LOCK_RELEASE_FAILED',
          undefined,
          { lockId, error: error.message }
        );
      }
      
      return true;
      
    } catch (error) {
      console.error('Error releasing lock: ' + (error as Error).message);
      return false;
    }
  }

  /**
   * Verifica si un lock existe y está activo
   */
  async checkLock(lockKey: string): Promise<LockInfo | null> {
    try {
      const fullLockKey = `lock:${lockKey}`;
      
      const { data, error } = await this.supabase
        .from('idempotency_locks')
        .select('id, lock_key, expires_at, metadata, created_at')
        .eq('lock_key', fullLockKey)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        key: data.lock_key,
        lockId: data.id,
        acquiredAt: new Date(data.created_at),
        expiresAt: new Date(data.expires_at),
        metadata: data.metadata
      };
      
    } catch (error) {
      console.error('Error checking lock:', error);
      return null;
    }
  }

  /**
   * Extiende el TTL de un lock existente
   */
  async extendLock(lockId: string, additionalSeconds: number): Promise<boolean> {
    try {
      const newExpiresAt = new Date(Date.now() + (additionalSeconds * 1000));
      
      const { error } = await this.supabase
        .from('idempotency_locks')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', lockId)
        .gt('expires_at', new Date().toISOString()); // Solo si no ha expirado
      
      if (error) {
        throw new IdempotencyError(
          `Failed to extend lock: ${error.message}`,
          'LOCK_EXTENSION_FAILED',
          undefined,
          { lockId, error: error.message }
        );
      }
      
      return true;
      
    } catch (error) {
      console.error('Error extending lock:', error);
      return false;
    }
  }

  /**
   * Limpia un lock expirado específico
   */
  private async cleanupExpiredLock(lockKey: string): Promise<void> {
    try {
      await this.supabase
        .from('idempotency_locks')
        .delete()
        .eq('lock_key', lockKey)
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      // Ignorar errores de limpieza, no son críticos
      console.warn('Warning: Failed to cleanup expired lock:', error);
    }
  }

  /**
   * Limpia todos los locks expirados
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('idempotency_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');
      
      if (error) {
        throw new IdempotencyError(
          `Failed to cleanup expired locks: ${error.message}`,
          'CLEANUP_FAILED',
          undefined,
          { error: error.message }
        );
      }
      
      const cleanedCount = data?.length || 0;
      
      // Actualizar estadísticas
      if (cleanedCount > 0) {
        for (const [key, stats] of this.lockStats.entries()) {
          stats.expired += Math.floor(cleanedCount / this.lockStats.size);
        }
      }
      
      return cleanedCount;
      
    } catch (error) {
      console.error('Error during cleanup: ' + (error as Error).message, { error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de locks
   */
  getLockStats(): Record<string, { acquired: number; failed: number; expired: number }> {
    // Stats always enabled
    
    const stats: Record<string, { acquired: number; failed: number; expired: number }> = {};
    
    for (const [key, value] of this.lockStats.entries()) {
      stats[key] = { ...value };
    }
    
    return stats;
  }

  /**
   * Reinicia las estadísticas
   */
  resetStats(): void {
    this.lockStats.clear();
  }

  /**
   * Calcula el delay para retry con backoff exponencial
   */
  private calculateRetryDelay(attempt: number): number {
    return this.config.retryDelayMs * Math.pow(2, attempt);
  }

  /**
   * Determina si un error es crítico y no debe reintentarse
   */
  private isCriticalError(error: any): boolean {
    // Errores de autenticación, permisos, etc.
    const criticalCodes = ['42501', '28000', '28P01', '3D000'];
    return criticalCodes.includes(error?.code);
  }

  /**
   * Actualiza estadísticas de locks
   */
  private updateStats(lockKey: string, type: 'acquired' | 'failed' | 'expired'): void {
    // Stats tracking
    
    if (!this.lockStats.has(lockKey)) {
      this.lockStats.set(lockKey, { acquired: 0, failed: 0, expired: 0 });
    }
    
    const stats = this.lockStats.get(lockKey)!;
    stats[type]++;
  }

  /**
   * Inicia el timer de limpieza automática
   */
  private startCleanupTimer(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredLocks();
      } catch (error) {
        console.error('Error in automatic cleanup:', error);
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Utility para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Actualiza la configuración del lock manager
   */
  updateConfig(newConfig: Partial<DatabaseLockConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destructor para limpieza de recursos
   */
  destroy(): void {
    // Limpiar timers si es necesario
    // En una implementación real, mantendríamos referencias a los timers
  }
}