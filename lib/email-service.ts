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
}

export interface ThankYouEmailData {
  user_email: string;
  user_name: string;
  subscription_type: string;
  original_price: number;
  discounted_price?: number;
  discount_percentage?: number;
  start_date: string;
  next_billing_date: string;
  external_reference: string;
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
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled',
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
      html: template.html
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
  emailType: 'created' | 'payment' | 'cancelled' | 'paused' | 'resumed' | 'payment_failed',
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
      html: template.html
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
  // Enviar correo de agradecimiento al cliente
  async sendThankYouEmail(data: ThankYouEmailData) {
    try {
      const template = this.createThankYouTemplate(data);
      return await this.sendEmail({
        to: data.user_email,
        subject: template.subject,
        html: template.html
      });
    } catch (error) {
      console.error('Error enviando correo de agradecimiento:', error);
      throw error;
    }
  }

  // Enviar correo de notificación a administradores
  async sendAdminNotificationEmail(data: ThankYouEmailData) {
    try {
      const template = this.createAdminNotificationTemplate(data);
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@petgourmet.mx'];
      
      const promises = adminEmails.map(email => 
        this.sendEmail({
          to: email.trim(),
          subject: template.subject,
          html: template.html
        })
      );
      
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error enviando correo a administradores:', error);
      throw error;
    }
  }

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

  // Plantilla de correo de agradecimiento
  private createThankYouTemplate(data: ThankYouEmailData) {
    const discountText = data.discount_percentage 
      ? `<tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Descuento aplicado</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">${data.discount_percentage}% de descuento</td>
        </tr>`
      : `<tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Precio</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">$${data.original_price} MXN</td>
        </tr>`;

    return {
      subject: '🎉 ¡Gracias por tu suscripción a Pet Gourmet!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>¡Gracias por tu suscripción!</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #7AB8BF; text-align: center;">🎉 ¡Gracias por tu suscripción, ${data.user_name}!</h1>
              
              <p>¡Excelente elección! Tu suscripción ha sido activada exitosamente.</p>
              
              <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📋 Detalles de tu suscripción:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Plan</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.subscription_type}</td>
                  </tr>
                  ${discountText}
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Próximo cobro</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.next_billing_date}</td>
                  </tr>
                </table>
              </div>
              
              <p>Gracias por elegir Pet Gourmet.</p>
              
