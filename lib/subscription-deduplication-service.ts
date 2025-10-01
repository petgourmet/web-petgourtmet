/**
 * Servicio de Deduplicación de Suscripciones
 * Implementa generación determinística de external_reference y validaciones previas
 */

import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export interface SubscriptionData {
  userId: string
  planId: string
  amount?: number
  currency?: string
  additionalData?: Record<string, any>
}

export interface ValidationResult {
  isValid: boolean
  reason: string
  externalReference?: string
  existingSubscription?: any
}

export interface DeterministicReferenceOptions {
  includeTimestamp?: boolean
  customSalt?: string
  hashLength?: number
}

export class SubscriptionDeduplicationService {
  private static instance: SubscriptionDeduplicationService
  private supabase = createClient()

  static getInstance(): SubscriptionDeduplicationService {
    if (!SubscriptionDeduplicationService.instance) {
      SubscriptionDeduplicationService.instance = new SubscriptionDeduplicationService()
    }
    return SubscriptionDeduplicationService.instance
  }

  /**
   * Genera un external_reference determinístico
   * Basado en userId, planId y datos adicionales para garantizar unicidad
   */
  generateDeterministicReference(
    subscriptionData: SubscriptionData,
    options: DeterministicReferenceOptions = {}
  ): string {
    // Remover console.log para producción
    const {
      includeTimestamp = false,
      customSalt = '',
      hashLength = 8
    } = options

    const { userId, planId, amount, currency, additionalData } = subscriptionData
    // Remover console.log para producción
    
    // Crear objeto con datos ordenados para hash consistente
    const dataToHash: Record<string, any> = {
      userId,
      planId,
      ...(amount && { amount }),
      ...(currency && { currency }),
      ...(additionalData && additionalData),
      ...(customSalt && { salt: customSalt })
    }

    // Si se incluye timestamp, agregar fecha actual (solo fecha, no hora)
    if (includeTimestamp) {
      dataToHash.date = new Date().toISOString().split('T')[0]
    }

    // Ordenar claves para consistencia
    const sortedKeys = Object.keys(dataToHash).sort()
    const orderedData = sortedKeys.reduce((acc, key) => {
      acc[key] = dataToHash[key]
      return acc
    }, {} as Record<string, any>)

    // Generar hash
    const hashInput = JSON.stringify(orderedData)
    // Remover console.log para producción
    const hash = crypto
      .createHash('md5')
      .update(hashInput)
      .digest('hex')
      .substring(0, hashLength)
    // Remover console.log para producción
    const reference = `SUB-${userId}-${planId}-${hash}`
    // Remover console.log para producción
    logger.info('External reference generado', 'DEDUPLICATION', {
      userId,
      planId,
      reference,
      hashInput: hashInput.substring(0, 100) + '...'
    })

    return reference
  }

