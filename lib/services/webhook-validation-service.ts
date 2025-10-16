import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WebhookPayload {
  id: string
  live_mode: boolean
  type: string
  date_created: string
  application_id: string
  user_id: string
  version: string
  api_version: string
  action: string
  data: {
    id: string
    [key: string]: any
  }
}

interface ValidationResult {
  isValid: boolean
  error?: string
  payload?: WebhookPayload
}

export class WebhookValidationService {
  private readonly mercadoPagoSecret: string
  private readonly maxTimestampDiff = 600 // 10 minutes in seconds

  constructor() {
    this.mercadoPagoSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    
    if (!this.mercadoPagoSecret) {
      console.warn('MERCADOPAGO_WEBHOOK_SECRET not configured')
    }
  }

  /**
   * Ultra-fast webhook validation (<100ms)
   * Validates MercadoPago webhook signature and payload
   */
  async validateWebhook(
    payload: string,
    signature: string,
    timestamp: string,
    requestId?: string
  ): Promise<ValidationResult> {
    const startTime = Date.now()

    try {
      // 1. Quick format validation (5ms)
      if (!payload || !signature || !timestamp) {
        return {
          isValid: false,
          error: 'Missing required headers'
        }
      }

      // 2. Timestamp validation (5ms)
      const timestampValidation = this.validateTimestamp(timestamp)
      if (!timestampValidation.isValid) {
        return timestampValidation
      }

      // 3. Signature validation (20ms)
      const signatureValidation = this.validateSignature(payload, signature, timestamp)
      if (!signatureValidation.isValid) {
        return signatureValidation
      }

      // 4. Payload parsing and validation (30ms)
      const payloadValidation = this.validatePayload(payload)
      if (!payloadValidation.isValid) {
        return payloadValidation
      }

      // 5. Duplicate detection (30ms)
      const duplicateCheck = await this.checkDuplicate(payloadValidation.payload!.id, requestId)
      if (!duplicateCheck.isValid) {
        return duplicateCheck
      }

      const endTime = Date.now()
      const processingTime = endTime - startTime

      console.log(`Webhook validation completed in ${processingTime}ms`)

      return {
        isValid: true,
        payload: payloadValidation.payload
      }

    } catch (error) {
      console.error('Webhook validation error:', error)
      return {
        isValid: false,
        error: 'Internal validation error'
      }
    }
  }

