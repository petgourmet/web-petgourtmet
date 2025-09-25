/**
 * Interfaces y tipos para el Sistema de Idempotencia Unificado
 * Fase 1: Estabilización del sistema de suscripciones
 * 
 * Este archivo contiene todas las definiciones de tipos necesarias
 * para el UnifiedIdempotencyService y sus componentes.
 */

// =====================================================
// TIPOS BÁSICOS
// =====================================================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export type SearchStrategy = 
  | 'exact_reference' 
  | 'user_product_amount' 
  | 'email_time_range' 
  | 'collection_payment_id' 
  | 'fuzzy_reference'
  | 'exact'
  | 'fuzzy'
  | 'composite'
  | 'smart';

export type OperationType = 
  | 'idempotency_start'
  | 'idempotency_success'
  | 'idempotency_error'
  | 'lock_acquired'
  | 'lock_released'
  | 'validation_start'
  | 'validation_success'
  | 'validation_failed'
  | 'search_start'
  | 'search_found'
  | 'search_not_found'
  | 'duplicate_detected'
  | 'operation_executed';

// =====================================================
// INTERFACES PRINCIPALES
// =====================================================

/**
 * Datos de suscripción para validación y búsqueda
 */
export interface SubscriptionData {
  id?: string;
  user_id: string;
  product_id: number;
  amount: number;
  external_reference?: string;
  payer_email?: string;
  collection_id?: string;
  payment_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Opciones de configuración para el UnifiedIdempotencyService
 */
export interface UnifiedIdempotencyOptions {
  // Configuración básica
  key: string;
  ttlSeconds?: number;
  maxRetries?: number;
  maxRetryAttempts?: number;
  retryDelayMs?: number;
  
  // Configuración de suscripciones
  subscriptionData?: SubscriptionData;
  enableSmartSearch?: boolean;
  enablePreValidation?: boolean;
  
  // Configuración de logging
  logLevel?: LogLevel;
  enableDetailedLogging?: boolean;
  
  // Configuración avanzada
  skipLockAcquisition?: boolean;
  customValidationRules?: ValidationRule[];
  searchStrategies?: SearchStrategy[];
  
  // Contexto adicional
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
}

/**
 * Resultado de la ejecución con idempotencia
 */
export interface UnifiedIdempotencyResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  
  // Metadata de operación
  operationId: string;
  executionTime: number;
  lockAcquired: boolean;
  duplicateFound: boolean;
  
  // Información de debugging
  searchCriteria?: SearchCriteria[];
  validationResults?: ValidationResult[];
  logEntries?: LogEntry[];
  
  // Información del duplicado (si se encontró)
  duplicateDetails?: {
    subscriptionId: string;
    matchStrategy: SearchStrategy;
    confidence: number;
    foundAt: string;
  };
  
  // Métricas de performance
  metrics?: {
    lockAcquisitionTime: number;
    validationTime: number;
    searchTime: number;
    operationTime: number;
    totalTime: number;
  };
}

// =====================================================
// INTERFACES PARA COMPONENTES
// =====================================================

/**
 * Resultado de adquisición de lock
 */
export interface LockResult {
  acquired: boolean;
  lockId?: string;
  expiresAt?: Date;
  attempt?: number;
  error?: string;
  retryAfter?: number;
}

/**
 * Información de lock activo
 */
export interface LockInfo {
  id: string;
  key: string;
  lockId: string;
  acquiredAt: Date;
  expiresAt: Date;
  operationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Criterio de búsqueda
 */
export interface SearchCriteria {
  strategy: SearchStrategy;
  field: string;
  value: any;
  operator?: 'eq' | 'like' | 'in' | 'gte' | 'lte';
  timeRange?: {
    start: Date;
    end: Date;
  };
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  
  // Campos específicos de búsqueda
  order_id?: string;
  email?: string;
  user_id?: string;
  external_reference?: string;
  product_id?: string;
  phone?: string;
  status?: string | string[];
}

/**
 * Resultado de búsqueda de suscripción
 */
export interface SubscriptionMatch {
  subscription: SubscriptionData;
  matchStrategy: SearchStrategy;
  confidence: number;
  searchId: string;
  matchedFields?: string[];
  searchTime?: number;
}

/**
 * Regla de validación personalizada
 */
export interface ValidationRule {
  name: string;
  description: string;
  validator: (data: SubscriptionData) => Promise<ValidationCheck>;
  priority: number;
  enabled: boolean;
  baseConfidence?: number;
  timeWindowHours?: number;
}

/**
 * Resultado de validación individual
 */
export interface ValidationCheck {
  criterion: string;
  passed: boolean;
  details?: any;
  message?: string;
  executionTime?: number;
}

/**
 * Resultado completo de validación
 */
export interface ValidationResult {
  isValid: boolean;
  validationId: string;
  executionTime: number;
  checks: ValidationCheck[];
  failedChecks: ValidationCheck[];
  duplicateFound: boolean;
  duplicateDetails?: any;
  recommendations?: string[];
}

/**
 * Entrada de log detallado
 */
export interface LogEntry {
  id?: string;
  timestamp: Date;
  operationId: string;
  operationType: OperationType;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  details?: Record<string, any>;
  createdAt?: Date;
  
