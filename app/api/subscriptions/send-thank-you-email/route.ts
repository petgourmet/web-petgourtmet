import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'
import { logger, LogCategory } from '@/lib/logger'

// Crear transporter para emails usando SMTP
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    
    const {
      user_id,
      subscription_id,
      user_email,
      user_name,
      subscription_details,
      send_admin_notification = false
    } = body

    logger.info(LogCategory.EMAIL, 'Sending thank you email', {
      user_id,
      subscription_id,
      user_email,
      user_name,
      send_admin_notification
    })

    if (!user_email || !user_name || !subscription_details) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos para enviar email' },
        { status: 400 }
      )
    }

    // Verificar que no hayamos enviado ya un email para esta suscripción
    if (subscription_id) {
      const { data: existingEmail, error: checkError } = await supabase
        .from('email_logs')
        .select('id')
        .eq('subscription_id', subscription_id)
        .eq('email_type', 'subscription_thank_you')
        .maybeSingle()

      if (checkError) {
        logger.error(LogCategory.EMAIL, 'Error checking previous emails', { error: checkError })
      } else if (existingEmail) {
        logger.info(LogCategory.EMAIL, 'Email already sent previously for this subscription')
        return NextResponse.json({
          success: true,
          message: 'Email ya enviado previamente'
        })
      }
    }

    // Preparar contenido del email
    const emailSubject = '¡Gracias por suscribirte a PetGourmet! 🐾'
    const emailHtml = generateThankYouEmailHtml(user_name, subscription_details)
    const emailText = generateThankYouEmailText(user_name, subscription_details)

    // Enviar email usando SMTP
    const transporter = createTransporter()
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
      to: user_email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    }

    const emailResult = await transporter.sendMail(mailOptions)
    logger.info(LogCategory.EMAIL, 'Email sent to user', { messageId: emailResult.messageId })

    // Enviar notificación a administradores si se solicita
    let adminEmailResult = null
    if (send_admin_notification) {
      try {
        const adminEmailSubject = `Nueva suscripción activada - ${user_name}`
        const adminEmailHtml = generateAdminNotificationHtml(user_name, user_email, subscription_details)
        
        const adminMailOptions = {
          from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
          to: 'contacto@petgourmet.mx',
          subject: adminEmailSubject,
          html: adminEmailHtml
        }

        adminEmailResult = await transporter.sendMail(adminMailOptions)
        logger.info(LogCategory.EMAIL, 'Admin notification email sent', { messageId: adminEmailResult.messageId })
      } catch (adminError) {
        logger.error(LogCategory.EMAIL, 'Error sending admin email', { error: adminError })
        // No fallar si el email de admin falla
      }
    }

    // Registrar el envío en la base de datos
    if (subscription_id) {
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          user_id,
          subscription_id,
          email_type: 'subscription_thank_you',
          recipient_email: user_email,
          subject: emailSubject,
          status: 'sent',
          external_id: emailResult.messageId,
          sent_at: new Date().toISOString()
        })

      if (logError) {
        logger.error(LogCategory.EMAIL, 'Error registering email log', { error: logError })
      }
    }

    return NextResponse.json({
      success: true,
      message: send_admin_notification ? 
        'Emails enviados exitosamente (usuario y admin)' : 
        'Email de agradecimiento enviado exitosamente',
      email_id: emailResult.messageId,
      admin_email_id: adminEmailResult?.messageId
    })

  } catch (error) {
    logger.error(LogCategory.EMAIL, 'Error sending thank you email', { error })
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

function generateThankYouEmailHtml(userName: string, subscriptionDetails: any): string {
  const {
    product_name,
    frequency_text,
    discounted_price,
    next_billing_date
  } = subscriptionDetails

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Gracias por suscribirte a PetGourmet!</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #e67e22;
          margin-bottom: 10px;
        }
        .title {
          color: #2c3e50;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 25px;
        }
        .subscription-details {
          background-color: #f8f9fa;
          border-left: 4px solid #e67e22;
          padding: 20px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 5px 0;
          border-bottom: 1px solid #eee;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #555;
        }
        .detail-value {
          color: #333;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-size: 14px;
        }
        .cta-button {
          display: inline-block;
          background-color: #e67e22;
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🐾 PetGourmet</div>
          <h1 class="title">¡Gracias por suscribirte!</h1>
        </div>
        
        <div class="content">
          <p>Hola <strong>${userName}</strong>,</p>
          
          <p>¡Estamos emocionados de tenerte como parte de la familia PetGourmet! Tu suscripción ha sido confirmada exitosamente.</p>
          
          <div class="subscription-details">
            <h3 style="margin-top: 0; color: #e67e22;">Detalles de tu suscripción:</h3>
            
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${product_name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Frecuencia:</span>
              <span class="detail-value">${frequency_text}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Precio:</span>
              <span class="detail-value">$${discounted_price}</span>
            </div>
            
            ${next_billing_date ? `
            <div class="detail-row">
              <span class="detail-label">Próximo cobro:</span>
              <span class="detail-value">${new Date(next_billing_date).toLocaleDateString('es-ES')}</span>
            </div>
            ` : ''}
          </div>
          
          <p>Tu mascota recibirá los mejores productos gourmet directamente en tu puerta. Nos aseguraremos de que cada entrega sea una experiencia especial.</p>
          
          <div style="text-align: center;">
            <a href="https://petgourmet.mx/perfil" class="cta-button">Administrar mi suscripción</a>
          </div>
          
          <p><strong>¿Tienes alguna pregunta?</strong><br>
          No dudes en contactarnos en cualquier momento. Estamos aquí para ayudarte.</p>
        </div>
        
        <div class="footer">
          <p>Gracias por confiar en PetGourmet<br>
          <small>Este email fue enviado porque confirmaste tu suscripción en nuestro sitio web.</small></p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateThankYouEmailText(userName: string, subscriptionDetails: any): string {
  const {
    product_name,
    frequency_text,
    discounted_price,
    next_billing_date
  } = subscriptionDetails

  return `
¡Gracias por suscribirte a PetGourmet!

Hola ${userName},

¡Estamos emocionados de tenerte como parte de la familia PetGourmet! Tu suscripción ha sido confirmada exitosamente.

Detalles de tu suscripción:
- Plan: ${product_name}
- Frecuencia: ${frequency_text}
- Precio: $${discounted_price}
${next_billing_date ? `- Próximo cobro: ${new Date(next_billing_date).toLocaleDateString('es-ES')}` : ''}

Tu mascota recibirá los mejores productos gourmet directamente en tu puerta. Nos aseguraremos de que cada entrega sea una experiencia especial.

Puedes administrar tu suscripción en cualquier momento visitando: https://petgourmet.mx/perfil

¿Tienes alguna pregunta?
No dudes en contactarnos en cualquier momento. Estamos aquí para ayudarte.

Gracias por confiar en PetGourmet

---
Este email fue enviado porque confirmaste tu suscripción en nuestro sitio web.
  `.trim()
}

function generateAdminNotificationHtml(userName: string, userEmail: string, subscriptionDetails: any): string {
  const {
    product_name,
    frequency_text,
    discounted_price,
    next_billing_date
  } = subscriptionDetails

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nueva Suscripción Activada - PetGourmet</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          background-color: #e67e22;
          color: white;
          padding: 20px;
          border-radius: 10px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 25px;
        }
        .user-details, .subscription-details {
          background-color: #f8f9fa;
          border-left: 4px solid #e67e22;
          padding: 20px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 5px 0;
          border-bottom: 1px solid #eee;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #555;
        }
        .detail-value {
          color: #333;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🐾 PetGourmet Admin</div>
          <h1 class="title">Nueva Suscripción Activada</h1>
        </div>
        
        <div class="content">
          <p><strong>¡Se ha activado una nueva suscripción!</strong></p>
          
          <div class="user-details">
            <h3 style="margin-top: 0; color: #e67e22;">Información del Cliente:</h3>
            
            <div class="detail-row">
              <span class="detail-label">Nombre:</span>
              <span class="detail-value">${userName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${userEmail}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Fecha de activación:</span>
              <span class="detail-value">${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}</span>
            </div>
          </div>
          
          <div class="subscription-details">
            <h3 style="margin-top: 0; color: #e67e22;">Detalles de la Suscripción:</h3>
            
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${product_name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Frecuencia:</span>
              <span class="detail-value">${frequency_text}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Precio:</span>
              <span class="detail-value">$${discounted_price} MXN</span>
            </div>
            
            ${next_billing_date ? `
            <div class="detail-row">
              <span class="detail-label">Próximo cobro:</span>
              <span class="detail-value">${new Date(next_billing_date).toLocaleDateString('es-ES')}</span>
            </div>
            ` : ''}
          </div>
          
          <p><strong>Acciones recomendadas:</strong></p>
          <ul>
            <li>Verificar el estado de la suscripción en el panel de administración</li>
            <li>Preparar el primer envío del producto</li>
            <li>Contactar al cliente si es necesario para confirmar detalles de entrega</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Notificación automática del sistema PetGourmet<br>
          <small>Este email se envía cuando se activa una nueva suscripción.</small></p>
        </div>
      </div>
    </body>
    </html>
  `
}