  /**
   * Validate timestamp to prevent replay attacks
   */
  private validateTimestamp(timestamp: string): ValidationResult {
    try {
      const webhookTime = parseInt(timestamp)
      const currentTime = Math.floor(Date.now() / 1000)
      const timeDiff = Math.abs(currentTime - webhookTime)

      if (timeDiff > this.maxTimestampDiff) {
        return {
          isValid: false,
          error: 'Timestamp too old or too far in future'
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid timestamp format'
      }
    }
  }

  /**
   * Validate MercadoPago webhook signature
   */
  private validateSignature(payload: string, signature: string, timestamp: string): ValidationResult {
    try {
      if (!this.mercadoPagoSecret) {
        console.warn('Webhook secret not configured, skipping signature validation')
        return { isValid: true }
      }

      // Extract signature components
      const signatureParts = signature.split(',')
      let ts = ''
      let v1 = ''

      for (const part of signatureParts) {
        const [key, value] = part.split('=')
        if (key === 'ts') ts = value
        if (key === 'v1') v1 = value
      }

      if (!ts || !v1) {
        return {
          isValid: false,
          error: 'Invalid signature format'
        }
      }

      // Verify timestamp matches
      if (ts !== timestamp) {
        return {
          isValid: false,
          error: 'Timestamp mismatch'
        }
      }

      // Generate expected signature
      const signedPayload = `${ts}.${payload}`
      const expectedSignature = crypto
        .createHmac('sha256', this.mercadoPagoSecret)
        .update(signedPayload, 'utf8')
        .digest('hex')

      // Compare signatures using constant-time comparison
      if (!this.constantTimeCompare(v1, expectedSignature)) {
        return {
          isValid: false,
          error: 'Invalid signature'
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: 'Signature validation failed'
      }
    }
  }

  /**
   * Validate and parse webhook payload
   */
  private validatePayload(payload: string): ValidationResult {
    try {
      const parsedPayload: WebhookPayload = JSON.parse(payload)

      // Validate required fields
      if (!parsedPayload.id || !parsedPayload.type || !parsedPayload.data) {
        return {
          isValid: false,
          error: 'Missing required payload fields'
        }
      }

      // Validate payload structure
      if (!parsedPayload.data.id) {
        return {
          isValid: false,
          error: 'Missing data.id in payload'
        }
      }

      // Validate webhook type
      const validTypes = [
        'payment',
        'subscription',
        'subscription_preapproval',
        'subscription_authorized_payment',
        'plan',
        'invoice'
      ]

      if (!validTypes.includes(parsedPayload.type)) {
        return {
          isValid: false,
          error: `Unsupported webhook type: ${parsedPayload.type}`
        }
      }

      return {
        isValid: true,
        payload: parsedPayload
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid JSON payload'
      }
    }
  }

  /**
   * Check for duplicate webhooks
   */
  private async checkDuplicate(webhookId: string, requestId?: string): Promise<ValidationResult> {
    try {
      // Check if we've already processed this webhook
      const { data: existingWebhook } = await supabase
        .from('webhook_log')
        .select('id')
        .eq('webhook_id', webhookId)
        .eq('status', 'processed')
        .single()

      if (existingWebhook) {
        return {
          isValid: false,
          error: 'Duplicate webhook'
        }
      }

      // Log this webhook attempt
      await supabase
        .from('webhook_log')
        .insert({
          webhook_id: webhookId,
          request_id: requestId,
          status: 'received',
          received_at: new Date().toISOString()
        })

      return { isValid: true }
    } catch (error) {
      console.error('Error checking duplicate webhook:', error)
      // Don't fail validation due to logging issues
      return { isValid: true }
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(webhookId: string, success: boolean, error?: string): Promise<void> {
    try {
      await supabase
        .from('webhook_log')
        .update({
          status: success ? 'processed' : 'failed',
          processed_at: new Date().toISOString(),
          error_message: error
        })
        .eq('webhook_id', webhookId)
    } catch (updateError) {
      console.error('Error updating webhook status:', updateError)
    }
  }

  /**
   * Get webhook processing statistics
   */
  async getWebhookStats(timeframe: 'hour' | 'day' | 'week' = 'day') {
    try {
      const now = new Date()
      const startTime = new Date()

      switch (timeframe) {
        case 'hour':
          startTime.setHours(now.getHours() - 1)
          break
        case 'day':
          startTime.setDate(now.getDate() - 1)
          break
        case 'week':
          startTime.setDate(now.getDate() - 7)
          break
      }

      const { data: stats } = await supabase
        .from('webhook_log')
        .select('status')
        .gte('received_at', startTime.toISOString())

      const total = stats?.length || 0
      const processed = stats?.filter(s => s.status === 'processed').length || 0
      const failed = stats?.filter(s => s.status === 'failed').length || 0
      const pending = stats?.filter(s => s.status === 'received').length || 0

      return {
        total,
        processed,
        failed,
        pending,
        success_rate: total > 0 ? (processed / total) * 100 : 0
      }
    } catch (error) {
      console.error('Error getting webhook stats:', error)
      return {
        total: 0,
        processed: 0,
        failed: 0,
        pending: 0,
        success_rate: 0
      }
    }
  }

  /**
   * Clean up old webhook logs
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      await supabase
        .from('webhook_log')
        .delete()
        .lt('received_at', cutoffDate.toISOString())

      console.log(`Cleaned up webhook logs older than ${daysToKeep} days`)
    } catch (error) {
      console.error('Error cleaning up webhook logs:', error)
    }
  }
}