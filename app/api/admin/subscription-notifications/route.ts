import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin-client';
import { EmailService, SubscriptionStatusChangeData } from '@/lib/email-service';

const emailService = new EmailService();

// Tipos para las notificaciones
interface SubscriptionNotification {
  id: number;
  subscription_id: number;
  old_status: string | null;
  new_status: string;
  user_email: string;
  admin_email: string;
  notification_sent: boolean;
  email_sent_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  unified_subscriptions?: {
    id: number;
    user_id: string;
    subscription_type: string;
    status: string;
    external_reference: string;
    product_name: string;
    product_image: string;
    next_billing_date: string;
    customer_data: string | Record<string, any>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar si es una llamada inmediata desde el trigger
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Si no hay body, es una llamada del cron
    }
    
    // Si viene notification_id, procesar solo esa notificación (llamada inmediata)
    if (body.notification_id) {
      console.log(`[SUBSCRIPTION-NOTIFICATIONS] Procesamiento INMEDIATO de notificación #${body.notification_id}`);
      
      const { data: notification, error: fetchError } = await supabase
        .from('subscription_notifications')
        .select(`
          *,
          unified_subscriptions (
            id,
            user_id,
            subscription_type,
            status,
            external_reference,
            product_name,
            product_image,
            next_billing_date,
            customer_data
          )
        `)
        .eq('id', body.notification_id)
        .single();
      
      if (fetchError || !notification) {
        console.error('[SUBSCRIPTION-NOTIFICATIONS] Error obteniendo notificación:', fetchError);
        return NextResponse.json({ 
          success: false, 
          error: fetchError?.message || 'Notificación no encontrada' 
        }, { status: 404 });
      }
      
      const result = await processNotification(notification as SubscriptionNotification, supabase);
      
      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Email enviado inmediatamente' : 'Error al enviar email',
        error: result.error,
        notification_id: body.notification_id
      });
    }
    
    // Si no viene notification_id, procesar todas las pendientes (llamada del cron)
    console.log('[SUBSCRIPTION-NOTIFICATIONS] Iniciando procesamiento de notificaciones pendientes...');
    
    // Obtener notificaciones pendientes (no enviadas y con menos de 5 reintentos)
    const { data: notifications, error: fetchError } = await supabase
      .from('subscription_notifications')
      .select(`
        *,
        unified_subscriptions (
          id,
          user_id,
          subscription_type,
          status,
          external_reference,
          product_name,
          product_image,
          next_billing_date,
          customer_data
        )
      `)
      .eq('notification_sent', false)
      .lt('retry_count', 5)
      .order('created_at', { ascending: true })
      .limit(20); // Procesar máximo 20 notificaciones por vez

    if (fetchError) {
      console.error('[SUBSCRIPTION-NOTIFICATIONS] Error obteniendo notificaciones:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message 
      }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      console.log('[SUBSCRIPTION-NOTIFICATIONS] No hay notificaciones pendientes');
      return NextResponse.json({ 
        success: true, 
        message: 'No hay notificaciones pendientes',
        processed: 0
      });
    }

    console.log(`[SUBSCRIPTION-NOTIFICATIONS] Encontradas ${notifications.length} notificaciones pendientes`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Procesar cada notificación
    for (const notification of notifications) {
      const result = await processNotification(notification as SubscriptionNotification, supabase);
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          notification_id: (notification as SubscriptionNotification).id,
          subscription_id: (notification as SubscriptionNotification).subscription_id,
          error: result.error
        });
      }
    }

    console.log('[SUBSCRIPTION-NOTIFICATIONS] Procesamiento completado:', results);

    return NextResponse.json({
      success: true,
      message: 'Procesamiento completado',
      processed: notifications.length,
      results
    });

  } catch (error) {
    console.error('[SUBSCRIPTION-NOTIFICATIONS] Error crítico:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}

// Función helper para type-safe notification processing
async function processNotification(
  notification: SubscriptionNotification,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[SUBSCRIPTION-NOTIFICATIONS] Procesando notificación #${notification.id} para suscripción #${notification.subscription_id}`);
    
    const subscription = notification.unified_subscriptions;
    
    if (!subscription) {
      console.error(`[SUBSCRIPTION-NOTIFICATIONS] No se encontró la suscripción #${notification.subscription_id}`);
      
    await supabase
      .from('subscription_notifications')
      .update({
        retry_count: notification.retry_count + 1,
        error_message: 'Suscripción no encontrada',
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', notification.id);      return { success: false, error: 'Suscripción no encontrada' };
    }

    let customerData: any = {};
    try {
      customerData = typeof subscription.customer_data === 'string' 
        ? JSON.parse(subscription.customer_data) 
        : subscription.customer_data || {};
    } catch (e) {
      console.error('[SUBSCRIPTION-NOTIFICATIONS] Error parseando customer_data:', e);
    }

    const userName = customerData.firstName 
      ? `${customerData.firstName} ${customerData.lastName || ''}`.trim()
      : 'Cliente';

    const emailData: SubscriptionStatusChangeData = {
      user_email: notification.user_email,
      user_name: userName,
      subscription_id: subscription.id,
      old_status: notification.old_status || 'unknown',
      new_status: notification.new_status,
      subscription_type: subscription.subscription_type || 'unknown',
      product_name: subscription.product_name,
      product_image: subscription.product_image,
      next_billing_date: subscription.next_billing_date 
        ? new Date(subscription.next_billing_date).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : undefined,
      external_reference: subscription.external_reference
    };

    console.log('[SUBSCRIPTION-NOTIFICATIONS] Datos de email preparados:', {
      notification_id: notification.id,
      subscription_id: subscription.id,
      user_email: emailData.user_email,
      new_status: emailData.new_status
    });

    await emailService.sendSubscriptionStatusChangeEmail(emailData);
    console.log('[SUBSCRIPTION-NOTIFICATIONS] ✅ Email enviado al usuario');

    try {
      await emailService.sendAdminSubscriptionStatusChangeEmail(emailData);
      console.log('[SUBSCRIPTION-NOTIFICATIONS] ✅ Email enviado a admin');
    } catch (adminEmailError) {
      console.error('[SUBSCRIPTION-NOTIFICATIONS] ⚠️ Error enviando email a admin (no crítico):', adminEmailError);
    }

    await supabase
      .from('subscription_notifications')
      .update({
        notification_sent: true,
        email_sent_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', notification.id);

    console.log(`[SUBSCRIPTION-NOTIFICATIONS] ✅ Notificación #${notification.id} marcada como enviada`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[SUBSCRIPTION-NOTIFICATIONS] ❌ Error procesando notificación #${notification.id}:`, error);

    await supabase
      .from('subscription_notifications')
      .update({
        retry_count: notification.retry_count + 1,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', notification.id);

    return { success: false, error: errorMessage };
  }
}

// Endpoint GET para obtener el estado de las notificaciones
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Obtener estadísticas
    const { data: stats, error: statsError } = await supabase
      .from('subscription_notifications')
      .select('notification_sent, retry_count', { count: 'exact' });

    if (statsError) {
      throw statsError;
    }

    const typedStats = stats as Array<{ notification_sent: boolean; retry_count: number }> | null;
    const pending = typedStats?.filter(s => !s.notification_sent && s.retry_count < 5).length || 0;
    const sent = typedStats?.filter(s => s.notification_sent).length || 0;
    const failed = typedStats?.filter(s => !s.notification_sent && s.retry_count >= 5).length || 0;

    // Obtener últimas notificaciones
    const { data: recent, error: recentError } = await supabase
      .from('subscription_notifications')
      .select(`
        id,
        subscription_id,
        new_status,
        user_email,
        notification_sent,
        retry_count,
        created_at,
        email_sent_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      throw recentError;
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: stats?.length || 0,
        pending,
        sent,
        failed
      },
      recent
    });

  } catch (error) {
    console.error('[SUBSCRIPTION-NOTIFICATIONS] Error obteniendo estado:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}
