import { createServiceClient } from '@/lib/supabase/service';
import { createAdvancedIdempotencyService } from './advanced-idempotency.service';

interface SyncCriteria {
  externalReference?: string;
  userId?: string;
  productId?: number;
  payerEmail?: string;
  collectionId?: string;
  paymentId?: string;
  preferenceId?: string;
}

interface SyncResult {
  success: boolean;
  subscription?: any;
  action: 'found' | 'created' | 'updated' | 'failed';
  criteria: string;
  errors: string[];
}

interface AlternativeSearchResult {
  found: boolean;
  subscription?: any;
  matchedCriteria: string[];
  confidence: 'high' | 'medium' | 'low';
}

export class SubscriptionSyncService {
  private static instance: SubscriptionSyncService;
  private supabase: any;

  private constructor() {
    this.supabase = createServiceClient();
  }

  static getInstance(): SubscriptionSyncService {
    if (!SubscriptionSyncService.instance) {
      SubscriptionSyncService.instance = new SubscriptionSyncService();
    }
    return SubscriptionSyncService.instance;
  }

  /**
   * Sincronización robusta con múltiples criterios de búsqueda
   */
  async syncSubscription(criteria: SyncCriteria, mercadoPagoData: any): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // 1. Búsqueda por external_reference (criterio principal)
      if (criteria.externalReference) {
        const directMatch = await this.findByExternalReference(criteria.externalReference);
        if (directMatch) {
          const updateResult = await this.updateSubscriptionFromMercadoPago(directMatch, mercadoPagoData);
          await this.logSyncEvent('direct_match_updated', {
            subscriptionId: directMatch.id,
            externalReference: criteria.externalReference,
            executionTime: Date.now() - startTime
          });
          return {
            success: true,
            subscription: updateResult,
            action: 'updated',
            criteria: 'external_reference',
            errors: []
          };
        }
      }

      // 2. Búsqueda por criterios alternativos
      const alternativeResult = await this.searchByAlternativeCriteria(criteria);
      if (alternativeResult.found && alternativeResult.confidence === 'high') {
        const updateResult = await this.updateSubscriptionFromMercadoPago(
          alternativeResult.subscription,
          mercadoPagoData
        );
        await this.logSyncEvent('alternative_match_updated', {
          subscriptionId: alternativeResult.subscription.id,
          matchedCriteria: alternativeResult.matchedCriteria,
          confidence: alternativeResult.confidence,
          executionTime: Date.now() - startTime
        });
        return {
          success: true,
          subscription: updateResult,
          action: 'updated',
          criteria: alternativeResult.matchedCriteria.join(', '),
          errors: []
        };
      }

      // 3. Si no se encuentra, verificar si debemos crear una nueva suscripción
      if (this.shouldCreateNewSubscription(criteria, mercadoPagoData)) {
        const newSubscription = await this.createSubscriptionFromMercadoPago(criteria, mercadoPagoData);
        await this.logSyncEvent('new_subscription_created', {
          subscriptionId: newSubscription.id,
          externalReference: criteria.externalReference,
          executionTime: Date.now() - startTime
        });
        return {
          success: true,
          subscription: newSubscription,
          action: 'created',
          criteria: 'new_subscription',
          errors: []
        };
      }

      // 4. No se pudo sincronizar
      errors.push('No se pudo encontrar o crear la suscripción');
      await this.logSyncEvent('sync_failed', {
        criteria,
        errors,
        executionTime: Date.now() - startTime
      });

