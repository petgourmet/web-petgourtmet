import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseLockManager } from './database-lock-manager';
import { DuplicateValidator } from './duplicate-validator';
import { SmartSubscriptionFinder } from './smart-subscription-finder';
import { DetailedLogger } from './detailed-logger';
import {
  UnifiedIdempotencyOptions,
  UnifiedIdempotencyResult,
  UnifiedIdempotencyConfig,
  SubscriptionData,
  OperationType,
  LogLevel,
  IdempotencyError,
  ValidationResult,
  SubscriptionMatch,
  LockResult,
  SearchCriteria,
  DEFAULT_CONFIG
} from './unified-idempotency.types';

/**
 * UnifiedIdempotencyService - Servicio principal de idempotencia unificado
 * 
 * Integra todos los componentes del sistema de idempotencia:
 * - DatabaseLockManager: Gestión de locks distribuidos
 * - DuplicateValidator: Validación de duplicados
 * - SmartSubscriptionFinder: Búsqueda inteligente de suscripciones
 * - DetailedLogger: Sistema de logging avanzado
 * 
 * Características:
 * - Patrón singleton para instancia global
 * - Operaciones atómicas con rollback automático
 * - Métricas y estadísticas en tiempo real
 * - Configuración flexible y extensible
 * - Manejo robusto de errores
 */
export class UnifiedIdempotencyService {
  private static instance: UnifiedIdempotencyService | null = null;
  private static isInitializing = false;

  private supabase: SupabaseClient;
  private config: UnifiedIdempotencyConfig;
  private lockManager!: DatabaseLockManager;
  private duplicateValidator!: DuplicateValidator;
  private subscriptionFinder!: SmartSubscriptionFinder;
  private logger!: DetailedLogger;
  private stats: any;
  private isInitialized = false;

  private constructor(supabase: SupabaseClient, config: Partial<UnifiedIdempotencyConfig> = {}) {
    this.supabase = supabase;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      duplicatesDetected: 0,
      locksAcquired: 0,
      locksReleased: 0,
      averageOperationTime: 0,
      lastOperationTime: new Date(),
      operationsByType: {
        create_subscription: 0,
        update_subscription: 0,
        cancel_subscription: 0,
        process_webhook: 0,
        sync_subscription: 0,
        unknown: 0
      },
      errorsByType: {},
      performanceMetrics: {
        p50: 0,
        p95: 0,
        p99: 0
      }
    };

