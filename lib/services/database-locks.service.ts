import { createServiceClient } from '@/lib/supabase/service'
import logger from '@/lib/logger'

export interface LockOptions {
  ttlSeconds?: number
  maxRetries?: number
  retryDelayMs?: number
}

export interface LockResult {
  success: boolean
  lockId?: string
  error?: string
  isAlreadyLocked?: boolean
}

export class DatabaseLocksService {
  private static instance: DatabaseLocksService
  private supabase: any

  private constructor() {
    this.initializeSupabase()
  }

  public static getInstance(): DatabaseLocksService {
    if (!DatabaseLocksService.instance) {
      DatabaseLocksService.instance = new DatabaseLocksService()
    }
    return DatabaseLocksService.instance
  }

  private async initializeSupabase() {
    if (!this.supabase) {
      this.supabase = createServiceClient()
    }
    return this.supabase
  }

  /**
   * Adquiere un lock distribuido en la base de datos
   * @param lockKey - Clave única del lock
   * @param options - Opciones del lock
   * @returns Resultado del lock con ID si es exitoso
   */
  async acquireLock(
    lockKey: string,
    options: LockOptions = {}
  ): Promise<LockResult> {
    const {
      ttlSeconds = 300, // 5 minutos por defecto
      maxRetries = 3,
      retryDelayMs = 1000
    } = options

    await this.initializeSupabase()

    const lockId = this.generateLockId()
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
    const startTime = Date.now()

    logger.info('🔒 Intentando adquirir lock de base de datos', 'DATABASE_LOCK', {
      lockKey,
      lockId,
      ttlSeconds,
      expiresAt
    })

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Limpiar locks expirados antes de intentar adquirir
        await this.cleanExpiredLocks()

        // Intentar insertar el lock
        const { data, error } = await this.supabase
          .from('idempotency_locks')
          .insert({
            lock_key: lockKey,
            lock_id: lockId,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
            metadata: {
              attempt,
              maxRetries,
              service: 'DatabaseLocksService'
            }
          })
          .select()
          .single()

        if (error) {
          // Si es error de duplicado (lock ya existe)
          if (error.code === '23505') {
            logger.warn('🔒 Lock ya existe - verificando si está expirado', 'DATABASE_LOCK', {
              lockKey,
              attempt,
              error: error.message
            })

            // Verificar si el lock existente está expirado
            const existingLock = await this.getLockInfo(lockKey)
            if (existingLock && this.isLockExpired(existingLock)) {
              logger.info('🔓 Lock expirado encontrado - limpiando y reintentando', 'DATABASE_LOCK', {
                lockKey,
                expiredLockId: existingLock.lock_id
              })
              
              await this.forceReleaseLock(lockKey)
              continue // Reintentar
            }

            if (attempt === maxRetries) {
              const duration = Date.now() - startTime
              logger.error('❌ No se pudo adquirir lock después de todos los intentos', 'DATABASE_LOCK', {
                lockKey,
                maxRetries,
                duration
              })
              
              return {
                success: false,
                error: 'Lock no disponible después de múltiples intentos',
                isAlreadyLocked: true
              }
            }

            // Esperar antes del siguiente intento
            await this.sleep(retryDelayMs * attempt)
            continue
          }

          // Otro tipo de error
          logger.error('❌ Error inesperado adquiriendo lock', 'DATABASE_LOCK', {
            lockKey,
            attempt,
            error: error.message
          })
          
          if (attempt === maxRetries) {
            return {
              success: false,
              error: `Error de base de datos: ${error.message}`
            }
          }
          
          await this.sleep(retryDelayMs * attempt)
          continue
        }

        // Lock adquirido exitosamente
        const duration = Date.now() - startTime
        logger.info('✅ Lock adquirido exitosamente', 'DATABASE_LOCK', {
          lockKey,
          lockId,
          attempt,
          duration,
          expiresAt
        })

        return {
          success: true,
          lockId
        }

      } catch (error: any) {
        logger.error('❌ Error crítico adquiriendo lock', 'DATABASE_LOCK', {
          lockKey,
          attempt,
          error: error.message
        })
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Error crítico: ${error.message}`
          }
        }
        
        await this.sleep(retryDelayMs * attempt)
      }
    }

    return {
      success: false,
      error: 'Máximo número de intentos alcanzado'
    }
  }

  /**
   * Libera un lock específico
   * @param lockKey - Clave del lock
   * @param lockId - ID del lock (opcional, para mayor seguridad)
   * @returns true si se liberó exitosamente
   */
  async releaseLock(lockKey: string, lockId?: string): Promise<boolean> {
    await this.initializeSupabase()

    try {
      logger.info('🔓 Liberando lock de base de datos', 'DATABASE_LOCK', {
        lockKey,
        lockId
      })

      let query = this.supabase
        .from('idempotency_locks')
        .delete()
        .eq('lock_key', lockKey)

      // Si se proporciona lockId, usarlo para mayor seguridad
      if (lockId) {
        query = query.eq('lock_id', lockId)
      }

      const { error } = await query

      if (error) {
        logger.error('❌ Error liberando lock', 'DATABASE_LOCK', {
          lockKey,
          lockId,
          error: error.message
        })
        return false
      }

      logger.info('✅ Lock liberado exitosamente', 'DATABASE_LOCK', {
        lockKey,
        lockId
      })

      return true

    } catch (error: any) {
      logger.error('❌ Error crítico liberando lock', 'DATABASE_LOCK', {
        lockKey,
        lockId,
        error: error.message
      })
      return false
    }
  }

  /**
   * Fuerza la liberación de un lock (útil para locks expirados)
   * @param lockKey - Clave del lock
   * @returns true si se liberó exitosamente
   */
  async forceReleaseLock(lockKey: string): Promise<boolean> {
    await this.initializeSupabase()

    try {
      const { error } = await this.supabase
        .from('idempotency_locks')
        .delete()
        .eq('lock_key', lockKey)

      if (error) {
        logger.error('❌ Error forzando liberación de lock', 'DATABASE_LOCK', {
          lockKey,
          error: error.message
        })
        return false
      }

      logger.info('🔓 Lock forzado a liberarse', 'DATABASE_LOCK', {
        lockKey
      })

      return true

    } catch (error: any) {
      logger.error('❌ Error crítico forzando liberación', 'DATABASE_LOCK', {
        lockKey,
        error: error.message
      })
      return false
    }
  }

  /**
   * Verifica si un lock está activo
   * @param lockKey - Clave del lock
   * @returns true si el lock está activo
   */
  async isLockActive(lockKey: string): Promise<boolean> {
    await this.initializeSupabase()

    try {
      const { data, error } = await this.supabase
        .from('idempotency_locks')
        .select('*')
        .eq('lock_key', lockKey)
        .single()

      if (error || !data) {
        return false
      }

      return !this.isLockExpired(data)

    } catch (error: any) {
      logger.error('❌ Error verificando estado del lock', 'DATABASE_LOCK', {
        lockKey,
        error: error.message
      })
      return false
    }
  }

  /**
   * Obtiene información de un lock
   * @param lockKey - Clave del lock
   * @returns Información del lock o null si no existe
   */
  async getLockInfo(lockKey: string): Promise<any | null> {
    await this.initializeSupabase()

    try {
      const { data, error } = await this.supabase
        .from('idempotency_locks')
        .select('*')
        .eq('lock_key', lockKey)
        .single()

      if (error || !data) {
        return null
      }

      return data

    } catch (error: any) {
      logger.error('❌ Error obteniendo información del lock', 'DATABASE_LOCK', {
        lockKey,
        error: error.message
      })
      return null
    }
  }

  /**
   * Limpia todos los locks expirados
   * @returns Número de locks limpiados
   */
  async cleanExpiredLocks(): Promise<number> {
    await this.initializeSupabase()

    try {
      const now = new Date().toISOString()
      
      const { data, error } = await this.supabase
        .from('idempotency_locks')
        .delete()
        .lt('expires_at', now)
        .select()

      if (error) {
        logger.error('❌ Error limpiando locks expirados', 'DATABASE_LOCK', {
          error: error.message
        })
        return 0
      }

      const cleanedCount = data?.length || 0
      
      if (cleanedCount > 0) {
        logger.info('🧹 Locks expirados limpiados', 'DATABASE_LOCK', {
          cleanedCount,
          timestamp: now
        })
      }

      return cleanedCount

    } catch (error: any) {
      logger.error('❌ Error crítico limpiando locks', 'DATABASE_LOCK', {
        error: error.message
      })
      return 0
    }
  }

  /**
   * Ejecuta una función con un lock distribuido
   * @param lockKey - Clave del lock
   * @param fn - Función a ejecutar
   * @param options - Opciones del lock
   * @returns Resultado de la función
   */
  async executeWithLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lockResult = await this.acquireLock(lockKey, options)
    
    if (!lockResult.success) {
      throw new Error(`No se pudo adquirir lock: ${lockResult.error}`)
    }

    try {
      const result = await fn()
      return result
    } finally {
      await this.releaseLock(lockKey, lockResult.lockId)
    }
  }

  // Métodos privados
  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private isLockExpired(lockData: any): boolean {
    const now = new Date()
    const expiresAt = new Date(lockData.expires_at)
    return now > expiresAt
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Exportar instancia singleton
export const databaseLocksService = DatabaseLocksService.getInstance()
export default databaseLocksService