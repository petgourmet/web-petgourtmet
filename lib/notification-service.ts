import { createClient } from '@supabase/supabase-js'
import { EmailService } from './email-service'

// ✅ SISTEMA DE NOTIFICACIONES PROACTIVAS - FASE 2
export class NotificationService {
  private supabase
  private emailService: EmailService
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.emailService = new EmailService()
  }
  
  // 🚨 NOTIFICACIONES DE FALLOS DE PAGO
  async notifyPaymentFailure(subscriptionId: string, error: any, retryCount: number = 0): Promise<void> {
    // Notificación de fallo de pago procesada silenciosamente
    
    try {
      // 1. Obtener datos de la suscripción y usuario
      const { data: subscription, error: subError } = await this.supabase
        .from('unified_subscriptions')
        .select(`
          *,
          profiles!inner(email, full_name),
          products!inner(name)
        `)
        .eq('id', subscriptionId)
        .single()
      
      if (subError || !subscription) {
        return
      }
      
      // 2. Registrar el fallo en la base de datos
      await this.logPaymentFailure(subscriptionId, error, retryCount)
      
      // 3. Determinar nivel de criticidad
      const severity = this.determineSeverity(retryCount, error)
      
      // 4. Notificar a administradores
      await this.notifyAdministrators({
        type: 'payment_failure',
        severity,
        subscriptionId,
        userEmail: subscription.profiles.email,
        userName: subscription.profiles.full_name,
        productName: subscription.products.name,
        amount: subscription.amount,
        retryCount,
        error: error.message || 'Error desconocido',
        timestamp: new Date().toISOString()
      })
      
      // 5. Si es crítico, enviar notificación inmediata
      if (severity === 'critical') {
        await this.sendImmediateAlert({
          title: '🚨 FALLO CRÍTICO DE PAGO',
          message: `Suscripción ${subscriptionId} ha fallado ${retryCount + 1} veces. Usuario: ${subscription.profiles.email}`,
          subscriptionId,
          error
        })
      }
      
      // Notificación enviada exitosamente
      
    } catch (notificationError) {
      // Error manejado silenciosamente en producción
    }
  }
  
  // 🔧 NOTIFICACIONES DE PROBLEMAS DEL SISTEMA
  async notifySystemIssue(issue: SystemIssue): Promise<void> {
    console.log(`🔧 Notificando problema del sistema: ${issue.type}`)
    
    try {
      // 1. Registrar el problema
      await this.logSystemIssue(issue)
      
      // 2. Determinar si requiere atención inmediata
      const requiresImmediate = this.requiresImmediateAttention(issue)
      
      // 3. Notificar a administradores
      await this.notifyAdministrators({
        type: 'system_issue',
        severity: issue.severity,
        issueType: issue.type,
        description: issue.description,
        affectedComponent: issue.component,
        timestamp: new Date().toISOString(),
        metadata: issue.metadata
      })
      
      // 4. Si requiere atención inmediata, enviar alerta
      if (requiresImmediate) {
        await this.sendImmediateAlert({
          title: `🔧 PROBLEMA DEL SISTEMA: ${issue.type.toUpperCase()}`,
          message: issue.description,
          component: issue.component,
          severity: issue.severity
        })
      }
      
      console.log(`✅ Notificación de problema del sistema enviada`)
      
    } catch (error) {
      console.error(`❌ Error al notificar problema del sistema:`, {
        issue: issue.type,
        error: error.message
      })
    }
  }
  
  // 📊 NOTIFICACIONES DE MÉTRICAS Y ALERTAS
  async notifyMetricAlert(metric: MetricAlert): Promise<void> {
    console.log(`📊 Notificando alerta de métrica: ${metric.name}`)
    
    try {
      await this.notifyAdministrators({
        type: 'metric_alert',
        severity: metric.severity,
        metricName: metric.name,
        currentValue: metric.currentValue,
        threshold: metric.threshold,
        description: metric.description,
        timestamp: new Date().toISOString()
      })
      
      if (metric.severity === 'critical') {
        await this.sendImmediateAlert({
          title: `📊 ALERTA CRÍTICA DE MÉTRICA: ${metric.name}`,
          message: `${metric.description}. Valor actual: ${metric.currentValue}, Umbral: ${metric.threshold}`,
          metric: metric.name
        })
      }
      
    } catch (error) {
      console.error(`❌ Error al notificar alerta de métrica:`, error.message)
    }
  }
  
  // 📧 ENVÍO DE NOTIFICACIONES A ADMINISTRADORES
  private async notifyAdministrators(notification: AdminNotification): Promise<void> {
    try {
      // 1. Obtener lista de administradores
      const { data: admins, error } = await this.supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'admin')
        .eq('notifications_enabled', true)
      
      if (error || !admins || admins.length === 0) {
        console.warn(`⚠️ No se encontraron administradores para notificar`)
        return
      }
      
      // 2. Preparar contenido del email
      const emailContent = this.formatNotificationEmail(notification)
      
      // 3. Enviar emails a todos los administradores
      const emailPromises = admins.map(admin => 
        this.emailService.sendEmail({
          to: admin.email,
          subject: emailContent.subject,
          html: emailContent.html,
          priority: notification.severity === 'critical' ? 'high' : 'normal'
        })
      )
      
      await Promise.allSettled(emailPromises)
      
      // 4. Registrar la notificación enviada
      await this.logNotificationSent(notification, admins.length)
      
    } catch (error) {
      console.error(`❌ Error al notificar administradores:`, error.message)
    }
  }
  
  // 🚨 ALERTAS INMEDIATAS (para casos críticos)
  private async sendImmediateAlert(alert: ImmediateAlert): Promise<void> {
    try {
      // En un entorno real, aquí se integrarían servicios como:
      // - Slack/Discord webhooks
      // - SMS (Twilio)
      // - Push notifications
      // - Sistemas de monitoreo (PagerDuty, etc.)
      
      console.log(`🚨 ALERTA INMEDIATA:`, alert)
      
      // Por ahora, registrar en base de datos para seguimiento
      await this.supabase
        .from('immediate_alerts')
        .insert({
          title: alert.title,
          message: alert.message,
          metadata: alert,
          created_at: new Date().toISOString()
        })
      
    } catch (error) {
      console.error(`❌ Error crítico al enviar alerta inmediata:`, error.message)
    }
  }
  
  // 📝 REGISTRO DE FALLOS DE PAGO
  private async logPaymentFailure(subscriptionId: string, error: any, retryCount: number): Promise<void> {
    try {
      await this.supabase
        .from('payment_failures')
        .insert({
          subscription_id: subscriptionId,
          error_message: error.message || 'Error desconocido',
          error_code: error.code || null,
          retry_count: retryCount,
          created_at: new Date().toISOString(),
          metadata: {
            stack: error.stack,
            ...error
          }
        })
    } catch (logError) {
      console.error(`❌ Error al registrar fallo de pago:`, logError.message)
    }
  }
  
  // 📝 REGISTRO DE PROBLEMAS DEL SISTEMA
  private async logSystemIssue(issue: SystemIssue): Promise<void> {
    try {
      await this.supabase
        .from('system_issues')
        .insert({
          type: issue.type,
          severity: issue.severity,
          component: issue.component,
          description: issue.description,
          metadata: issue.metadata,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error(`❌ Error al registrar problema del sistema:`, error.message)
    }
  }
  
  // 📝 REGISTRO DE NOTIFICACIONES ENVIADAS
  private async logNotificationSent(notification: AdminNotification, recipientCount: number): Promise<void> {
    try {
      await this.supabase
        .from('notification_logs')
        .insert({
          type: notification.type,
          severity: notification.severity,
          recipient_count: recipientCount,
          content: notification,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error(`❌ Error al registrar notificación enviada:`, error.message)
    }
  }
  
  // 🎯 DETERMINACIÓN DE SEVERIDAD
  private determineSeverity(retryCount: number, error: any): 'low' | 'medium' | 'high' | 'critical' {
    // Crítico: más de 3 intentos fallidos
    if (retryCount >= 3) return 'critical'
    
    // Alto: errores de tarjeta o problemas de autorización
    if (error.code === 'card_declined' || error.code === 'insufficient_funds') return 'high'
    
    // Medio: errores de red o temporales
    if (error.code === 'network_error' || error.code === 'timeout') return 'medium'
    
    // Bajo: primer intento fallido
    return 'low'
  }
  
  // ⚡ VERIFICACIÓN DE ATENCIÓN INMEDIATA
  private requiresImmediateAttention(issue: SystemIssue): boolean {
    return issue.severity === 'critical' || 
           issue.type === 'database_connection' ||
           issue.type === 'payment_gateway_down' ||
           issue.type === 'security_breach'
  }
  
  // 📧 FORMATEO DE EMAILS DE NOTIFICACIÓN
  private formatNotificationEmail(notification: AdminNotification): { subject: string, html: string } {
    const severityEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    }
    
    const subject = `${severityEmoji[notification.severity]} PetGourmet - ${notification.type.replace('_', ' ').toUpperCase()}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
          ${severityEmoji[notification.severity]} Notificación del Sistema PetGourmet
        </h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Detalles de la Notificación:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Tipo:</strong> ${notification.type.replace('_', ' ')}</li>
            <li><strong>Severidad:</strong> ${notification.severity.toUpperCase()}</li>
            <li><strong>Timestamp:</strong> ${notification.timestamp}</li>
            ${notification.subscriptionId ? `<li><strong>Suscripción ID:</strong> ${notification.subscriptionId}</li>` : ''}
            ${notification.userEmail ? `<li><strong>Usuario:</strong> ${notification.userEmail}</li>` : ''}
            ${notification.error ? `<li><strong>Error:</strong> ${notification.error}</li>` : ''}
          </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p><strong>Acción Requerida:</strong></p>
          <p>Por favor, revise el panel de administración para más detalles y tome las acciones necesarias.</p>
        </div>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Este es un mensaje automático del sistema de notificaciones de PetGourmet.<br>
          Timestamp: ${new Date().toISOString()}
        </p>
      </div>
    `
    
    return { subject, html }
  }
}

// 🔧 INTERFACES Y TIPOS
interface SystemIssue {
  type: 'database_connection' | 'payment_gateway_down' | 'email_service_error' | 'api_rate_limit' | 'security_breach' | 'performance_degradation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  component: string
  description: string
  metadata?: any
}

interface MetricAlert {
  name: string
  currentValue: number
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

interface AdminNotification {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  subscriptionId?: string
  userEmail?: string
  userName?: string
  productName?: string
  amount?: number
  retryCount?: number
  error?: string
  issueType?: string
  description?: string
  affectedComponent?: string
  metricName?: string
  currentValue?: number
  threshold?: number
  metadata?: any
}

interface ImmediateAlert {
  title: string
  message: string
  subscriptionId?: string
  component?: string
  severity?: string
  error?: any
  metric?: string
}