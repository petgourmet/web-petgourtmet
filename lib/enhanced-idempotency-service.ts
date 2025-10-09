/**
 * Servicio de Idempotencia Mejorado
 * Integra deduplicación de suscripciones con idempotencia robusta
 */

import { createClient } from '@/lib/supabase/client'
import { logger, LogCategory } from '@/lib/logger'
import { subscriptionDeduplicationService, SubscriptionData, ValidationResult } from './subscription-deduplication-service'

export interface EnhancedIdempotencyOptions {
  key: string
  ttlSeconds?: number
  maxRetries?: number
  retryDelayMs?: number
  enablePreValidation?: boolean
  subscriptionData?: SubscriptionData
}

export interface EnhancedIdempotencyResult<T> {
  success: boolean
  data?: T
  error?: string
  wasAlreadyProcessed: boolean
  validationResult?: ValidationResult
  externalReference?: string
  processingTimeMs?: number
  errorCode?: string
}

export interface IdempotencyLock {
  lock_key: string
  expires_at: string
  created_at: string
  process_id?: string
}

export interface IdempotencyResult {
  result_key: string
  result_data: any
  expires_at: string
  created_at: string
}

const ENHANCED_IDEMPOTENCY_CONTEXT = 'ENHANCED_IDEMPOTENCY'

const withContext = (data?: any) => {
  if (!data) {
    return { context: ENHANCED_IDEMPOTENCY_CONTEXT }
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    return {
      context: ENHANCED_IDEMPOTENCY_CONTEXT,
      ...data
    }
  }

  return {
    context: ENHANCED_IDEMPOTENCY_CONTEXT,
    value: data
  }
}

const logDebug = (message: string, data?: any, metadata?: any) =>
  logger.debug(LogCategory.SUBSCRIPTION, message, withContext(data), metadata)

const logInfo = (message: string, data?: any, metadata?: any) =>
  logger.info(LogCategory.SUBSCRIPTION, message, withContext(data), metadata)

const logWarn = (message: string, data?: any, metadata?: any) =>
  logger.warn(LogCategory.SUBSCRIPTION, message, withContext(data), metadata)

const logError = (message: string, error?: any, data?: any, metadata?: any) =>
  logger.error(LogCategory.SUBSCRIPTION, message, error, withContext(data), metadata)

export class EnhancedIdempotencyService {
  private static instance: EnhancedIdempotencyService
  private supabase = createClient() as any
  private processId: string

