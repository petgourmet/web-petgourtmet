import { createClient } from './supabase/admin-client';
import * as nodemailer from 'nodemailer';

// Interfaces
export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export interface SubscriptionEmailData {
  user_email: string;
  user_name: string;
  subscription_type: string;
  amount: number;
  next_payment_date?: string;
  plan_description?: string;
  external_reference: string;
  current_period_start?: string;
  current_period_end?: string;
  status?: string;
  admin_details?: any;
  days_until_payment?: number; // Para recordatorios de pago
  subscription_id?: number;
  shipping_cost?: number; // Costo de envío
  product_image?: string; // Imagen del producto
}

export interface SubscriptionStatusChangeData {
  user_email: string;
  user_name: string;
  subscription_id: number;
  old_status: string;
  new_status: string;
  subscription_type: string;
  product_name?: string;
  product_image?: string;
  next_billing_date?: string;
  external_reference?: string;
}

// Función para crear el transporter de nodemailer
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Función para enviar correos de estado de orden con reintentos automáticos
export async function sendOrderStatusEmail(
  orderStatus: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded',
  customerEmail: string,
  orderData: any,
  maxRetries: number = 3
) {
  console.log(`[EMAIL-SERVICE] Iniciando envío de correo de estado ${orderStatus} a ${customerEmail}`);

  // Verificar configuración SMTP
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[EMAIL-SERVICE] ERROR: Configuración SMTP incompleta para correo de estado de orden');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const transporter = createTransporter();
    const template = getOrderStatusTemplate(orderStatus, orderData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: template.subject,
      html: template.html,
      headers: {
        'X-Entity-Ref-ID': `order-${orderData.id}-${orderStatus}-${Date.now()}`,
      }
    };

    // Implementar reintentos automáticos con backoff exponencial
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[EMAIL-SERVICE] Intento ${attempt}/${maxRetries} - Enviando correo de estado ${orderStatus} a ${customerEmail}`);

        const result = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] ✅ Correo de estado ${orderStatus} enviado exitosamente:`, {
          messageId: result.messageId,
          attempt: attempt,
          orderStatus: orderStatus,
          customerEmail: customerEmail
        });

        return { success: true, messageId: result.messageId, attempts: attempt };

      } catch (error) {
        console.error(`[EMAIL-SERVICE] ❌ Error en intento ${attempt}/${maxRetries} para correo de estado ${orderStatus}:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          customerEmail: customerEmail,
          orderStatus: orderStatus,
          attempt: attempt
        });

        if (attempt === maxRetries) {
          console.error(`[EMAIL-SERVICE] 🚨 FALLO DEFINITIVO: No se pudo enviar correo de estado ${orderStatus} a ${customerEmail} después de ${maxRetries} intentos`);
          throw error;
        }

        // Esperar antes del siguiente intento (backoff exponencial)
        const delayMs = 2000 * Math.pow(2, attempt - 1);
        console.log(`[EMAIL-SERVICE] ⏳ Esperando ${delayMs}ms antes del siguiente intento para correo de estado...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  } catch (error) {
    console.error(`[EMAIL-SERVICE] ❌ Error crítico enviando correo de estado ${orderStatus}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      customerEmail: customerEmail,
      orderStatus: orderStatus
    });
    throw error;
  }
}

// Función para enviar correo de nuevo pedido al admin (contacto@petgourmet.mx)
export async function sendAdminNewOrderEmail(orderData: any, maxRetries: number = 2) {
  const adminEmail = 'contacto@petgourmet.mx';
  console.log(`[EMAIL-SERVICE] Iniciando envío de notificación de nuevo pedido al admin`);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[EMAIL-SERVICE] ERROR: Configuración SMTP incompleta');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const transporter = createTransporter();
    const template = getAdminNewOrderTemplate(orderData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: template.subject,
      html: template.html
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] ✅ Notificación admin enviada:`, { messageId: result.messageId, attempt });
        return { success: true, messageId: result.messageId, attempts: attempt };
      } catch (error) {
        console.error(`[EMAIL-SERVICE] ❌ Error intento ${attempt}/${maxRetries} email admin:`, error instanceof Error ? error.message : error);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  } catch (error) {
    console.error(`[EMAIL-SERVICE] ❌ Error crítico enviando email admin:`, error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Función para logging de correos enviados con manejo de errores mejorado
export async function logEmailSent(
  orderId: number,
  emailType: string,
  customerEmail: string,
  messageId?: string,
  attempts?: number
) {
  const logData = {
    order_id: orderId,
    email_type: emailType,
    customer_email: customerEmail,
    message_id: messageId || null,
    attempts_count: attempts || 1,
    sent_at: new Date().toISOString()
  };

  console.log(`[EMAIL-SERVICE] 📧 Registrando envío de correo:`, logData);

  try {
    const supabase = createClient();

    // Intentar insertar el log en la base de datos
    const { data, error } = await supabase
      .from('email_logs')
      .insert(logData)
      .select();

    if (error) {
      console.error('[EMAIL-SERVICE] ❌ Error insertando log de correo en base de datos:', {
        error: error.message,
        logData: logData
      });

      // Fallback: guardar en logs locales si falla la BD
      console.log('[EMAIL-SERVICE] 💾 FALLBACK - Log guardado localmente:', logData);
      return { success: false, error: error.message, fallback: true };
    }

    console.log('[EMAIL-SERVICE] ✅ Log de correo guardado exitosamente en BD:', data?.[0]?.id);
    return { success: true, logId: data?.[0]?.id };

  } catch (error) {
    console.error('[EMAIL-SERVICE] ❌ Error crítico registrando correo enviado:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      logData: logData
    });

    // Fallback: siempre guardar en logs locales como último recurso
    console.log('[EMAIL-SERVICE] 💾 FALLBACK CRÍTICO - Log guardado localmente:', logData);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', fallback: true };
  }
}

// Función para enviar correos de suscripción
export async function sendSubscriptionEmail(
  emailType: 'created' | 'payment' | 'cancelled' | 'paused' | 'resumed' | 'payment_failed' | 'subscription_updated' | 'payment_reminder',
  subscriptionData: SubscriptionEmailData,
  maxRetries: number = 3
) {
  console.log(`[EMAIL-SERVICE] Enviando correo de suscripción ${emailType} a ${subscriptionData.user_email}`);

  try {
    const transporter = createTransporter();
    const template = getSubscriptionTemplate(emailType, subscriptionData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: subscriptionData.user_email,
      subject: template.subject,
      html: template.html,
      headers: {
        'X-Entity-Ref-ID': `sub-${subscriptionData.external_reference || subscriptionData.user_email}-${emailType}-${Date.now()}`,
      }
    };

    // Implementar reintentos automáticos
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[EMAIL-SERVICE] Intento ${attempt}/${maxRetries} - Enviando correo a ${subscriptionData.user_email}`);

        const result = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] ✅ Correo de suscripción ${emailType} enviado exitosamente:`, {
          messageId: result.messageId,
          attempt: attempt
        });

        return { success: true, messageId: result.messageId, attempts: attempt };

      } catch (error) {
        console.error(`[EMAIL-SERVICE] ❌ Error en intento ${attempt}/${maxRetries}:`, error);

        if (attempt === maxRetries) {
          console.error(`[EMAIL-SERVICE] 🚨 FALLO DEFINITIVO: No se pudo enviar correo después de ${maxRetries} intentos`);
          throw error;
        }

        // Esperar antes del siguiente intento (backoff exponencial)
        const delayMs = 2000 * Math.pow(2, attempt - 1);
        console.log(`[EMAIL-SERVICE] ⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  } catch (error) {
    console.error(`[EMAIL-SERVICE] ❌ Error enviando correo de suscripción ${emailType}:`, error);
    throw error;
  }
}

// Clase EmailService para manejar los nuevos correos
export class EmailService {
  // Método privado para enviar correos con reintentos automáticos
  private async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }, maxRetries: number = 3) {
    console.log(`[EMAIL-SERVICE] Iniciando envío de correo a ${to} - Asunto: ${subject}`);

    // Verificar configuración SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[EMAIL-SERVICE] ERROR: Configuración SMTP incompleta');
      return { success: false, error: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };

    // Implementar reintentos automáticos
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[EMAIL-SERVICE] Intento ${attempt}/${maxRetries} - Enviando correo a ${to}`);

        const result = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL-SERVICE] ✅ Correo enviado exitosamente a ${to}:`, {
          messageId: result.messageId,
          attempt: attempt
        });

        return {
          success: true,
          messageId: result.messageId,
          attempts: attempt
        };

      } catch (error) {
        console.error(`[EMAIL-SERVICE] ❌ Error en intento ${attempt}/${maxRetries} para ${to}:`, error);

        if (attempt === maxRetries) {
          console.error(`[EMAIL-SERVICE] 🚨 FALLO DEFINITIVO: No se pudo enviar correo a ${to} después de ${maxRetries} intentos`);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: attempt
          };
        }

        // Esperar antes del siguiente intento (backoff exponencial)
        const delayMs = 2000 * Math.pow(2, attempt - 1);
        console.log(`[EMAIL-SERVICE] ⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
        await this.delay(delayMs);
      }
    }

    return { success: false, error: 'Max retries exceeded', attempts: maxRetries };
  }

  // Enviar correo de cambio de estado de suscripción
  async sendSubscriptionStatusChangeEmail(data: SubscriptionStatusChangeData) {
    try {
      const template = this.createSubscriptionStatusChangeTemplate(data);
      return await this.sendEmail({
        to: data.user_email,
        subject: template.subject,
        html: template.html
      });
    } catch (error) {
      console.error('[EMAIL-SERVICE] Error enviando correo de cambio de estado de suscripción:', error);
      throw error;
    }
  }

  // Enviar correo a admin sobre cambio de estado de suscripción
  async sendAdminSubscriptionStatusChangeEmail(data: SubscriptionStatusChangeData) {
    try {
      const template = this.createAdminSubscriptionStatusChangeTemplate(data);
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['contacto@petgourmet.mx'];

      const promises = adminEmails.map(email =>
        this.sendEmail({
          to: email.trim(),
          subject: template.subject,
          html: template.html
        })
      );

      return await Promise.all(promises);
    } catch (error) {
      console.error('[EMAIL-SERVICE] Error enviando correo a administradores sobre cambio de estado:', error);
      throw error;
    }
  }

  // Plantilla de correo para cambio de estado de suscripción (usuario)
  private createSubscriptionStatusChangeTemplate(data: SubscriptionStatusChangeData) {
    const statusInfo = this.getStatusInfo(data.new_status);

    const productSection = data.product_name ? `
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        ${data.product_image ? `
          <img src="${data.product_image}" alt="${data.product_name}" style="max-width: 200px; border-radius: 8px; margin-bottom: 10px;" />
        ` : ''}
        <h3 style="margin: 10px 0; color: #374151;">${data.product_name}</h3>
        <p style="margin: 5px 0; color: #6b7280;">Tipo: ${data.subscription_type}</p>
      </div>
    ` : '';

    const nextBillingSection = data.next_billing_date && data.new_status === 'active' ? `
      <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">📅 Próximo cobro:</p>
        <p style="margin: 5px 0 0 0; font-weight: bold; color: #10b981; font-size: 16px;">${data.next_billing_date}</p>
      </div>
    ` : '';

    return {
      subject: `${statusInfo.icon} ${statusInfo.subjectPrefix} - Pet Gourmet`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8">
            <title>${statusInfo.title}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

              <!-- Header con Logo + ID de suscripción -->
              <table style="width: 100%; margin-bottom: 0; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); background-color: #7AB8BF; border-radius: 8px 8px 0 0;" bgcolor="#7AB8BF" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 30px 20px; background-color: #7AB8BF;" bgcolor="#7AB8BF" valign="middle">
                    <table style="width: 100%;" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 70%;" valign="middle">
                          <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;" />
                        </td>
                        <td style="width: 30%; text-align: right; vertical-align: middle;" valign="middle">
                          <div style="background-color: rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 6px; backdrop-filter: blur(10px);">
                            <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Suscripción</p>
                            <p style="margin: 0; color: white; font-size: 16px; font-weight: bold; margin-top: 2px;">#${data.subscription_id}</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="padding: 25px 20px;">

                <h2 style="font-size: 20px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">${statusInfo.title}</h2>

                <p style="font-size: 14px; color: #4B5563; margin-top: 0; margin-bottom: 20px;">
                  Hola <strong>${data.user_name}</strong>,
                </p>

                <div style="background-color: ${statusInfo.backgroundColor}; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                  <p style="margin: 0; font-size: 14px; color: ${statusInfo.textColor};">
                    ${statusInfo.message}
                  </p>
                </div>

                ${productSection}

                <!-- Resumen de la suscripción -->
                <div style="margin-bottom: 30px;">
                  <h3 style="font-size: 15px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">Resumen de la suscripción</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; width: 60px;">
                        <div style="width: 50px; height: 50px; background-color: #7AB8BF; border-radius: 8px; text-align: center; line-height: 50px;">
                          <span style="color: white; font-size: 22px;">🐾</span>
                        </div>
                      </td>
                      <td style="padding: 15px 10px; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: left;">
                        <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151; text-transform: uppercase;">${data.subscription_type}</p>
                        <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">ID: #${data.subscription_id}</p>
                      </td>
                      <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: right; width: 80px;">
                        ${data.new_status === 'active' && data.next_billing_date ? `<p style="margin: 0; font-size: 11px; color: #6b7280;">Próximo cobro</p><p style="margin: 2px 0 0; font-size: 12px; font-weight: bold; color: #10b981;">${data.next_billing_date}</p>` : ''}
                      </td>
                    </tr>
                  </table>
                </div>

                ${statusInfo.additionalInfo ? `
                  <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #92400e;">
                      <strong>ℹ️ Información importante:</strong><br>
                      ${statusInfo.additionalInfo}
                    </p>
                  </div>
                ` : ''}

                <!-- WhatsApp CTA -->
                <div style="margin: 28px 0; padding: 20px 24px; background-color: #f0fafe; border-radius: 14px; border: 1px solid #c6e9eb; text-align: center;">
                  <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #374151;">¿Necesitas ayuda?</p>
                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">Escríbenos con tus dudas o comentarios.</p>
                  <a href="https://wa.me/525561269681" target="_blank" style="display: inline-block; background-color: #7AB8BF; color: white; padding: 11px 26px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;"><img src="https://petgourmet.mx/iconos/whatsapp.png?v=2" width="15" height="15" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;margin-bottom:2px;">Enviar WhatsApp</a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <div style="margin-bottom: 14px;">
                  <a href="https://web.facebook.com/petgourmetmx" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/facebook.png?v=2" width="34" height="34" alt="Facebook" style="display:inline-block;border:0;"></a>
                  <a href="https://www.instagram.com/petgourmet_mx/" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/instagram.png?v=2" width="34" height="34" alt="Instagram" style="display:inline-block;border:0;"></a>
                  <a href="https://www.tiktok.com/@petgourmetmex" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/tiktok.png" width="34" height="34" alt="TikTok" style="display:inline-block;border:0;"></a>
                  <a href="https://www.youtube.com/@PetGourmetMexico" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/youtube.png?v=2" width="34" height="34" alt="YouTube" style="display:inline-block;border:0;"></a>
                </div>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  © 2025 Pet Gourmet. Todos los derechos reservados.
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">
                  Este es un correo automático, por favor no respondas a este mensaje.
                </p>
                <p style="margin: 8px 0 0 0; color: #c9cdd4; font-size: 11px;">
                  ¿No deseas recibir más correos? <a href="https://petgourmet.mx/suscripcion" style="color: #c9cdd4; text-decoration: underline;">Darte de baja</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    };
  }

  // Plantilla de correo para admin sobre cambio de estado
  private createAdminSubscriptionStatusChangeTemplate(data: SubscriptionStatusChangeData) {
    const statusBadge = this.getStatusBadge(data.new_status);
    const logoUrl = 'https://petgourmet.mx/petgourmet-logo.png';
    const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'}/admin/subscriptions`;

    return {
      subject: `🔔 Cambio de estado de suscripción #${data.subscription_id} - ${data.new_status.toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8">
            <title>Cambio de estado de suscripción</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
            <div style="max-width: 600px; margin: 0 auto;">

              <!-- Header con Logo -->
              <table style="width: 100%; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); background-color: #7AB8BF; border-radius: 8px 8px 0 0;" bgcolor="#7AB8BF" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 30px 20px; background-color: #7AB8BF; text-align: center;" bgcolor="#7AB8BF">
                    <img src="${logoUrl}" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
                  </td>
                </tr>
              </table>

              <!-- Alerta cambio de estado -->
              <div style="background-color: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b;">
                <table style="width: 100%;">
                  <tr>
                    <td style="width: 40px; vertical-align: top;">
                      <span style="font-size: 28px;">🔔</span>
                    </td>
                    <td>
                      <h2 style="font-size: 20px; color: #92400e; margin: 0 0 5px;">Cambio de Estado de Suscripción</h2>
                      <p style="font-size: 14px; color: #b45309; margin: 0;">Se ha registrado un cambio de estado en una suscripción.</p>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background-color: white; padding: 25px 20px; border-radius: 0 0 8px 8px;">

                <!-- Datos del cliente -->
                <div style="margin-bottom: 25px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                  <h3 style="font-size: 14px; color: #0c4a6e; margin-top: 0; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">👤 Datos del Cliente</h3>
                  <table style="width: 100%; font-size: 13px; color: #374151;">
                    <tr>
                      <td style="padding: 4px 0; font-weight: 600; width: 100px;">Nombre:</td>
                      <td style="padding: 4px 0;">${data.user_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-weight: 600;">Email:</td>
                      <td style="padding: 4px 0;"><a href="mailto:${data.user_email}" style="color: #7AB8BF; text-decoration: none;">${data.user_email}</a></td>
                    </tr>
                  </table>
                </div>

                <!-- Detalles de la suscripción -->
                <div style="margin-bottom: 20px;">
                  <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">📊 Información de la Suscripción</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px; width: 40%;">ID Suscripción</td>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;">#${data.subscription_id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Tipo</td>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;">${data.subscription_type}</td>
                    </tr>
                    ${data.product_name ? `
                    <tr>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Producto</td>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;">${data.product_name}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Estado anterior</td>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${data.old_status || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Nuevo estado</td>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;">${statusBadge}</td>
                    </tr>
                    ${data.external_reference ? `
                    <tr>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Referencia</td>
                      <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 12px; font-family: monospace;">${data.external_reference}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <!-- Botón de acción -->
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${adminUrl}" style="background-color: #7AB8BF; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; display: inline-block;">Ver en Panel de Admin</a>
                </div>

              </div>

              <!-- WhatsApp CTA -->
              <div style="margin: 20px 0; padding: 20px 24px; background-color: #f0fafe; border-radius: 14px; border: 1px solid #c6e9eb; text-align: center;">
                <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #374151;">¿Necesitas ayuda?</p>
                <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">Escríbenos para cualquier consulta sobre la suscripción.</p>
                <a href="https://wa.me/525561269681" target="_blank" style="display: inline-block; background-color: #7AB8BF; color: white; padding: 11px 26px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;"><img src="https://petgourmet.mx/iconos/whatsapp.png?v=2" width="15" height="15" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;margin-bottom:2px;">Enviar WhatsApp</a>
              </div>
              <!-- Footer redes sociales -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <div style="margin-bottom: 14px;">
                  <a href="https://web.facebook.com/petgourmetmx" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/facebook.png?v=2" width="34" height="34" alt="Facebook" style="display:inline-block;border:0;"></a>
                  <a href="https://www.instagram.com/petgourmet_mx/" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/instagram.png?v=2" width="34" height="34" alt="Instagram" style="display:inline-block;border:0;"></a>
                  <a href="https://www.tiktok.com/@petgourmetmex" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/tiktok.png" width="34" height="34" alt="TikTok" style="display:inline-block;border:0;"></a>
                  <a href="https://www.youtube.com/@PetGourmetMexico" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/youtube.png?v=2" width="34" height="34" alt="YouTube" style="display:inline-block;border:0;"></a>
                </div>
                <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
                  Este es un correo automático del sistema de suscripciones de Pet Gourmet.
                </p>
              </div>

            </div>
          </body>
        </html>
      `
    };
  }

  // Obtener información de estilo según el estado
  private getStatusInfo(status: string) {
    const statusMap: Record<string, any> = {
      'active': {
        icon: '✅',
        title: 'Suscripción Activada',
        subjectPrefix: 'Tu suscripción está activa',
        message: 'Tu suscripción ha sido activada exitosamente. ¡Gracias por confiar en Pet Gourmet!',
        color: '#10b981',
        backgroundColor: '#d1fae5',
        textColor: '#065f46',
        additionalInfo: ''
      },
      'pending': {
        icon: '⏳',
        title: 'Suscripción Pendiente',
        subjectPrefix: 'Tu suscripción está pendiente',
        message: 'Tu suscripción está siendo procesada. Te notificaremos cuando esté activa.',
        color: '#f59e0b',
        backgroundColor: '#fef3c7',
        textColor: '#92400e',
        additionalInfo: 'Estamos verificando el pago. Esto puede tardar unos minutos.'
      },
      'cancelled': {
        icon: '❌',
        title: 'Suscripción Cancelada',
        subjectPrefix: 'Tu suscripción ha sido cancelada',
        message: 'Tu suscripción ha sido cancelada. Esperamos verte de nuevo pronto.',
        color: '#ef4444',
        backgroundColor: '#fee2e2',
        textColor: '#991b1b',
        additionalInfo: 'Si esto fue un error, contáctanos inmediatamente.'
      },
      'paused': {
        icon: '⏸️',
        title: 'Suscripción Pausada',
        subjectPrefix: 'Tu suscripción ha sido pausada',
        message: 'Tu suscripción está pausada temporalmente. Puedes reanudarla cuando desees.',
        color: '#6366f1',
        backgroundColor: '#e0e7ff',
        textColor: '#3730a3',
        additionalInfo: 'No se realizarán cobros mientras tu suscripción esté pausada.'
      },
      'expired': {
        icon: '⏰',
        title: 'Suscripción Expirada',
        subjectPrefix: 'Tu suscripción ha expirado',
        message: 'Tu suscripción ha expirado. Renuévala para continuar disfrutando de nuestros productos.',
        color: '#dc2626',
        backgroundColor: '#fecaca',
        textColor: '#7f1d1d',
        additionalInfo: 'Puedes renovar tu suscripción desde tu perfil.'
      },
      'suspended': {
        icon: '🚫',
        title: 'Suscripción Suspendida',
        subjectPrefix: 'Tu suscripción ha sido suspendida',
        message: 'Tu suscripción ha sido suspendida. Por favor, contacta con soporte.',
        color: '#dc2626',
        backgroundColor: '#fee2e2',
        textColor: '#991b1b',
        additionalInfo: 'Contacta con nuestro equipo de soporte para más información.'
      }
    };

    return statusMap[status] || {
      icon: '📋',
      title: 'Actualización de Suscripción',
      subjectPrefix: 'Actualización de tu suscripción',
      message: `El estado de tu suscripción ha cambiado a: ${status}`,
      color: '#6b7280',
      backgroundColor: '#f3f4f6',
      textColor: '#374151',
      additionalInfo: ''
    };
  }

  // Obtener badge HTML para estados (para correos de admin)
  private getStatusBadge(status: string): string {
    const badges: Record<string, string> = {
      'active': '<span style="background-color: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">✅ ACTIVE</span>',
      'pending': '<span style="background-color: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">⏳ PENDING</span>',
      'cancelled': '<span style="background-color: #ef4444; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">❌ CANCELLED</span>',
      'paused': '<span style="background-color: #6366f1; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">⏸️ PAUSED</span>',
      'expired': '<span style="background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">⏰ EXPIRED</span>',
      'suspended': '<span style="background-color: #dc2626; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">🚫 SUSPENDED</span>'
    };

    return badges[status] || `<span style="background-color: #6b7280; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">${status.toUpperCase()}</span>`;
  }

  // Método auxiliar para delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Funciones auxiliares para plantillas
function getOrderStatusTemplate(status: string, orderData: any) {
  const statusMessages: Record<string, any> = {
    pending: {
      subject: `🛍️ Completar tu compra #${orderData.id} - Pet Gourmet`,
      title: 'Completar tu compra',
      intro: `Hola ${orderData.shipping_address?.full_name || orderData.customer_name || ''}, tu pedido ha sido registrado.`,
      message: 'Estos artículos estarán siendo procesados una vez completado o verificado el pago. Te notificaremos pronto.',
      showOrderButton: false,
      buttonText: '',
    },
    processing: {
      subject: `⚡ Tu pedido está siendo preparado - Pet Gourmet`,
      title: 'Preparando tu pedido',
      intro: `Hola ${orderData.shipping_address?.full_name || orderData.customer_name || ''}, ya estamos preparando tu pedido con mucho cuidado. Pronto estará listo para el envío.`,
      message: 'Regularmente enviamos tu pedido al día siguiente de la compra. Si quieres recibirlo en otra fecha o tienes alguna indicación especial, escríbenos por WhatsApp.',
      showOrderButton: false,
      buttonText: '',
    },
    shipped: {
      subject: `🚚 Tu pedido #${orderData.id} está en camino - Pet Gourmet`,
      title: 'Tu pedido está en camino y se entregará en unas horas',
      intro: 'Tu pedido está en camino. Rastrea tu envío para ver el estado de la entrega.',
      message: '',
      showOrderButton: false,
      buttonText: '',
    },
    completed: {
      subject: `✅ Tu pedido #${orderData.id} ha sido entregado - Pet Gourmet`,
      title: 'Tu pedido se ha entregado',
      intro: '¿No has recibido tu pedido? <a href="mailto:contacto@petgourmet.mx" style="color:#7AB8BF;">Infórmanos</a>.',
      message: '',
      showOrderButton: false,
      buttonText: '',
    },
    cancelled: {
      subject: `❌ Tu pedido #${orderData.id} ha sido cancelado - Pet Gourmet`,
      title: 'Lo lamentamos pero tu pedido ha sido cancelado',
      intro: `El pedido #${orderData.id} fue cancelado y tu pago ha sido anulado o no fue procesado.`,
      message: '',
      showOrderButton: false,
      buttonText: '',
    },
    refunded: {
      subject: `💸 Reembolso del pedido #${orderData.id} procesado - Pet Gourmet`,
      title: 'Te informamos que el monto de tu pedido ha sido reembolsado',
      intro: `Monto total reembolsado: <strong>$${orderData.total || '0.00'} MXN</strong>`,
      message: '',
      showOrderButton: false,
      buttonText: '',
    }
  };

  const statusInfo = statusMessages[status] || statusMessages.pending;

  // Productos loop
  let productsHtml = '';
  let subtotal = 0;
  if (orderData?.products && Array.isArray(orderData.products)) {
    productsHtml = orderData.products.map((product: any) => {
      const pPrice = parseFloat(product.price || 0);
      const pQty = parseInt(product.quantity || 1, 10);
      subtotal += pPrice * pQty;
      return `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; width: 60px;">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" />` : `<div style="width: 50px; height: 50px; background-color: #d1d5db; border-radius: 8px;"></div>`}
          </td>
          <td style="padding: 15px 10px; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: left;">
            <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151; text-transform: uppercase;">${product.name || 'Producto'} × ${pQty}</p>
            ${product.size ? `<p style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">Talla: ${product.size}</p>` : ''}
          </td>
          <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: right; width: 100px;">
            <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151;">$${(pPrice * pQty).toFixed(2)}</p>
          </td>
        </tr>
      `;
    }).join('');
  }

  const shippingCost = parseFloat(orderData?.shipping_cost || 0);
  const taxCost = 0; // Si hay impuestos, extraer de orderData
  const displayTotal = parseFloat(orderData?.total || 0).toFixed(2);
  const calculatedSubtotal = subtotal > 0 ? subtotal : displayTotal;

  // Dirección de envío
  let shippingAddressHtml = '';
  if (orderData?.shipping_address && status !== 'cancelled' && status !== 'refunded') {
    const addr = orderData.shipping_address;
    shippingAddressHtml = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d1d5db;">
        <h3 style="font-size: 16px; color: #374151; margin-top: 0; margin-bottom: 15px;">Información del cliente</h3>
        <table style="width: 100%; font-size: 13px; color: #6b7280; line-height: 1.5;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <p style="margin: 0 0 5px; font-weight: bold; color: #374151;">Dirección de envío</p>
              <p style="margin: 0;">${addr.name || addr.full_name || 'Cliente'}</p>
              <p style="margin: 0;">${addr.address_line_1 || addr.address || ''}</p>
              ${(addr.address_line_2 || addr.address2) ? `<p style="margin: 0;">${addr.address_line_2 || addr.address2}</p>` : ''}
              <p style="margin: 0;">${addr.city || ''}${addr.state ? `, ${addr.state}` : ''}</p>
              <p style="margin: 0;">${addr.postal_code || addr.postalCode || ''}</p>
            </td>
            <td style="width: 50%; vertical-align: top;">
              ${addr.phone ? `
                <p style="margin: 0 0 5px; font-weight: bold; color: #374151;">Teléfono</p>
                <p style="margin: 0;">${addr.phone}</p>
              ` : ''}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // Siempre usar URL de producción para el logo (los clientes de email no pueden acceder a localhost)
  const logoUrl = 'https://petgourmet.mx/petgourmet-logo.png';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${statusInfo.title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
        
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header con Logo -->
          <table style="width: 100%; margin-bottom: 30px; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); background-color: #7AB8BF; border-radius: 8px 8px 0 0;" bgcolor="#7AB8BF" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 30px 20px; background-color: #7AB8BF;" bgcolor="#7AB8BF" valign="middle">
                <table style="width: 100%;" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 70%;" valign="middle">
                      <img src="${logoUrl}" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;" />
                    </td>
                    <td style="width: 30%; text-align: right; vertical-align: middle;" valign="middle">
                      <div style="background-color: rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 6px; backdrop-filter: blur(10px);">
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Pedido</p>
                        <p style="margin: 0; color: white; font-size: 16px; font-weight: bold; margin-top: 2px;">#${orderData.id}</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="padding: 25px 20px;">
            
            <h2 style="font-size: 20px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">${statusInfo.title}</h2>
            
            ${statusInfo.intro ? `<p style="font-size: 14px; color: #4B5563; margin-top: 0; margin-bottom: ${statusInfo.message ? '10px' : '30px'};">${statusInfo.intro}</p>` : ''}
            ${statusInfo.message ? `<p style="font-size: 14px; color: #4B5563; margin-top: 0; margin-bottom: 30px;">${statusInfo.message}</p>` : ''}



            ${['pending', 'processing', 'shipped', 'completed'].includes(status) ? `
            <div style="margin-bottom: 40px; padding: 20px; background-color: white; border-radius: 8px; border: 1px solid #E5E7EB;">
              <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Progreso del Pedido</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${['pending', 'processing', 'shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">1</div>
                    <div style="color: ${['pending', 'processing', 'shipped', 'completed'].includes(status) ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">Confirmado</div>
                    <div style="position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background-color: ${['processing', 'shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; z-index: 1;"></div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${['processing', 'shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">2</div>
                    <div style="color: ${['processing', 'shipped', 'completed'].includes(status) ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">Preparando</div>
                    <div style="position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background-color: ${['shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; z-index: 1;"></div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${['shipped', 'completed'].includes(status) ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">3</div>
                    <div style="color: ${['shipped', 'completed'].includes(status) ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">En camino</div>
                    <div style="position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background-color: ${status === 'completed' ? '#7AB8BF' : '#E5E7EB'}; z-index: 1;"></div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${status === 'completed' ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">4</div>
                    <div style="color: ${status === 'completed' ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">Entregado</div>
                  </td>
                </tr>
              </table>
            </div>
            ` : ''}

            ${status === 'cancelled' || status === 'refunded' ? `
            <div style="margin-bottom: 40px; padding: 20px; background-color: #FEF2F2; border-radius: 8px; border: 1px solid #FCA5A5;">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 40px; vertical-align: top;">
                    <span style="font-size: 24px;">${status === 'cancelled' ? '❌' : '💸'}</span>
                  </td>
                  <td>
                    <h3 style="font-size: 15px; color: ${status === 'cancelled' ? '#B91C1C' : '#C2410C'}; margin-top: 0; margin-bottom: 5px; font-weight: 600;">${status === 'cancelled' ? 'Pedido Cancelado' : 'Reembolso Procesado'}</h3>
                    <p style="font-size: 13px; color: #7F1D1D; margin: 0;">${status === 'cancelled' ? 'El pedido no continuará su curso. Si realizaste un pago, el reembolso será procesado.' : 'Hemos emitido el reembolso correspondiente a tu método de pago.'}</p>
                  </td>
                </tr>
              </table>
            </div>
            ` : ''}

            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 15px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">${status === 'refunded' ? 'Reembolsar artículos' : status === 'shipped' ? 'Artículos en este envío' : 'Resumen del pedido'}</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${productsHtml}
                </tbody>
              </table>

              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <td style="width: 40%;"></td>
                  <td style="width: 60%;">
                    <table style="width: 100%; font-size: 13px; color: #6b7280;">
                      <tr>
                        <td style="padding: 5px 0;">Subtotal</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$${parseFloat(String(calculatedSubtotal)).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">Envíos</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$${shippingCost.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; border-bottom: 1px solid #d1d5db; padding-bottom: 15px;">Impuestos</td>
                        <td style="padding: 5px 0; border-bottom: 1px solid #d1d5db; padding-bottom: 15px; text-align: right; color: #374151;">$${taxCost.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0 5px; font-size: 15px; color: #6b7280;">Total</td>
                        <td style="padding: 20px 0 5px; text-align: right; font-size: 18px; font-weight: bold; color: #374151;">$${displayTotal} MXN</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            ${shippingAddressHtml}

          </div>
          
          <!-- WhatsApp CTA -->
          <div style="margin: 28px 0; padding: 20px 24px; background-color: #f0fafe; border-radius: 14px; border: 1px solid #c6e9eb; text-align: center;">
            <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #374151;">¿Necesitas ayuda con tu pedido?</p>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">Escríbenos con tus dudas o comentarios.</p>
            <a href="https://wa.me/525561269681" target="_blank" style="display: inline-block; background-color: #7AB8BF; color: white; padding: 11px 26px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;"><img src="https://petgourmet.mx/iconos/whatsapp.png?v=2" width="15" height="15" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;margin-bottom:2px;">Enviar WhatsApp</a>
          </div>
          <!-- Redes sociales & footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <div style="margin-bottom: 14px;">
              <a href="https://web.facebook.com/petgourmetmx" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/facebook.png?v=2" width="34" height="34" alt="Facebook" style="display:inline-block;border:0;"></a>
              <a href="https://www.instagram.com/petgourmet_mx/" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/instagram.png?v=2" width="34" height="34" alt="Instagram" style="display:inline-block;border:0;"></a>
              <a href="https://www.tiktok.com/@petgourmetmex" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/tiktok.png" width="34" height="34" alt="TikTok" style="display:inline-block;border:0;"></a>
              <a href="https://www.youtube.com/@PetGourmetMexico" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/youtube.png?v=2" width="34" height="34" alt="YouTube" style="display:inline-block;border:0;"></a>
            </div>
            <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
              Si tienes alguna pregunta, contáctanos en
              <a href="mailto:contacto@petgourmet.mx" style="color: #7AB8BF; text-decoration: none;">contacto@petgourmet.mx</a>
            </p>
            <p style="margin: 8px 0 0 0; color: #c9cdd4; font-size: 11px;">
              ¿No deseas recibir más correos? <a href="https://petgourmet.mx/suscripcion" style="color: #c9cdd4; text-decoration: underline;">Darte de baja</a>
            </p>
          </div>

        </div>
      </body>
    </html>
  `;

  return {
    subject: statusInfo.subject,
    html: html
  };
}

// Plantilla de notificación al admin cuando llega un nuevo pedido
function getAdminNewOrderTemplate(orderData: any) {
  // Siempre usar URL de producción para el logo en emails
  const logoUrl = 'https://petgourmet.mx/petgourmet-logo.png';

  const customerName = orderData.customer_name || orderData.shipping_address?.full_name || orderData.shipping_address?.name || 'Cliente';
  const customerEmail = orderData.customer_email || 'No proporcionado';
  const customerPhone = orderData.shipping_address?.phone || orderData.customer_phone || 'No proporcionado';

  // Productos
  let productsHtml = '';
  let subtotal = 0;
  if (orderData?.products && Array.isArray(orderData.products)) {
    productsHtml = orderData.products.map((product: any) => {
      const pPrice = parseFloat(product.price || 0);
      const pQty = parseInt(product.quantity || 1, 10);
      subtotal += pPrice * pQty;
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; width: 60px;">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" />` : `<div style="width: 50px; height: 50px; background-color: #d1d5db; border-radius: 8px;"></div>`}
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #d1d5db; vertical-align: middle;">
            <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151; text-transform: uppercase;">${product.name || 'Producto'} × ${pQty}</p>
            ${product.size ? `<p style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">Talla: ${product.size}</p>` : ''}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: right; width: 100px;">
            <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151;">$${(pPrice * pQty).toFixed(2)}</p>
          </td>
        </tr>
      `;
    }).join('');
  }

  const shippingCost = parseFloat(orderData?.shipping_cost || 0);
  const displayTotal = parseFloat(orderData?.total || 0).toFixed(2);
  const calculatedSubtotal = subtotal > 0 ? subtotal : parseFloat(orderData?.total || 0);

  // Dirección de envío
  let shippingAddressHtml = '';
  if (orderData?.shipping_address) {
    const addr = orderData.shipping_address;
    shippingAddressHtml = `
      <div style="margin-top: 25px; padding: 15px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">📍 Dirección de envío</h3>
        <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.6;">
          ${addr.name || addr.full_name || customerName}<br/>
          ${addr.address_line_1 || addr.address || ''}
          ${(addr.address_line_2 || addr.address2) ? `<br/>${addr.address_line_2 || addr.address2}` : ''}
          <br/>${addr.city || ''}${addr.state ? `, ${addr.state}` : ''}
          ${(addr.postal_code || addr.postalCode) ? ` ${addr.postal_code || addr.postalCode}` : ''}
          ${addr.phone ? `<br/>📞 ${addr.phone}` : ''}
        </p>
      </div>
    `;
  }

  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'}/admin/orders/${orderData.id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Nuevo Pedido #${orderData.id}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
        
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header con Logo -->
          <table style="width: 100%; margin-bottom: 0; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); border-radius: 8px 8px 0 0;" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 30px 20px;" valign="middle">
                <table style="width: 100%;" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 70%;" valign="middle">
                      <img src="${logoUrl}" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;" />
                    </td>
                    <td style="width: 30%; text-align: right; vertical-align: middle;" valign="middle">
                      <div style="background-color: rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 6px;">
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Pedido</p>
                        <p style="margin: 0; color: white; font-size: 16px; font-weight: bold; margin-top: 2px;">#${orderData.id}</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Alerta nuevo pedido -->
          <div style="background-color: #ecfdf5; padding: 20px; border-left: 4px solid #10b981;">
            <table style="width: 100%;">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <span style="font-size: 28px;">🛒</span>
                </td>
                <td>
                  <h2 style="font-size: 20px; color: #065f46; margin: 0 0 5px;">¡Nuevo Pedido Recibido!</h2>
                  <p style="font-size: 14px; color: #047857; margin: 0;">Se ha recibido un nuevo pedido que requiere preparación.</p>
                </td>
              </tr>
            </table>
          </div>

          <div style="background-color: white; padding: 25px 20px; border-radius: 0 0 8px 8px;">

            <!-- Datos del cliente -->
            <div style="margin-bottom: 25px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
              <h3 style="font-size: 14px; color: #0c4a6e; margin-top: 0; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em;">👤 Datos del Cliente</h3>
              <table style="width: 100%; font-size: 13px; color: #374151;">
                <tr>
                  <td style="padding: 4px 0; font-weight: 600; width: 100px;">Nombre:</td>
                  <td style="padding: 4px 0;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: 600;">Email:</td>
                  <td style="padding: 4px 0;"><a href="mailto:${customerEmail}" style="color: #7AB8BF; text-decoration: none;">${customerEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: 600;">Teléfono:</td>
                  <td style="padding: 4px 0;">${customerPhone}</td>
                </tr>
              </table>
            </div>

            <!-- Resumen del pedido -->
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">📦 Productos del Pedido</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${productsHtml || '<tr><td style="padding: 15px; color: #6b7280; text-align: center;">Sin detalle de productos</td></tr>'}
                </tbody>
              </table>

              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="width: 40%;"></td>
                  <td style="width: 60%;">
                    <table style="width: 100%; font-size: 13px; color: #6b7280;">
                      <tr>
                        <td style="padding: 5px 0;">Subtotal</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$${parseFloat(String(calculatedSubtotal)).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">Envío</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$${shippingCost.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0 5px; font-size: 16px; font-weight: bold; color: #374151; border-top: 2px solid #d1d5db;">Total</td>
                        <td style="padding: 15px 0 5px; text-align: right; font-size: 18px; font-weight: bold; color: #065f46; border-top: 2px solid #d1d5db;">$${displayTotal} MXN</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            ${shippingAddressHtml}

            <!-- Botón de acción -->
            <div style="text-align: center; margin-top: 30px;">
              <a href="${adminUrl}" style="background-color: #7AB8BF; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; display: inline-block;">Ver Pedido en Admin</a>
            </div>

          </div>
          
          <!-- WhatsApp CTA -->
          <div style="margin: 20px 0; padding: 20px 24px; background-color: #f0fafe; border-radius: 14px; border: 1px solid #c6e9eb; text-align: center;">
            <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #374151;">¿Necesitas ayuda?</p>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">Escríbenos para cualquier consulta sobre el pedido.</p>
            <a href="https://wa.me/525561269681" target="_blank" style="display: inline-block; background-color: #7AB8BF; color: white; padding: 11px 26px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;"><img src="https://petgourmet.mx/iconos/whatsapp.png?v=2" width="15" height="15" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;margin-bottom:2px;">Enviar WhatsApp</a>
          </div>
          <!-- Footer redes sociales -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <div style="margin-bottom: 14px;">
              <a href="https://web.facebook.com/petgourmetmx" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/facebook.png?v=2" width="34" height="34" alt="Facebook" style="display:inline-block;border:0;"></a>
              <a href="https://www.instagram.com/petgourmet_mx/" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/instagram.png?v=2" width="34" height="34" alt="Instagram" style="display:inline-block;border:0;"></a>
              <a href="https://www.tiktok.com/@petgourmetmex" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/tiktok.png" width="34" height="34" alt="TikTok" style="display:inline-block;border:0;"></a>
              <a href="https://www.youtube.com/@PetGourmetMexico" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/youtube.png?v=2" width="34" height="34" alt="YouTube" style="display:inline-block;border:0;"></a>
            </div>
            <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
              Este es un correo automático del sistema de pedidos de Pet Gourmet.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `🛒 Nuevo Pedido #${orderData.id} - $${displayTotal} MXN - ${customerName}`,
    html: html
  };
}

function getSubscriptionTemplate(type: string, data: SubscriptionEmailData) {
  const subIdLabel = data.subscription_id ? ` #${data.subscription_id}` : '';
  const typeMessages = {
    created: {
      subject: `🎉 ¡Bienvenido a Pet Gourmet! Tu suscripción${subIdLabel} está activa`,
      title: '🎉 ¡Suscripción Activada!',
      message: 'Gracias por suscribirte a Pet Gourmet. Tu suscripción ha sido activada exitosamente y recibirás tu primer envío pronto.',
      color: '#10b981',
      icon: '✅'
    },
    payment: {
      subject: `💳 Pago de suscripción${subIdLabel} procesado - Pet Gourmet`,
      title: '💳 Pago Procesado',
      message: 'Tu pago de suscripción ha sido procesado exitosamente. Tu próximo envío está en camino.',
      color: '#3b82f6',
      icon: '💳'
    },
    subscription_updated: {
      subject: `🔄 Tu suscripción${subIdLabel} ha sido actualizada - Pet Gourmet`,
      title: '🔄 Suscripción Actualizada',
      message: 'Tu suscripción ha sido actualizada. A continuación encontrarás los detalles del nuevo período.',
      color: '#3b82f6',
      icon: '🔄'
    },
    cancelled: {
      subject: `❌ Suscripción${subIdLabel} cancelada - Pet Gourmet`,
      title: '❌ Suscripción Cancelada',
      message: 'Tu suscripción ha sido cancelada. Esperamos verte de nuevo pronto.',
      color: '#ef4444',
      icon: '❌'
    },
    paused: {
      subject: `⏸️ Suscripción${subIdLabel} pausada - Pet Gourmet`,
      title: '⏸️ Suscripción Pausada',
      message: 'Tu suscripción ha sido pausada temporalmente. No se realizarán cobros hasta que la reactives.',
      color: '#f59e0b',
      icon: '⏸️'
    },
    resumed: {
      subject: `▶️ Suscripción${subIdLabel} reactivada - Pet Gourmet`,
      title: '▶️ ¡Suscripción Reactivada!',
      message: 'Tu suscripción ha sido reactivada exitosamente. Los envíos se reanudarán según el calendario.',
      color: '#10b981',
      icon: '▶️'
    },
    payment_failed: {
      subject: `⚠️ Error en el pago de tu suscripción${subIdLabel} - Pet Gourmet`,
      title: '⚠️ Error en el Pago',
      message: 'No pudimos procesar el pago de tu suscripción. Por favor, actualiza tu método de pago para continuar.',
      color: '#dc2626',
      icon: '⚠️'
    },
    payment_reminder: {
      subject: `🔔 Recordatorio: Próximo pago de suscripción${subIdLabel} - Pet Gourmet`,
      title: '🔔 Próximo Pago',
      message: `Tu próximo pago está programado para dentro de ${data.days_until_payment || 3} días.Asegúrate de tener fondos suficientes en tu método de pago.`,
      color: '#8b5cf6',
      icon: '🔔'
    }
  };

  const typeInfo = typeMessages[type as keyof typeof typeMessages] || typeMessages.created;

  // Formatear tipo de suscripción
  const frequencyText = {
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    annual: 'Anual'
  }[data.subscription_type] || data.subscription_type;

  // Siempre usar URL de producción para el logo en emails
  const logoUrl = 'https://petgourmet.mx/petgourmet-logo.png';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx';

  // Texto legible de frecuencia para condiciones
  const frequencyLabel = {
    weekly: 'cada semana',
    biweekly: 'cada 2 semanas',
    monthly: 'cada mes',
    quarterly: 'cada 3 meses',
    annual: 'cada año'
  }[data.subscription_type] || 'cada período';

  return {
    subject: typeInfo.subject,
    html: `
    <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${typeInfo.title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header con Logo + ID de suscripción -->
          <table style="width: 100%; margin-bottom: 0; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); background-color: #7AB8BF; border-radius: 8px 8px 0 0;" bgcolor="#7AB8BF" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 30px 20px; background-color: #7AB8BF;" bgcolor="#7AB8BF" valign="middle">
                <table style="width: 100%;" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 70%;" valign="middle">
                      <img src="${logoUrl}" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;" />
                    </td>
                    <td style="width: 30%; text-align: right; vertical-align: middle;" valign="middle">
                      ${data.subscription_id ? `
                      <div style="background-color: rgba(255, 255, 255, 0.2); padding: 8px 15px; border-radius: 6px; backdrop-filter: blur(10px);">
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Suscripción</p>
                        <p style="margin: 0; color: white; font-size: 16px; font-weight: bold; margin-top: 2px;">#${data.subscription_id}</p>
                      </div>
                      ` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="padding: 25px 20px;">

            <h2 style="font-size: 20px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">${typeInfo.title}</h2>

            <p style="font-size: 14px; color: #4B5563; margin-top: 0; margin-bottom: 10px;">Hola <strong>${data.user_name}</strong>,</p>
            <p style="font-size: 14px; color: #4B5563; margin-top: 0; margin-bottom: 30px;">${typeInfo.message}</p>

            <!-- Línea de tiempo del estado de suscripción -->
            ${['created', 'payment', 'resumed', 'subscription_updated', 'payment_reminder'].includes(type) ? `
            <div style="margin-bottom: 40px; padding: 20px; background-color: white; border-radius: 8px; border: 1px solid #E5E7EB;">
              <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Estado de tu Suscripción</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: #7AB8BF; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">1</div>
                    <div style="color: #374151; font-size: 12px; margin-top: 8px; font-weight: 600;">Suscrito</div>
                    <div style="position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background-color: #7AB8BF; z-index: 1;"></div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: #7AB8BF; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">2</div>
                    <div style="color: #374151; font-size: 12px; margin-top: 8px; font-weight: 600;">Activo</div>
                    <div style="position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background-color: ${type === 'payment' ? '#7AB8BF' : '#E5E7EB'}; z-index: 1;"></div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: ${type === 'payment' ? '#7AB8BF' : '#E5E7EB'}; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">3</div>
                    <div style="color: ${type === 'payment' ? '#374151' : '#9CA3AF'}; font-size: 12px; margin-top: 8px; font-weight: 600;">En envío</div>
                    <div style="position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background-color: #E5E7EB; z-index: 1;"></div>
                  </td>
                  <td style="width: 25%; text-align: center; position: relative;">
                    <div style="background-color: #E5E7EB; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-block; line-height: 32px; font-size: 16px; font-weight: bold; z-index: 2; position: relative;">4</div>
                    <div style="color: #9CA3AF; font-size: 12px; margin-top: 8px; font-weight: 600;">Renovando</div>
                  </td>
                </tr>
              </table>
            </div>
            ` : ''}

            <!-- Alerta para cancelación / pausa / fallo de pago -->
            ${['cancelled', 'paused', 'payment_failed'].includes(type) ? `
            <div style="margin-bottom: 40px; padding: 20px; background-color: ${type === 'paused' ? '#FFFBEB' : '#FEF2F2'}; border-radius: 8px; border: 1px solid ${type === 'paused' ? '#FDE68A' : '#FCA5A5'};">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 40px; vertical-align: top;">
                    <span style="font-size: 24px;">${typeInfo.icon}</span>
                  </td>
                  <td>
                    <h3 style="font-size: 15px; color: ${type === 'paused' ? '#92400E' : '#B91C1C'}; margin-top: 0; margin-bottom: 5px; font-weight: 600;">${typeInfo.title}</h3>
                    <p style="font-size: 13px; color: ${type === 'paused' ? '#78350F' : '#7F1D1D'}; margin: 0;">${typeInfo.message}</p>
                  </td>
                </tr>
              </table>
            </div>
            ` : ''}

            <!-- Resumen de la suscripción -->
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 15px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: normal;">Resumen de la suscripción</h3>

              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; width: 60px;">
                      ${data.product_image
                        ? `<img src="${data.product_image}" alt="Producto" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" />`
                        : `<div style="width: 50px; height: 50px; background-color: #7AB8BF; border-radius: 8px; text-align: center; line-height: 50px;"><span style="color: white; font-size: 22px;">🐾</span></div>`
                      }
                    </td>
                    <td style="padding: 15px 10px; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: left;">
                      <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151; text-transform: uppercase;">${data.plan_description || 'Suscripción ' + frequencyText}</p>
                      <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">Frecuencia: ${frequencyText}${data.status ? ' · ' + (data.status === 'active' ? '✅ Activa' : data.status === 'paused' ? '⏸️ Pausada' : data.status) : ''}</p>
                    </td>
                    <td style="padding: 15px 0; border-bottom: 1px solid #d1d5db; vertical-align: middle; text-align: right; width: 100px;">
                      <p style="margin: 0; font-weight: bold; font-size: 13px; color: #374151;">$${data.amount.toFixed(2)}</p>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <td style="width: 40%;"></td>
                  <td style="width: 60%;">
                    <table style="width: 100%; font-size: 13px; color: #6b7280;">
                      <tr>
                        <td style="padding: 5px 0;">Subtotal</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$${data.shipping_cost ? (data.amount - data.shipping_cost).toFixed(2) : data.amount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;">Envíos</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151;">$${data.shipping_cost ? data.shipping_cost.toFixed(2) : '0.00'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; border-bottom: 1px solid #d1d5db; padding-bottom: 15px;">Impuestos</td>
                        <td style="padding: 5px 0; border-bottom: 1px solid #d1d5db; padding-bottom: 15px; text-align: right; color: #374151;">$0.00</td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 0 5px; font-size: 15px; color: #6b7280;">Total</td>
                        <td style="padding: 20px 0 5px; text-align: right; font-size: 18px; font-weight: bold; color: #374151;">$${data.amount.toFixed(2)} MXN</td>
                      </tr>
                      ${data.next_payment_date ? `
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Próximo cobro</td>
                        <td style="padding: 5px 0; text-align: right; color: #7AB8BF; font-weight: bold; font-size: 12px;">${typeof data.next_payment_date === 'string' && data.next_payment_date.includes('-') ? new Date(data.next_payment_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : data.next_payment_date}</td>
                      </tr>
                      ` : ''}
                      ${data.current_period_end ? `
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Período hasta</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151; font-size: 12px;">${new Date(data.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      </tr>
                      ` : ''}
                      ${data.current_period_start ? `
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Período desde</td>
                        <td style="padding: 5px 0; text-align: right; color: #374151; font-size: 12px;">${new Date(data.current_period_start).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            ${type === 'subscription_updated' && data.admin_details ? `
                <!-- Detalles para Admin -->
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <h4 style="margin-top: 0; color: #92400e; font-size: 14px;">📊 Detalles de Actualización (Admin)</h4>
                  <table style="width: 100%; font-size: 12px; color: #78350f;">
                    <tr>
                      <td style="padding: 4px 0;">ID Usuario:</td>
                      <td style="text-align: right; font-weight: bold;">${data.admin_details.user_id || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0;">ID Suscripción:</td>
                      <td style="text-align: right; font-family: monospace; font-size: 11px;">${data.admin_details.subscription_id}</td>
                    </tr>
                    ${data.admin_details.changes?.dates ? `
                      <tr>
                        <td style="padding: 4px 0;">Período anterior:</td>
                        <td style="text-align: right;">${data.admin_details.previous_period_start ? new Date(data.admin_details.previous_period_start).toLocaleDateString('es-MX') : 'N/A'} - ${data.admin_details.previous_period_end ? new Date(data.admin_details.previous_period_end).toLocaleDateString('es-MX') : 'N/A'}</td>
                      </tr>
                    ` : ''}
                    ${data.admin_details.changes?.status ? `
                      <tr>
                        <td style="padding: 4px 0;">Estado anterior:</td>
                        <td style="text-align: right;">${data.admin_details.previous_status}</td>
                      </tr>
                    ` : ''}
                  </table>
                </div>
              ` : ''
            }

            <!-- Beneficios (solo en creación) -->
            ${type === 'created' ? `
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #065f46; text-align: center;">🎁 Beneficios de tu Suscripción</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 8px 0; color: #047857;">✓ Nutrición premium para tu mascota</li>
                    <li style="padding: 8px 0; color: #047857;">✓ Entrega automática cada período</li>
                    <li style="padding: 8px 0; color: #047857;">✓ Descuentos exclusivos de suscriptor</li>
                    <li style="padding: 8px 0; color: #047857;">✓ Soporte prioritario</li>
                    <li style="padding: 8px 0; color: #047857;">✓ Cancela o pausa cuando quieras</li>
                  </ul>
                </div>
              ` : ''
            }

            <!-- Acciones -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/suscripcion"
                 style="background-color: #7AB8BF; color: white; padding: 12px 32px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 15px;">
                Gestionar mi suscripción
              </a>
            </div>

            <!-- WhatsApp CTA -->
            <div style="margin: 28px 0; padding: 20px 24px; background-color: #f0fafe; border-radius: 14px; border: 1px solid #c6e9eb; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #374151;">¿Necesitas ayuda?</p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">Escríbenos con tus dudas o comentarios.</p>
              <a href="https://wa.me/525561269681" target="_blank" style="display: inline-block; background-color: #7AB8BF; color: white; padding: 11px 26px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;"><img src="https://petgourmet.mx/iconos/whatsapp.png?v=2" width="15" height="15" alt="" style="display:inline-block;vertical-align:middle;margin-right:6px;margin-bottom:2px;">Enviar WhatsApp</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <div style="margin-bottom: 14px;">
              <a href="https://web.facebook.com/petgourmetmx" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/facebook.png?v=2" width="34" height="34" alt="Facebook" style="display:inline-block;border:0;"></a>
              <a href="https://www.instagram.com/petgourmet_mx/" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/instagram.png?v=2" width="34" height="34" alt="Instagram" style="display:inline-block;border:0;"></a>
              <a href="https://www.tiktok.com/@petgourmetmex" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/tiktok.png" width="34" height="34" alt="TikTok" style="display:inline-block;border:0;"></a>
              <a href="https://www.youtube.com/@PetGourmetMexico" target="_blank" style="display:inline-block;margin:0 4px;text-decoration:none;vertical-align:middle"><img src="https://petgourmet.mx/iconos/youtube.png?v=2" width="34" height="34" alt="YouTube" style="display:inline-block;border:0;"></a>
            </div>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              © 2025 Pet Gourmet. Todos los derechos reservados.
            </p>
            <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">
              Este correo fue enviado a ${data.user_email}
            </p>
            <p style="margin: 8px 0 0 0; color: #c9cdd4; font-size: 11px;">¿No deseas recibir más correos? <a href="${appUrl}/suscripcion" style="color: #c9cdd4; text-decoration: underline;">Darte de baja</a></p>
          </div>
        </div>
      </body>
    </html>
    `
  };
}