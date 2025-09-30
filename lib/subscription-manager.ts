import { createClient } from '@supabase/supabase-js';
import { 
  generateDeterministicReference, 
  findExistingSubscription, 
  reactivateExistingSubscription,
  ReferenceComponents 
} from './deterministic-reference';

/**
 * Gestor centralizado de suscripciones que previene duplicaciones
 * y maneja la activación automática de manera robusta
 */

export interface CreateSubscriptionParams {
  userId: string;
  userEmail: string;
  productName: string;
  productId: string;
  planType?: string;
  mercadopagoData?: any;
  forceNew?: boolean;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  externalReference: string;
  isReactivation: boolean;
  message: string;
  error?: string;
}

export class SubscriptionManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Crea o reactiva una suscripción de manera inteligente
   */
  async createOrReactivateSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const { userId, userEmail, productName, productId, planType, mercadopagoData, forceNew = false } = params;

    try {
      // 1. Generar external_reference determinístico
      const referenceComponents: ReferenceComponents = {
        userId,
        productId,
        userEmail,
        type: 'new'
      };

      const externalReference = generateDeterministicReference(referenceComponents, {
        includeUserEmail: true,
        maxLength: 64,
        prefix: 'pg'
      });

      // 2. Buscar suscripciones existentes si no se fuerza nueva
      if (!forceNew) {
        const existingSubscription = await findExistingSubscription(
          userId,
          productName,
          externalReference
        );

        if (existingSubscription) {
          // 3a. Reactiva suscripción existente si es posible
          if (existingSubscription.can_reuse) {
            const reactivated = await reactivateExistingSubscription(
              existingSubscription.subscription_id,
              externalReference,
              mercadopagoData
            );

            if (reactivated) {
              return {
                success: true,
                subscriptionId: existingSubscription.subscription_id,
                externalReference,
                isReactivation: true,
                message: 'Suscripción existente reactivada exitosamente'
              };
            }
          } else if (existingSubscription.status === 'active') {
            // 3b. Suscripción ya activa
            return {
              success: true,
              subscriptionId: existingSubscription.subscription_id,
              externalReference: existingSubscription.external_reference,
              isReactivation: false,
              message: 'Suscripción ya está activa'
            };
          }
        }
      }

      // 4. Crear nueva suscripción
      const newSubscription = await this.createNewSubscription({
        userId,
        userEmail,
        productName,
        productId,
        planType,
        externalReference,
        mercadopagoData
      });

      return {
        success: true,
        subscriptionId: newSubscription.id,
        externalReference,
        isReactivation: false,
        message: 'Nueva suscripción creada exitosamente'
      };

    } catch (error: any) {
      console.error('Error en createOrReactivateSubscription:', error);
      
      // Manejar error de duplicación específicamente
      if (error.message?.includes('Ya existe una suscripción activa')) {
        return {
          success: false,
          externalReference: '',
          isReactivation: false,
          message: 'Ya tienes una suscripción activa para este producto',
          error: 'DUPLICATE_SUBSCRIPTION'
        };
      }

      return {
        success: false,
        externalReference: '',
        isReactivation: false,
        message: 'Error al procesar la suscripción',
        error: error.message
      };
    }
  }

  /**
   * Crea una nueva suscripción en la base de datos
   */
  private async createNewSubscription(params: {
    userId: string;
    userEmail: string;
    productName: string;
    productId: string;
    planType?: string;
    externalReference: string;
    mercadopagoData?: any;
  }) {
    const subscriptionData = {
      user_id: params.userId,
      user_email: params.userEmail,
      product_name: params.productName,
      product_id: params.productId,
      plan_type: params.planType || 'monthly',
      external_reference: params.externalReference,
      status: 'pending',
      mercadopago_data: params.mercadopagoData || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando suscripción: ${error.message}`);
    }

    return data;
  }

  /**
   * Activa una suscripción pendiente
   */
  async activateSubscription(
    subscriptionId: string,
    mercadopagoData?: any
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Calcular next_billing_date (30 días desde ahora)
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      const updateData: any = {
        status: 'active',
        activated_at: new Date().toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        updated_at: new Date().toISOString()
      };

      if (mercadopagoData) {
        updateData.mercadopago_data = mercadopagoData;
        updateData.mercadopago_subscription_id = mercadopagoData.id || mercadopagoData.subscription_id;
      }

      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error activando suscripción: ${error.message}`);
      }

      // Crear registro en billing_history
      await this.createBillingRecord(data);

      return {
        success: true,
        message: 'Suscripción activada exitosamente'
      };

    } catch (error: any) {
      console.error('Error en activateSubscription:', error);
      return {
        success: false,
        message: 'Error al activar la suscripción',
        error: error.message
      };
    }
  }

  /**
   * Crea un registro de facturación
   */
  private async createBillingRecord(subscription: any) {
    try {
      const billingData = {
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        amount: subscription.amount || 0,
        currency: subscription.currency || 'MXN',
        status: 'paid',
        payment_date: new Date().toISOString(),
        billing_period_start: new Date().toISOString(),
        billing_period_end: subscription.next_billing_date,
        mercadopago_payment_id: subscription.mercadopago_data?.payment_id,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('billing_history')
        .insert(billingData);

      if (error) {
        console.error('Error creando registro de facturación:', error);
      }
    } catch (error) {
      console.error('Error en createBillingRecord:', error);
    }
  }

  /**
   * Busca suscripción por external_reference con múltiples estrategias
   */
  async findSubscriptionByReference(externalReference: string) {
    try {
      // Búsqueda directa
      let { data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', externalReference)
        .single();

      if (!error && data) {
        return data;
      }

      // Búsqueda por mercadopago_subscription_id
      ({ data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', externalReference)
        .single());

      if (!error && data) {
        return data;
      }

      // Búsqueda en mercadopago_data
      ({ data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('*')
        .or(`mercadopago_data->>external_reference.eq.${externalReference},mercadopago_data->>id.eq.${externalReference}`)
        .single());

      return data;
    } catch (error) {
      console.error('Error buscando suscripción por referencia:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de suscripciones para monitoreo
   */
  async getSubscriptionStats() {
    try {
      const { data, error } = await this.supabase
        .from('unified_subscriptions')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw error;
      }

      const stats = data.reduce((acc: any, sub: any) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      }, {});

      return {
        total: data.length,
        ...stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

// Instancia singleton para uso global
export const subscriptionManager = new SubscriptionManager();