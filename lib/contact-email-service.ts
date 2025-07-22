// Servicio de emails para formularios de contacto
import nodemailer from 'nodemailer'

export interface ContactFormData {
  name: string
  email: string
  phone?: string
  message: string
  formType: 'contact' | 'newsletter' | 'contact-section'
}

export interface NewsletterData {
  email: string
}

// Crear transporter SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Plantilla de confirmación para el cliente
export const getCustomerConfirmationTemplate = (formData: ContactFormData) => ({
  subject: 'Confirmación de contacto - Pet Gourmet',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmación de Contacto</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
          </div>
          
          <h1 style="color: #7BBDC5;">¡Gracias por contactarnos, ${formData.name}!</h1>
          
          <p>Hemos recibido tu mensaje y queremos confirmarte que llegó correctamente a nuestro equipo.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #7BBDC5;">Resumen de tu mensaje:</h3>
            <p><strong>Nombre:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            ${formData.phone ? `<p><strong>Teléfono:</strong> ${formData.phone}</p>` : ''}
            <p><strong>Mensaje:</strong></p>
            <p style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #7BBDC5;">
              ${formData.message}
            </p>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📞 ¿Qué sigue?</strong></p>
            <p>Nuestro equipo revisará tu mensaje y te responderemos en un plazo máximo de 24 horas.</p>
            <p>Si tu consulta es urgente, puedes contactarnos directamente:</p>
            <ul>
              <li><strong>Teléfono:</strong> +525561269681</li>
              <li><strong>Email:</strong> contacto@petgourmet.mx</li>
            </ul>
          </div>
          
          <p>Mientras tanto, te invitamos a conocer más sobre nuestros productos en <a href="https://petgourmet.mx/productos">nuestra tienda</a>.</p>
          
          <p style="margin-top: 30px;">
            ¡Gracias por confiar en Pet Gourmet!<br>
            <strong>El equipo de Pet Gourmet</strong>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Pet Gourmet - Nutrición premium para tus compañeros<br>
            Avenida José María Castorena 425, plaza Cuajimalpa Local 6<br>
            Cuajimalpa, Ciudad de México<br>
            Este es un mensaje automático, por favor no respondas a este email.
          </p>
        </div>
      </body>
    </html>
  `
})

// Plantilla de notificación para el admin
export const getAdminNotificationTemplate = (formData: ContactFormData) => ({
  subject: `[Pet Gourmet] Nuevo mensaje de contacto - ${formData.name}`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Nuevo Mensaje de Contacto</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7BBDC5;">🔔 Nuevo mensaje de contacto</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Detalles del contacto:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7BBDC5; color: white; font-weight: bold;">Nombre</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd;">${formData.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7BBDC5; color: white; font-weight: bold;">Email</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd;">
                  <a href="mailto:${formData.email}">${formData.email}</a>
                </td>
              </tr>
              ${formData.phone ? `
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7BBDC5; color: white; font-weight: bold;">Teléfono</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd;">
                  <a href="tel:${formData.phone}">${formData.phone}</a>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7BBDC5; color: white; font-weight: bold;">Tipo de formulario</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd;">${formData.formType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #ddd; background-color: #7BBDC5; color: white; font-weight: bold;">Fecha</td>
                <td style="padding: 8px 12px; border: 1px solid #ddd;">${new Date().toLocaleString('es-MX', { 
                  timeZone: 'America/Mexico_City'
                })}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">💬 Mensaje del cliente:</h3>
            <p style="background-color: white; padding: 15px; border-radius: 4px; white-space: pre-wrap; border-left: 4px solid #ffc107;">
${formData.message}</p>
          </div>
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📋 Acciones recomendadas:</strong></p>
            <ol>
              <li>Responder al cliente en un plazo máximo de 24 horas</li>
              <li>Revisar si el mensaje requiere seguimiento especial</li>
              <li>Actualizar el CRM con la información del contacto</li>
            </ol>
          </div>
          
          <p style="margin-top: 30px;">
            <strong>Responder directamente a:</strong> <a href="mailto:${formData.email}">${formData.email}</a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Sistema automático de notificaciones - Pet Gourmet<br>
            Generado el ${new Date().toLocaleString('es-MX')}
          </p>
        </div>
      </body>
    </html>
  `
})

// Plantilla de confirmación para newsletter
export const getNewsletterConfirmationTemplate = (email: string) => ({
  subject: '¡Bienvenido a la familia Pet Gourmet! 🐾',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Bienvenido a Pet Gourmet</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
          </div>
          
          <h1 style="color: #7BBDC5; text-align: center;">¡Bienvenido a nuestra manada! 🐾</h1>
          
          <p>¡Hola!</p>
          <p>Gracias por suscribirte al newsletter de Pet Gourmet. Nos emociona tenerte como parte de nuestra familia.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0; color: #155724;">🎉 ¡Suscripción confirmada!</h3>
            <p>Tu email <strong>${email}</strong> ha sido agregado exitosamente a nuestra lista.</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #7BBDC5;">¿Qué puedes esperar?</h3>
            <ul>
              <li>🏷️ <strong>Ofertas exclusivas</strong> para suscriptores</li>
              <li>🍽️ <strong>Consejos de nutrición</strong> para tu mascota</li>
              <li>🆕 <strong>Nuevos productos</strong> antes que nadie</li>
              <li>📚 <strong>Recetas gourmet</strong> caseras para tu pet</li>
              <li>💡 <strong>Tips de cuidado</strong> y bienestar animal</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://petgourmet.mx/productos" 
               style="background-color: #7BBDC5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              🛒 Explorar Productos
            </a>
          </div>
          
          <p>Mientras tanto, te invitamos a seguirnos en nuestras redes sociales para mantenerte al día con todas las novedades.</p>
          
          <p style="margin-top: 30px;">
            ¡Bienvenido a la familia Pet Gourmet!<br>
            <strong>El equipo de Pet Gourmet</strong>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Si no deseas recibir más emails, puedes <a href="https://petgourmet.mx/unsubscribe?email=${encodeURIComponent(email)}">darte de baja aquí</a>.<br>
            Pet Gourmet - Nutrición premium para tus compañeros<br>
            Avenida José María Castorena 425, plaza Cuajimalpa Local 6, Cuajimalpa, Ciudad de México
          </p>
        </div>
      </body>
    </html>
  `
})

// Función principal para enviar emails de contacto
export async function sendContactEmails(formData: ContactFormData) {
  try {
    console.log('Sending contact emails for:', formData.email)
    
    // Verificar configuración SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP configuration missing')
    }
    
    const transporter = createTransporter()
    
    // Verificar conexión
    await transporter.verify()
    
    const customerTemplate = getCustomerConfirmationTemplate(formData)
    const adminTemplate = getAdminNotificationTemplate(formData)
    
    // Email de confirmación al cliente
    const customerEmailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: formData.email,
      subject: customerTemplate.subject,
      html: customerTemplate.html
    }
    
    // Email de notificación al admin
    const adminEmailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: 'contacto@petgourmet.mx', // Enviar notificaciones al email principal
      subject: adminTemplate.subject,
      html: adminTemplate.html
    }
    
    // Enviar ambos emails
    const [customerResult, adminResult] = await Promise.all([
      transporter.sendMail(customerEmailOptions),
      transporter.sendMail(adminEmailOptions)
    ])
    
    console.log('Emails sent successfully:', {
      customer: customerResult.messageId,
      admin: adminResult.messageId
    })
    
    return {
      success: true,
      customerMessageId: customerResult.messageId,
      adminMessageId: adminResult.messageId
    }
    
  } catch (error) {
    console.error('Error sending contact emails:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Función para enviar email de newsletter
export async function sendNewsletterEmail(email: string) {
  try {
    console.log('Sending newsletter confirmation to:', email)
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP configuration missing')
    }
    
    const transporter = createTransporter()
    await transporter.verify()
    
    const template = getNewsletterConfirmationTemplate(email)
    
    const emailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: email,
      subject: template.subject,
      html: template.html
    }
    
    const result = await transporter.sendMail(emailOptions)
    
    // También notificar al admin
    const adminNotification = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: 'contacto@petgourmet.mx', // Enviar notificaciones al email principal
      subject: `[Pet Gourmet] Nueva suscripción al newsletter: ${email}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Nueva Suscripción Newsletter</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #7BBDC5;">📧 Nueva suscripción al newsletter</h1>
              
              <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h3 style="margin-top: 0; color: #155724;">Nuevo suscriptor agregado</h3>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX', { 
                  timeZone: 'America/Mexico_City'
                })}</p>
                <p><strong>Estado:</strong> Email de confirmación enviado exitosamente ✅</p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📋 Acciones recomendadas:</strong></p>
                <ul>
                  <li>Agregar el email a la lista de marketing</li>
                  <li>Considerar envío de ofertas exclusivas</li>
                  <li>Incluir en próximas campañas de newsletter</li>
                </ul>
              </div>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                Sistema automático de notificaciones - Pet Gourmet<br>
                Generado el ${new Date().toLocaleString('es-MX')}
              </p>
            </div>
          </body>
        </html>
      `
    }
    
    await transporter.sendMail(adminNotification)
    
    console.log('Newsletter email sent successfully:', result.messageId)
    
    return {
      success: true,
      messageId: result.messageId
    }
    
  } catch (error) {
    console.error('Error sending newsletter email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Interface para recordatorio de pago de suscripción
export interface SubscriptionPaymentReminderData {
  userEmail: string
  userName: string
  productName: string
  nextPaymentDate: string
  amount: number
  subscriptionId: string
}

// Interface para confirmación de pago de suscripción
export interface SubscriptionPaymentSuccessData {
  userEmail: string
  userName: string
  productName: string
  amount: number
  paymentDate: string
  nextPaymentDate: string
}

// Función para enviar recordatorio de pago de suscripción
export const sendSubscriptionPaymentReminder = async (data: SubscriptionPaymentReminderData) => {
  try {
    const transporter = createTransporter()
    
    const paymentDate = new Date(data.nextPaymentDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Email al cliente
    const customerReminder = {
      from: `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: data.userEmail,
      subject: '🔔 Recordatorio de pago - Tu suscripción Pet Gourmet',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Recordatorio de Pago</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
              </div>
              
              <div style="background: linear-gradient(135deg, #7BBDC5 0%, #5A9EA6 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 28px;">🔔 Recordatorio de Pago</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Tu próximo pago se procesará pronto</p>
              </div>

              <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="color: #7BBDC5; margin-top: 0;">Hola ${data.userName},</h2>
                <p>Te recordamos que tu suscripción a <strong>${data.productName}</strong> tiene un pago programado para el <strong>${paymentDate}</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #7BBDC5;">
                  <h3 style="margin-top: 0; color: #333;">Detalles del pago:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;"><strong>Producto:</strong> ${data.productName}</li>
                    <li style="margin-bottom: 10px;"><strong>Monto:</strong> $${data.amount.toLocaleString('es-MX')} MXN</li>
                    <li style="margin-bottom: 10px;"><strong>Fecha de cargo:</strong> ${paymentDate}</li>
                  </ul>
                </div>
              </div>

              <div style="background: #e8f4f5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #7BBDC5; margin-top: 0;">💡 ¿Qué pasará?</h3>
                <p>El cargo se realizará automáticamente en tu método de pago registrado. No necesitas hacer nada, pero asegúrate de que tu tarjeta tenga fondos suficientes.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://petgourmet.mx/perfil" style="background: #7BBDC5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                  Ver Mi Suscripción
                </a>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <h4 style="color: #d68910; margin-top: 0;">¿Necesitas cambiar algo?</h4>
                <p style="margin-bottom: 0;">Si necesitas actualizar tu método de pago o gestionar tu suscripción, visita tu perfil o contáctanos.</p>
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                Este es un recordatorio automático de Pet Gourmet<br>
                Si tienes preguntas, contáctanos en contacto@petgourmet.mx
              </p>
            </div>
          </body>
        </html>
      `
    }

    const result = await transporter.sendMail(customerReminder)

    console.log('Subscription payment reminder sent successfully:', result.messageId)
    
    return {
      success: true,
      messageId: result.messageId
    }
    
  } catch (error) {
    console.error('Error sending subscription payment reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Función para confirmar pago exitoso de suscripción
export const sendSubscriptionPaymentSuccess = async (data: SubscriptionPaymentSuccessData) => {
  try {
    const transporter = createTransporter()
    
    const paymentDate = new Date(data.paymentDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const nextPaymentDate = new Date(data.nextPaymentDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Email al cliente
    const customerConfirmation = {
      from: `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: data.userEmail,
      subject: '✅ Pago procesado exitosamente - Pet Gourmet',
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
                <img src="https://petgourmet.mx/logo.png" alt="Pet Gourmet" style="max-width: 200px;">
              </div>
              
              <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 28px;">✅ ¡Pago Exitoso!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Tu suscripción sigue activa</p>
              </div>

              <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="color: #28a745; margin-top: 0;">Hola ${data.userName},</h2>
                <p>¡Excelentes noticias! Hemos procesado exitosamente el pago de tu suscripción a <strong>${data.productName}</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745;">
                  <h3 style="margin-top: 0; color: #333;">Detalles del pago:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;"><strong>Producto:</strong> ${data.productName}</li>
                    <li style="margin-bottom: 10px;"><strong>Monto pagado:</strong> $${data.amount.toLocaleString('es-MX')} MXN</li>
                    <li style="margin-bottom: 10px;"><strong>Fecha de pago:</strong> ${paymentDate}</li>
                    <li style="margin-bottom: 10px;"><strong>Próximo pago:</strong> ${nextPaymentDate}</li>
                  </ul>
                </div>
              </div>

              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #155724; margin-top: 0;">🚚 ¿Qué sigue?</h3>
                <p style="color: #155724; margin-bottom: 0;">Tu pedido será preparado y enviado según tu programación de suscripción. Te notificaremos cuando esté en camino.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://petgourmet.mx/perfil" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
                  Ver Mi Perfil
                </a>
                <a href="https://petgourmet.mx/productos" style="background: #7BBDC5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                  Ver Productos
                </a>
              </div>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                Gracias por confiar en Pet Gourmet<br>
                Si tienes preguntas, contáctanos en contacto@petgourmet.mx
              </p>
            </div>
          </body>
        </html>
      `
    }

    // Email al admin
    const adminNotification = {
      from: `"Pet Gourmet System" <${process.env.SMTP_USER}>`,
      to: 'contacto@petgourmet.mx',
      subject: `💰 Pago de suscripción procesado - ${data.productName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>💰 Pago de Suscripción Procesado</h2>
            <p><strong>Cliente:</strong> ${data.userName} (${data.userEmail})</p>
            <p><strong>Producto:</strong> ${data.productName}</p>
            <p><strong>Monto:</strong> $${data.amount.toLocaleString('es-MX')} MXN</p>
            <p><strong>Fecha de pago:</strong> ${paymentDate}</p>
            <p><strong>Próximo pago:</strong> ${nextPaymentDate}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Sistema automático de notificaciones - Pet Gourmet<br>
              Generado el ${new Date().toLocaleString('es-MX')}
            </p>
          </body>
        </html>
      `
    }

    const result = await transporter.sendMail(customerConfirmation)
    await transporter.sendMail(adminNotification)

    console.log('Subscription payment success notification sent:', result.messageId)
    
    return {
      success: true,
      messageId: result.messageId
    }
    
  } catch (error) {
    console.error('Error sending subscription payment success notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
