import { createClient } from '@supabase/supabase-js'
import { EmailService } from './email-service'
import { NotificationService } from './notification-service'

// ⏰ SISTEMA DE ALERTAS TEMPRANAS - FASE 2
export class EarlyAlertService {
  private supabase
  private emailService: EmailService
  private notificationService: NotificationService
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.emailService = new EmailService()
    this.notificationService = new NotificationService()
  }
  
  // 🔍 VERIFICAR SUSCRIPCIONES PRÓXIMAS A VENCER
  async checkExpiringSubscriptions(): Promise<void> {
    console.log('🔍 Verificando suscripciones próximas a vencer...')
    
    try {
      // Obtener suscripciones que vencen en los próximos 7, 3 y 1 días
      const alerts = await Promise.all([
        this.getSubscriptionsExpiringIn(7, '7_days'),
        this.getSubscriptionsExpiringIn(3, '3_days'),
        this.getSubscriptionsExpiringIn(1, '1_day')
      ])
      
      const allAlerts = alerts.flat()
      
      if (allAlerts.length > 0) {
        console.log(`📊 Encontradas ${allAlerts.length} suscripciones próximas a vencer`)
        
        // Procesar cada alerta
        for (const alert of allAlerts) {
          await this.processExpirationAlert(alert)
        }
        
        // Notificar a administradores sobre el resumen
        await this.sendExpirationSummary(allAlerts)
      } else {
        console.log('✅ No hay suscripciones próximas a vencer')
      }
      
    } catch (error) {
      console.error('❌ Error al verificar suscripciones próximas a vencer:', error.message)
      
      // Notificar error del sistema
      await this.notificationService.notifySystemIssue({
        type: 'performance_degradation',
        severity: 'medium',
        component: 'EarlyAlertService',
        description: `Error al verificar suscripciones próximas a vencer: ${error.message}`
      })
    }
  }
  
  // 📅 OBTENER SUSCRIPCIONES QUE VENCEN EN X DÍAS
  private async getSubscriptionsExpiringIn(days: number, alertType: string): Promise<ExpirationAlert[]> {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)
    const targetDateStr = targetDate.toISOString().split('T')[0]
    
    const { data: subscriptions, error } = await this.supabase
      .from('unified_subscriptions')
      .select(`
        id,
        user_id,
        status,
        next_billing_date,
        amount,
        profiles!inner(email, full_name),
        products!inner(name)
      `)
      .eq('status', 'active')
      .eq('next_billing_date', targetDateStr)
      .is('cancelled_at', null)
    
    if (error) {
      console.error(`❌ Error al obtener suscripciones que vencen en ${days} días:`, error.message)
      return []
    }
    
    return (subscriptions || []).map(sub => ({
      subscriptionId: sub.id,
      userId: sub.user_id,
      userEmail: sub.profiles.email,
      userName: sub.profiles.full_name,
      productName: sub.products.name,
      amount: sub.amount,
      expirationDate: sub.next_billing_date,
      daysUntilExpiration: days,
      alertType,
      severity: this.determineSeverity(days)
    }))
  }
  
  // ⚡ PROCESAR ALERTA DE VENCIMIENTO
  private async processExpirationAlert(alert: ExpirationAlert): Promise<void> {
    try {
      // 1. Verificar si ya se envió esta alerta
      const alreadySent = await this.checkIfAlertSent(alert.subscriptionId, alert.alertType)
      if (alreadySent) {
        console.log(`⏭️ Alerta ya enviada para suscripción ${alert.subscriptionId} (${alert.alertType})`)
        return
      }
      
      // 2. Enviar email al usuario
      await this.sendUserExpirationEmail(alert)
      
      // 3. Registrar la alerta enviada
      await this.logAlertSent(alert)
      
      // 4. Si es crítico (1 día), notificar también a administradores
      if (alert.severity === 'critical') {
        await this.notificationService.notifyMetricAlert({
          name: 'subscription_expiring_soon',
          currentValue: alert.daysUntilExpiration,
          threshold: 1,
          severity: 'high',
          description: `Suscripción ${alert.subscriptionId} vence mañana. Usuario: ${alert.userEmail}`
        })
      }
      
      console.log(`✅ Alerta de vencimiento procesada: ${alert.subscriptionId} (${alert.alertType})`)
      
    } catch (error) {
      console.error(`❌ Error al procesar alerta de vencimiento:`, {
        subscriptionId: alert.subscriptionId,
        error: error.message
      })
    }
  }
  
  // 📧 ENVIAR EMAIL DE VENCIMIENTO AL USUARIO
  private async sendUserExpirationEmail(alert: ExpirationAlert): Promise<void> {
    const emailContent = this.formatExpirationEmail(alert)
    
    await this.emailService.sendEmail({
      to: alert.userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      priority: alert.severity === 'critical' ? 'high' : 'normal'
    })
  }
  
  // 📊 ENVIAR RESUMEN A ADMINISTRADORES
  private async sendExpirationSummary(alerts: ExpirationAlert[]): Promise<void> {
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      byDays: {
        '1_day': alerts.filter(a => a.alertType === '1_day').length,
        '3_days': alerts.filter(a => a.alertType === '3_days').length,
        '7_days': alerts.filter(a => a.alertType === '7_days').length
      }
    }
    
    await this.notificationService.notifyMetricAlert({
      name: 'daily_expiration_summary',
      currentValue: summary.total,
      threshold: 10, // Umbral configurable
      severity: summary.critical > 0 ? 'high' : summary.total > 20 ? 'medium' : 'low',
      description: `Resumen diario: ${summary.total} suscripciones próximas a vencer (${summary.critical} críticas, ${summary.high} altas, ${summary.medium} medias)`
    })
  }
  
  // ✅ VERIFICAR SI YA SE ENVIÓ LA ALERTA
  private async checkIfAlertSent(subscriptionId: string, alertType: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await this.supabase
      .from('expiration_alerts')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('alert_type', alertType)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .limit(1)
    
    if (error) {
      console.error('❌ Error al verificar alerta enviada:', error.message)
      return false
    }
    
    return (data && data.length > 0)
  }
  
  // 📝 REGISTRAR ALERTA ENVIADA
  private async logAlertSent(alert: ExpirationAlert): Promise<void> {
    try {
      await this.supabase
        .from('expiration_alerts')
        .insert({
          subscription_id: alert.subscriptionId,
          user_id: alert.userId,
          alert_type: alert.alertType,
          days_until_expiration: alert.daysUntilExpiration,
          severity: alert.severity,
          user_email: alert.userEmail,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('❌ Error al registrar alerta enviada:', error.message)
    }
  }
  
  // 🎯 DETERMINAR SEVERIDAD
  private determineSeverity(days: number): 'low' | 'medium' | 'high' | 'critical' {
    if (days <= 1) return 'critical'
    if (days <= 3) return 'high'
    if (days <= 7) return 'medium'
    return 'low'
  }
  
  // 📧 FORMATEAR EMAIL DE VENCIMIENTO
  private formatExpirationEmail(alert: ExpirationAlert): { subject: string, html: string } {
    const urgencyText = {
      '1_day': 'mañana',
      '3_days': 'en 3 días',
      '7_days': 'en una semana'
    }
    
    const subject = `⏰ Tu suscripción a ${alert.productName} vence ${urgencyText[alert.alertType]}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #e74c3c; text-align: center; margin-bottom: 30px;">
            ⏰ Tu suscripción está próxima a vencer
          </h2>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 30px;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">¡Hola ${alert.userName}!</h3>
            <p style="margin: 0; color: #856404;">
              Tu suscripción a <strong>${alert.productName}</strong> vence <strong>${urgencyText[alert.alertType]}</strong>.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 30px;">
            <h4 style="margin: 0 0 15px 0; color: #333;">Detalles de tu suscripción:</h4>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 5px 0; border-bottom: 1px solid #dee2e6;"><strong>Producto:</strong> ${alert.productName}</li>
              <li style="padding: 5px 0; border-bottom: 1px solid #dee2e6;"><strong>Monto:</strong> $${alert.amount}</li>
              <li style="padding: 5px 0; border-bottom: 1px solid #dee2e6;"><strong>Fecha de vencimiento:</strong> ${new Date(alert.expirationDate).toLocaleDateString('es-ES')}</li>
              <li style="padding: 5px 0;"><strong>Días restantes:</strong> ${alert.daysUntilExpiration}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscriptions" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Renovar Suscripción
            </a>
          </div>
          
          <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #bee5eb;">
            <p style="margin: 0; color: #0c5460; font-size: 14px;">
              <strong>💡 Tip:</strong> Puedes configurar la renovación automática para evitar interrupciones en tu servicio.
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
          
          <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
            Este es un recordatorio automático de PetGourmet.<br>
            Si tienes alguna pregunta, contáctanos en soporte@petgourmet.com
          </p>
        </div>
      </div>
    `
    
    return { subject, html }
  }
  
  // 🔄 EJECUTAR VERIFICACIÓN PROGRAMADA
  async runScheduledCheck(): Promise<void> {
    console.log('🔄 Iniciando verificación programada de alertas tempranas...')
    
    try {
      await this.checkExpiringSubscriptions()
      console.log('✅ Verificación programada completada exitosamente')
    } catch (error) {
      console.error('❌ Error en verificación programada:', error.message)
      
      await this.notificationService.notifySystemIssue({
        type: 'performance_degradation',
        severity: 'high',
        component: 'EarlyAlertService.runScheduledCheck',
        description: `Error en verificación programada de alertas tempranas: ${error.message}`
      })
    }
  }
}

// 🔧 INTERFACES
interface ExpirationAlert {
  subscriptionId: string
  userId: string
  userEmail: string
  userName: string
  productName: string
  amount: number
  expirationDate: string
  daysUntilExpiration: number
  alertType: '1_day' | '3_days' | '7_days'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Instancia singleton
export const earlyAlertService = new EarlyAlertService()