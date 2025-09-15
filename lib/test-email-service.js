// lib/test-email-service.js
// Versión modificada del EmailService para pruebas
// Redirige todos los correos a cristoferscalante@gmail.com

const nodemailer = require('nodemailer')

// Función para crear transporter SMTP
function createTransporter() {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Clase EmailService modificada para pruebas
class TestEmailService {
  constructor() {
    this.testEmail = 'cristoferscalante@gmail.com'
    console.log('✅ TestEmailService configurado - todos los correos van a cristoferscalante@gmail.com')
  }

  // Enviar correo de agradecimiento al cliente (modificado para pruebas)
  async sendThankYouEmail(data) {
    try {
      const template = this.createThankYouTemplate(data)
      const originalEmail = data.user_email
      
      // Modificar el contenido para indicar que es una prueba
      const testTemplate = {
        subject: `[PRUEBA] ${template.subject}`,
        html: `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">🧪 CORREO DE PRUEBA</h3>
            <p><strong>Email original destinatario:</strong> ${originalEmail}</p>
            <p><strong>Redirigido a:</strong> ${this.testEmail}</p>
            <p><strong>Tipo:</strong> Correo de agradecimiento al cliente</p>
          </div>
          ${template.html}
        `
      }
      
      console.log(`📧 Enviando correo de agradecimiento (PRUEBA):`)
      console.log(`   Original: ${originalEmail} → Redirigido: ${this.testEmail}`)
      
      return await this.sendEmail({
        to: this.testEmail,
        subject: testTemplate.subject,
        html: testTemplate.html
      })
    } catch (error) {
      console.error('Error enviando correo de agradecimiento:', error)
      throw error
    }
  }

  // Enviar correo de notificación a administradores (modificado para pruebas)
  async sendAdminNotificationEmail(data) {
    try {
      const template = this.createAdminNotificationTemplate(data)
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@petgourmet.mx']
      
      // Modificar el contenido para indicar que es una prueba
      const testTemplate = {
        subject: `[PRUEBA] ${template.subject}`,
        html: `
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #17a2b8;">
            <h3 style="color: #0c5460; margin-top: 0;">🧪 CORREO DE PRUEBA - NOTIFICACIÓN ADMIN</h3>
            <p><strong>Emails originales administradores:</strong> ${adminEmails.join(', ')}</p>
            <p><strong>Redirigido a:</strong> ${this.testEmail}</p>
            <p><strong>Tipo:</strong> Notificación a administradores</p>
          </div>
          ${template.html}
        `
      }
      
      console.log(`📧 Enviando notificación admin (PRUEBA):`)
      console.log(`   Originales: ${adminEmails.join(', ')} → Redirigido: ${this.testEmail}`)
      
      return await this.sendEmail({
        to: this.testEmail,
        subject: testTemplate.subject,
        html: testTemplate.html
      })
    } catch (error) {
      console.error('Error enviando correo a administradores:', error)
      throw error
    }
  }

  // Plantilla de correo de agradecimiento
  createThankYouTemplate(data) {
    const discountText = data.discount_percentage 
      ? `<tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Descuento aplicado</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">${data.discount_percentage}% de descuento</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Precio original</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd; text-decoration: line-through;">$${data.original_price} MXN</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Precio con descuento</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">$${data.discounted_price} MXN</td>
        </tr>`
      : `<tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Precio</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">$${data.original_price} MXN</td>
        </tr>`

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
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                  <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
                </div>
              </div>
              
              <h1 style="color: #7AB8BF; text-align: center;">🎉 ¡Gracias por tu suscripción, ${data.user_name}!</h1>
              
              <p>¡Excelente elección! Tu suscripción ha sido activada exitosamente. Ahora formas parte de la familia Pet Gourmet y tu mascota recibirá la mejor nutrición de forma automática.</p>
              
              <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7AB8BF;">
                <h3 style="margin-top: 0; color: #8c4a23;">📋 Detalles de tu suscripción:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Plan</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.subscription_type}</td>
                  </tr>
                  ${discountText}
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Fecha de inicio</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.start_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Próximo cobro</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">${data.next_billing_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7AB8BF; color: white; font-weight: bold;">Referencia</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; font-family: monospace;">${data.external_reference}</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin-top: 30px;">Gracias por elegir Pet Gourmet. ¡Tu mascota lo va a amar!</p>
              
              <p style="margin-top: 30px;">
                Saludos cordiales,<br>
                <strong>El equipo de Pet Gourmet</strong>
              </p>
            </div>
          </body>
        </html>
      `
    }
  }

  // Plantilla de correo para administradores
  createAdminNotificationTemplate(data) {
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
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #7AB8BF 0%, #5A9EA6 100%); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(122, 184, 191, 0.3);">
                  <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block;">
                </div>
              </div>
              
              <h1 style="color: #7AB8BF;">🔔 Nueva suscripción activada</h1>
              
              <p>Se ha activado una nueva suscripción en Pet Gourmet:</p>
              
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="margin-top: 0; color: #004085;">👤 Información del cliente:</h3>
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
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Precio</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd;">$${data.discounted_price || data.original_price} MXN</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #007bff; color: white; font-weight: bold;">Referencia</td>
                    <td style="padding: 8px 12px; border: 1px solid #ddd; font-family: monospace;">${data.external_reference}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666; font-size: 12px; text-align: center;">
                Pet Gourmet - Panel de administración<br>
                Este correo fue generado automáticamente por el sistema de suscripciones.
              </p>
            </div>
          </body>
        </html>
      `
    }
  }

  // Método privado para enviar correos (modificado para pruebas)
  async sendEmail({ to, subject, html }) {
    // Verificar configuración SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, skipping email send')
      return { success: false, error: 'SMTP not configured' }
    }

    const transporter = createTransporter()
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet Test" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    }

    try {
      const result = await transporter.sendMail(mailOptions)
      console.log(`📧 [PRUEBA] Correo enviado a: cristoferscalante@gmail.com`)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error(`❌ Error enviando email a ${to}:`, error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

module.exports = { TestEmailService }