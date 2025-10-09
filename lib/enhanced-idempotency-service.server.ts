/**
 * Servicio de Idempotencia Mejorado - Versión Servidor
 * Integra deduplicación de suscripciones con idempotencia robusta
 * Usa createServiceClient() para operaciones del servidor
 */

import { createServiceClient } from '@/lib/supabase/service'
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

export class EnhancedIdempotencyServiceServer {
  private static instance: EnhancedIdempotencyServiceServer
  private supabase = createServiceClient()
  private processId: string

  constructor() {
    // Generar ID único para este proceso
    this.processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static getInstance(): EnhancedIdempotencyServiceServer {
    if (!EnhancedIdempotencyServiceServer.instance) {
      EnhancedIdempotencyServiceServer.instance = new EnhancedIdempotencyServiceServer()
    }
    return EnhancedIdempotencyServiceServer.instance
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

    logInfo('Iniciando operación de suscripción con idempotencia (servidor)', {
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
   * Intenta adquirir un lock con reintentos
   */
  private async acquireLockWithRetries(
    key: string, 
    ttlSeconds: number, 
    maxRetries: number, 
    retryDelayMs: number
  ): Promise<{ acquired: boolean; error?: string }> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const lockResult = await this.acquireLock(key, ttlSeconds)
      
      if (lockResult.acquired) {
        logDebug('Lock adquirido exitosamente', {
          key,
          attempt,
          processId: this.processId
        })
        return { acquired: true }
      }
      
      if (attempt < maxRetries) {
        logDebug('Lock no disponible, reintentando', {
          key,
          attempt,
          maxRetries,
          retryDelayMs,
          processId: this.processId
        })
        
        await this.sleep(retryDelayMs)
      }
    }
    
    logWarn('No se pudo adquirir lock después de todos los reintentos', {
      key,
      maxRetries,
      processId: this.processId
    })
    
    return { 
      acquired: false, 
      error: `No se pudo adquirir lock después de ${maxRetries} intentos` 
    }
  }

  /**
   * Intenta adquirir un lock
   */
  private async acquireLock(key: string, ttlSeconds: number): Promise<{ acquired: boolean; error?: string }> {
    try {
      // Limpiar locks expirados primero
      await this.cleanupExpiredLocks()
      
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
      
      const { data, error } = await this.supabase
        .from('idempotency_locks')
        .insert({
          lock_key: key,
          expires_at: expiresAt,
          process_id: this.processId,
          created_at: new Date().toISOString()
        })
        .select()
      
      if (error) {
        // Si es un error de constraint único, significa que el lock ya existe
        if (error.code === '23505') {
          return { acquired: false, error: 'Lock ya existe' }
        }
        throw error
      }
      
      return { acquired: true }
      
    } catch (error: any) {
      logError('Error adquiriendo lock', error, {
        key,
        processId: this.processId
      })
      
      return { acquired: false, error: error.message }
    }
  }

  /**
   * Libera un lock
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
   * Utilidad para dormir
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// NO exportar instancia singleton para evitar inicialización automática
// Las rutas de API deben crear su propia instancia cuando la necesiten
export function createEnhancedIdempotencyServiceServer(): EnhancedIdempotencyServiceServer {
  return new EnhancedIdempotencyServiceServer()
}