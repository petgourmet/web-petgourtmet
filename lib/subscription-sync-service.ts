import { createServiceClient } from '@/lib/supabase/service'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'

interface SubscriptionSyncResult {
  subscription_id: number
  external_reference: string
  old_status: string
  new_status: string
  updated: boolean
  error?: string
}

interface SyncSummary {
  total_processed: number
  updated_count: number
  error_count: number
  results: SubscriptionSyncResult[]
  execution_time_ms: number
}

export class SubscriptionSyncService {
  private client: any
  private preApproval: PreApproval
  private isRunning: boolean = false

  constructor() {
    this.client = createServiceClient()
    
    const mercadoPagoClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
      options: {
        timeout: 5000,
        idempotencyKey: 'sync-service'
      }
    })
    
    this.preApproval = new PreApproval(mercadoPagoClient)
  }

  /**
   * Sincroniza todas las suscripciones activas
   */
  async syncAllSubscriptions(): Promise<SyncSummary> {
    if (this.isRunning) {
      throw new Error('Sync process is already running')
    }

    this.isRunning = true
    const startTime = Date.now()
    
    try {
      console.log('🔄 Iniciando sincronización de todas las suscripciones...')
      
      // Obtener todas las suscripciones que no estén canceladas o expiradas
      const { data: subscriptions, error } = await this.client
        .from('unified_subscriptions')
        .select('id, external_reference, status, user_id, created_at')
        .in('status', ['pending', 'authorized', 'paused'])
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Error fetching subscriptions: ${error.message}`)
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('📋 No hay suscripciones para sincronizar')
        return {
          total_processed: 0,
          updated_count: 0,
          error_count: 0,
          results: [],
          execution_time_ms: Date.now() - startTime
        }
      }

      console.log(`📊 Procesando ${subscriptions.length} suscripciones...`)
      
      const results: SubscriptionSyncResult[] = []
      let updatedCount = 0
      let errorCount = 0

      // Procesar cada suscripción
      for (const subscription of subscriptions) {
        try {
          const result = await this.syncSingleSubscription(subscription.external_reference)
          results.push(result)
          
          if (result.updated) {
            updatedCount++
          }
          
          if (result.error) {
            errorCount++
          }
          
          // Pequeña pausa para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          console.error(`❌ Error procesando suscripción ${subscription.external_reference}:`, error)
          results.push({
            subscription_id: subscription.id,
            external_reference: subscription.external_reference,
            old_status: subscription.status,
            new_status: subscription.status,
            updated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          errorCount++
        }
      }

      const summary: SyncSummary = {
        total_processed: subscriptions.length,
        updated_count: updatedCount,
        error_count: errorCount,
        results,
        execution_time_ms: Date.now() - startTime
      }

      console.log(`✅ Sincronización completada: ${updatedCount}/${subscriptions.length} actualizadas en ${summary.execution_time_ms}ms`)
      
      return summary
      
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Sincroniza una suscripción específica por external_reference
   */
  async syncSingleSubscription(externalReference: string): Promise<SubscriptionSyncResult> {
    try {
      console.log(`🔍 Sincronizando suscripción: ${externalReference}`)
      
      // Obtener datos actuales de la base de datos
      const { data: dbSubscription, error: dbError } = await this.client
        .from('unified_subscriptions')
        .select('id, status, user_id')
        .eq('external_reference', externalReference)
        .single()

      if (dbError || !dbSubscription) {
        throw new Error(`Subscription not found in database: ${externalReference}`)
      }

      // Obtener estado actual desde MercadoPago
      const mpStatus = await this.getMercadoPagoSubscriptionStatus(externalReference)
      
      if (!mpStatus) {
        throw new Error(`Could not fetch status from MercadoPago for: ${externalReference}`)
      }

      const result: SubscriptionSyncResult = {
        subscription_id: dbSubscription.id,
        external_reference: externalReference,
        old_status: dbSubscription.status,
        new_status: mpStatus,
        updated: false
      }

      // Verificar si necesita actualización
      if (dbSubscription.status !== mpStatus) {
        console.log(`🔄 Actualizando estado: ${dbSubscription.status} → ${mpStatus}`)
        
        const { error: updateError } = await this.client
          .from('unified_subscriptions')
          .update({ 
            status: mpStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbSubscription.id)

        if (updateError) {
          throw new Error(`Failed to update subscription: ${updateError.message}`)
        }

        result.updated = true
        
        // Log del cambio de estado
        await this.logStatusChange(dbSubscription.id, dbSubscription.status, mpStatus)
        
      } else {
        console.log(`✅ Estado ya sincronizado: ${mpStatus}`)
      }

      return result
      
    } catch (error) {
      console.error(`❌ Error sincronizando ${externalReference}:`, error)
      return {
        subscription_id: 0,
        external_reference: externalReference,
        old_status: 'unknown',
        new_status: 'unknown',
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Obtiene el estado actual de una suscripción desde MercadoPago
   */
  private async getMercadoPagoSubscriptionStatus(externalReference: string): Promise<string | null> {
    try {
      // Buscar por external_reference
      const searchResponse = await this.preApproval.search({
        filters: {
          external_reference: externalReference
        }
      })

      if (!searchResponse.results || searchResponse.results.length === 0) {
        console.warn(`⚠️ No se encontró suscripción en MP: ${externalReference}`)
        return null
      }

      const subscription = searchResponse.results[0]
      return subscription.status || null
      
    } catch (error) {
      console.error(`❌ Error consultando MP para ${externalReference}:`, error)
      return null
    }
  }

  /**
   * Registra cambios de estado en el log
   */
  private async logStatusChange(subscriptionId: number, oldStatus: string, newStatus: string): Promise<void> {
    try {
      await this.client
        .from('subscription_logs')
        .insert({
          subscription_id: subscriptionId,
          event_type: 'status_sync',
          old_status: oldStatus,
          new_status: newStatus,
          description: `Status synchronized from ${oldStatus} to ${newStatus}`,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('❌ Error logging status change:', error)
      // No lanzar error para no interrumpir la sincronización
    }
  }

  /**
   * Verifica si el servicio está ejecutándose
   */
  isCurrentlyRunning(): boolean {
    return this.isRunning
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  async getSyncStats(): Promise<any> {
    try {
      const { data: stats } = await this.client
        .from('subscription_logs')
        .select('event_type, created_at')
        .eq('event_type', 'status_sync')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      return {
        last_24h_syncs: stats?.length || 0,
        last_sync: stats?.[0]?.created_at || null
      }
    } catch (error) {
      console.error('Error getting sync stats:', error)
      return { last_24h_syncs: 0, last_sync: null }
    }
  }
}

// Singleton instance
const subscriptionSyncService = new SubscriptionSyncService()

export default subscriptionSyncService
export type { SubscriptionSyncResult, SyncSummary }