  /**
   * Valida si una suscripción puede ser creada (sin duplicados)
   */
  async validateBeforeCreate(
    subscriptionData: SubscriptionData,
    options: DeterministicReferenceOptions = {}
  ): Promise<ValidationResult> {
    const { userId, planId } = subscriptionData

    logger.info('Iniciando validación previa', 'DEDUPLICATION', {
      userId,
      planId
    })

    try {
      // Generar external_reference determinístico
      const externalReference = this.generateDeterministicReference(
        subscriptionData,
        options
      )

      // Verificar si ya existe una suscripción con este external_reference
      const { data: existingByReference, error: refError } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', externalReference)
        .maybeSingle()

      if (refError) {
        logger.error('Error verificando external_reference', 'DEDUPLICATION', {
          externalReference,
          error: refError.message
        })
        return {
          isValid: false,
          reason: `Error verificando duplicados: ${refError.message}`,
          externalReference
        }
      }

      if (existingByReference) {
        logger.warn('Suscripción duplicada encontrada por external_reference', 'DEDUPLICATION', {
          externalReference,
          existingId: existingByReference.id,
          existingStatus: existingByReference.status
        })
        return {
          isValid: false,
          reason: 'Ya existe una suscripción con este external_reference',
          externalReference,
          existingSubscription: existingByReference
        }
      }

      // Verificar suscripciones activas del usuario para el mismo plan
      logger.info('Buscando suscripciones activas', 'DEDUPLICATION', {
        userId,
        planId,
        searchBy: 'product_id'
      })
      const { data: activeSubs, error: activeError } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', planId)
        .in('status', ['active', 'pending', 'processing'])
        .limit(5)

      if (activeError) {
        logger.error('Error verificando suscripciones activas', 'DEDUPLICATION', {
          userId,
          planId,
          error: activeError.message
        })
        return {
          isValid: false,
          reason: `Error verificando suscripciones activas: ${activeError.message}`,
          externalReference
        }
      }

      if (activeSubs && activeSubs.length > 0) {
        // Separar suscripciones por estado para mejor manejo
        const pendingSubs = activeSubs.filter(sub => sub.status === 'pending')
        const activeSubs_filtered = activeSubs.filter(sub => sub.status === 'active')
        const processingSubs = activeSubs.filter(sub => sub.status === 'processing')
        
        logger.warn('Usuario ya tiene suscripciones activas para este plan', 'DEDUPLICATION', {
          userId,
          planId,
          activeCount: activeSubs.length,
          pendingCount: pendingSubs.length,
          activeCount_filtered: activeSubs_filtered.length,
          processingCount: processingSubs.length,
          activeIds: activeSubs.map(s => s.id)
        })
        
        // Si solo hay suscripciones pendientes, permitir gestión más flexible
        if (pendingSubs.length > 0 && activeSubs_filtered.length === 0 && processingSubs.length === 0) {
          return {
            isValid: false,
            reason: `Ya existe una suscripción pendiente para este producto. Puedes continuar con ella o cancelarla para crear una nueva.`,
            externalReference,
            existingSubscription: pendingSubs[0]
          }
        }
        
        // Si hay suscripciones activas o en procesamiento, ser más restrictivo
        return {
          isValid: false,
          reason: `Ya existe una suscripción activa para este usuario y producto. User ID: ${userId}, Product ID: ${planId}`,
          externalReference,
          existingSubscription: activeSubs[0]
        }
      }

      // Verificar suscripciones recientes (últimos 5 minutos) para detectar posibles duplicados
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      logger.info('Buscando suscripciones recientes', 'DEDUPLICATION', {
        userId,
        planId,
        searchBy: 'product_id',
        since: fiveMinutesAgo
      })
      const { data: recentSubs, error: recentError } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', planId)
        .gte('created_at', fiveMinutesAgo)
        .limit(3)

      if (recentError) {
        logger.error('Error verificando suscripciones recientes', 'DEDUPLICATION', {
          userId,
          planId,
          error: recentError.message
        })
        // No fallar por este error, solo loggearlo
      } else if (recentSubs && recentSubs.length > 0) {
        logger.warn('Suscripciones recientes encontradas', 'DEDUPLICATION', {
          userId,
          planId,
          recentCount: recentSubs.length,
          recentIds: recentSubs.map(s => s.id)
        })
        return {
          isValid: false,
          reason: `Usuario creó ${recentSubs.length} suscripción(es) reciente(s) para este plan`,
          externalReference,
          existingSubscription: recentSubs[0]
        }
      }

      logger.info('Validación previa exitosa', 'DEDUPLICATION', {
        userId,
        planId,
        externalReference
      })

      return {
        isValid: true,
        reason: 'No se encontraron duplicados',
        externalReference
      }

    } catch (error: any) {
      logger.error('Error en validación previa', 'DEDUPLICATION', {
        userId,
        planId,
        error: error.message
      })
      return {
        isValid: false,
        reason: `Error interno: ${error.message}`
      }
    }
  }

  /**
   * Genera una clave de idempotencia para operaciones de suscripción
   */
  generateIdempotencyKey(
    subscriptionData: SubscriptionData,
    operation: string = 'create'
  ): string {
    try {
      // Remover console.log para producción
      const userId = subscriptionData.user_id || subscriptionData.userId;
      const planId = subscriptionData.plan_id || subscriptionData.planId;
      const amount = subscriptionData.amount || subscriptionData.transaction_amount;
      
      // Remover console.log para producción
      const externalReference = generateDeterministicReference(subscriptionData);
      
      // Remover console.log para producción
      const key = `subscription_${userId}_${planId}_${externalReference}`;
      
      // Remover console.log para producción
      return key;
    } catch (error) {
      console.error('🔑 [ERROR] Error en generateIdempotencyKey:', error)
      throw error
    }
  }

