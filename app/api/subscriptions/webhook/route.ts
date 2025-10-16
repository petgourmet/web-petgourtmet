import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookValidationService } from '@/lib/services/webhook-validation-service';
import { detailedLogger } from '@/lib/detailed-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const webhookValidator = WebhookValidationService.getInstance();

  try {
    detailedLogger.info('🔔 Webhook recibido', {
      timestamp: new Date().toISOString(),
      endpoint: '/api/subscriptions/webhook'
    });

    // Obtener headers y payload
    const signature = request.headers.get('x-signature') || '';
    const timestamp = request.headers.get('x-request-id') || Date.now().toString();
    const payload = await request.text();

    // Validación ultra-rápida del webhook
    const validationResult = await webhookValidator.validateWebhook(
      payload,
      signature,
      timestamp
    );

    if (!validationResult.isValid) {
      detailedLogger.error('❌ Webhook inválido', {
        error: validationResult.error,
        processingTime: `${validationResult.processingTime}ms`
      });
      
      return NextResponse.json(
        { 
          error: 'Webhook inválido',
          reason: validationResult.error,
          processingTime: `${validationResult.processingTime}ms`
        },
        { status: 400 }
      );
    }

    const webhookData = validationResult.data!;
    const webhookInfo = webhookValidator.extractWebhookInfo(webhookData);

    detailedLogger.info('✅ Webhook validado', {
      type: webhookInfo.type,
      action: webhookInfo.action,
      resourceId: webhookInfo.resourceId,
      validationTime: `${validationResult.processingTime}ms`
    });

    // Procesamiento según tipo de webhook
    let processingResult;
    
    switch (webhookInfo.type) {
      case 'preapproval':
        processingResult = await processSubscriptionWebhook(webhookInfo);
        break;
      case 'payment':
        processingResult = await processPaymentWebhook(webhookInfo);
        break;
      default:
        detailedLogger.warn('⚠️ Tipo de webhook no procesado', {
          type: webhookInfo.type
        });
        return NextResponse.json({ 
          message: 'Webhook recibido pero no procesado',
          type: webhookInfo.type 
        });
    }

    const totalProcessingTime = Date.now() - startTime;

    detailedLogger.info('✅ Webhook procesado exitosamente', {
      type: webhookInfo.type,
      action: webhookInfo.action,
      totalProcessingTime: `${totalProcessingTime}ms`,
      result: processingResult
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook procesado exitosamente',
      processingTime: `${totalProcessingTime}ms`,
      result: processingResult
    });

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    
    detailedLogger.error('❌ Error procesando webhook', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${totalProcessingTime}ms`
    });

    return NextResponse.json(
      { 
        error: 'Error interno procesando webhook',
        processingTime: `${totalProcessingTime}ms`
      },
      { status: 500 }
    );
  }
}

async function processSubscriptionWebhook(webhookInfo: any) {
  const supabase = createClient();
  
  try {
    // Obtener información actualizada de MercadoPago
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${webhookInfo.resourceId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      throw new Error(`Error obteniendo datos de MercadoPago: ${mpResponse.status}`);
    }

    const mpData = await mpResponse.json();
    
    detailedLogger.info('📊 Datos de MercadoPago obtenidos', {
      subscriptionId: mpData.id,
      status: mpData.status,
      externalReference: mpData.external_reference
    });

    // Buscar suscripción en base de datos
    const { data: subscription, error: findError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('preapproval_plan_id', webhookInfo.resourceId)
      .single();

    if (findError || !subscription) {
      detailedLogger.warn('⚠️ Suscripción no encontrada en BD', {
        preapprovalId: webhookInfo.resourceId,
        error: findError
      });
      return { action: 'subscription_not_found', preapprovalId: webhookInfo.resourceId };
    }

    // Mapear estado de MercadoPago a nuestro sistema
    const statusMapping: { [key: string]: string } = {
      'authorized': 'active',
      'paused': 'paused',
      'cancelled': 'cancelled',
      'pending': 'pending',
      'expired': 'cancelled'
    };

    const newStatus = statusMapping[mpData.status] || subscription.status;
    
    // Actualizar suscripción si hay cambio de estado
    if (newStatus !== subscription.status) {
      const { error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        throw new Error(`Error actualizando suscripción: ${updateError.message}`);
      }

      // Registrar en historial
      await supabase
        .from('subscription_history')
        .insert({
          subscription_id: subscription.id,
          action: 'webhook_update',
          previous_status: subscription.status,
          new_status: newStatus,
          reason: `Webhook MercadoPago: ${webhookInfo.action}`,
          metadata: {
            webhook_type: webhookInfo.type,
            webhook_action: webhookInfo.action,
            mercadopago_status: mpData.status,
            timestamp: new Date().toISOString()
          }
        });

      detailedLogger.info('✅ Suscripción actualizada', {
        subscriptionId: subscription.id,
        previousStatus: subscription.status,
        newStatus: newStatus
      });

      return {
        action: 'subscription_updated',
        subscriptionId: subscription.id,
        previousStatus: subscription.status,
        newStatus: newStatus
      };
    }

    return {
      action: 'no_changes_needed',
      subscriptionId: subscription.id,
      currentStatus: subscription.status
    };

  } catch (error) {
    detailedLogger.error('❌ Error procesando webhook de suscripción', { error });
    throw error;
  }
}

async function processPaymentWebhook(webhookInfo: any) {
  const supabase = createClient();
  
  try {
    // Obtener información del pago de MercadoPago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${webhookInfo.resourceId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      throw new Error(`Error obteniendo pago de MercadoPago: ${mpResponse.status}`);
    }

    const paymentData = await mpResponse.json();
    
    detailedLogger.info('💳 Datos de pago obtenidos', {
      paymentId: paymentData.id,
      status: paymentData.status,
      externalReference: paymentData.external_reference,
      amount: paymentData.transaction_amount
    });

    // Si el pago tiene external_reference, buscar la suscripción
    if (paymentData.external_reference) {
      const { data: subscription } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', paymentData.external_reference)
        .single();

      if (subscription) {
        // Registrar el pago en billing_history
        const { error: billingError } = await supabase
          .from('billing_history')
          .insert({
            subscription_id: subscription.id,
            transaction_amount: paymentData.transaction_amount,
            currency: paymentData.currency_id || 'ARS',
            payment_method: paymentData.payment_method_id,
            status: paymentData.status,
            mercadopago_payment_id: paymentData.id.toString(),
            external_reference: paymentData.external_reference,
            processed_at: new Date().toISOString(),
            metadata: {
              webhook_processed: true,
              payment_type: paymentData.payment_type_id,
              installments: paymentData.installments
            }
          });

        if (billingError) {
          detailedLogger.error('❌ Error registrando pago en billing_history', { billingError });
        } else {
          detailedLogger.info('✅ Pago registrado en billing_history', {
            subscriptionId: subscription.id,
            paymentId: paymentData.id,
            amount: paymentData.transaction_amount
          });
        }

        return {
          action: 'payment_recorded',
          subscriptionId: subscription.id,
          paymentId: paymentData.id,
          amount: paymentData.transaction_amount,
          status: paymentData.status
        };
      }
    }

    return {
      action: 'payment_processed_no_subscription',
      paymentId: paymentData.id,
      status: paymentData.status
    };

  } catch (error) {
    detailedLogger.error('❌ Error procesando webhook de pago', { error });
    throw error;
  }
}

// Endpoint GET para verificar estado del webhook
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Webhook endpoint funcionando correctamente',
    timestamp: new Date().toISOString(),
    supportedTypes: ['preapproval', 'payment']
  });
}