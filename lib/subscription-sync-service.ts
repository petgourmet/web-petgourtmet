import { supabase } from '@/lib/supabase/client'
import { logger, LogCategory } from '@/lib/logger'

interface SubscriptionSyncParams {
  collection_id?: string
  payment_id?: string
  user_id?: string
  product_id?: number
  payer_email?: string
  transaction_amount?: string
  created_date?: string
  external_reference?: string
}

interface SubscriptionMatch {
  id: number
  user_id: string
  external_reference: string
  status: string
  product_id: number
  transaction_amount: string
  created_at: string
  customer_data: any
  match_criteria: string[]
}

export class SubscriptionSyncService {
  /**
   * Busca suscripciones pendientes usando múltiples criterios cuando el external_reference no coincide
   */
  static async findPendingSubscriptionByAlternativeCriteria(
    params: SubscriptionSyncParams
  ): Promise<SubscriptionMatch | null> {
    try {
      logger.info(LogCategory.SUBSCRIPTION, 'Buscando suscripción por criterios alternativos', {
        collection_id: params.collection_id,
        payment_id: params.payment_id,
        user_id: params.user_id,
        product_id: params.product_id,
        payer_email: params.payer_email,
        external_reference: params.external_reference
      })

      // Construir query base para suscripciones pendientes
      let query = supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'pending')

      const matchCriteria: string[] = []
      let hasValidCriteria = false

      // Criterio 1: Buscar por user_id y product_id (más específico)
      if (params.user_id && params.product_id) {
        query = query.eq('user_id', params.user_id).eq('product_id', params.product_id)
        matchCriteria.push('user_id + product_id')
        hasValidCriteria = true
      }
      // Criterio 2: Buscar solo por user_id si no hay product_id
      else if (params.user_id) {
        query = query.eq('user_id', params.user_id)
        matchCriteria.push('user_id')
        hasValidCriteria = true
      }
      // Criterio 3: Buscar por email del pagador
      else if (params.payer_email) {
        // Buscar en customer_data que contiene el email
        query = query.ilike('customer_data', `%${params.payer_email}%`)
        matchCriteria.push('payer_email')
        hasValidCriteria = true
      }

      if (!hasValidCriteria) {
        logger.warn(LogCategory.SUBSCRIPTION, 'No hay criterios válidos para buscar suscripción', params)
        return null
      }

      // Ejecutar query
      const { data: subscriptions, error } = await query

      if (error) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error buscando suscripciones por criterios alternativos', error.message, {
          params,
          error: error.details
        })
        return null
      }

      if (!subscriptions || subscriptions.length === 0) {
        logger.info(LogCategory.SUBSCRIPTION, 'No se encontraron suscripciones pendientes con los criterios dados', {
          matchCriteria,
          params
        })
        return null
      }

      // Si hay múltiples suscripciones, aplicar filtros adicionales
      let bestMatch = subscriptions[0]

      if (subscriptions.length > 1) {
        logger.info(LogCategory.SUBSCRIPTION, `Encontradas ${subscriptions.length} suscripciones, aplicando filtros adicionales`, {
          subscriptionIds: subscriptions.map(s => s.id),
          matchCriteria
        })

        // Filtrar por monto de transacción si está disponible
        if (params.transaction_amount) {
          const amountMatches = subscriptions.filter(s => 
            s.transaction_amount === params.transaction_amount
          )
          if (amountMatches.length > 0) {
            bestMatch = amountMatches[0]
            matchCriteria.push('transaction_amount')
            logger.info(LogCategory.SUBSCRIPTION, 'Filtrado por monto de transacción', {
              selectedId: bestMatch.id,
              amount: params.transaction_amount
            })
          }
        }

        // Filtrar por fecha de creación (buscar la más reciente dentro de las últimas 24 horas)
        if (params.created_date) {
          const targetDate = new Date(params.created_date)
          const dayBefore = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000)
          const dayAfter = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)

          const dateMatches = subscriptions.filter(s => {
            const subDate = new Date(s.created_at)
            return subDate >= dayBefore && subDate <= dayAfter
          })

          if (dateMatches.length > 0) {
            // Tomar la más reciente
            bestMatch = dateMatches.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            matchCriteria.push('created_date_range')
            logger.info(LogCategory.SUBSCRIPTION, 'Filtrado por rango de fecha', {
              selectedId: bestMatch.id,
              targetDate: params.created_date,
              selectedDate: bestMatch.created_at
            })
          }
        }

        // Si aún hay múltiples, tomar la más reciente
        if (subscriptions.length > 1) {
          bestMatch = subscriptions.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          matchCriteria.push('most_recent')
        }
      }

      logger.info(LogCategory.SUBSCRIPTION, 'Suscripción encontrada por criterios alternativos', {
        subscriptionId: bestMatch.id,
        external_reference: bestMatch.external_reference,
        user_id: bestMatch.user_id,
        product_id: bestMatch.product_id,
        status: bestMatch.status,
        matchCriteria,
        mercadopago_external_reference: params.external_reference
      })

      return {
        ...bestMatch,
        match_criteria: matchCriteria
      }

    } catch (error) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error crítico buscando suscripción por criterios alternativos', 
        error instanceof Error ? error.message : 'Error desconocido', {
        params,
        error: error instanceof Error ? error.stack : error
      })
      return null
    }
  }

  /**
   * Actualiza una suscripción encontrada por criterios alternativos
   */
  static async updateSubscriptionWithMercadoPagoData(
    subscriptionId: number,
    mercadoPagoData: {
      external_reference: string
      collection_id?: string
      payment_id?: string
      mercadopago_subscription_id?: string
      status: string
      payer_email?: string
    }
  ): Promise<boolean> {
    try {
      logger.info(LogCategory.SUBSCRIPTION, 'Actualizando suscripción con datos de MercadoPago', {
        subscriptionId,
        mercadoPagoData
      })

      const updateData: any = {
        status: mercadoPagoData.status,
        updated_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString()
      }

      // Agregar campos opcionales si están disponibles
      if (mercadoPagoData.mercadopago_subscription_id) {
        updateData.mercadopago_subscription_id = mercadoPagoData.mercadopago_subscription_id
      }

      // Actualizar metadata con información de sincronización
      const { data: currentSub } = await supabase
        .from('unified_subscriptions')
        .select('metadata')
        .eq('id', subscriptionId)
        .single()

      if (currentSub?.metadata) {
        try {
          const metadata = typeof currentSub.metadata === 'string' 
            ? JSON.parse(currentSub.metadata) 
            : currentSub.metadata
          
          metadata.sync_info = {
            original_external_reference: metadata.external_reference || 'unknown',
            mercadopago_external_reference: mercadoPagoData.external_reference,
            collection_id: mercadoPagoData.collection_id,
            payment_id: mercadoPagoData.payment_id,
            synced_at: new Date().toISOString(),
            sync_method: 'alternative_criteria'
          }
          
          updateData.metadata = JSON.stringify(metadata)
        } catch (metadataError) {
          logger.warn(LogCategory.SUBSCRIPTION, 'Error procesando metadata, creando nueva', {
            subscriptionId,
            error: metadataError
          })
          
          updateData.metadata = JSON.stringify({
            sync_info: {
              mercadopago_external_reference: mercadoPagoData.external_reference,
              collection_id: mercadoPagoData.collection_id,
              payment_id: mercadoPagoData.payment_id,
              synced_at: new Date().toISOString(),
              sync_method: 'alternative_criteria'
            }
          })
        }
      }

      const { error } = await supabase
        .from('unified_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)

      if (error) {
        logger.error(LogCategory.SUBSCRIPTION, 'Error actualizando suscripción', error.message, {
          subscriptionId,
          updateData,
          error: error.details
        })
        return false
      }

      logger.info(LogCategory.SUBSCRIPTION, 'Suscripción actualizada exitosamente', {
        subscriptionId,
        newStatus: mercadoPagoData.status,
        mercadopago_external_reference: mercadoPagoData.external_reference
      })

      return true

    } catch (error) {
      logger.error(LogCategory.SUBSCRIPTION, 'Error crítico actualizando suscripción', 
        error instanceof Error ? error.message : 'Error desconocido', {
        subscriptionId,
        mercadoPagoData,
        error: error instanceof Error ? error.stack : error
      })
      return false
    }
  }

  /**
   * Extrae información del usuario desde los parámetros de MercadoPago
   */
  static extractUserInfoFromMercadoPagoParams(searchParams: URLSearchParams): {
    collection_id?: string
    payment_id?: string
    external_reference?: string
    status?: string
    payer_email?: string
  } {
    return {
      collection_id: searchParams.get('collection_id') || undefined,
      payment_id: searchParams.get('payment_id') || undefined,
      external_reference: searchParams.get('external_reference') || undefined,
      status: searchParams.get('status') || undefined,
      // El payer_email no viene en los parámetros de URL, se obtendría del webhook
      payer_email: undefined
    }
  }
}