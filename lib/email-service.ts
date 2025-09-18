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
  emailType: 'created' | 'payment' | 'cancelled',
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

  // Método auxiliar para delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Funciones auxiliares para plantillas
function getOrderStatusTemplate(status: string, orderData: any) {
  return {
    subject: `Actualización de tu pedido - ${status}`,
    html: `<h1>Tu pedido está ${status}</h1><p>Detalles: ${JSON.stringify(orderData)}</p>`
  };
}

function getSubscriptionTemplate(type: string, data: SubscriptionEmailData) {
  return {
    subject: `Suscripción ${type}`,
    html: `<h1>Suscripción ${type}</h1><p>Hola ${data.user_name}, tu suscripción ${data.subscription_type} ha sido ${type}.</p>`
  };
}