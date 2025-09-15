import logger, { LogCategory } from '@/lib/logger'

/**
 * Utilidad para logs detallados del webhook service
 * Proporciona logging estructurado para monitoreo en producción
 */
export class WebhookLogger {
  private static instance: WebhookLogger
  
  static getInstance(): WebhookLogger {
    if (!WebhookLogger.instance) {
      WebhookLogger.instance = new WebhookLogger()
    }
    return WebhookLogger.instance
  }

  /**
   * Log de inicio de procesamiento de webhook
   */
  logWebhookStart(type: string, data: any): string {
    const webhookId = `${type}_${data.id || 'unknown'}_${Date.now()}`
    
    logger.info(LogCategory.WEBHOOK, `🚀 INICIO: Procesando webhook ${type}`, {
      webhookId,
      type,
      dataId: data.id,
      status: data.status,
      externalReference: data.external_reference,
      payerEmail: data.payer_email,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      liveMode: data.live_mode || false
    })
    
    return webhookId
  }

  /**
   * Log de búsqueda de suscripción pendiente
   */
  logPendingSubscriptionSearch(webhookId: string, externalReference: string, found: boolean, pendingData?: any): void {
    logger.info(LogCategory.WEBHOOK, `🔍 Búsqueda de suscripción pendiente`, {
      webhookId,
      externalReference,
      found,
      pendingId: pendingData?.id,
      userId: pendingData?.user_id,
      productId: pendingData?.product_id,
      subscriptionType: pendingData?.subscription_type,
      searchTimestamp: new Date().toISOString()
    })
  }

  /**
   * Log de extracción de user_id desde external_reference
   */
  logUserIdExtraction(webhookId: string, externalReference: string, extractedUserId: string | null): void {
    logger.info(LogCategory.WEBHOOK, `👤 Extracción de user_id`, {
      webhookId,
      externalReference,
      extractedUserId,
      extractionSuccess: !!extractedUserId,
      extractionPattern: externalReference?.includes('_') ? 'subscription_userId' : 'unknown',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log de creación de suscripción activa
   */
  logActiveSubscriptionCreation(webhookId: string, subscriptionData: any, success: boolean, error?: any): void {
    logger.info(LogCategory.WEBHOOK, `✅ Creación de suscripción activa`, {
      webhookId,
      success,
      userId: subscriptionData.user_id,
      productId: subscriptionData.product_id,
      subscriptionType: subscriptionData.subscription_type,
      mercadopagoId: subscriptionData.mercadopago_subscription_id,
      status: subscriptionData.status,
      nextBillingDate: subscriptionData.next_billing_date,
      error: error?.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log de actualización de perfil de usuario
   */
  logUserProfileUpdate(webhookId: string, userId: string, hasActiveSubscription: boolean, success: boolean, error?: any): void {
    logger.info(LogCategory.WEBHOOK, `👤 Actualización de perfil de usuario`, {
      webhookId,
      userId,
      hasActiveSubscription,
      success,
      error: error?.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log de procesamiento de pago de suscripción
   */
  logSubscriptionPayment(webhookId: string, paymentData: any): void {
    logger.info(LogCategory.WEBHOOK, `💳 Procesamiento de pago de suscripción`, {
      webhookId,
      paymentId: paymentData.id,
      subscriptionId: paymentData.preapproval_id,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      status: paymentData.status,
      paymentMethod: paymentData.payment_method_id,
      billingDate: paymentData.date_created,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log de finalización exitosa de webhook
   */
  logWebhookSuccess(webhookId: string, type: string, duration: number, details?: any): void {
    logger.info(LogCategory.WEBHOOK, `🎉 ÉXITO: Webhook procesado correctamente`, {
      webhookId,
      type,
      duration: `${duration}ms`,
      performance: duration < 1000 ? 'excellent' : duration < 3000 ? 'good' : 'slow',
      details,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log de error en procesamiento de webhook
   */
  logWebhookError(webhookId: string, type: string, error: any, duration: number, context?: any): void {
    logger.error(LogCategory.WEBHOOK, `❌ ERROR: Fallo en procesamiento de webhook`, error.message, {
      webhookId,
      type,
      error: error.message,
      errorStack: error.stack,
      duration: `${duration}ms`,
      context,
      timestamp: new Date().toISOString(),
      severity: 'high'
    })
  }

  /**
   * Log de advertencia en procesamiento de webhook
   */
  logWebhookWarning(webhookId: string, type: string, message: string, context?: any): void {
    logger.warn(LogCategory.WEBHOOK, `⚠️ ADVERTENCIA: ${message}`, {
      webhookId,
      type,
      context,
      timestamp: new Date().toISOString(),
      severity: 'medium'
    })
  }

  /**
   * Log de métricas de rendimiento
   */
  logPerformanceMetrics(webhookId: string, type: string, metrics: {
    totalDuration: number
    dbQueries: number
    apiCalls: number
    emailsSent: number
  }): void {
    logger.info(LogCategory.WEBHOOK, `📊 Métricas de rendimiento`, {
      webhookId,
      type,
      ...metrics,
      performance: {
        speed: metrics.totalDuration < 1000 ? 'fast' : metrics.totalDuration < 3000 ? 'normal' : 'slow',
        efficiency: metrics.dbQueries < 5 ? 'efficient' : 'needs_optimization'
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log de estado de integridad del flujo
   */
  logFlowIntegrity(webhookId: string, checks: {
    pendingSubscriptionFound: boolean
    userIdExtracted: boolean
    activeSubscriptionCreated: boolean
    profileUpdated: boolean
    emailSent: boolean
  }): void {
    const integrityScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100
    
    logger.info(LogCategory.WEBHOOK, `🔍 Verificación de integridad del flujo`, {
      webhookId,
      integrityScore: `${integrityScore.toFixed(1)}%`,
      checks,
      status: integrityScore === 100 ? 'perfect' : integrityScore >= 80 ? 'good' : 'needs_attention',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Log de relación usuario-suscripción
   */
  logUserSubscriptionRelation(webhookId: string, relation: {
    userId: string
    externalReference: string
    mercadopagoSubscriptionId: string
    relationEstablished: boolean
    method: 'pending_subscription' | 'external_reference_extraction' | 'direct_creation'
  }): void {
    logger.info(LogCategory.WEBHOOK, `🔗 Relación usuario-suscripción establecida`, {
      webhookId,
      ...relation,
      timestamp: new Date().toISOString(),
      criticalForMonitoring: true
    })
  }
}

export default WebhookLogger.getInstance()