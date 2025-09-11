// Sistema de emails para estados de orden y suscripciones
import { createServiceClient } from "@/lib/supabase/service"
import nodemailer from 'nodemailer'

export interface EmailData {
  to: string
  subject: string
  html: string
  orderNumber?: string
  customerName?: string
}

export interface SubscriptionEmailData {
  customerName: string
  customerEmail: string
  planName: string
  planDescription?: string
  frequency: string
  amount: number
  currency: string
  productName: string
  productImage?: string
  subscriptionId: string
  externalReference?: string
  nextPaymentDate?: string
  paymentMethod?: string
  transactionId?: string
}

// Configurar el transporter SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Configuraciones adicionales para GoDaddy/Secure Server
    tls: {
      rejectUnauthorized: false // Puede ser necesario para algunos proveedores
    }
  })
}

// Plantillas de email por estado
export const emailTemplates = {
  pending: (orderNumber: string, customerName: string) => ({
    subject: `¡Gracias por tu compra! - Orden #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmación de Compra</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
              </div>
            </div>
            
            <h1 style="color: #7AB8BF;">¡Gracias por tu compra, ${customerName}!</h1>
            
            <p>Tu orden <strong>#${orderNumber}</strong> ha sido recibida exitosamente.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #7AB8BF;">Estado de tu pedido:</h3>
              <p><strong>📦 PENDIENTE:</strong> Estamos preparando tu pedido con mucho amor.</p>
              <p>Te notificaremos cuando esté listo para envío.</p>
            </div>
            
            <p>Puedes revisar el estado de tu pedido en cualquier momento en tu <a href="https://petgourmet.mx/perfil">dashboard</a>.</p>
            
            <p style="margin-top: 30px;">
              ¡Gracias por confiar en Pet Gourmet!<br>
              <strong>El equipo de Pet Gourmet</strong>
            </p>
          </div>
        </body>
      </html>
    `
  }),

  processing: (orderNumber: string, customerName: string) => ({
    subject: `Tu pedido está en camino - Orden #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedido en Camino</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
              </div>
            </div>
            
            <h1 style="color: #7AB8BF;">¡Tu pedido está en camino, ${customerName}!</h1>
            
            <p>Tu orden <strong>#${orderNumber}</strong> ha sido enviada y está en camino hacia ti.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7AB8BF;">
              <h3 style="margin-top: 0; color: #8c4a23;">Estado de tu pedido:</h3>
              <p><strong>🚚 EN CAMINO:</strong> Tu pedido ha salido de nuestras instalaciones.</p>
              <p>Pronto recibirás la nutrición premium que tu mascota merece.</p>
            </div>
            
            <p>Te notificaremos cuando tu pedido sea entregado.</p>
            
            <p style="margin-top: 30px;">
              ¡Gracias por elegir Pet Gourmet!<br>
              <strong>El equipo de Pet Gourmet</strong>
            </p>
          </div>
        </body>
      </html>
    `
  }),

  completed: (orderNumber: string, customerName: string) => ({
    subject: `¡Pedido entregado! - Orden #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedido Entregado</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
              </div>
            </div>
            
            <h1 style="color: #7AB8BF;">¡Pedido entregado exitosamente! 🎉</h1>
            
            <p>¡Hola ${customerName}!</p>
            <p>Tu orden <strong>#${orderNumber}</strong> ha sido entregada con éxito.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7AB8BF;">
              <h3 style="margin-top: 0; color: #8c4a23;">¡Disfruta tu compra!</h3>
              <p><strong>✅ ENTREGADO:</strong> Tu pedido ha llegado a su destino.</p>
              <p>Esperamos que tu mascota disfrute la nutrición premium de Pet Gourmet.</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>💝 ¿Te gustó tu experiencia?</strong></p>
              <p>Nos encantaría conocer tu opinión. <a href="https://petgourmet.mx/contacto">Déjanos tu reseña</a>.</p>
            </div>
            
            <p style="margin-top: 30px;">
              ¡Gracias por confiar en Pet Gourmet para el cuidado de tu mascota!<br>
              <strong>El equipo de Pet Gourmet</strong>
            </p>
          </div>
        </body>
      </html>
    `
  }),

  cancelled: (orderNumber: string, customerName: string) => ({
    subject: `Pedido cancelado - Orden #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedido Cancelado</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
              </div>
            </div>
            
            <h1 style="color: #7AB8BF;">Lamentamos informarte sobre tu pedido</h1>
            
            <p>Hola ${customerName},</p>
            <p>Lamentamos informarte que tu orden <strong>#${orderNumber}</strong> ha sido cancelada.</p>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="margin-top: 0; color: #721c24;">Estado de tu pedido:</h3>
              <p><strong>❌ CANCELADO:</strong> Tu pedido no pudo ser procesado.</p>
              <p>Si realizaste un pago, será reembolsado en los próximos 3-5 días hábiles.</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>💬 ¿Necesitas ayuda?</strong></p>
              <p>Si tienes preguntas sobre la cancelación, <a href="https://petgourmet.mx/contacto">contáctanos</a> y te ayudaremos.</p>
            </div>
            
            <p>Esperamos poder servirte mejor en el futuro.</p>
            
            <p style="margin-top: 30px;">
              Saludos cordiales,<br>
              <strong>El equipo de Pet Gourmet</strong>
            </p>
          </div>
        </body>
      </html>
    `
  })
}