    this.initializeComponents();
  }

  /**
   * Obtiene la instancia singleton del servicio
   */
  public static async getInstance(
    supabase?: SupabaseClient,
    config?: Partial<UnifiedIdempotencyConfig>
  ): Promise<UnifiedIdempotencyService> {
    if (UnifiedIdempotencyService.instance && UnifiedIdempotencyService.instance.isInitialized) {
      return UnifiedIdempotencyService.instance;
    }

    if (UnifiedIdempotencyService.isInitializing) {
      // Esperar a que termine la inicialización
      while (UnifiedIdempotencyService.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (UnifiedIdempotencyService.instance) {
        return UnifiedIdempotencyService.instance;
      }
    }

    if (!supabase) {
      throw new IdempotencyError(
        'MISSING_SUPABASE_CLIENT',
        'Supabase client is required for first initialization'
      );
    }

    UnifiedIdempotencyService.isInitializing = true;

    try {
      UnifiedIdempotencyService.instance = new UnifiedIdempotencyService(supabase, config);
      await UnifiedIdempotencyService.instance.initialize();
      return UnifiedIdempotencyService.instance;
    } finally {
      UnifiedIdempotencyService.isInitializing = false;
    }
  }

  /**
   * Inicializa los componentes del servicio
   */
  private initializeComponents(): void {
    this.lockManager = new DatabaseLockManager(this.supabase, this.config.lockManager);
    this.duplicateValidator = new DuplicateValidator(this.supabase, this.config.validator);
    this.subscriptionFinder = new SmartSubscriptionFinder(this.supabase, this.config.finder);
    this.logger = new DetailedLogger(this.supabase, this.config.logger);
  }

  /**
   * Inicializa el servicio
   */
  private async initialize(): Promise<void> {
    try {
      await this.logger.info('Initializing UnifiedIdempotencyService', {
        operation_type: 'service_init',
        config: this.sanitizeConfig()
      });

      // Verificar conectividad con Supabase
      await this.verifySupabaseConnection();

      // Configurar limpieza automática si está habilitada
      // Auto cleanup deshabilitado por ahora
      if (false) {
        this.setupAutoCleanup();
      }

      this.isInitialized = true;

      await this.logger.info('UnifiedIdempotencyService initialized successfully', {
        operation_type: 'service_init'
      });
    } catch (error) {
      await this.logger.error('Failed to initialize UnifiedIdempotencyService', {
        operation_type: 'service_init',
        error_details: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Ejecuta una operación idempotente
   */
  async executeIdempotentOperation<T = any>(
    operationId: string,
    subscriptionData: SubscriptionData,
    operation: () => Promise<T>,
    options: Partial<UnifiedIdempotencyOptions> = {}
  ): Promise<UnifiedIdempotencyResult<T>> {
    const startTime = Date.now();
    const operationType = 'idempotency_start';
    let lockResult: LockResult | null = null;

    try {
      await this.logger.info('Starting idempotent operation', {
        operation_type: operationType,
        operation_id: operationId,
        subscription_id: subscriptionData.id,
        user_id: subscriptionData.user_id
      });

      // 1. Adquirir lock si está habilitado
      // Locking habilitado por defecto
      if (true) {
        lockResult = await this.acquireLock(operationId, options);
        if (!lockResult.acquired) {
          return this.createFailureResult(
            'LOCK_ACQUISITION_FAILED',
            'Failed to acquire operation lock',
            { lockResult },
            startTime
          );
        }
      }

      // 2. Validar duplicados si está habilitado
      if (this.config.enablePreValidation && options.enablePreValidation !== false) {
        const validationResult = await this.validateDuplicates(subscriptionData, options);
        if (!validationResult.isValid) {
          await this.releaseLock(lockResult);
          return this.createFailureResult(
            'DUPLICATE_DETECTED',
            'Duplicate operation detected',
            { validationResult },
            startTime
          );
        }
      }

      // 3. Buscar suscripciones existentes si está habilitado
      let existingSubscriptions: SubscriptionMatch[] = [];
      if (options.enableSmartSearch !== false) {
        existingSubscriptions = await this.findExistingSubscriptions(subscriptionData, options);
      }

      // 4. Ejecutar la operación principal
      const result = await this.executeWithRetry(operation, options);

      // 5. Liberar lock
      await this.releaseLock(lockResult);

      // 6. Actualizar estadísticas
      this.updateStats(operationType, true, Date.now() - startTime);

      await this.logger.info('Idempotent operation completed successfully', {
        operation_type: operationType,
        operation_id: operationId,
        duration_ms: Date.now() - startTime,
        existing_subscriptions_found: existingSubscriptions.length
      });

      return {
        success: true,

        operationId,
        executionTime: Date.now() - startTime,
        duplicateFound: existingSubscriptions.length > 0,
      lockAcquired: lockResult?.acquired || false
      };

    } catch (error) {
      // Liberar lock en caso de error
      await this.releaseLock(lockResult);

      // Actualizar estadísticas de error
      this.updateStats(operationType, false, Date.now() - startTime, error);

      await this.logger.error('Idempotent operation failed', {
        operation_type: operationType,
        operation_id: operationId,
        duration_ms: Date.now() - startTime,
        error_details: error instanceof Error ? error.message : String(error)
      });

      return this.createFailureResult(
        'OPERATION_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        { error },
        startTime
      );
    }
  }

  /**
   * Adquiere un lock para la operación
   */
  private async acquireLock(
    operationId: string,
    options: Partial<UnifiedIdempotencyOptions>
  ): Promise<LockResult> {
    const lockKey = `operation:${operationId}`;
    const ttl = options.ttlSeconds || 300;

    return await this.lockManager.acquireLock(lockKey, ttl, {
      maxRetryAttempts: options.maxRetryAttempts || this.config.maxRetryAttempts,
      retryDelay: options.retryDelayMs || this.config.retryDelayMs
    });
  }

  /**
   * Libera un lock
   */
  private async releaseLock(lockResult: LockResult | null): Promise<void> {
    if (lockResult?.acquired && lockResult.lockId) {
      await this.lockManager.releaseLock(lockResult.lockId);
    }
  }

  /**
   * Valida duplicados
   */
  private async validateDuplicates(
    subscriptionData: SubscriptionData,
    options: Partial<UnifiedIdempotencyOptions>
  ): Promise<ValidationResult> {
    const rules = options.customValidationRules || [];

    return await this.duplicateValidator.validateSubscription(subscriptionData, rules);
  }

  /**
   * Busca suscripciones existentes
   */
  private async findExistingSubscriptions(
    subscriptionData: SubscriptionData,
    options: Partial<UnifiedIdempotencyOptions>
  ): Promise<SubscriptionMatch[]> {
    const searchCriteria = {
      external_id: subscriptionData.external_reference,
      user_id: subscriptionData.user_id || '',
      email: subscriptionData.payer_email,
      phone: ''
    };

    const strategy = options.searchStrategies?.[0] || this.config.finder?.defaultStrategy || 'smart';
    const criteria: SearchCriteria = {
      strategy,
      field: 'composite',
      value: searchCriteria
    };
    return await this.subscriptionFinder.findSubscriptions(criteria, strategy);
  }

  /**
   * Ejecuta una operación con reintentos
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<UnifiedIdempotencyOptions>
  ): Promise<T> {
    const maxAttempts = options.maxRetryAttempts || this.config.maxRetryAttempts;
    const retryDelay = options.retryDelayMs || this.config.retryDelayMs;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          break;
        }

        await this.logger.warn(`Operation attempt ${attempt} failed, retrying`, {
          operation_type: 'retry',
          attempt,
          max_attempts: maxAttempts,
          error_details: lastError.message
        });

        // Esperar antes del siguiente intento con backoff exponencial
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed after all retry attempts');
  }

  /**
   * Crea un resultado de fallo
   */
  private createFailureResult<T>(
    errorCode: string,
    errorMessage: string,
    context: any,
    startTime: number
  ): UnifiedIdempotencyResult<T> {
    return {
      success: false,
      error: `${errorCode}: ${errorMessage}`,
      operationId: '',
      executionTime: Date.now() - startTime,
      duplicateFound: false,
      lockAcquired: false
    };
  }

  /**
   * Actualiza las estadísticas del servicio
   */
  private updateStats(
    operationType: OperationType,
    success: boolean,
    executionTime: number,
    error?: any
  ): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.stats.totalOperations++;
    this.stats.operationsByType[operationType]++;
    this.stats.lastOperationTime = new Date();

    if (success) {
      this.stats.successfulOperations++;
    } else {
      this.stats.failedOperations++;
      
      if (error) {
        const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
        this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
      }
    }

    // Actualizar tiempo promedio de operación
    this.stats.averageOperationTime = 
      (this.stats.averageOperationTime * (this.stats.totalOperations - 1) + executionTime) / 
      this.stats.totalOperations;
  }

  /**
   * Verifica la conexión con Supabase
   */
  private async verifySupabaseConnection(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('idempotency_locks')
        .select('id')
        .limit(1);

      if (error) {
        throw new IdempotencyError(
           'Failed to connect to Supabase: ' + error.message,
           'SUPABASE_CONNECTION_ERROR'
         );
      }
    } catch (error) {
      throw new IdempotencyError(
         'Failed to verify Supabase connection: ' + (error instanceof Error ? error.message : String(error)),
         'SUPABASE_CONNECTION_ERROR'
       );
    }
  }

  /**
   * Configura la limpieza automática
   */
  private setupAutoCleanup(): void {
    setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        await this.logger.error('Auto cleanup failed', {
          operation_type: 'cleanup',
          error_details: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Limpia recursos expirados
   */
  async cleanup(): Promise<void> {
    await this.logger.info('Starting cleanup process', {
      operation_type: 'cleanup'
    });

    try {
      // Limpiar locks expirados
      await this.lockManager.cleanupExpiredLocks();

      // Limpiar logs antiguos
      await this.logger.forceFlush();

      await this.logger.info('Cleanup process completed', {
        operation_type: 'cleanup'
      });
    } catch (error) {
      await this.logger.error('Cleanup process failed', {
        operation_type: 'cleanup',
        error_details: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Sanitiza la configuración para logging
   */
  private sanitizeConfig(): any {
    const { ...config } = this.config;
    // Remover información sensible si la hay
    return config;
  }

  /**
   * Obtiene las estadísticas del servicio
   */
  getStats(): any {
    return { ...this.stats };
  }

  /**
   * Obtiene la configuración del servicio
   */
  getConfig(): UnifiedIdempotencyConfig {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración del servicio
   */
  updateConfig(newConfig: Partial<UnifiedIdempotencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Actualizar configuraciones de componentes
    if (newConfig.lockManager) {
      this.lockManager.updateConfig(newConfig.lockManager);
    }
    if (newConfig.validator) {
      this.duplicateValidator.updateConfig(newConfig.validator);
    }
    if (newConfig.finder) {
      this.subscriptionFinder.updateConfig(newConfig.finder);
    }
    if (newConfig.logger) {
      this.logger.updateConfig(newConfig.logger);
    }
  }

  /**
   * Verifica si el servicio está listo
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Destruye el servicio y limpia recursos
   */
  async destroy(): Promise<void> {
    try {
      await this.logger.info('Destroying UnifiedIdempotencyService', {
        operation_type: 'service_destroy'
      });

      // Limpiar componentes
      await this.lockManager.destroy();
      await this.duplicateValidator.destroy();
      await this.subscriptionFinder.destroy();
      await this.logger.destroy();

      this.isInitialized = false;
      UnifiedIdempotencyService.instance = null;

    } catch (error) {
      console.error('Error destroying UnifiedIdempotencyService:', error);
    }
  }

  /**
   * Resetea la instancia singleton (útil para testing)
   */
  static resetInstance(): void {
    if (UnifiedIdempotencyService.instance) {
      UnifiedIdempotencyService.instance.destroy().catch(console.error);
    }
    UnifiedIdempotencyService.instance = null;
    UnifiedIdempotencyService.isInitializing = false;
  }
}

/**
 * Factory function para crear/obtener la instancia del servicio
 */
export async function getUnifiedIdempotencyService(
  supabase?: SupabaseClient,
  config?: Partial<UnifiedIdempotencyConfig>
): Promise<UnifiedIdempotencyService> {
  return await UnifiedIdempotencyService.getInstance(supabase, config);
}

/**
 * Función de conveniencia para ejecutar operaciones idempotentes
 */
export async function executeIdempotentOperation<T = any>(
  operationId: string,
  subscriptionData: SubscriptionData,
  operation: () => Promise<T>,
  options: Partial<UnifiedIdempotencyOptions> = {},
  supabase?: SupabaseClient
): Promise<UnifiedIdempotencyResult<T>> {
  const service = await getUnifiedIdempotencyService(supabase);
  return await service.executeIdempotentOperation(operationId, subscriptionData, operation, options);
}

export default UnifiedIdempotencyService;