  constructor() {
    // Generar ID único para este proceso
    this.processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static getInstance(): EnhancedIdempotencyService {
    if (!EnhancedIdempotencyService.instance) {
      EnhancedIdempotencyService.instance = new EnhancedIdempotencyService()
    }
    return EnhancedIdempotencyService.instance
  }

  /**
   * Ejecuta una operación de suscripción con idempotencia y deduplicación
   */
  async executeSubscriptionWithIdempotency<T>(
    operation: (externalReference: string) => Promise<T>,
    options: EnhancedIdempotencyOptions
  ): Promise<EnhancedIdempotencyResult<T>> {
    const startTime = Date.now()
    const {
      key,
      ttlSeconds = 300,
      maxRetries = 3,
      retryDelayMs = 1000,
      enablePreValidation = true,
      subscriptionData
    } = options

    logInfo('Iniciando operación de suscripción con idempotencia', {
      key,
      ttlSeconds,
      maxRetries,
      enablePreValidation,
      processId: this.processId
    })

    let validationResult: ValidationResult | undefined
    let externalReference: string | undefined

    // 1. Validación previa si está habilitada y hay datos de suscripción
    if (enablePreValidation && subscriptionData) {
      try {
        validationResult = await subscriptionDeduplicationService.validateBeforeCreate(subscriptionData)
        
        if (!validationResult.isValid) {
          logWarn('Validación previa falló', {
            key,
            reason: validationResult.reason,
            processId: this.processId
          })
          
          return {
            success: false,
            error: validationResult.reason,
            wasAlreadyProcessed: false,
            validationResult,
            processingTimeMs: Date.now() - startTime,
            errorCode: 'VALIDATION_FAILED'
          }
        }
        
        externalReference = validationResult.externalReference
        
        logInfo('Validación previa exitosa', {
          key,
          externalReference,
          processId: this.processId
        })
        
      } catch (error: any) {
        logError('Error en validación previa', error, {
          key,
          processId: this.processId
        })
        
        return {
          success: false,
          error: `Error en validación previa: ${error.message}`,
          wasAlreadyProcessed: false,
          processingTimeMs: Date.now() - startTime,
          errorCode: 'VALIDATION_ERROR'
        }
      }
    }

    // 2. Verificar si ya existe un resultado previo
    const existingResult = await this.getExistingResult<T>(key)
    if (existingResult) {
      logInfo('Operación ya procesada previamente', {
        key,
        resultExists: true,
        processId: this.processId
      })
      
      return {
        success: true,
        data: existingResult,
        wasAlreadyProcessed: true,
        validationResult,
        externalReference,
        processingTimeMs: Date.now() - startTime
      }
    }

    // 3. Intentar adquirir lock con reintentos
    const lockResult = await this.acquireLockWithRetries(key, ttlSeconds, maxRetries, retryDelayMs)
    
    if (!lockResult.acquired) {
      // Verificar una vez más si se completó mientras esperábamos
      const finalCheck = await this.getExistingResult<T>(key)
      if (finalCheck) {
        logInfo('Operación completada por otro proceso durante espera', {
          key,
          processId: this.processId
        })
        
        return {
          success: true,
          data: finalCheck,
          wasAlreadyProcessed: true,
          validationResult,
          externalReference,
          processingTimeMs: Date.now() - startTime
        }
      }
      
      return {
        success: false,
        error: lockResult.error || 'No se pudo adquirir lock para procesamiento',
        wasAlreadyProcessed: false,
        validationResult,
        externalReference,
        processingTimeMs: Date.now() - startTime,
        errorCode: 'LOCK_NOT_ACQUIRED'
      }
    }

    // 4. Ejecutar la operación con el lock adquirido
    try {
      logInfo('Ejecutando operación con lock adquirido', {
        key,
        externalReference,
        processId: this.processId
      })
      
      // Pasar el external_reference a la operación
      const result = await operation(externalReference || key)
      
      // Guardar el resultado
      await this.saveResult(key, result, ttlSeconds)
      
      logInfo('Operación completada exitosamente', {
        key,
        externalReference,
        hasResult: !!result,
        processingTimeMs: Date.now() - startTime,
        processId: this.processId
      })
      
      return {
        success: true,
        data: result,
        wasAlreadyProcessed: false,
        validationResult,
        externalReference,
        processingTimeMs: Date.now() - startTime
      }
      
    } catch (error: any) {
      logError('Error ejecutando operación', error, {
        key,
        externalReference,
        processId: this.processId
      })
      
      return {
        success: false,
        error: error.message,
        wasAlreadyProcessed: false,
        validationResult,
        externalReference,
        processingTimeMs: Date.now() - startTime,
        errorCode: 'OPERATION_FAILED'
      }
      
    } finally {
      // Liberar el lock
      await this.releaseLock(key)
    }
  }

  /**
   * Adquiere un lock con reintentos y backoff exponencial
   */
  private async acquireLockWithRetries(
    key: string,
    ttlSeconds: number,
    maxRetries: number,
    retryDelayMs: number
  ): Promise<{ acquired: boolean; error?: string }> {
    
    // Primer intento
    const firstAttempt = await this.acquireLock(key, ttlSeconds)
    if (firstAttempt) {
      return { acquired: true }
    }

    // Reintentos con backoff exponencial
    for (let retry = 0; retry < maxRetries; retry++) {
      const delay = retryDelayMs * Math.pow(2, retry) // Backoff exponencial
      
      logInfo('Lock no disponible, esperando antes de reintentar', {
        key,
        retry: retry + 1,
        maxRetries,
        delayMs: delay,
        processId: this.processId
      })
      
      await this.sleep(delay)
      
      // Limpiar locks expirados antes de reintentar
      await this.cleanupExpiredLocks()
      
      // Intentar adquirir lock nuevamente
      const retryAttempt = await this.acquireLock(key, ttlSeconds)
      if (retryAttempt) {
        return { acquired: true }
      }
    }

    return {
      acquired: false,
      error: `No se pudo adquirir lock después de ${maxRetries} reintentos`
    }
  }

  /**
   * Adquiere un lock distribuido
   */
  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
      
      const { error } = await this.supabase
        .from('idempotency_locks')
        .insert({
          lock_key: key,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          process_id: this.processId
        })
      
      if (error) {
        // Si es error de constraint único, el lock ya existe
        if (error.code === '23505') {
          logDebug('Lock ya existe', {
            key,
            processId: this.processId
          })
          return false
        }
        throw error
      }
      
      logInfo('Lock adquirido exitosamente', {
        key,
        expiresAt,
        processId: this.processId
      })
      return true
      
    } catch (error: any) {
      logError('Error adquiriendo lock', error, {
        key,
        processId: this.processId
      })
      return false
    }
  }

  /**
   * Libera un lock distribuido
   */
  private async releaseLock(key: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('idempotency_locks')
        .delete()
        .eq('lock_key', key)
        .eq('process_id', this.processId)
      
      if (error) {
        logError('Error liberando lock', error, {
          key,
          processId: this.processId
        })
      } else {
        logDebug('Lock liberado exitosamente', {
          key,
          processId: this.processId
        })
      }
      
    } catch (error: any) {
      logError('Error liberando lock', error, {
        key,
        processId: this.processId
      })
    }
  }

  /**
   * Obtiene un resultado existente
   */
  private async getExistingResult<T>(key: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from('idempotency_results')
        .select('result_data')
        .eq('operation_key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      
      if (error) {
        logError('Error obteniendo resultado existente', error, {
          key,
          processId: this.processId
        })
        return null
      }
      
      return data?.result_data || null
      
    } catch (error: any) {
      logError('Error obteniendo resultado existente', error, {
        key,
        processId: this.processId
      })
      return null
    }
  }

  /**
   * Guarda un resultado
   */
  private async saveResult<T>(key: string, result: T, ttlSeconds: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
      
      const { error } = await this.supabase
        .from('idempotency_results')
        .upsert({
          operation_key: key,
          result_data: result,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        })
      
      if (error) {
        throw error
      }
      
      logDebug('Resultado guardado exitosamente', {
        key,
        expiresAt,
        processId: this.processId
      })
      
    } catch (error: any) {
      logError('Error guardando resultado', error, {
        key,
        processId: this.processId
      })
      throw error
    }
  }

  /**
   * Limpia locks expirados
   */
  private async cleanupExpiredLocks(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('idempotency_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())
      
      if (error) {
        logError('Error limpiando locks expirados', error, {
          processId: this.processId
        })
      }
      
    } catch (error: any) {
      logError('Error limpiando locks expirados', error, {
        processId: this.processId
      })
    }
  }

  /**
   * Limpia resultados expirados
   */
  async cleanupExpiredResults(): Promise<{ removed: number; errors: string[] }> {
    const errors: string[] = []
    let removed = 0

    try {
      const { count, error } = await this.supabase
        .from('idempotency_results')
        .delete()
        .lt('expires_at', new Date().toISOString())
      
      if (error) {
        errors.push(`Error limpiando resultados: ${error.message}`)
      } else {
        removed = count || 0
        logInfo('Resultados expirados limpiados', {
          removed,
          processId: this.processId
        })
      }
      
    } catch (error: any) {
      errors.push(`Error general limpiando resultados: ${error.message}`)
    }

    return { removed, errors }
  }

  /**
   * Utilidad para dormir
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Obtiene estadísticas del servicio
   */
  async getStats(): Promise<{
    activeLocks: number
    activeResults: number
    expiredLocks: number
    expiredResults: number
  }> {
    const now = new Date().toISOString()
    
    try {
      const [locksActive, locksExpired, resultsActive, resultsExpired] = await Promise.all([
        this.supabase.from('idempotency_locks').select('*', { count: 'exact' }).gt('expires_at', now),
        this.supabase.from('idempotency_locks').select('*', { count: 'exact' }).lt('expires_at', now),
        this.supabase.from('idempotency_results').select('*', { count: 'exact' }).gt('expires_at', now),
        this.supabase.from('idempotency_results').select('*', { count: 'exact' }).lt('expires_at', now)
      ])

      return {
        activeLocks: locksActive.count || 0,
        activeResults: resultsActive.count || 0,
        expiredLocks: locksExpired.count || 0,
        expiredResults: resultsExpired.count || 0
      }
      
    } catch (error: any) {
      logError('Error obteniendo estadísticas', error, {
        processId: this.processId
      })
      
      return {
        activeLocks: 0,
        activeResults: 0,
        expiredLocks: 0,
        expiredResults: 0
      }
    }
  }
}

// NO exportar instancia singleton para evitar inicialización automática en el cliente
// Los componentes del cliente deben crear su propia instancia cuando la necesiten
export function createEnhancedIdempotencyService(): EnhancedIdempotencyService {
  return new EnhancedIdempotencyService()
}