// Función para enviar email usando SMTP
export async function sendOrderStatusEmail(
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled',
  customerEmail: string,
  orderNumber: string,
  customerName: string
) {
  try {
    console.log(`Sending ${orderStatus} email to ${customerEmail} for order ${orderNumber}`)
    
    const template = emailTemplates[orderStatus](orderNumber, customerName)
    
    // Verificar configuración SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, skipping email send')
      return { success: false, error: 'SMTP not configured' }
    }
    
    // En desarrollo, solo loggear pero también enviar el email real si está configurado
    if (process.env.NODE_ENV === 'development') {
      console.log('DEVELOPMENT MODE - EMAIL DETAILS:')
      console.log('To:', customerEmail)
      console.log('Subject:', template.subject)
      console.log('Order:', orderNumber)
    }
    
    // Crear transporter y enviar email
    const transporter = createTransporter()
    
    // Verificar conexión SMTP
    try {
      await transporter.verify()
      console.log('SMTP connection verified successfully')
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError)
      return { success: false, error: 'SMTP connection failed' }
    }
    
    // Configurar el email
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: template.subject,
      html: template.html
    }
    
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    })
    
    // Enviar el email
    const result = await transporter.sendMail(mailOptions)
    
    console.log('Email sent successfully:', {
      messageId: result.messageId,
      response: result.response
    })
    
    return { 
      success: true, 
      messageId: result.messageId,
      response: result.response 
    }
    
  } catch (error) {
    console.error('Error sending email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Función para registrar el email enviado en la base de datos
export async function logEmailSent(orderId: number, emailType: string, customerEmail: string) {
  try {
    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('email_logs')
      .insert({
        order_id: orderId,
        email_type: emailType,
        recipient_email: customerEmail,
        sent_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error logging email:', error)
    }
  } catch (error) {
    console.error('Error logging email:', error)
  }
}

// Plantillas de email para suscripciones
export const subscriptionEmailTemplates = {
  created: (data: SubscriptionEmailData) => ({
    subject: `🎉 ¡Bienvenido a Pet Gourmet! - Suscripción confirmada`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Suscripción Confirmada</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
              </div>
            </div>
            
            <h1 style="color: #7AB8BF;">🎉 ¡Bienvenido a Pet Gourmet, ${data.customerName}!</h1>
            
            <p>Tu suscripción ha sido activada exitosamente. ¡Gracias por confiar en nosotros para el cuidado de tu mascota!</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7AB8BF;">
              <h3 style="margin-top: 0; color: #8c4a23;">📋 Detalles de tu suscripción:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Producto</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.productName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Plan</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.planName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Frecuencia</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.frequency}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Monto</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">$${data.amount} ${data.currency}</td>
                </tr>
                ${data.nextPaymentDate ? `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Próximo cobro</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.nextPaymentDate}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${data.planDescription ? `
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">💬 Descripción del plan:</h3>
              <p style="background-color: white; padding: 15px; border-radius: 4px; white-space: pre-wrap; border-left: 4px solid #ffc107;">
${data.planDescription}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📋 Información importante:</strong></p>
              <ul>
                <li>Tu suscripción se renovará automáticamente según la frecuencia seleccionada</li>
                <li>Puedes gestionar tu suscripción desde tu <a href="https://petgourmet.mx/perfil">perfil</a></li>
                <li>Recibirás notificaciones antes de cada cobro</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://petgourmet.mx/perfil" style="background: #7AB8BF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mi suscripción</a>
            </div>
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              Si no deseas recibir más emails, puedes <a href="https://petgourmet.mx/unsubscribe?email=${encodeURIComponent(data.customerEmail)}">darte de baja aquí</a>.<br>
              Pet Gourmet - Nutrición premium para tus compañeros<br>
              <strong>ID de suscripción:</strong> ${data.subscriptionId}
            </p>
          </div>
        </body>
      </html>
    `
  }),

  payment: (data: SubscriptionEmailData) => ({
    subject: `💳 Pago procesado - Suscripción Pet Gourmet`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pago Procesado</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
              </div>
            </div>
            
            <h1 style="color: #7AB8BF;">💳 ¡Pago procesado exitosamente!</h1>
            
            <p>¡Hola ${data.customerName}!</p>
            <p>Tu pago de suscripción ha sido procesado correctamente. Tu suscripción sigue activa.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7AB8BF;">
              <h3 style="margin-top: 0; color: #8c4a23;">💳 Detalles del pago:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Producto</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.productName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Plan</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.planName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Monto pagado</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">$${data.amount} ${data.currency}</td>
                </tr>
                ${data.paymentMethod ? `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Método de pago</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.paymentMethod}</td>
                </tr>
                ` : ''}
                ${data.transactionId ? `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">ID de transacción</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; font-family: monospace;">${data.transactionId}</td>
                </tr>
                ` : ''}
                ${data.nextPaymentDate ? `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Próximo cobro</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.nextPaymentDate}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📋 Tu suscripción:</strong></p>
              <ul>
                <li>Sigue activa y renovándose automáticamente</li>
                <li>Puedes gestionar tu suscripción desde tu <a href="https://petgourmet.mx/perfil">perfil</a></li>
                <li>Recibirás tu próximo envío según la frecuencia seleccionada</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://petgourmet.mx/perfil" style="background: #7AB8BF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mi suscripción</a>
            </div>
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              Si no deseas recibir más emails, puedes <a href="https://petgourmet.mx/unsubscribe?email=${encodeURIComponent(data.customerEmail)}">darte de baja aquí</a>.<br>
              Pet Gourmet - Nutrición premium para tus compañeros<br>
              <strong>ID de suscripción:</strong> ${data.subscriptionId}
            </p>
          </div>
        </body>
      </html>
    `
  }),

  cancelled: (data: SubscriptionEmailData) => ({
    subject: `📋 Suscripción cancelada - Pet Gourmet`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Suscripción Cancelada</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
              </div>
            </div>
            
            <h1 style="color: #7AB8BF;">📋 Suscripción cancelada</h1>
            
            <p>Hola ${data.customerName},</p>
            <p>Tu suscripción a Pet Gourmet ha sido cancelada exitosamente.</p>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="margin-top: 0; color: #721c24;">📋 Detalles de la cancelación:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Producto</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.productName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Plan cancelado</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.planName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Fecha de cancelación</td>
                  <td style="padding: 8px 12px; border: 1px solid #ddd;">${new Date().toLocaleDateString('es-MX')}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>💬 ¿Necesitas ayuda?</strong></p>
              <p>Si tienes preguntas sobre la cancelación o si cambias de opinión, <a href="https://petgourmet.mx/contacto">contáctanos</a> y te ayudaremos.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 20px;">Lamentamos verte partir. Si cambias de opinión, estaremos aquí para ti.</p>
              <a href="https://petgourmet.mx/productos" style="background: #7AB8BF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Explorar productos</a>
            </div>
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              Pet Gourmet - Siempre aquí para tu mascota<br>
              <strong>ID de suscripción:</strong> ${data.subscriptionId}
            </p>
          </div>
        </body>
      </html>
    `
  })
}

// Función para enviar emails de suscripción
export async function sendSubscriptionEmail(
  emailType: 'created' | 'payment' | 'cancelled',
  subscriptionData: SubscriptionEmailData
) {
  try {
    console.log(`Sending ${emailType} subscription email to ${subscriptionData.customerEmail}`)
    
    const template = subscriptionEmailTemplates[emailType](subscriptionData)
    
    // Verificar configuración SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, skipping email send')
      return { success: false, error: 'SMTP not configured' }
    }
    
    // En desarrollo, solo loggear pero también enviar el email real si está configurado
    if (process.env.NODE_ENV === 'development') {
      console.log('DEVELOPMENT MODE - SUBSCRIPTION EMAIL DETAILS:')
      console.log('To:', subscriptionData.customerEmail)
      console.log('Subject:', template.subject)
      console.log('Plan:', subscriptionData.planName)
      console.log('Product:', subscriptionData.productName)
      console.log('Amount:', subscriptionData.amount, subscriptionData.currency)
    }
    
    // Crear transporter y enviar email
    const transporter = createTransporter()
    
    // Verificar conexión SMTP
    try {
      await transporter.verify()
      console.log('SMTP connection verified successfully')
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError)
      return { success: false, error: 'SMTP connection failed' }
    }
    
    // Configurar el email
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: subscriptionData.customerEmail,
      subject: template.subject,
      html: template.html
    }
    
    console.log('Sending subscription email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      subscriptionId: subscriptionData.subscriptionId
    })
    
    // Enviar el email
    const result = await transporter.sendMail(mailOptions)
    
    console.log('Subscription email sent successfully:', {
      messageId: result.messageId,
      response: result.response
    })
    
    return { 
      success: true, 
      messageId: result.messageId,
      response: result.response 
    }
    
  } catch (error) {
    console.error('Error sending subscription email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
