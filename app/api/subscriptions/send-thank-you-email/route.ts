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
        <title>¡Gracias por suscribirte a Pet Gourmet!</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
        <div style="max-width: 600px; margin: 0 auto;">

          <!-- Header con Logo -->
          <table style="width: 100%; margin-bottom: 0; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); border-radius: 8px 8px 0 0;" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 30px 20px; text-align: center;">
                <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
              </td>
            </tr>
          </table>

          <!-- Contenido principal -->
          <div style="background-color: white; border-radius: 0 0 8px 8px; padding: 30px 25px;">

            <h2 style="font-size: 22px; color: #374151; margin-top: 0; margin-bottom: 8px; font-weight: 600; text-align: center;">🎉 ¡Gracias por suscribirte!</h2>
            <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 25px; text-align: center;">
              Hola <strong>${userName}</strong>, tu suscripción ha sido confirmada exitosamente.
            </p>

            <!-- Detalles de suscripción -->
            <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #E5E7EB;">
              <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">📋 Detalles de tu suscripción</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; background-color: #7AB8BF; color: white; font-weight: bold; width: 40%;">Plan</td>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #374151;">${product_name || 'Suscripción Pet Gourmet'}</td>
                </tr>
                ${frequency_text ? `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; background-color: #7AB8BF; color: white; font-weight: bold;">Frecuencia</td>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #374151;">${frequency_text}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; background-color: #7AB8BF; color: white; font-weight: bold;">Precio</td>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #16a34a; font-weight: bold;">$${discounted_price} MXN</td>
                </tr>
                ${next_billing_date ? `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; background-color: #7AB8BF; color: white; font-weight: bold;">Próximo cobro</td>
                  <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #374151;">${new Date(next_billing_date).toLocaleDateString('es-MX')}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <p style="font-size: 14px; color: #4B5563; margin-bottom: 25px;">
              Tu mascota recibirá los mejores productos gourmet directamente en tu puerta. ¡Nos aseguraremos de que cada entrega sea una experiencia especial!
            </p>

            <div style="text-align: center; margin-bottom: 25px;">
              <a href="https://petgourmet.mx/perfil" style="display: inline-block; background-color: #7AB8BF; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">Administrar mi suscripción</a>
            </div>

            <!-- WhatsApp CTA -->
            <div style="margin: 25px 0; padding: 20px; background-color: #f0fafe; border-radius: 12px; border: 1px solid #c6e9eb; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #374151;">¿Tienes alguna pregunta?</p>
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #6b7280;">Escríbenos con tus dudas o comentarios.</p>
              <a href="https://wa.me/525561269681" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 10px 26px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;">💬 Enviar WhatsApp</a>
            </div>

            <!-- Redes sociales & footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
              <div style="margin-bottom: 12px;">
                <a href="https://web.facebook.com/petgourmetmx" target="_blank" style="display: inline-block; background-color: #1877F2; width: 36px; height: 36px; border-radius: 50%; color: white; text-align: center; line-height: 36px; text-decoration: none; font-weight: bold; font-size: 15px; margin: 0 5px;">f</a>
                <a href="https://www.instagram.com/petgourmet_mx/" target="_blank" style="display: inline-block; background-color: #E1306C; width: 36px; height: 36px; border-radius: 50%; color: white; text-align: center; line-height: 36px; text-decoration: none; font-weight: bold; font-size: 13px; margin: 0 5px;">ig</a>
                <a href="https://www.tiktok.com/@petgourmet_mx" target="_blank" style="display: inline-block; background-color: #010101; width: 36px; height: 36px; border-radius: 50%; color: white; text-align: center; line-height: 36px; text-decoration: none; font-weight: bold; font-size: 12px; margin: 0 5px;">tt</a>
              </div>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
                Si tienes alguna pregunta, contáctanos en
                <a href="mailto:contacto@petgourmet.mx" style="color: #7AB8BF; text-decoration: none;">contacto@petgourmet.mx</a>
              </p>
            </div>

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
      <title>Nueva Suscripción Activada - Pet Gourmet</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 40px 10px; background-color: #EAECEF;">
      <div style="max-width: 600px; margin: 0 auto;">

        <!-- Header con Logo -->
        <table style="width: 100%; background: linear-gradient(135deg, #7AB8BF 0%, #5a9aa0 100%); background-color: #7AB8BF; border-radius: 8px 8px 0 0;" bgcolor="#7AB8BF" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 30px 20px; background-color: #7AB8BF; text-align: center;" bgcolor="#7AB8BF">
              <img src="https://petgourmet.mx/petgourmet-logo.png" alt="Pet Gourmet" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
        </table>

        <!-- Alerta nueva suscripción -->
        <div style="background-color: #ecfdf5; padding: 20px; border-left: 4px solid #10b981;">
          <table style="width: 100%;">
            <tr>
              <td style="width: 40px; vertical-align: top;">
                <span style="font-size: 28px;">🎉</span>
              </td>
              <td>
                <h2 style="font-size: 20px; color: #065f46; margin: 0 0 5px;">¡Nueva Suscripción Activada!</h2>
                <p style="font-size: 14px; color: #047857; margin: 0;">Se ha activado una nueva suscripción en el sistema.</p>
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
                <td style="padding: 4px 0; font-weight: 600; width: 130px;">Nombre:</td>
                <td style="padding: 4px 0;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: 600;">Email:</td>
                <td style="padding: 4px 0;"><a href="mailto:${userEmail}" style="color: #7AB8BF; text-decoration: none;">${userEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: 600;">Fecha de activación:</td>
                <td style="padding: 4px 0;">${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</td>
              </tr>
            </table>
          </div>

          <!-- Detalles de la suscripción -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 14px; color: #374151; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">📦 Detalles de la Suscripción</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px; width: 40%;">Plan</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;">${product_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Frecuencia</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px;">${frequency_text}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Precio</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 14px; font-weight: bold; color: #065f46;">$${discounted_price} MXN</td>
              </tr>
              ${next_billing_date ? `
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background-color: #7AB8BF; color: white; font-weight: bold; font-size: 13px;">Próximo cobro</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px; color: #7AB8BF; font-weight: 600;">${new Date(next_billing_date).toLocaleDateString('es-MX')}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Acciones recomendadas -->
          <div style="padding: 15px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #374151;">📋 Acciones recomendadas:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4b5563; line-height: 1.8;">
              <li>Verificar el estado de la suscripción en el panel de administración</li>
              <li>Preparar el primer envío del producto</li>
              <li>Contactar al cliente si es necesario para confirmar detalles de entrega</li>
            </ul>
          </div>

          <!-- Botón de acción -->
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://petgourmet.mx/admin/subscriptions" style="background-color: #7AB8BF; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; display: inline-block;">Ver en Panel de Admin</a>
          </div>

        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: left;">
          <p style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
            Este es un correo automático del sistema de suscripciones de Pet Gourmet.
          </p>
        </div>

      </div>
    </body>
    </html>
  `
}