      return {
        success: false,
        action: 'failed',
        criteria: 'none',
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      await this.logSyncEvent('sync_error', {
        criteria,
        error: errorMessage,
        executionTime: Date.now() - startTime
      });

      return {
        success: false,
        action: 'failed',
        criteria: 'error',
        errors
      };
    }
  }

  /**
   * Búsqueda por external_reference
   */
  private async findByExternalReference(externalReference: string): Promise<any> {
    const { data } = await this.supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    return data;
  }

  /**
   * Búsqueda por criterios alternativos con sistema de confianza
   */
  private async searchByAlternativeCriteria(criteria: SyncCriteria): Promise<AlternativeSearchResult> {
    const searchResults: Array<{ subscription: any; matchedCriteria: string[]; score: number }> = [];

    // Búsqueda por user_id + product_id (alta confianza)
    if (criteria.userId && criteria.productId) {
      const { data: userProductMatch } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', criteria.userId)
        .eq('product_id', criteria.productId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (userProductMatch && userProductMatch.length > 0) {
        searchResults.push({
          subscription: userProductMatch[0],
          matchedCriteria: ['user_id', 'product_id'],
          score: 90
        });
      }
    }

    // Búsqueda por email del pagador + product_id (confianza media-alta)
    if (criteria.payerEmail && criteria.productId) {
      const { data: emailProductMatch } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .contains('customer_data', { email: criteria.payerEmail })
        .eq('product_id', criteria.productId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (emailProductMatch && emailProductMatch.length > 0) {
        searchResults.push({
          subscription: emailProductMatch[0],
          matchedCriteria: ['payer_email', 'product_id'],
          score: 75
        });
      }
    }

    // Búsqueda por collection_id o payment_id en metadata (confianza media)
    if (criteria.collectionId || criteria.paymentId) {
      const searchId = criteria.collectionId || criteria.paymentId;
      const { data: metadataMatch } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .or(`metadata->>collection_id.eq.${searchId},metadata->>payment_id.eq.${searchId}`)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (metadataMatch && metadataMatch.length > 0) {
        searchResults.push({
          subscription: metadataMatch[0],
          matchedCriteria: ['collection_id_or_payment_id'],
          score: 60
        });
      }
    }

    // Búsqueda por preference_id en metadata (confianza baja-media)
    if (criteria.preferenceId) {
      const { data: preferenceMatch } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .contains('metadata', { preference_id: criteria.preferenceId })
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (preferenceMatch && preferenceMatch.length > 0) {
        searchResults.push({
          subscription: preferenceMatch[0],
          matchedCriteria: ['preference_id'],
          score: 50
        });
      }
    }

    // Seleccionar el mejor resultado
    if (searchResults.length > 0) {
      const bestMatch = searchResults.reduce((best, current) => 
        current.score > best.score ? current : best
      );

      const confidence = bestMatch.score >= 80 ? 'high' : 
                        bestMatch.score >= 60 ? 'medium' : 'low';

      return {
        found: true,
        subscription: bestMatch.subscription,
        matchedCriteria: bestMatch.matchedCriteria,
        confidence
      };
    }

    return {
      found: false,
      matchedCriteria: [],
      confidence: 'low'
    };
  }

  /**
   * Actualizar suscripción con datos de MercadoPago
   */
  private async updateSubscriptionFromMercadoPago(subscription: any, mercadoPagoData: any): Promise<any> {
    const updateData: any = {
      status: this.mapMercadoPagoStatus(mercadoPagoData.status),
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    // Actualizar metadata con información de MercadoPago
    const currentMetadata = subscription.metadata || {};
    updateData.metadata = {
      ...currentMetadata,
      collection_id: mercadoPagoData.collection_id,
      payment_id: mercadoPagoData.payment_id,
      preference_id: mercadoPagoData.preference_id,
      payment_type: mercadoPagoData.payment_type,
      site_id: mercadoPagoData.site_id,
      last_sync_at: new Date().toISOString()
    };

    // Si no tiene external_reference, agregarlo
    if (!subscription.external_reference && mercadoPagoData.external_reference) {
      updateData.external_reference = mercadoPagoData.external_reference;
    }

    // Actualizar fechas de facturación si es necesario
    if (updateData.status === 'active' && !subscription.start_date) {
      updateData.start_date = new Date().toISOString();
      updateData.next_billing_date = this.calculateNextBillingDate(
        subscription.subscription_type,
        subscription.frequency || 1
      );
    }

    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscription.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Crear nueva suscripción desde datos de MercadoPago
   */
  private async createSubscriptionFromMercadoPago(criteria: SyncCriteria, mercadoPagoData: any): Promise<any> {
    const subscriptionData = {
      user_id: criteria.userId,
      product_id: criteria.productId,
      external_reference: criteria.externalReference,
      status: this.mapMercadoPagoStatus(mercadoPagoData.status),
      subscription_type: 'monthly', // Default, debería venir de los datos
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      customer_data: {
        email: criteria.payerEmail
      },
      metadata: {
        collection_id: mercadoPagoData.collection_id,
        payment_id: mercadoPagoData.payment_id,
        preference_id: mercadoPagoData.preference_id,
        payment_type: mercadoPagoData.payment_type,
        site_id: mercadoPagoData.site_id,
        created_from_sync: true,
        sync_timestamp: new Date().toISOString()
      }
    };

    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Determinar si se debe crear una nueva suscripción
   */
  private shouldCreateNewSubscription(criteria: SyncCriteria, mercadoPagoData: any): boolean {
    // Solo crear si tenemos datos suficientes y el pago está aprobado
    return !!(criteria.externalReference && 
             criteria.userId && 
             criteria.productId && 
             mercadoPagoData.status === 'approved');
  }

  /**
   * Mapear estado de MercadoPago a estado interno
   */
  private mapMercadoPagoStatus(mpStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'approved': 'active',
      'pending': 'processing',
      'rejected': 'failed',
      'cancelled': 'cancelled',
      'refunded': 'cancelled'
    };
    return statusMap[mpStatus] || 'pending';
  }

  /**
   * Calcular próxima fecha de facturación
   */
  private calculateNextBillingDate(subscriptionType: string, frequency: number): string {
    const now = new Date();
    const typeMap: { [key: string]: number } = {
      'weekly': 7,
      'biweekly': 14,
      'monthly': 30,
      'quarterly': 90,
      'semiannual': 180,
      'annual': 365
    };
    
    const days = (typeMap[subscriptionType] || 30) * frequency;
    const nextDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return nextDate.toISOString();
  }

  /**
   * Registrar evento de sincronización
   */
  private async logSyncEvent(eventType: string, data: any): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          operation: `subscription_sync_${eventType}`,
          details: data,
          status: 'completed',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging sync event:', error);
    }
  }

  /**
   * Obtener estadísticas de sincronización
   */
  async getSyncStats(hours: number = 24): Promise<any> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data } = await this.supabase
      .from('sync_logs')
      .select('operation, status, created_at')
      .like('operation', 'subscription_sync_%')
      .gte('created_at', since);

    if (!data) return { total: 0, success: 0, failed: 0, byType: {} };

    const stats = data.reduce((acc: any, log: any) => {
      acc.total++;
      if (log.status === 'completed') acc.success++;
      else acc.failed++;
      
      const type = log.operation.replace('subscription_sync_', '');
      acc.byType[type] = (acc.byType[type] || 0) + 1;
      
      return acc;
    }, { total: 0, success: 0, failed: 0, byType: {} });

    return stats;
  }
}

// Factory function para crear instancias
export function createSubscriptionSyncService(): SubscriptionSyncService {
  return SubscriptionSyncService.getInstance();
}