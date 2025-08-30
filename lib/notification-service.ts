import logger from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase/service'

interface NotificationData {
  type: 'payment_issue' | 'system_health' | 'sync_failure' | 'webhook_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  data?: any
  orderId?: number
  paymentId?: string
}

interface NotificationChannel {
  email?: boolean
  webhook?: boolean
  database?: boolean
}

class NotificationService {
  private emailTransporter: any
  private adminEmails: string[]
  private webhookUrl?: string

  constructor() {
    this.adminEmails = [
      process.env.ADMIN_EMAIL,
      process.env.ADMIN_EMAIL_2,
      process.env.ADMIN_EMAIL_3
    ].filter(Boolean) as string[]
    
    this.webhookUrl = process.env.ADMIN_WEBHOOK_URL
    
    this.initializeEmailTransporter()
  }

  private initializeEmailTransporter() {
    try {
      const nodemailer = require('nodemailer')
      
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    } catch (error) {
      logger.error('Error inicializando transportador de email', 'NOTIFICATION', {
        error: error.message
      })
    }
  }

  // Enviar notificación automática
  async sendNotification(
    notification: NotificationData,
    channels: NotificationChannel = { email: true, database: true }
  ): Promise<{
    success: boolean
    channels: {
      email?: boolean
      webhook?: boolean
      database?: boolean
    }
    errors?: string[]
  }> {
    const results = {
      success: true,
      channels: {},
      errors: [] as string[]
    }

    logger.info('Enviando notificación automática', 'NOTIFICATION', {
      type: notification.type,
      severity: notification.severity,
      title: notification.title
    })

    // Enviar por email
    if (channels.email && this.adminEmails.length > 0) {
      try {
        const emailSent = await this.sendEmailNotification(notification)
        results.channels.email = emailSent
        if (!emailSent) {
          results.errors.push('Error enviando email')
        }
      } catch (error) {
        results.channels.email = false
        results.errors.push(`Email error: ${error.message}`)
      }
    }

    // Enviar por webhook
    if (channels.webhook && this.webhookUrl) {
      try {
        const webhookSent = await this.sendWebhookNotification(notification)
        results.channels.webhook = webhookSent
        if (!webhookSent) {
          results.errors.push('Error enviando webhook')
        }
      } catch (error) {
        results.channels.webhook = false
        results.errors.push(`Webhook error: ${error.message}`)
      }
    }

    // Guardar en base de datos
    if (channels.database) {
      try {
        const dbSaved = await this.saveNotificationToDatabase(notification)
        results.channels.database = dbSaved
        if (!dbSaved) {
          results.errors.push('Error guardando en base de datos')
        }
      } catch (error) {
        results.channels.database = false
        results.errors.push(`Database error: ${error.message}`)
      }
    }

    results.success = results.errors.length === 0

    if (!results.success) {
      logger.error('Errores enviando notificación', 'NOTIFICATION', {
        errors: results.errors,
        notification: notification.title
      })
    }

    return results
  }

  // Enviar notificación por email
  private async sendEmailNotification(notification: NotificationData): Promise<boolean> {
    if (!this.emailTransporter || this.adminEmails.length === 0) {
      return false
    }

    try {
      const subject = `🚨 ${this.getSeverityEmoji(notification.severity)} ${notification.title} - PetGourmet`
      
      const htmlContent = this.generateEmailHTML(notification)
      const textContent = this.generateEmailText(notification)

      for (const email of this.adminEmails) {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'sistema@petgourmet.mx',
          to: email,
          subject,
          text: textContent,
          html: htmlContent
        })
      }

      logger.info('Email de notificación enviado', 'NOTIFICATION', {
        recipients: this.adminEmails.length,
        type: notification.type
      })

