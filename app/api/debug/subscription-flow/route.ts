// app/api/debug/subscription-flow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookService } from '@/lib/webhook-service';

interface DebugWebhookPayload {
  action: string;
  api_version: string;
  data: {
    id: string;
    status: string;
    external_reference: string;
    payer_id?: number;
    auto_recurring?: {
      frequency: number;
      frequency_type: string;
      transaction_amount: number;
      currency_id: string;
    };
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

interface SubscriptionStatus {
  pending_subscription: any;
  user_subscription: any;
  user_profile: any;
  webhook_logs: any[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, external_reference, subscription_id, user_id, status = 'authorized' } = body;

    if (action === 'simulate_webhook') {
      // Simular webhook de MercadoPago
      const mockWebhookPayload: DebugWebhookPayload = {
        action: 'payment.created',
        api_version: 'v1',
        data: {
          id: subscription_id || `sub_${Date.now()}`,
          status: status,
          external_reference: external_reference,
          payer_id: 123456789,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: 299,
            currency_id: 'MXN'
          }
        },
        date_created: new Date().toISOString(),
        id: Date.now(),
        live_mode: false,
        type: 'payment',
        user_id: user_id
      };

      console.log('🔄 Simulando webhook de MercadoPago:', mockWebhookPayload);

      // Procesar el webhook usando el servicio existente
      const webhookService = new WebhookService();
      const result = await webhookService.processWebhook(mockWebhookPayload);

      return NextResponse.json({
        success: true,
        message: 'Webhook simulado procesado exitosamente',
        webhook_payload: mockWebhookPayload,
        processing_result: result
      });
    }

    if (action === 'check_subscription_status') {
      const supabase = createClient();
      const status = await checkSubscriptionStatus(supabase, external_reference, user_id);
      
      return NextResponse.json({
        success: true,
        subscription_status: status
      });
    }

    if (action === 'verify_flow_integrity') {
      const supabase = createClient();
      const integrity = await verifyFlowIntegrity(supabase, external_reference, user_id);
      
      return NextResponse.json({
        success: true,
        flow_integrity: integrity
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no válida. Usa: simulate_webhook, check_subscription_status, o verify_flow_integrity'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error en endpoint de debug:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const external_reference = searchParams.get('external_reference');
    const user_id = searchParams.get('user_id');

    if (!external_reference && !user_id) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere external_reference o user_id'
      }, { status: 400 });
    }

    const supabase = createClient();
    const status = await checkSubscriptionStatus(supabase, external_reference, user_id);
    
    return NextResponse.json({
      success: true,
      subscription_status: status
    });

  } catch (error) {
    console.error('❌ Error al verificar estado de suscripción:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

async function checkSubscriptionStatus(supabase: any, external_reference?: string | null, user_id?: string | null): Promise<SubscriptionStatus> {
  const status: SubscriptionStatus = {
    pending_subscription: null,
    user_subscription: null,
    user_profile: null,
    webhook_logs: []
  };

  try {
    // Buscar suscripción pendiente
    if (external_reference) {
      const { data: pendingData } = await supabase
        .from('pending_subscriptions')
        .select('*')
        .eq('external_reference', external_reference)
        .single();
      
      status.pending_subscription = pendingData;
      
      if (pendingData?.user_id) {
        user_id = pendingData.user_id;
      }
    }

    // Buscar suscripción activa del usuario
    if (user_id) {
      const { data: activeData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .single();
      
      status.user_subscription = activeData;

      // Buscar perfil del usuario
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single();
      
      status.user_profile = profileData;
    }

    // Buscar logs de webhooks relacionados
    if (external_reference) {
      const { data: logsData } = await supabase
        .from('webhook_logs')
        .select('*')
        .ilike('payload', `%${external_reference}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      status.webhook_logs = logsData || [];
    }

  } catch (error) {
    console.error('❌ Error al verificar estado de suscripción:', error);
  }

  return status;
}

async function verifyFlowIntegrity(supabase: any, external_reference?: string | null, user_id?: string | null) {
  const integrity = {
    has_pending_subscription: false,
    has_active_subscription: false,
    user_profile_updated: false,
    external_reference_linked: false,
    webhook_processed: false,
    issues: [] as string[]
  };

  try {
    const status = await checkSubscriptionStatus(supabase, external_reference, user_id);

    // Verificar suscripción pendiente
    if (status.pending_subscription) {
      integrity.has_pending_subscription = true;
      
      if (status.pending_subscription.external_reference === external_reference) {
        integrity.external_reference_linked = true;
      } else {
        integrity.issues.push('External reference no coincide con suscripción pendiente');
      }
    } else if (external_reference) {
      integrity.issues.push('No se encontró suscripción pendiente para external_reference');
    }

    // Verificar suscripción activa
    if (status.user_subscription) {
      integrity.has_active_subscription = true;
    } else if (user_id) {
      integrity.issues.push('No se encontró suscripción activa para el usuario');
    }

    // Verificar perfil actualizado
    if (status.user_profile?.has_active_subscription) {
      integrity.user_profile_updated = true;
    } else if (status.user_subscription) {
      integrity.issues.push('Perfil de usuario no actualizado con has_active_subscription');
    }

    // Verificar procesamiento de webhooks
    if (status.webhook_logs.length > 0) {
      integrity.webhook_processed = true;
    } else if (external_reference) {
      integrity.issues.push('No se encontraron logs de webhooks procesados');
    }

  } catch (error) {
    integrity.issues.push(`Error al verificar integridad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  return integrity;
}