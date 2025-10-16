import { createClient } from '@/lib/supabase/server';
import { detailedLogger } from '@/lib/detailed-logger';

export interface NotificationData {
  userId: string;
  type: 'subscription_created' | 'subscription_cancelled' | 'subscription_paused' | 'subscription_resumed' | 'payment_success' | 'payment_failed' | 'subscription_expiring';
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('email' | 'toast' | 'push')[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    url: string;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private supabase = createClient();

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Enviar notificación completa (email + toast + push)
   */
  public async sendNotification(notification: NotificationData): Promise<{
    success: boolean;
    results: {
      email?: boolean;
      toast?: boolean;
      push?: boolean;
    };
    errors?: string[];
  }> {
    const startTime = Date.now();
    const results: any = {};
    const errors: string[] = [];

    try {
      detailedLogger.info('📧 Enviando notificación completa', {
        userId: notification.userId,
        type: notification.type,
        channels: notification.channels,
        priority: notification.priority
      });

      // Guardar notificación en base de datos
      const { data: savedNotification, error: saveError } = await this.supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          channels: notification.channels,
          priority: notification.priority,
          status: 'pending',
          scheduled_for: notification.scheduledFor?.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        detailedLogger.error('❌ Error guardando notificación', { error: saveError.message });
        errors.push(`Error guardando notificación: ${saveError.message}`);
      }

      // Enviar por cada canal solicitado
      const promises = notification.channels.map(async (channel) => {
        try {
          switch (channel) {
            case 'email':
              results.email = await this.sendEmailNotification(notification);
              break;
            case 'toast':
              results.toast = await this.sendToastNotification(notification);
              break;
            case 'push':
              results.push = await this.sendPushNotification(notification);
              break;
          }
        } catch (error) {
          const errorMsg = `Error en canal ${channel}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          errors.push(errorMsg);
          results[channel] = false;
        }
      });

      await Promise.all(promises);

      // Actualizar estado de la notificación
      if (savedNotification) {
        const allSuccess = Object.values(results).every(result => result === true);
        await this.supabase
          .from('notifications')
          .update({
            status: allSuccess ? 'sent' : 'partial',
            sent_at: new Date().toISOString(),
            results: results,
            errors: errors.length > 0 ? errors : null
          })
          .eq('id', savedNotification.id);
      }

      const processingTime = Date.now() - startTime;
      const success = errors.length === 0;

      detailedLogger.info(success ? '✅ Notificación enviada exitosamente' : '⚠️ Notificación enviada con errores', {
        userId: notification.userId,
        type: notification.type,
        processingTime: `${processingTime}ms`,
        results,
        errorsCount: errors.length
      });

      return { success, results, errors: errors.length > 0 ? errors : undefined };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      detailedLogger.error('❌ Error enviando notificación', {
        userId: notification.userId,
        type: notification.type,
        error: error instanceof Error ? error.message : 'Error desconocido',
        processingTime: `${processingTime}ms`
      });

      return {
        success: false,
        results,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Enviar notificación por email
   */
  private async sendEmailNotification(notification: NotificationData): Promise<boolean> {
    try {
      // Obtener datos del usuario
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', notification.userId)
        .single();

      if (userError || !user?.email) {
        throw new Error('Usuario no encontrado o sin email');
      }

      // Generar template de email
      const template = this.generateEmailTemplate(notification, user);

      // Enviar email usando servicio de email (ejemplo con Resend)
      const emailResult = await this.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent
      });

      return emailResult;

    } catch (error) {
      detailedLogger.error('❌ Error enviando email', {
        userId: notification.userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      return false;
    }
  }

  /**
   * Enviar notificación toast (guardar para frontend)
   */
  private async sendToastNotification(notification: NotificationData): Promise<boolean> {
    try {
      const toastData: ToastNotification = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: this.getToastType(notification.type),
        title: notification.title,
        message: notification.message,
        duration: this.getToastDuration(notification.priority),
        action: notification.data?.actionUrl ? {
          label: notification.data.actionLabel || 'Ver más',
          url: notification.data.actionUrl
        } : undefined
      };

      // Guardar toast en tabla para que el frontend lo consuma
      const { error } = await this.supabase
        .from('toast_notifications')
        .insert({
          user_id: notification.userId,
          toast_id: toastData.id,
          type: toastData.type,
          title: toastData.title,
          message: toastData.message,
          duration: toastData.duration,
          action: toastData.action,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return true;

    } catch (error) {
      detailedLogger.error('❌ Error enviando toast', {
        userId: notification.userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      return false;
    }
  }

  /**
   * Enviar notificación push
   */
  private async sendPushNotification(notification: NotificationData): Promise<boolean> {
    try {
      // Obtener tokens de push del usuario
      const { data: pushTokens } = await this.supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', notification.userId)
        .eq('active', true);

      if (!pushTokens || pushTokens.length === 0) {
        detailedLogger.info('ℹ️ No hay tokens push para el usuario', {
          userId: notification.userId
        });
        return true; // No es un error, simplemente no hay tokens
      }

      // Enviar push a cada token
      const pushPromises = pushTokens.map(async (tokenData) => {
        try {
          // Aquí integrarías con tu servicio de push (Firebase, OneSignal, etc.)
          // Por ahora, simulamos el envío
          await this.sendPushToToken(tokenData.token, {
            title: notification.title,
            body: notification.message,
            data: notification.data
          });
          return true;
        } catch (error) {
          detailedLogger.error('❌ Error enviando push a token', {
            token: tokenData.token.substring(0, 10) + '...',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
          return false;
        }
      });

      const results = await Promise.all(pushPromises);
      const successCount = results.filter(r => r).length;

      detailedLogger.info('📱 Push notifications enviadas', {
        userId: notification.userId,
        total: pushTokens.length,
        successful: successCount
      });

      return successCount > 0;

    } catch (error) {
      detailedLogger.error('❌ Error enviando push notifications', {
        userId: notification.userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      return false;
    }
  }

  /**
   * Generar template de email según tipo de notificación
   */
  private generateEmailTemplate(notification: NotificationData, user: any): EmailTemplate {
    const userName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Usuario';

    const templates: Record<string, EmailTemplate> = {
      subscription_created: {
        subject: '🎉 ¡Tu suscripción está activa!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">¡Hola ${userName}!</h2>
            <p>Tu suscripción ha sido creada exitosamente.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Detalles de tu suscripción:</h3>
              <p><strong>Producto:</strong> ${notification.data?.productName || 'N/A'}</p>
              <p><strong>Precio:</strong> $${notification.data?.price || 'N/A'}</p>
              <p><strong>Frecuencia:</strong> ${notification.data?.frequency || 'N/A'}</p>
            </div>
            <p>¡Gracias por confiar en nosotros!</p>
          </div>
        `,
        textContent: `¡Hola ${userName}! Tu suscripción ha sido creada exitosamente. Detalles: ${notification.data?.productName || 'N/A'} - $${notification.data?.price || 'N/A'} - ${notification.data?.frequency || 'N/A'}`
      },
      subscription_cancelled: {
        subject: '😔 Tu suscripción ha sido cancelada',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Hola ${userName}</h2>
            <p>Tu suscripción ha sido cancelada como solicitaste.</p>
            <p>Lamentamos verte partir. Si cambias de opinión, estaremos aquí para ayudarte.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscriptions" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reactivar suscripción</a>
          </div>
        `,
        textContent: `Hola ${userName}, tu suscripción ha sido cancelada. Puedes reactivarla en cualquier momento visitando ${process.env.NEXT_PUBLIC_APP_URL}/subscriptions`
      },
      payment_success: {
        subject: '✅ Pago procesado exitosamente',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">¡Pago confirmado!</h2>
            <p>Hola ${userName}, tu pago ha sido procesado exitosamente.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Monto:</strong> $${notification.data?.amount || 'N/A'}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>ID de transacción:</strong> ${notification.data?.transactionId || 'N/A'}</p>
            </div>
          </div>
        `,
        textContent: `¡Pago confirmado! Monto: $${notification.data?.amount || 'N/A'}, ID: ${notification.data?.transactionId || 'N/A'}`
      },
      payment_failed: {
        subject: '❌ Problema con tu pago',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Problema con el pago</h2>
            <p>Hola ${userName}, hubo un problema procesando tu pago.</p>
            <p>Por favor, verifica tu método de pago y vuelve a intentarlo.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscriptions/payment" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Actualizar pago</a>
          </div>
        `,
        textContent: `Problema con el pago. Por favor actualiza tu método de pago en ${process.env.NEXT_PUBLIC_APP_URL}/subscriptions/payment`
      }
    };

    return templates[notification.type] || {
      subject: notification.title,
      htmlContent: `<div style="font-family: Arial, sans-serif;"><h2>Hola ${userName}</h2><p>${notification.message}</p></div>`,
      textContent: `Hola ${userName}, ${notification.message}`
    };
  }

  /**
   * Obtener tipo de toast según tipo de notificación
   */
  private getToastType(notificationType: string): ToastNotification['type'] {
    const typeMap: Record<string, ToastNotification['type']> = {
      subscription_created: 'success',
      subscription_cancelled: 'warning',
      subscription_paused: 'warning',
      subscription_resumed: 'success',
      payment_success: 'success',
      payment_failed: 'error',
      subscription_expiring: 'warning'
    };

    return typeMap[notificationType] || 'info';
  }

  /**
   * Obtener duración de toast según prioridad
   */
  private getToastDuration(priority: string): number {
    const durationMap: Record<string, number> = {
      low: 3000,
      medium: 5000,
      high: 8000,
      urgent: 0 // No se cierra automáticamente
    };

    return durationMap[priority] || 5000;
  }

  /**
   * Enviar email usando servicio externo
   */
  private async sendEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    try {
      // Aquí integrarías con tu servicio de email preferido
      // Ejemplo con Resend, SendGrid, etc.
      
      // Por ahora, simulamos el envío exitoso
      detailedLogger.info('📧 Email enviado (simulado)', {
        to: emailData.to,
        subject: emailData.subject
      });

      return true;
    } catch (error) {
      detailedLogger.error('❌ Error enviando email', {
        to: emailData.to,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      return false;
    }
  }

  /**
   * Enviar push notification a token específico
   */
  private async sendPushToToken(token: string, payload: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<void> {
    // Aquí integrarías con Firebase Cloud Messaging, OneSignal, etc.
    // Por ahora, simulamos el envío
    detailedLogger.info('📱 Push notification enviada (simulado)', {
      token: token.substring(0, 10) + '...',
      title: payload.title
    });
  }

  /**
   * Obtener notificaciones toast pendientes para un usuario
   */
  public async getPendingToasts(userId: string): Promise<ToastNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('toast_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Marcar como enviadas
      if (data && data.length > 0) {
        await this.supabase
          .from('toast_notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .in('id', data.map(t => t.id));
      }

      return data?.map(t => ({
        id: t.toast_id,
        type: t.type,
        title: t.title,
        message: t.message,
        duration: t.duration,
        action: t.action
      })) || [];

    } catch (error) {
      detailedLogger.error('❌ Error obteniendo toasts pendientes', {
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      return [];
    }
  }

  /**
   * Crear notificación rápida para eventos de suscripción
   */
  public async notifySubscriptionEvent(
    userId: string,
    eventType: NotificationData['type'],
    subscriptionData: Record<string, any>
  ): Promise<boolean> {
    const notifications: Record<string, Partial<NotificationData>> = {
      subscription_created: {
        title: '🎉 ¡Suscripción creada!',
        message: `Tu suscripción a ${subscriptionData.productName} está activa`,
        priority: 'high',
        channels: ['email', 'toast']
      },
      subscription_cancelled: {
        title: '😔 Suscripción cancelada',
        message: 'Tu suscripción ha sido cancelada exitosamente',
        priority: 'medium',
        channels: ['email', 'toast']
      },
      payment_success: {
        title: '✅ Pago confirmado',
        message: `Pago de $${subscriptionData.amount} procesado exitosamente`,
        priority: 'medium',
        channels: ['toast']
      },
      payment_failed: {
        title: '❌ Error en el pago',
        message: 'Hubo un problema con tu pago. Por favor, verifica tu método de pago',
        priority: 'high',
        channels: ['email', 'toast']
      }
    };

    const notificationTemplate = notifications[eventType];
    if (!notificationTemplate) return false;

    const notification: NotificationData = {
      userId,
      type: eventType,
      title: notificationTemplate.title!,
      message: notificationTemplate.message!,
      data: subscriptionData,
      channels: notificationTemplate.channels!,
      priority: notificationTemplate.priority!
    };

    const result = await this.sendNotification(notification);
    return result.success;
  }
}

export default NotificationService;