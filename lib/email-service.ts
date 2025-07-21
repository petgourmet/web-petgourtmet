// Sistema de emails para estados de orden
import { createServiceClient } from "@/lib/supabase/service"
import nodemailer from 'nodemailer'

export interface EmailData {
  to: string
  subject: string
  html: string
  orderNumber?: string
  customerName?: string
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
              <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
            </div>
            
            <h1 style="color: #2c5aa0;">¡Gracias por tu compra, ${customerName}!</h1>
            
            <p>Tu orden <strong>#${orderNumber}</strong> ha sido recibida exitosamente.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2c5aa0;">Estado de tu pedido:</h3>
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
              <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
            </div>
            
            <h1 style="color: #28a745;">¡Tu pedido está en camino, ${customerName}!</h1>
            
            <p>Tu orden <strong>#${orderNumber}</strong> ha sido enviada y está en camino hacia ti.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">Estado de tu pedido:</h3>
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
              <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
            </div>
            
            <h1 style="color: #28a745;">¡Pedido entregado exitosamente! 🎉</h1>
            
            <p>¡Hola ${customerName}!</p>
            <p>Tu orden <strong>#${orderNumber}</strong> ha sido entregada con éxito.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">¡Disfruta tu compra!</h3>
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
              <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
            </div>
            
            <h1 style="color: #dc3545;">Lamentamos informarte sobre tu pedido</h1>
            
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