              <p>Saludos cordiales,<br><strong>El equipo de Pet Gourmet</strong></p>
            </div>
          </body>
        </html>
      `
    };
  }

  // Plantilla de correo para administradores
  private createAdminNotificationTemplate(data: ThankYouEmailData) {
    return {
      subject: `🔔 Nueva suscripción activada - ${data.user_name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Nueva suscripción activada</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #7AB8BF;">🔔 Nueva suscripción activada</h1>
              
              <p>Se ha activado una nueva suscripción en Pet Gourmet:</p>
              
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">👤 Información del cliente:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Nombre</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.user_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Email</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.user_email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Plan</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.subscription_type}</td>
                  </tr>
                </table>
              </div>
              
              <p>Pet Gourmet - Panel de administración</p>
            </div>
          </body>
        </html>
      `
    };
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
        <html>
          <head>
            <meta charset="utf-8">
            <title>${statusInfo.title}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
                  ${statusInfo.icon} Pet Gourmet
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px 20px;">
                <h2 style="color: ${statusInfo.color}; text-align: center; margin-bottom: 20px;">
                  ${statusInfo.title}
                </h2>
                
                <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
                  Hola <strong>${data.user_name}</strong>,
                </p>
                
                <div style="background-color: ${statusInfo.backgroundColor}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; font-size: 16px; color: ${statusInfo.textColor};">
                    ${statusInfo.message}
                  </p>
                </div>
                
                ${productSection}
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">ID de Suscripción:</p>
                  <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #374151; text-align: center;">#${data.subscription_id}</p>
                </div>
                
                ${nextBillingSection}
                
                ${statusInfo.additionalInfo ? `
                  <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;">
                      <strong>ℹ️ Información importante:</strong><br>
                      ${statusInfo.additionalInfo}
                    </p>
                  </div>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                  <p style="color: #6b7280; font-size: 14px;">¿Tienes alguna pregunta?</p>
                  <p style="color: #7AB8BF; font-weight: bold; margin: 5px 0;">📧 contacto@petgourmet.mx</p>
                  <p style="color: #7AB8BF; font-weight: bold;">📞 +52 123 456 7890</p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  © 2025 Pet Gourmet. Todos los derechos reservados.
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">
                  Este es un correo automático, por favor no respondas a este mensaje.
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
    
    return {
      subject: `🔔 Cambio de estado de suscripción #${data.subscription_id} - ${data.new_status.toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Cambio de estado de suscripción</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #7AB8BF;">🔔 Cambio de estado de suscripción</h1>
              
              <p>Se ha registrado un cambio de estado en una suscripción:</p>
              
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📊 Información de la suscripción:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">ID Suscripción</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">#${data.subscription_id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Cliente</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.user_name} (${data.user_email})</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Tipo</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.subscription_type}</td>
                  </tr>
                  ${data.product_name ? `
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Producto</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.product_name}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Estado anterior</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.old_status || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Nuevo estado</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${statusBadge}</td>
                  </tr>
                  ${data.external_reference ? `
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Referencia</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; font-family: monospace; font-size: 12px;">${data.external_reference}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/subscriptions" 
                   style="display: inline-block; background-color: #7AB8BF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Ver en Panel de Admin
                </a>
              </div>
              
              <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                Pet Gourmet - Notificación automática del sistema
              </p>
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
  const statusMessages = {
    pending: {
      subject: '📋 Tu pedido ha sido recibido - Pet Gourmet',
      title: '📋 Pedido Recibido',
      message: 'Hemos recibido tu pedido y lo estamos procesando. Te notificaremos cuando esté listo para envío.',
      color: '#fbbf24',
      icon: '📋'
    },
    processing: {
      subject: '⚡ Tu pedido está siendo preparado - Pet Gourmet',
      title: '⚡ Preparando tu Pedido',
      message: 'Tu pedido está siendo preparado con mucho cuidado. Pronto estará listo para el envío.',
      color: '#3b82f6',
      icon: '⚡'
    },
    completed: {
      subject: '✅ Tu pedido ha sido enviado - Pet Gourmet',
      title: '✅ Pedido Enviado',
      message: 'Tu pedido ha sido enviado exitosamente. Recibirás la información de seguimiento pronto.',
      color: '#10b981',
      icon: '✅'
    },
    cancelled: {
      subject: '❌ Tu pedido ha sido cancelado - Pet Gourmet',
      title: '❌ Pedido Cancelado',
      message: 'Tu pedido ha sido cancelado. Si tienes alguna pregunta, no dudes en contactarnos.',
      color: '#ef4444',
      icon: '❌'
    }
  };

  const statusInfo = statusMessages[status as keyof typeof statusMessages] || statusMessages.pending;
  
  // Formatear productos si existen
  let productsHtml = '';
  if (orderData?.products && Array.isArray(orderData.products)) {
    productsHtml = `
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #374151;">🛍️ Productos en tu pedido:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e5e7eb;">
              <th style="padding: 12px; text-align: left; border: 1px solid #d1d5db;">Producto</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">Cantidad</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #d1d5db;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.products.map((product: any) => `
              <tr>
                <td style="padding: 12px; border: 1px solid #d1d5db;">${product.name || 'Producto'}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">${product.quantity || 1}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #d1d5db;">$${product.price || '0.00'} MXN</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Información de envío si existe
  let shippingHtml = '';
  if (orderData?.shipping_address) {
    const addr = orderData.shipping_address;
    shippingHtml = `
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">📍 Dirección de envío:</h3>
        <p style="margin: 5px 0;"><strong>${addr.full_name || addr.name || 'Cliente'}</strong></p>
        <p style="margin: 5px 0;">${addr.address_line_1 || addr.address || ''}</p>
        ${addr.address_line_2 ? `<p style="margin: 5px 0;">${addr.address_line_2}</p>` : ''}
        <p style="margin: 5px 0;">${addr.city || ''}, ${addr.state || ''} ${addr.postal_code || ''}</p>
        ${addr.phone ? `<p style="margin: 5px 0;">📞 ${addr.phone}</p>` : ''}
      </div>
    `;
  }

  return {
    subject: statusInfo.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${statusInfo.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
                ${statusInfo.icon} Pet Gourmet
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: ${statusInfo.color}; color: white; padding: 15px 25px; border-radius: 25px; display: inline-block; font-size: 18px; font-weight: bold;">
                  ${statusInfo.title}
                </div>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
                ${statusInfo.message}
              </p>
              
              ${orderData?.id ? `
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">Número de pedido:</p>
                  <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #374151;">#${orderData.id}</p>
                </div>
              ` : ''}
              
              ${productsHtml}
              ${shippingHtml}
              
              ${orderData?.total ? `
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; font-size: 16px; color: #065f46;">Total del pedido:</p>
                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #10b981;">$${orderData.total} MXN</p>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px;">¿Tienes alguna pregunta? Contáctanos:</p>
                <p style="color: #7AB8BF; font-weight: bold;">📧 soporte@petgourmet.mx</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © 2024 Pet Gourmet. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}

function getSubscriptionTemplate(type: string, data: SubscriptionEmailData) {
  const typeMessages = {
    created: {
      subject: '🎉 ¡Bienvenido a Pet Gourmet! Tu suscripción está activa',
      title: '🎉 ¡Suscripción Activada!',
      message: 'Gracias por suscribirte a Pet Gourmet. Tu suscripción ha sido activada exitosamente y recibirás tu primer envío pronto.',
      color: '#10b981',
      icon: '✅'
    },
    payment: {
      subject: '💳 Pago de suscripción procesado - Pet Gourmet',
      title: '💳 Pago Procesado',
      message: 'Tu pago de suscripción ha sido procesado exitosamente. Tu próximo envío está en camino.',
      color: '#3b82f6',
      icon: '💳'
    },
    cancelled: {
      subject: '❌ Suscripción cancelada - Pet Gourmet',
      title: '❌ Suscripción Cancelada',
      message: 'Tu suscripción ha sido cancelada. Esperamos verte de nuevo pronto.',
      color: '#ef4444',
      icon: '❌'
    },
    paused: {
      subject: '⏸️ Suscripción pausada - Pet Gourmet',
      title: '⏸️ Suscripción Pausada',
      message: 'Tu suscripción ha sido pausada temporalmente. No se realizarán cobros hasta que la reactives.',
      color: '#f59e0b',
      icon: '⏸️'
    },
    resumed: {
      subject: '▶️ Suscripción reactivada - Pet Gourmet',
      title: '▶️ ¡Suscripción Reactivada!',
      message: 'Tu suscripción ha sido reactivada exitosamente. Los envíos se reanudarán según el calendario.',
      color: '#10b981',
      icon: '▶️'
    },
    payment_failed: {
      subject: '⚠️ Error en el pago de tu suscripción - Pet Gourmet',
      title: '⚠️ Error en el Pago',
      message: 'No pudimos procesar el pago de tu suscripción. Por favor, actualiza tu método de pago para continuar.',
      color: '#dc2626',
      icon: '⚠️'
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

  return {
    subject: typeInfo.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${typeInfo.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
                🐾 Pet Gourmet
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: ${typeInfo.color}; color: white; padding: 15px 25px; border-radius: 25px; display: inline-block; font-size: 18px; font-weight: bold;">
                  ${typeInfo.title}
                </div>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
                Hola <strong>${data.user_name}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px; text-align: center;">
                ${typeInfo.message}
              </p>
              
              <!-- Detalles de la suscripción -->
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151; text-align: center;">📦 Detalles de tu Suscripción</h3>
                
                <div style="margin: 15px 0; padding: 15px; background-color: white; border-radius: 8px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Tipo de suscripción:</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #374151;">Suscripción ${frequencyText}</td>
                    </tr>
                    ${data.plan_description ? `
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Plan:</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #374151; border-top: 1px solid #e5e7eb;">${data.plan_description}</td>
                      </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Monto por período:</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #10b981; font-size: 18px; border-top: 1px solid #e5e7eb;">$${data.amount.toFixed(2)} MXN</td>
                    </tr>
                    ${data.next_payment_date ? `
                      <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Próximo cobro:</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #7AB8BF; border-top: 1px solid #e5e7eb;">${data.next_payment_date}</td>
                      </tr>
                    ` : ''}
                  </table>
                </div>
              </div>
              
              <!-- Beneficios -->
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
              ` : ''}
              
              <!-- Acciones -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/perfil" 
                   style="background-color: #7AB8BF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Ver Mi Suscripción
                </a>
              </div>
              
              <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">¿Tienes alguna pregunta? Contáctanos:</p>
                <p style="color: #7AB8BF; font-weight: bold; margin: 5px 0;">📧 soporte@petgourmet.mx</p>
                <p style="color: #7AB8BF; font-weight: bold; margin: 5px 0;">📱 WhatsApp: +52 123 456 7890</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © 2025 Pet Gourmet. Todos los derechos reservados.
              </p>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">
                Este correo fue enviado a ${data.user_email}
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  };
}