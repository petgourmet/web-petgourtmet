import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detailedLogger } from '@/lib/detailed-logger';
import { getMercadoPagoAccessToken } from '@/lib/mercadopago-config';

interface ManageSubscriptionRequest {
  subscriptionId: string;
  action: 'pause' | 'cancel' | 'modify' | 'resume';
  modifyData?: {
    frequency_type?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
    quantity?: number;
    discount_percentage?: number;
  };
  reason?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    detailedLogger.info('🔧 Iniciando gestión de suscripción', {
      timestamp: new Date().toISOString(),
      endpoint: '/api/subscriptions/manage'
    });

    // Validar autenticación
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      detailedLogger.error('❌ Usuario no autenticado', { authError });
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Parsear request body
    const body: ManageSubscriptionRequest = await request.json();
    const { subscriptionId, action, modifyData, reason } = body;

    // Validar parámetros requeridos
    if (!subscriptionId || !action) {
      detailedLogger.error('❌ Parámetros faltantes', { subscriptionId, action });
      return NextResponse.json(
        { error: 'subscriptionId y action son requeridos' },
        { status: 400 }
      );
    }

    // Validar que la suscripción pertenece al usuario
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      detailedLogger.error('❌ Suscripción no encontrada', { 
        subscriptionId, 
        userId: user.id, 
        error: subError 
      });
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      );
    }

    detailedLogger.info('✅ Suscripción encontrada', {
      subscriptionId,
      currentStatus: subscription.status,
      action
    });

    let updateData: any = {};
    let mercadoPagoAction: string | null = null;

    // Procesar según la acción
    switch (action) {
      case 'pause':
        if (subscription.status !== 'active') {
          return NextResponse.json(
            { error: 'Solo se pueden pausar suscripciones activas' },
            { status: 400 }
          );
        }
        updateData = { status: 'paused' };
        mercadoPagoAction = 'pause';
        break;

      case 'resume':
        if (subscription.status !== 'paused') {
          return NextResponse.json(
            { error: 'Solo se pueden reanudar suscripciones pausadas' },
            { status: 400 }
          );
        }
        updateData = { status: 'active' };
        mercadoPagoAction = 'resume';
        break;

      case 'cancel':
        if (!['active', 'paused'].includes(subscription.status)) {
          return NextResponse.json(
            { error: 'Solo se pueden cancelar suscripciones activas o pausadas' },
            { status: 400 }
          );
        }
        updateData = { status: 'cancelled' };
        mercadoPagoAction = 'cancel';
        break;

      case 'modify':
        if (subscription.status !== 'active') {
          return NextResponse.json(
            { error: 'Solo se pueden modificar suscripciones activas' },
            { status: 400 }
          );
        }
        if (!modifyData) {
          return NextResponse.json(
            { error: 'modifyData es requerido para modificar suscripción' },
            { status: 400 }
          );
        }
        updateData = { ...modifyData };
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    // Actualizar en MercadoPago si es necesario
    if (mercadoPagoAction && subscription.preapproval_plan_id) {
      try {
        const mercadoPagoResponse = await fetch(`https://api.mercadopago.com/preapproval/${subscription.preapproval_plan_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${getMercadoPagoAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: mercadoPagoAction === 'cancel' ? 'cancelled' : 
                   mercadoPagoAction === 'pause' ? 'paused' : 'authorized'
          }),
        });

        if (!mercadoPagoResponse.ok) {
          const mpError = await mercadoPagoResponse.text();
          detailedLogger.error('❌ Error en MercadoPago', { 
            action: mercadoPagoAction, 
            error: mpError 
          });
          throw new Error(`Error en MercadoPago: ${mpError}`);
        }

        detailedLogger.info('✅ Acción ejecutada en MercadoPago', {
          subscriptionId,
          action: mercadoPagoAction
        });
      } catch (mpError) {
        detailedLogger.error('❌ Error al actualizar en MercadoPago', { mpError });
        return NextResponse.json(
          { error: 'Error al actualizar suscripción en MercadoPago' },
          { status: 500 }
        );
      }
    }

    // Actualizar en base de datos
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      detailedLogger.error('❌ Error al actualizar suscripción', { updateError });
      return NextResponse.json(
        { error: 'Error al actualizar suscripción' },
        { status: 500 }
      );
    }

    // Registrar en historial
    const { error: historyError } = await supabase
      .from('subscription_history')
      .insert({
        subscription_id: parseInt(subscriptionId),
        action: action,
        previous_status: subscription.status,
        new_status: updateData.status || subscription.status,
        reason: reason || `Acción ${action} ejecutada por usuario`,
        created_by: user.id,
        metadata: {
          modifyData,
          timestamp: new Date().toISOString()
        }
      });

    if (historyError) {
      detailedLogger.warn('⚠️ Error al registrar historial', { historyError });
    }

    const processingTime = Date.now() - startTime;
    
    detailedLogger.info('✅ Suscripción gestionada exitosamente', {
      subscriptionId,
      action,
      newStatus: updatedSubscription.status,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: `Suscripción ${action === 'pause' ? 'pausada' : 
                              action === 'resume' ? 'reanudada' : 
                              action === 'cancel' ? 'cancelada' : 
                              'modificada'} exitosamente`,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    detailedLogger.error('❌ Error en gestión de suscripción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        processingTime: `${processingTime}ms`
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId es requerido' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Obtener suscripción con historial
    const { data: subscription, error: subError } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        products (
          name,
          image_url,
          base_price
        )
      `)
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      );
    }

    // Obtener historial
    const { data: history } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('subscription_id', parseInt(subscriptionId))
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      subscription,
      history: history || [],
      availableActions: getAvailableActions(subscription.status)
    });

  } catch (error) {
    detailedLogger.error('❌ Error al obtener suscripción', { error });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getAvailableActions(status: string): string[] {
  switch (status) {
    case 'active':
      return ['pause', 'cancel', 'modify'];
    case 'paused':
      return ['resume', 'cancel'];
    case 'cancelled':
      return [];
    default:
      return [];
  }
}