  /**
   * Valida y genera datos completos para crear una suscripción
   */
  async prepareSubscriptionData(
    subscriptionData: SubscriptionData,
    options: DeterministicReferenceOptions = {}
  ): Promise<{
    isValid: boolean
    data?: {
      externalReference: string
      idempotencyKey: string
      validationResult: ValidationResult
    }
    error?: string
  }> {
    try {
      // Validar antes de crear
      const validationResult = await this.validateBeforeCreate(subscriptionData, options)
      
      if (!validationResult.isValid) {
        return {
          isValid: false,
          error: validationResult.reason
        }
      }

      // Generar clave de idempotencia
      const idempotencyKey = this.generateIdempotencyKey(subscriptionData)

      return {
        isValid: true,
        data: {
          externalReference: validationResult.externalReference!,
          idempotencyKey,
          validationResult
        }
      }

    } catch (error: any) {
      logger.error('Error preparando datos de suscripción', 'DEDUPLICATION', {
        subscriptionData,
        error: error.message
      })
      return {
        isValid: false,
        error: `Error preparando datos: ${error.message}`
      }
    }
  }

  /**
   * Limpia suscripciones duplicadas existentes (utilidad de mantenimiento)
   */
  async cleanupDuplicates(dryRun: boolean = true): Promise<{
    duplicatesFound: number
    duplicatesRemoved: number
    errors: string[]
  }> {
    logger.info('Iniciando limpieza de duplicados', 'DEDUPLICATION', { dryRun })

    const errors: string[] = []
    let duplicatesFound = 0
    let duplicatesRemoved = 0

    try {
      // Buscar duplicados por external_reference
      const { data: duplicates, error } = await this.supabase
        .from('unified_subscriptions')
        .select('external_reference, id, created_at, status')
        .order('external_reference')
        .order('created_at')

      if (error) {
        errors.push(`Error buscando duplicados: ${error.message}`)
        return { duplicatesFound, duplicatesRemoved, errors }
      }

      // Agrupar por external_reference
      const grouped = duplicates?.reduce((acc, sub) => {
        if (!acc[sub.external_reference]) {
          acc[sub.external_reference] = []
        }
        acc[sub.external_reference].push(sub)
        return acc
      }, {} as Record<string, any[]>) || {}

      // Identificar duplicados (más de 1 por external_reference)
      for (const [externalRef, subs] of Object.entries(grouped)) {
        if (subs.length > 1) {
          duplicatesFound += subs.length - 1
          
          // Mantener el más antiguo, eliminar los demás
          const toRemove = subs.slice(1)
          
          logger.info('Duplicados encontrados', 'DEDUPLICATION', {
            externalReference: externalRef,
            total: subs.length,
            toRemove: toRemove.length,
            keepId: subs[0].id,
            removeIds: toRemove.map(s => s.id)
          })

          if (!dryRun) {
            for (const sub of toRemove) {
              const { error: deleteError } = await this.supabase
                .from('unified_subscriptions')
                .delete()
                .eq('id', sub.id)

              if (deleteError) {
                errors.push(`Error eliminando duplicado ${sub.id}: ${deleteError.message}`)
              } else {
                duplicatesRemoved++
              }
            }
          }
        }
      }

      logger.info('Limpieza de duplicados completada', 'DEDUPLICATION', {
        duplicatesFound,
        duplicatesRemoved,
        errorsCount: errors.length,
        dryRun
      })

    } catch (error: any) {
      errors.push(`Error general en limpieza: ${error.message}`)
    }

    return { duplicatesFound, duplicatesRemoved, errors }
  }
}

// Exportar instancia singleton
export const subscriptionDeduplicationService = SubscriptionDeduplicationService.getInstance()