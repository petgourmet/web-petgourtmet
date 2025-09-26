import { createServiceClient } from '@/lib/supabase/service';
import { createAdvancedIdempotencyServiceServer } from './advanced-idempotency.service.server';

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

export class SubscriptionSyncServiceServer {
  private supabase: any;
  private advancedIdempotencyService: any;

  constructor() {
    this.supabase = createServiceClient();
    this.advancedIdempotencyService = createAdvancedIdempotencyServiceServer();
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
          const updateResult = await this.updateSubscriptionFromMercadoPagoInternal(directMatch, mercadoPagoData);
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
        const updateResult = await this.updateSubscriptionFromMercadoPagoInternal(
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

    // Retornar el mejor resultado
    if (searchResults.length > 0) {
      const bestResult = searchResults.sort((a, b) => b.score - a.score)[0];
      return {
        found: true,
        subscription: bestResult.subscription,
        matchedCriteria: bestResult.matchedCriteria,
        confidence: bestResult.score >= 85 ? 'high' : bestResult.score >= 65 ? 'medium' : 'low'
      };
    }

    return {
      found: false,
      subscription: null,
      matchedCriteria: [],
      confidence: 'low'
    };
  }

  private shouldCreateNewSubscription(criteria: SyncCriteria, mercadoPagoData: any): boolean {
    // Lógica para determinar si se debe crear una nueva suscripción
    return criteria.externalReference && mercadoPagoData && mercadoPagoData.status === 'approved';
  }

  private async createSubscriptionFromMercadoPago(criteria: SyncCriteria, mercadoPagoData: any): Promise<any> {
    const subscriptionData = {
      external_reference: criteria.externalReference,
      user_id: criteria.userId,
      product_id: criteria.productId,
      status: 'active',
      customer_data: {
        email: criteria.payerEmail,
        ...mercadoPagoData.payer
      },
      payment_data: mercadoPagoData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
   * Método público para actualizar suscripción con datos de MercadoPago
   */
  async updateSubscriptionFromMercadoPago(subscriptionId: string, mercadoPagoData: any): Promise<{ success: boolean; subscription?: any; error?: string }> {
    try {
      const updateData = {
        payment_data: mercadoPagoData,
        status: this.mapMercadoPagoStatusToSubscriptionStatus(mercadoPagoData.status),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Error updating subscription: ${error.message}`
        };
      }

      return {
        success: true,
        subscription: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async updateSubscriptionFromMercadoPagoInternal(subscription: any, mercadoPagoData: any): Promise<any> {
    const updateData = {
      payment_data: mercadoPagoData,
      status: this.mapMercadoPagoStatusToSubscriptionStatus(mercadoPagoData.status),
      updated_at: new Date().toISOString()
    };

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

  private mapMercadoPagoStatusToSubscriptionStatus(mpStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'approved': 'active',
      'pending': 'pending',
      'rejected': 'cancelled',
      'cancelled': 'cancelled',
      'refunded': 'cancelled'
    };

    return statusMap[mpStatus] || 'pending';
  }

  private async logSyncEvent(event: string, data: any): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          event,
          data,
          service: 'SubscriptionSyncServiceServer',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging sync event:', error);
    }
  }
}

// Factory function para crear instancias del servidor
export function createSubscriptionSyncServiceServer(): SubscriptionSyncServiceServer {
  return new SubscriptionSyncServiceServer();
}