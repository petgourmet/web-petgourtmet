/**
 * Servicio de Idempotencia Mejorado - Versión Servidor
 * Integra deduplicación de suscripciones con idempotencia robusta
 * Usa createServiceClient() para operaciones del servidor
 */

import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
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

    logger.info('Iniciando operación de suscripción con idempotencia (servidor)', 'ENHANCED_IDEMPOTENCY', {
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
          logger.warn('Validación previa falló', 'ENHANCED_IDEMPOTENCY', {
            key,
            reason: validationResult.reason,
            processId: this.processId
          })
          
          return {
            success: false,
            error: validationResult.reason,
            wasAlreadyProcessed: false,
            validationResult,
            processingTimeMs: Date.now() - startTime
          }
        }
        
        externalReference = validationResult.externalReference
        
        logger.info('Validación previa exitosa', 'ENHANCED_IDEMPOTENCY', {
          key,
          externalReference,
          processId: this.processId
        })
        
      } catch (error: any) {
        logger.error('Error en validación previa', 'ENHANCED_IDEMPOTENCY', {
          key,
          error: error.message,
          processId: this.processId
        })
        
        return {
          success: false,
          error: `Error en validación previa: ${error.message}`,
          wasAlreadyProcessed: false,
          processingTimeMs: Date.now() - startTime
        }
      }
    }

    // 2. Verificar si ya existe un resultado previo
    const existingResult = await this.getExistingResult<T>(key)
    if (existingResult) {
      logger.info('Operación ya procesada previamente', 'ENHANCED_IDEMPOTENCY', {
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
        logger.info('Operación completada por otro proceso durante espera', 'ENHANCED_IDEMPOTENCY', {
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
        processingTimeMs: Date.now() - startTime
      }
    }

    // 4. Ejecutar la operación con el lock adquirido
    try {
      logger.info('Ejecutando operación con lock adquirido', 'ENHANCED_IDEMPOTENCY', {
        key,
        externalReference,
        processId: this.processId
      })
      
      // Pasar el external_reference a la operación
      const result = await operation(externalReference || key)
      
      // Guardar el resultado
      await this.saveResult(key, result, ttlSeconds)
      
      logger.info('Operación completada exitosamente', 'ENHANCED_IDEMPOTENCY', {
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
      logger.error('Error ejecutando operación', 'ENHANCED_IDEMPOTENCY', {
        key,
        error: error.message,
        processId: this.processId
      })
      
      return {
        success: false,
        error: error.message,
        wasAlreadyProcessed: false,
        validationResult,
        externalReference,
        processingTimeMs: Date.now() - startTime
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
        logger.debug('Lock adquirido exitosamente', 'ENHANCED_IDEMPOTENCY', {
          key,
          attempt,
          processId: this.processId
        })
        return { acquired: true }
      }
      
      if (attempt < maxRetries) {
        logger.debug('Lock no disponible, reintentando', 'ENHANCED_IDEMPOTENCY', {
          key,
          attempt,
          maxRetries,
          retryDelayMs,
          processId: this.processId
        })
        
        await this.sleep(retryDelayMs)
      }
    }
    
    logger.warn('No se pudo adquirir lock después de todos los reintentos', 'ENHANCED_IDEMPOTENCY', {
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
      logger.error('Error adquiriendo lock', 'ENHANCED_IDEMPOTENCY', {
        key,
        error: error.message,
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
        logger.error('Error liberando lock', 'ENHANCED_IDEMPOTENCY', {
          key,
          error: error.message,
          processId: this.processId
        })
      } else {
        logger.debug('Lock liberado exitosamente', 'ENHANCED_IDEMPOTENCY', {
          key,
          processId: this.processId
        })
      }
      
    } catch (error: any) {
      logger.error('Error liberando lock', 'ENHANCED_IDEMPOTENCY', {
        key,
        error: error.message,
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
        logger.error('Error obteniendo resultado existente', 'ENHANCED_IDEMPOTENCY', {
          key,
          error: error.message,
          processId: this.processId
        })
        return null
      }
      
      return data?.result_data || null
      
    } catch (error: any) {
      logger.error('Error obteniendo resultado existente', 'ENHANCED_IDEMPOTENCY', {
        key,
        error: error.message,
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
      
      logger.debug('Resultado guardado exitosamente', 'ENHANCED_IDEMPOTENCY', {
        key,
        expiresAt,
        processId: this.processId
      })
      
    } catch (error: any) {
      logger.error('Error guardando resultado', 'ENHANCED_IDEMPOTENCY', {
        key,
        error: error.message,
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
        logger.error('Error limpiando locks expirados', 'ENHANCED_IDEMPOTENCY', {
          error: error.message,
          processId: this.processId
        })
      }
      
    } catch (error: any) {
      logger.error('Error limpiando locks expirados', 'ENHANCED_IDEMPOTENCY', {
        error: error.message,
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