      return true
    } catch (error) {
      logger.error('Error enviando email de notificación', 'NOTIFICATION', {
        error: error.message
      })
      return false
    }
  }

  // Enviar notificación por webhook (Slack, Discord, etc.)
  private async sendWebhookNotification(notification: NotificationData): Promise<boolean> {
    if (!this.webhookUrl) {
      return false
    }

    try {
      const payload = {
        text: `${this.getSeverityEmoji(notification.severity)} ${notification.title}`,
        attachments: [{
          color: this.getSeverityColor(notification.severity),
          fields: [
            {
              title: 'Tipo',
              value: notification.type,
              short: true
            },
            {
              title: 'Severidad',
              value: notification.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Mensaje',
              value: notification.message,
              short: false
            }
          ],
          footer: 'Sistema de Pagos PetGourmet',
          ts: Math.floor(Date.now() / 1000)
        }]
      }

      if (notification.orderId) {
        payload.attachments[0].fields.push({
          title: 'Orden ID',
          value: notification.orderId.toString(),
          short: true
        })
      }

      if (notification.paymentId) {
        payload.attachments[0].fields.push({
          title: 'Payment ID',
          value: notification.paymentId,
          short: true
        })
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        logger.info('Webhook de notificación enviado', 'NOTIFICATION', {
          type: notification.type,
          webhookUrl: this.webhookUrl
        })
        return true
      } else {
        logger.error('Error en respuesta del webhook', 'NOTIFICATION', {
          status: response.status,
          statusText: response.statusText
        })
        return false
      }
    } catch (error) {
      logger.error('Error enviando webhook de notificación', 'NOTIFICATION', {
        error: error.message
      })
      return false
    }
  }

  // Guardar notificación en base de datos
  private async saveNotificationToDatabase(notification: NotificationData): Promise<boolean> {
    try {
      const supabase = createServiceClient()
      
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type: notification.type,
          severity: notification.severity,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          order_id: notification.orderId,
          payment_id: notification.paymentId,
          created_at: new Date().toISOString(),
          read: false
        })

      if (error) {
        logger.error('Error guardando notificación en BD', 'NOTIFICATION', {
          error: error.message
        })
        return false
      }

      return true
    } catch (error) {
      logger.error('Error accediendo a base de datos para notificación', 'NOTIFICATION', {
        error: error.message
      })
      return false
    }
  }

  // Generar HTML para email
  private generateEmailHTML(notification: NotificationData): string {
    const severityColor = this.getSeverityColor(notification.severity)
    const emoji = this.getSeverityEmoji(notification.severity)
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Notificación del Sistema - PetGourmet</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
          .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .data-table th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} ${notification.title}</h1>
            <p><strong>Severidad:</strong> ${notification.severity.toUpperCase()}</p>
            <p><strong>Tipo:</strong> ${notification.type}</p>
          </div>
          <div class="content">
            <h3>Mensaje:</h3>
            <p>${notification.message}</p>
            
            ${notification.orderId ? `<p><strong>Orden ID:</strong> ${notification.orderId}</p>` : ''}
            ${notification.paymentId ? `<p><strong>Payment ID:</strong> ${notification.paymentId}</p>` : ''}
            
            ${notification.data ? `
              <h3>Datos Adicionales:</h3>
              <pre style="background: #eee; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(notification.data, null, 2)}</pre>
            ` : ''}
            
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático del sistema de pagos de PetGourmet.</p>
            <p>Para más información, revisa el panel de administración.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Generar texto plano para email
  private generateEmailText(notification: NotificationData): string {
    return `
${notification.title}

Severidad: ${notification.severity.toUpperCase()}
Tipo: ${notification.type}

Mensaje:
${notification.message}

${notification.orderId ? `Orden ID: ${notification.orderId}\n` : ''}${notification.paymentId ? `Payment ID: ${notification.paymentId}\n` : ''}
Timestamp: ${new Date().toLocaleString()}

${notification.data ? `Datos Adicionales:\n${JSON.stringify(notification.data, null, 2)}\n\n` : ''}---
Este es un mensaje automático del sistema de pagos de PetGourmet.
Para más información, revisa el panel de administración.
    `
  }

  // Obtener emoji según severidad
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  // Obtener color según severidad
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc3545'
      case 'high': return '#fd7e14'
      case 'medium': return '#ffc107'
      case 'low': return '#28a745'
      default: return '#6c757d'
    }
  }

  // Métodos de conveniencia para tipos específicos de notificaciones
  async notifyPaymentIssue(orderId: number, paymentId?: string, details?: any): Promise<void> {
    await this.sendNotification({
      type: 'payment_issue',
      severity: 'high',
      title: 'Problema de Pago Detectado',
      message: `Se detectó un problema con el pago de la orden ${orderId}. Requiere atención inmediata.`,
      orderId,
      paymentId,
      data: details
    })
  }

  async notifySystemHealth(healthScore: number, issues: any[]): Promise<void> {
    const severity = healthScore < 50 ? 'critical' : healthScore < 70 ? 'high' : 'medium'
    
    await this.sendNotification({
      type: 'system_health',
      severity,
      title: 'Alerta de Salud del Sistema',
      message: `El sistema de pagos tiene una puntuación de salud de ${healthScore}/100 con ${issues.length} problemas detectados.`,
      data: { healthScore, issues }
    })
  }

  async notifySyncFailure(orderId: number, error: string): Promise<void> {
    await this.sendNotification({
      type: 'sync_failure',
      severity: 'medium',
      title: 'Fallo en Sincronización Automática',
      message: `La sincronización automática falló para la orden ${orderId}: ${error}`,
      orderId,
      data: { error }
    })
  }

  async notifyWebhookError(paymentId: string, error: string): Promise<void> {
    await this.sendNotification({
      type: 'webhook_error',
      severity: 'high',
      title: 'Error en Webhook de MercadoPago',
      message: `Error procesando webhook para pago ${paymentId}: ${error}`,
      paymentId,
      data: { error }
    })
  }
}

// Instancia singleton
const notificationService = new NotificationService()

export default notificationService
export type { NotificationData, NotificationChannel }