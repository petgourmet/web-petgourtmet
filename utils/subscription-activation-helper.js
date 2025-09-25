/**
 * Utilidad mejorada para la activación de suscripciones
 * Maneja la discrepancia entre external_reference de MercadoPago y el sistema local
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables de entorno de Supabase no configuradas');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Busca una suscripción usando múltiples estrategias
 * @param {string} externalReference - El external_reference de MercadoPago
 * @param {string} userId - ID del usuario (opcional)
 * @param {number} productId - ID del producto (opcional)
 * @returns {Promise<{method: string, subscription: object|null}>}
 */
export async function findSubscriptionByReference(externalReference, userId = null, productId = null) {
  console.log(`🔍 Buscando suscripción con external_reference: ${externalReference}`);
  
  try {
    // Estrategia 1: Búsqueda directa por external_reference
    console.log('📋 Estrategia 1: Búsqueda directa por external_reference');
    const { data: directResult, error: directError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('external_reference', externalReference)
      .maybeSingle();
    
    if (!directError && directResult) {
      console.log('✅ Suscripción encontrada por búsqueda directa');
      return { method: 'direct', subscription: directResult };
    }
    
    // Estrategia 2: Búsqueda en metadata por mercadopago_external_reference
    console.log('📋 Estrategia 2: Búsqueda en metadata');
    const { data: metadataResults, error: metadataError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .contains('metadata', { mercadopago_external_reference: externalReference });
    
    if (!metadataError && metadataResults && metadataResults.length > 0) {
      console.log(`✅ Encontradas ${metadataResults.length} suscripciones por metadata`);
      
      // Si hay múltiples resultados, priorizar por usuario y producto
      let selectedSubscription = metadataResults[0];
      
      if (metadataResults.length > 1 && (userId || productId)) {
        const filtered = metadataResults.filter(sub => {
          const matchUser = !userId || sub.user_id === userId;
          const matchProduct = !productId || sub.product_id === productId;
          return matchUser && matchProduct;
        });
        
        if (filtered.length > 0) {
          selectedSubscription = filtered[0];
          console.log('🎯 Suscripción filtrada por usuario/producto');
        }
      }
      
      return { method: 'metadata', subscription: selectedSubscription };
    }
    
    // Estrategia 3: Búsqueda por criterios alternativos (si se proporcionan)
    if (userId && productId) {
      console.log('📋 Estrategia 3: Búsqueda por criterios alternativos');
      const { data: alternativeResults, error: alternativeError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!alternativeError && alternativeResults && alternativeResults.length > 0) {
        console.log(`✅ Encontradas ${alternativeResults.length} suscripciones por criterios alternativos`);
        return { method: 'alternative', subscription: alternativeResults[0] };
      }
    }
    
    console.log('❌ No se encontró ninguna suscripción');
    return { method: 'not_found', subscription: null };
    
  } catch (error) {
    console.error('❌ Error buscando suscripción:', error.message);
    return { method: 'error', subscription: null, error: error.message };
  }
}

/**
 * Activa una suscripción y actualiza su metadata con información de MercadoPago
 * @param {number} subscriptionId - ID de la suscripción
 * @param {string} mercadopagoReference - External reference de MercadoPago
 * @param {object} additionalData - Datos adicionales de MercadoPago
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function activateSubscriptionWithMercadoPagoData(subscriptionId, mercadopagoReference, additionalData = {}) {
  console.log(`🚀 Activando suscripción ${subscriptionId} con datos de MercadoPago`);
  
  try {
    // Obtener la suscripción actual
    const { data: currentSubscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
    
    if (fetchError) {
      return { success: false, error: `Error obteniendo suscripción: ${fetchError.message}` };
    }
    
    if (!currentSubscription) {
      return { success: false, error: 'Suscripción no encontrada' };
    }
    
    // Calcular próxima fecha de facturación
    const nextBillingDate = calculateNextBillingDate(currentSubscription);
    
    // Preparar datos de actualización
    const updateData = {
      status: 'active',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      next_billing_date: nextBillingDate,
      metadata: {
        ...currentSubscription.metadata,
        mercadopago_external_reference: mercadopagoReference,
        activated_by_improved_system: true,
        activation_timestamp: new Date().toISOString(),
        mercadopago_data: {
          ...additionalData,
          processed_at: new Date().toISOString()
        }
      }
    };
    
    // Actualizar la suscripción
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();
    
    if (updateError) {
      return { success: false, error: `Error actualizando suscripción: ${updateError.message}` };
    }
    
    console.log('✅ Suscripción activada exitosamente');
    return { success: true, data: updatedSubscription };
    
  } catch (error) {
    console.error('❌ Error activando suscripción:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Calcula la próxima fecha de facturación basada en la frecuencia de la suscripción
 * @param {object} subscription - Objeto de suscripción
 * @returns {string} - Fecha ISO de la próxima facturación
 */
function calculateNextBillingDate(subscription) {
  const now = new Date();
  const frequency = subscription.frequency || 1;
  const frequencyType = subscription.frequency_type || 'months';
  
  switch (frequencyType) {
    case 'days':
      now.setDate(now.getDate() + frequency);
      break;
    case 'weeks':
      now.setDate(now.getDate() + (frequency * 7));
      break;
    case 'months':
    default:
      now.setMonth(now.getMonth() + frequency);
      break;
  }
  
  return now.toISOString();
}

/**
 * Función principal para procesar la activación de suscripción desde MercadoPago
 * @param {object} mercadopagoParams - Parámetros de MercadoPago
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
export async function processSubscriptionActivationFromMercadoPago(mercadopagoParams) {
  const {
    external_reference,
    collection_id,
    payment_id,
    status,
    collection_status,
    preference_id,
    payment_type,
    site_id,
    user_id,
    product_id
  } = mercadopagoParams;
  
  console.log('🎯 === PROCESANDO ACTIVACIÓN DESDE MERCADOPAGO ===');
  console.log('Parámetros recibidos:', mercadopagoParams);
  
  try {
    // Buscar la suscripción usando múltiples estrategias
    const searchResult = await findSubscriptionByReference(external_reference, user_id, product_id);
    
    if (!searchResult.subscription) {
      return {
        success: false,
        message: `No se encontró suscripción para external_reference: ${external_reference}`,
        searchMethod: searchResult.method
      };
    }
    
    console.log(`✅ Suscripción encontrada usando método: ${searchResult.method}`);
    
    // Verificar si ya está activa
    if (searchResult.subscription.status === 'active') {
      console.log('⚠️ La suscripción ya está activa');
      return {
        success: true,
        message: 'Suscripción ya estaba activa',
        data: searchResult.subscription,
        searchMethod: searchResult.method
      };
    }
    
    // Activar la suscripción
    const activationResult = await activateSubscriptionWithMercadoPagoData(
      searchResult.subscription.id,
      external_reference,
      {
        collection_id,
        payment_id,
        status,
        collection_status,
        preference_id,
        payment_type,
        site_id
      }
    );
    
    if (!activationResult.success) {
      return {
        success: false,
        message: `Error activando suscripción: ${activationResult.error}`,
        searchMethod: searchResult.method
      };
    }
    
    return {
      success: true,
      message: 'Suscripción activada exitosamente',
      data: activationResult.data,
      searchMethod: searchResult.method
    };
    
  } catch (error) {
    console.error('❌ Error procesando activación:', error.message);
    return {
      success: false,
      message: `Error procesando activación: ${error.message}`
    };
  }
}