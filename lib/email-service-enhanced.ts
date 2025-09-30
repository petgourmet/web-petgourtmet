import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

/**
 * Servicio de email mejorado con manejo robusto de errores y reintentos
 * Específicamente optimizado para confirmaciones de suscripción
 */

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface SubscriptionEmailData {
  userEmail: string;
  userName?: string;
  subscriptionId: string;
  productName: string;
  planType: string;
  amount?: number;
  currency?: string;
  nextBillingDate?: string;
  status: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryCount?: number;
}

export class EnhancedEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private supabase;
  private config: EmailConfig;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };
  }

  /**
   * Inicializa el transportador de email con validación
   */
  private async initializeTransporter(): Promise<boolean> {
    try {
      if (!this.config.auth.user || !this.config.auth.pass) {
        console.error('Configuración SMTP incompleta');
        return false;
      }

      this.transporter = nodemailer.createTransporter(this.config);

      // Verificar conexión
      await this.transporter.verify();
      console.log('Conexión SMTP verificada exitosamente');
      return true;
    } catch (error) {
      console.error('Error inicializando transportador SMTP:', error);
      this.transporter = null;
      return false;
    }
  }

  /**
   * Envía email de confirmación de suscripción con reintentos
   */
  async sendSubscriptionConfirmationEmail(
    data: SubscriptionEmailData,
    maxRetries: number = 3
  ): Promise<EmailResult> {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Inicializar transportador si no existe
        if (!this.transporter) {
          const initialized = await this.initializeTransporter();
          if (!initialized) {
            throw new Error('No se pudo inicializar el servicio de email');
          }
        }

        // Generar contenido del email
        const emailContent = this.generateSubscriptionEmailContent(data);

        // Enviar email al cliente
        const customerResult = await this.transporter!.sendMail({
          from: `"Pet Gourmet" <${this.config.auth.user}>`,
          to: data.userEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        // Enviar notificación a administradores
        await this.sendAdminNotification(data, customerResult.messageId);

        // Registrar envío exitoso
        await this.logEmailSent(data, customerResult.messageId, attempt);

        return {
          success: true,
          messageId: customerResult.messageId,
          retryCount: attempt
        };

      } catch (error: any) {
        lastError = error;
        console.error(`Intento ${attempt}/${maxRetries} falló:`, error.message);

        // Reinicializar transportador en caso de error de conexión
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          this.transporter = null;
        }

        // Esperar antes del siguiente intento (backoff exponencial)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Registrar fallo después de todos los intentos
    await this.logEmailFailed(data, lastError?.message, maxRetries);

    return {
      success: false,
      error: lastError?.message || 'Error desconocido',
      retryCount: maxRetries
    };
  }

  /**
   * Genera el contenido HTML y texto del email de confirmación
   */
  private generateSubscriptionEmailContent(data: SubscriptionEmailData) {
    const { userEmail, userName, productName, planType, amount, currency, nextBillingDate, status } = data;

    const subject = `¡Confirmación de Suscripción - ${productName}!`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; margin-bottom: 20px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">✅</div>
                <h1>¡Suscripción Confirmada!</h1>
                <p>Tu suscripción a ${productName} está activa</p>
            </div>
            
            <div class="content">
                <p>Hola ${userName || userEmail},</p>
                
                <p>¡Excelente noticia! Tu suscripción ha sido procesada exitosamente y ya está activa.</p>
                
                <div class="details">
                    <h3>Detalles de tu Suscripción:</h3>
                    <div class="detail-row">
                        <strong>Producto:</strong>
                        <span>${productName}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Plan:</strong>
                        <span>${planType}</span>
                    </div>
                    ${amount ? `
                    <div class="detail-row">
                        <strong>Precio:</strong>
                        <span>$${amount} ${currency || 'MXN'}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <strong>Estado:</strong>
                        <span style="color: #4CAF50; font-weight: bold;">${status === 'active' ? 'Activa' : status}</span>
                    </div>
                    ${nextBillingDate ? `
                    <div class="detail-row">
                        <strong>Próximo Cobro:</strong>
                        <span>${new Date(nextBillingDate).toLocaleDateString('es-MX')}</span>
                    </div>
                    ` : ''}
                </div>
                
                <p>Ahora puedes disfrutar de todos los beneficios de tu suscripción. Si tienes alguna pregunta, no dudes en contactarnos.</p>
                
                <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" class="button">
                        Ir a Mi Dashboard
                    </a>
                </div>
                
                <div class="footer">
                    <p>Gracias por confiar en Pet Gourmet</p>
                    <p>Este email fue enviado automáticamente, por favor no respondas a este mensaje.</p>
                    <p>Si necesitas ayuda, contacta a soporte@petgourmet.com</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
¡Suscripción Confirmada!

Hola ${userName || userEmail},

Tu suscripción a ${productName} ha sido procesada exitosamente y ya está activa.

Detalles:
- Producto: ${productName}
- Plan: ${planType}
${amount ? `- Precio: $${amount} ${currency || 'MXN'}` : ''}
- Estado: ${status === 'active' ? 'Activa' : status}
${nextBillingDate ? `- Próximo Cobro: ${new Date(nextBillingDate).toLocaleDateString('es-MX')}` : ''}

Gracias por confiar en Pet Gourmet.

Para gestionar tu suscripción visita: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard
    `;

    return { subject, html, text };
  }

  /**
   * Envía notificación a administradores
   */
  private async sendAdminNotification(data: SubscriptionEmailData, customerMessageId: string) {
    try {
      if (!this.transporter) return;

      const adminEmails = (process.env.ADMIN_EMAILS || 'admin@petgourmet.com').split(',');

      const adminContent = `
        <h2>Nueva Suscripción Activada</h2>
        <p><strong>Cliente:</strong> ${data.userEmail}</p>
        <p><strong>Producto:</strong> ${data.productName}</p>
        <p><strong>Plan:</strong> ${data.planType}</p>
        <p><strong>ID Suscripción:</strong> ${data.subscriptionId}</p>
        <p><strong>Estado:</strong> ${data.status}</p>
        <p><strong>Email enviado:</strong> ${customerMessageId}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
      `;

      await this.transporter.sendMail({
        from: `"Pet Gourmet System" <${this.config.auth.user}>`,
        to: adminEmails.join(','),
        subject: `Nueva Suscripción: ${data.productName} - ${data.userEmail}`,
        html: adminContent
      });

    } catch (error) {
      console.error('Error enviando notificación a administradores:', error);
    }
  }

  /**
   * Registra email enviado exitosamente
   */
  private async logEmailSent(data: SubscriptionEmailData, messageId: string, attempt: number) {
    try {
      await this.supabase
        .from('email_logs')
        .insert({
          subscription_id: data.subscriptionId,
          recipient: data.userEmail,
          email_type: 'subscription_confirmation',
          status: 'sent',
          message_id: messageId,
          attempt_count: attempt,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error registrando email enviado:', error);
    }
  }

  /**
   * Registra fallo en envío de email
   */
  private async logEmailFailed(data: SubscriptionEmailData, error: string, attempts: number) {
    try {
      await this.supabase
        .from('email_logs')
        .insert({
          subscription_id: data.subscriptionId,
          recipient: data.userEmail,
          email_type: 'subscription_confirmation',
          status: 'failed',
          error_message: error,
          attempt_count: attempts,
          failed_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Error registrando fallo de email:', logError);
    }
  }

  /**
   * Verifica la configuración SMTP
   */
  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      const initialized = await this.initializeTransporter();
      return { valid: initialized };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Envía email de prueba
   */
  async sendTestEmail(to: string): Promise<EmailResult> {
    try {
      if (!this.transporter) {
        const initialized = await this.initializeTransporter();
        if (!initialized) {
          throw new Error('No se pudo inicializar el servicio de email');
        }
      }

      const result = await this.transporter!.sendMail({
        from: `"Pet Gourmet Test" <${this.config.auth.user}>`,
        to,
        subject: 'Test de Configuración SMTP - Pet Gourmet',
        html: `
          <h2>Test de Email Exitoso</h2>
          <p>Este es un email de prueba para verificar la configuración SMTP.</p>
          <p>Enviado el: ${new Date().toLocaleString('es-MX')}</p>
        `,
        text: `Test de Email Exitoso\n\nEste es un email de prueba para verificar la configuración SMTP.\nEnviado el: ${new Date().toLocaleString('es-MX')}`
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Instancia singleton
export const enhancedEmailService = new EnhancedEmailService();