  // Contexto de suscripción
  subscriptionId?: string;
  userId?: string;
  externalReference?: string;
  
  // Métricas de performance
  executionTimeMs?: number;
  memoryUsageMb?: number;
  durationMs?: number;
  errorDetails?: any;
  metadata?: any;
  
  // Información de debugging
  stackTrace?: string;
  requestId?: string;
  sessionId?: string;
}

/**
 * Configuración del logger
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableDatabase: boolean;
  enableFile: boolean;
  maxLogSize: number;
  retentionDays: number;
  batchSize: number;
  flushInterval: number;
  bufferSize: number;
  enableMetrics?: boolean;
  contextFields?: string[];
}

// =====================================================
// INTERFACES PARA ESTADÍSTICAS Y MONITOREO
// =====================================================

/**
 * Estadísticas de locks
 */
export interface LockStatistics {
  totalLocks: number;
  activeLocks: number;
  expiredLocks: number;
  releasedLocks: number;
  averageLockDuration: number;
  lockSuccessRate: number;
  mostUsedKeys: Array<{
    key: string;
    count: number;
  }>;
}

/**
 * Estadísticas de operaciones
 */
export interface OperationStatistics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  duplicatesDetected: number;
  averageExecutionTime: number;
  operationsByType: Record<OperationType, number>;
  errorsByType: Record<string, number>;
}

/**
 * Métricas de performance
 */
export interface PerformanceMetrics {
  timestamp: Date;
  operationId: string;
  
  // Tiempos de ejecución
  lockAcquisitionTime: number;
  validationTime: number;
  searchTime: number;
  operationTime: number;
  totalTime: number;
  
  // Uso de recursos
  memoryUsage: number;
  cpuUsage?: number;
  
  // Contadores
  retryCount: number;
  validationChecks: number;
  searchStrategies: number;
}

// =====================================================
// TIPOS DE CONFIGURACIÓN
// =====================================================

/**
 * Configuración del DatabaseLockManager
 */
export interface DatabaseLockConfig {
  defaultTtlSeconds: number;
  maxRetries: number;
  retryDelayMs: number;
  cleanupIntervalMs: number;
  enableAutoCleanup?: boolean;
  lockTimeoutMs?: number;
  lockPrefix?: string;
  enableStats?: boolean;
  backoffMultiplier?: number;
}

/**
 * Configuración del DuplicateValidator
 */
export interface DuplicateValidatorConfig {
  enableExactReference?: boolean;
  enableUserProductAmount?: boolean;
  enableEmailTimeRange?: boolean;
  emailTimeRangeMinutes?: number;
  userProductTimeRangeMinutes?: number;
  enableCustomRules?: boolean;
  strictMode?: boolean;
  enableStats?: boolean;
  customRules?: ValidationRule[];
  
  // Propiedades adicionales necesarias
  enableStrictValidation?: boolean;
  maxValidationTimeMs?: number;
  enableBatchValidation?: boolean;
  batchSize?: number;
  strictEmailValidation?: boolean;
  validateExternalReference?: boolean;
  validateOrderId?: boolean;
}

/**
 * Configuración del SmartSubscriptionFinder
 */
export interface SmartSubscriptionFinderConfig {
  enabledStrategies: SearchStrategy[];
  confidenceThreshold: number;
  maxSearchTime: number;
  enableFuzzySearch: boolean;
  fuzzySearchThreshold: number;
  cacheResults: boolean;
  cacheTimeoutMs: number;
  maxResults: number;
  cacheExpiryMs?: number;
  enableStats?: boolean;
  searchTimeoutMs?: number;
  fuzzyThreshold?: number;
  enableCache?: boolean;
  defaultStrategy?: SearchStrategy;
  enableBatchSearch?: boolean;
  batchSize?: number;
}

/**
 * Configuración completa del UnifiedIdempotencyService
 */
