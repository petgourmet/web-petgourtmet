/**
 * Servicio de Idempotencia Robusta
 * Previene procesamiento duplicado usando locks distribuidos en base de datos
 */

import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

export interface IdempotencyOptions {
  key: string
  ttlSeconds?: number
  maxRetries?: number
  retryDelayMs?: number
}

export interface IdempotencyResult<T> {
  success: boolean
  data?: T
  error?: string
  wasAlreadyProcessed: boolean
}

export class IdempotencyService {
  private static instance: IdempotencyService
  private supabase = createServiceClient()

  static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService()
    }
    return IdempotencyService.instance
  }

  /**
   * Ejecuta una operación con garantía de idempotencia
   */
  async executeWithIdempotency<T>(
    operation: () => Promise<T>,
    options: IdempotencyOptions
  ): Promise<IdempotencyResult<T>> {
    const {
      key,
      ttlSeconds = 300, // 5 minutos por defecto
      maxRetries = 3,
      retryDelayMs = 1000
    } = options

    logger.info('Iniciando operación con idempotencia', 'IDEMPOTENCY', {
      key,
      ttlSeconds,
      maxRetries
    })

    // Verificar si ya existe un resultado previo
    const existingResult = await this.getExistingResult<T>(key)
    if (existingResult) {
      logger.info('Operación ya procesada previamente', 'IDEMPOTENCY', {
        key,
        resultExists: true
      })
      return {
        success: true,
        data: existingResult,
        wasAlreadyProcessed: true
      }
    }

    // Intentar adquirir lock
    const lockAcquired = await this.acquireLock(key, ttlSeconds)
    if (!lockAcquired) {
      // Si no se puede adquirir el lock, esperar y reintentar
      for (let retry = 0; retry < maxRetries; retry++) {
        logger.info('Lock no disponible, reintentando', 'IDEMPOTENCY', {
          key,
          retry: retry + 1,
          maxRetries
        })
        
        await this.sleep(retryDelayMs * (retry + 1)) // Backoff exponencial
        
        // Verificar si ya se completó mientras esperábamos
        const resultWhileWaiting = await this.getExistingResult<T>(key)
        if (resultWhileWaiting) {
          logger.info('Operación completada por otro proceso', 'IDEMPOTENCY', {
            key,
            completedWhileWaiting: true
          })
          return {
            success: true,
            data: resultWhileWaiting,
            wasAlreadyProcessed: true
          }
        }
        
        // Intentar adquirir lock nuevamente
        const retryLockAcquired = await this.acquireLock(key, ttlSeconds)
        if (retryLockAcquired) {
          break
        }
        
        if (retry === maxRetries - 1) {
          logger.error('No se pudo adquirir lock después de reintentos', 'IDEMPOTENCY', {
            key,
            maxRetries
          })
          return {
            success: false,
            error: 'No se pudo adquirir lock para procesamiento',
            wasAlreadyProcessed: false
          }
        }
      }
    }

    try {
      // Ejecutar la operación
      logger.info('Ejecutando operación con lock adquirido', 'IDEMPOTENCY', { key })
      const result = await operation()
      
      // Guardar el resultado
      await this.saveResult(key, result, ttlSeconds)
      
      logger.info('Operación completada exitosamente', 'IDEMPOTENCY', {
        key,
        hasResult: !!result
      })
      
      return {
        success: true,
        data: result,
        wasAlreadyProcessed: false
      }
      
    } catch (error: any) {
      logger.error('Error ejecutando operación', 'IDEMPOTENCY', {
        key,
        error: error.message
      })
      
      return {
        success: false,
        error: error.message,
        wasAlreadyProcessed: false
      }
      
    } finally {
      // Liberar el lock
      await this.releaseLock(key)
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
          created_at: new Date().toISOString()
        })
      
      if (error) {
        // Si es error de constraint único, el lock ya existe
        if (error.code === '23505') {
          logger.info('Lock ya existe', 'IDEMPOTENCY', { key })
          return false
        }
        throw error
      }
      
      logger.info('Lock adquirido exitosamente', 'IDEMPOTENCY', {
        key,
        expiresAt
      })
      return true
      
    } catch (error: any) {
      logger.error('Error adquiriendo lock', 'IDEMPOTENCY', {
        key,
        error: error.message
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
      
      if (error) {
        logger.error('Error liberando lock', 'IDEMPOTENCY', {
          key,
          error: error.message
        })
      } else {
        logger.info('Lock liberado exitosamente', 'IDEMPOTENCY', { key })
      }
      
    } catch (error: any) {
      logger.error('Error liberando lock', 'IDEMPOTENCY', {
        key,
        error: error.message
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
        .gte('expires_at', new Date().toISOString())
        .maybeSingle()
      
      if (error) {
        logger.error('Error obteniendo resultado existente', 'IDEMPOTENCY', {
          key,
          error: error.message
        })
        return null
      }
      
      if (data?.result_data) {
        logger.info('Resultado existente encontrado', 'IDEMPOTENCY', { key })
        return typeof data.result_data === 'string' 
          ? JSON.parse(data.result_data) 
          : data.result_data
      }
      
      return null
      
    } catch (error: any) {
      logger.error('Error obteniendo resultado existente', 'IDEMPOTENCY', {
        key,
        error: error.message
      })
      return null
    }
  }

  /**
   * Guarda el resultado de una operación
   */
  private async saveResult<T>(key: string, result: T, ttlSeconds: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
      
      const { error } = await this.supabase
        .from('idempotency_results')
        .upsert({
          operation_key: key,
          result_data: JSON.stringify(result),
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        })
      
      if (error) {
        logger.error('Error guardando resultado', 'IDEMPOTENCY', {
          key,
          error: error.message
        })
      } else {
        logger.info('Resultado guardado exitosamente', 'IDEMPOTENCY', {
          key,
          expiresAt
        })
      }
      
    } catch (error: any) {
      logger.error('Error guardando resultado', 'IDEMPOTENCY', {
        key,
        error: error.message
      })
    }
  }

  /**
   * Limpia locks y resultados expirados
   */
  async cleanup(): Promise<void> {
    try {
      const now = new Date().toISOString()
      
      // Limpiar locks expirados
      const { error: lockError } = await this.supabase
        .from('idempotency_locks')
        .delete()
        .lt('expires_at', now)
      
      if (lockError) {
        logger.error('Error limpiando locks expirados', 'IDEMPOTENCY', {
          error: lockError.message
        })
      }
      
      // Limpiar resultados expirados
      const { error: resultError } = await this.supabase
        .from('idempotency_results')
        .delete()
        .lt('expires_at', now)
      
      if (resultError) {
        logger.error('Error limpiando resultados expirados', 'IDEMPOTENCY', {
          error: resultError.message
        })
      }
      
      logger.info('Limpieza de idempotencia completada', 'IDEMPOTENCY')
      
    } catch (error: any) {
      logger.error('Error en limpieza de idempotencia', 'IDEMPOTENCY', {
        error: error.message
      })
    }
  }

  /**
   * Genera una clave de idempotencia para suscripciones
   */
  static generateSubscriptionKey(userId: string, externalReference: string, action: string): string {
    return `subscription:${action}:${userId}:${externalReference}`
  }

  /**
   * Genera una clave de idempotencia para webhooks
   */
  static generateWebhookKey(webhookId: string, action: string): string {
    return `webhook:${action}:${webhookId}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Exportar instancia singleton
export const idempotencyService = IdempotencyService.getInstance()