export interface UnifiedIdempotencyConfig {
  lockManager: DatabaseLockConfig;
  validator: DuplicateValidatorConfig;
  finder: SmartSubscriptionFinderConfig;
  logger: LoggerConfig;
  
  // Configuración global
  enableMetrics: boolean;
  enableStatistics: boolean;
  enableHealthCheck: boolean;
  healthCheckIntervalMs: number;
  cleanupIntervalMs: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
  enablePreValidation: boolean;
}

// =====================================================
// TIPOS DE ERROR
// =====================================================

export class IdempotencyError extends Error {
  constructor(
    message: string,
    public code: string,
    public operationId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'IdempotencyError';
  }
}

export class LockAcquisitionError extends IdempotencyError {
  constructor(message: string, operationId?: string, details?: any) {
    super(message, 'LOCK_ACQUISITION_FAILED', operationId, details);
    this.name = 'LockAcquisitionError';
  }
}

export class ValidationError extends IdempotencyError {
  constructor(message: string, operationId?: string, details?: any) {
    super(message, 'VALIDATION_FAILED', operationId, details);
    this.name = 'ValidationError';
  }
}

export class DuplicateFoundError extends IdempotencyError {
  constructor(
    message: string,
    public duplicateData: any,
    operationId?: string
  ) {
    super(message, 'DUPLICATE_FOUND', operationId, duplicateData);
    this.name = 'DuplicateFoundError';
  }
}

// =====================================================
// CONSTANTES
// =====================================================

export const DEFAULT_CONFIG: UnifiedIdempotencyConfig = {
  lockManager: {
    defaultTtlSeconds: 300,
    maxRetries: 3,
    retryDelayMs: 1000,
    cleanupIntervalMs: 60000,
    enableAutoCleanup: true,
    lockTimeoutMs: 30000
  },
  validator: {
    enableExactReference: true,
    enableUserProductAmount: true,
    enableEmailTimeRange: true,
    emailTimeRangeMinutes: 5,
    userProductTimeRangeMinutes: 10,
    enableCustomRules: false,
    strictMode: false
  },
  finder: {
    enabledStrategies: [
      'exact_reference',
      'user_product_amount',
      'email_time_range',
      'collection_payment_id'
    ],
    confidenceThreshold: 0.8,
    maxSearchTime: 5000,
    enableFuzzySearch: false,
    fuzzySearchThreshold: 0.7,
    cacheResults: true,
    cacheTimeoutMs: 300000,
    maxResults: 50
  },
  logger: {
    level: 'info',
    enableConsole: true,
    enableDatabase: true,
    enableFile: false,
    maxLogSize: 1000000,
    retentionDays: 30,
    batchSize: 100,
    flushInterval: 5000,
    bufferSize: 1000
  },
  enableMetrics: true,
  enableStatistics: true,
  enableHealthCheck: true,
  healthCheckIntervalMs: 30000,
  cleanupIntervalMs: 60000,
  maxRetryAttempts: 3,
  retryDelayMs: 1000,
  enablePreValidation: true
};

// =====================================================
// TIPOS AUXILIARES
// =====================================================

/**
 * Tipo para funciones de operación idempotente
 */
export type IdempotentOperation<T = any> = () => Promise<T>;

/**
 * Tipo para callbacks de eventos
 */
export type EventCallback<T = any> = (data: T) => void | Promise<void>;

/**
 * Eventos del sistema de idempotencia
 */
export interface IdempotencyEvents {
  'lock:acquired': EventCallback<{ operationId: string; lockId: string }>;
  'lock:released': EventCallback<{ operationId: string; lockId: string }>;
  'lock:failed': EventCallback<{ operationId: string; error: string }>;
  'validation:started': EventCallback<{ operationId: string; data: SubscriptionData }>;
  'validation:passed': EventCallback<{ operationId: string; result: ValidationResult }>;
  'validation:failed': EventCallback<{ operationId: string; result: ValidationResult }>;
  'duplicate:found': EventCallback<{ operationId: string; duplicate: SubscriptionMatch }>;
  'operation:completed': EventCallback<{ operationId: string; result: UnifiedIdempotencyResult }>;
  'error:occurred': EventCallback<{ operationId: string; error: Error }>;
}

/**
 * Tipo para el estado del sistema
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: {
    lockManager: 'up' | 'down' | 'degraded';
    validator: 'up' | 'down' | 'degraded';
    finder: 'up' | 'down' | 'degraded';
    logger: 'up' | 'down' | 'degraded';
    database: 'up' | 'down' | 'degraded';
  };
  metrics: {
    activeLocks: number;
    operationsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
  };
  issues?: string[];
}