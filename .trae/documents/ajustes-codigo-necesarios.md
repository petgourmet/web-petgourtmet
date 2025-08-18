# Ajustes de Código Necesarios - Sistema de Pagos Pet Gourmet

## 🔧 Modificaciones Requeridas en el Código Existente

### 1. Mejoras en WebhookService (`lib/webhook-service.ts`)

#### 1.1 Agregar Logging Estructurado

**Crear archivo:** `lib/logger.ts`
```typescript
interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  service: string
  action: string
  data?: any
  error?: string
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }
  
  console.log(JSON.stringify(logEntry))
}

export function logError(service: string, action: string, error: any, data?: any): void {
  log({
    level: 'error',
    service,
    action,
    error: error.message || String(error),
    data
  })
}

export function logInfo(service: string, action: string, data?: any): void {
  log({
    level: 'info',
    service,
    action,
    data
  })
}
```

#### 1.2 Mejorar Manejo de Errores en WebhookService

**Modificar:** `lib/webhook-service.ts`

Agregar estas importaciones al inicio:
```typescript
import { log, logError, logInfo } from './logger'
import crypto from 'crypto'
```

Reemplazar el método `validateSignature`:
```typescript
private validateSignature(payload: string, signature: string): boolean {
  try {
    if (!signature || !this.webhookSecret) {
      logError('webhook', 'signature_validation', 'Missing signature or webhook secret')
      return false
    }

    // Extraer la firma del header (formato: "ts=timestamp,v1=signature")
    const signatureParts = signature.split(',')
    const versionedSignature = signatureParts.find(part => part.startsWith('v1='))
    
    if (!versionedSignature) {
      logError('webhook', 'signature_validation', 'Invalid signature format')
      return false
    }

    const receivedSignature = versionedSignature.split('v1=')[1]
    
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )

    if (!isValid) {
      logError('webhook', 'signature_validation', 'Signature mismatch')
    }

    return isValid
  } catch (error) {
    logError('webhook', 'signature_validation', error)
    return false
  }
}
```

Agregar método para retry de llamadas a MercadoPago:
```typescript
private async fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        return response
      }
      
      if (response.status === 404) {
        // No reintentar para recursos no encontrados
        throw new Error(`Resource not found: ${response.status}`)
      }
      
      if (i === maxRetries - 1) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Exponential backoff
      const delay = Math.pow(2, i) * 1000
      logInfo('webhook', 'retry_attempt', { attempt: i + 1, delay, url })
      await new Promise(resolve => setTimeout(resolve, delay))
      
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error
      }
      
      const delay = Math.pow(2, i) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error('Max retries exceeded')
}
```

Modificar el método `getPaymentData`:
```typescript
private async getPaymentData(paymentId: string) {
  try {
    logInfo('webhook', 'fetch_payment_data', { paymentId })
    
    const response = await this.fetchWithRetry(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    const paymentData = await response.json()
    
    logInfo('webhook', 'payment_data_received', {
      paymentId,
      status: paymentData.status,
      externalReference: paymentData.external_reference
    })
    
    return paymentData
  } catch (error) {
    logError('webhook', 'fetch_payment_data', error, { paymentId })
    throw error
  }
}
```

#### 1.3 Mejorar Procesamiento de Pagos de Suscripción

Agregar al método `handleSubscriptionPayment`:
```typescript
private async handleSubscriptionPayment(paymentData: any) {
  try {
    logInfo('webhook', 'handle_subscription_payment', {
      paymentId: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount
    })

    // Buscar suscripción por preapproval_id
    const { data: subscription, error: subError } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('mercadopago_subscription_id', paymentData.preapproval_id)
      .single()

    if (subError || !subscription) {
      logError('webhook', 'subscription_not_found', subError, {
        preapprovalId: paymentData.preapproval_id,
        paymentId: paymentData.id
      })
      return
    }

    // Crear registro en historial de facturación
    const billingRecord = {
      subscription_id: subscription.id,
      billing_date: new Date().toISOString().split('T')[0],
      amount: paymentData.transaction_amount,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      payment_method: paymentData.payment_method_id,
      mercadopago_payment_id: paymentData.id,
      payment_details: {
        payment_type: paymentData.payment_type_id,
        installments: paymentData.installments,
        card_last_four: paymentData.card?.last_four_digits,
        transaction_amount: paymentData.transaction_amount,
        net_received_amount: paymentData.net_received_amount
      }
    }

    const { error: billingError } = await this.supabase
      .from('subscription_billing_history')
      .insert(billingRecord)

    if (billingError) {
      logError('webhook', 'billing_history_insert', billingError, billingRecord)
    }

    // Actualizar fecha del último pago si fue exitoso
    if (paymentData.status === 'approved') {
      const nextBillingDate = this.calculateNextBillingDate(
        subscription.subscription_type,
        new Date()
      )

      const { error: updateError } = await this.supabase
        .from('user_subscriptions')
        .update({
          last_billing_date: new Date().toISOString().split('T')[0],
          next_billing_date: nextBillingDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) {
        logError('webhook', 'subscription_update', updateError, {
          subscriptionId: subscription.id
        })
      }

      // Enviar email de confirmación
      await this.sendSubscriptionPaymentEmail(subscription, paymentData)
    }

    logInfo('webhook', 'subscription_payment_processed', {
      subscriptionId: subscription.id,
      paymentId: paymentData.id,
      status: paymentData.status
    })

  } catch (error) {
    logError('webhook', 'handle_subscription_payment', error, {
      paymentId: paymentData.id
    })
    throw error
  }
}

private calculateNextBillingDate(subscriptionType: string, currentDate: Date): string {
  const nextDate = new Date(currentDate)
  
  switch (subscriptionType) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    default:
      nextDate.setMonth(nextDate.getMonth() + 1) // Default to monthly
  }
  
  return nextDate.toISOString().split('T')[0]
}

private async sendSubscriptionPaymentEmail(subscription: any, paymentData: any) {
  try {
    // Obtener datos del usuario
    const { data: user } = await this.supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', subscription.user_id)
      .single()

    if (!user?.email) return

    const emailContent = `
      <h2>Pago de Suscripción Confirmado</h2>
      <p>Hola ${user.full_name || 'Cliente'},</p>
      <p>Tu pago de suscripción ha sido procesado exitosamente:</p>
      <ul>
        <li><strong>Monto:</strong> $${paymentData.transaction_amount.toLocaleString('es-CO')}</li>
        <li><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</li>
        <li><strong>Método de pago:</strong> ${paymentData.payment_method_id}</li>
        <li><strong>ID de transacción:</strong> ${paymentData.id}</li>
      </ul>
      <p>Tu próximo pago será procesado automáticamente en la fecha programada.</p>
      <p>¡Gracias por confiar en Pet Gourmet!</p>
    `

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: 'Pago de Suscripción Confirmado - Pet Gourmet',
      html: emailContent
    })

    logInfo('webhook', 'subscription_email_sent', {
      userId: subscription.user_id,
      email: user.email,
      paymentId: paymentData.id
    })

  } catch (error) {
    logError('webhook', 'send_subscription_email', error, {
      subscriptionId: subscription.id
    })
  }
}
```

### 2. Crear Endpoint de Verificación de Estado

**Crear archivo:** `app/api/health/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Verificar conexión a Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1)
    
    if (error) throw new Error(`Database error: ${error.message}`)
    
    // Verificar variables de entorno críticas
    const requiredEnvs = [
      'MERCADOPAGO_ACCESS_TOKEN',
      'MERCADOPAGO_WEBHOOK_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    const missingEnvs = requiredEnvs.filter(env => !process.env[env])
    
    // Verificar conectividad con MercadoPago
    let mercadopagoStatus = 'unknown'
    try {
      const mpResponse = await fetch('https://api.mercadopago.com/v1/account/settings', {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      })
      mercadopagoStatus = mpResponse.ok ? 'connected' : 'error'
    } catch {
      mercadopagoStatus = 'error'
    }
    
    const isHealthy = missingEnvs.length === 0 && mercadopagoStatus === 'connected'
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        mercadopago: mercadopagoStatus,
        environment: process.env.NODE_ENV
      },
      issues: {
        missingEnvs: missingEnvs.length > 0 ? missingEnvs : null
      }
    }, { 
      status: isHealthy ? 200 : 503 
    })
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
```

### 3. Crear Endpoint de Verificación Manual de Pagos

**Crear archivo:** `app/api/admin/verify-payment/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logInfo, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { payment_id, order_id } = await request.json()
    
    if (!payment_id || !order_id) {
      return NextResponse.json(
        { error: 'payment_id and order_id are required' },
        { status: 400 }
      )
    }
    
    logInfo('admin', 'verify_payment_request', { payment_id, order_id })
    
    // Obtener datos del pago desde MercadoPago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`MercadoPago API error: ${response.status}`)
    }
    
    const paymentData = await response.json()
    
    // Actualizar orden en base de datos
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const newStatus = paymentData.status === 'approved' ? 'confirmed' : 
                     paymentData.status === 'rejected' ? 'cancelled' : 'processing'
    
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentData.status,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    logInfo('admin', 'payment_verified', {
      payment_id,
      order_id,
      old_status: 'unknown',
      new_status: newStatus,
      payment_status: paymentData.status
    })
    
    return NextResponse.json({
      success: true,
      payment_status: paymentData.status,
      order_status: newStatus,
      updated_order: updatedOrder
    })
    
  } catch (error) {
    logError('admin', 'verify_payment', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to verify payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

### 4. Mejorar Componente de Administración de Órdenes

**Modificar:** `app/admin/(dashboard)/orders/[id]/page.tsx`

Agregar función de verificación manual:
```typescript
// Agregar esta función dentro del componente
const verifyPaymentStatus = async () => {
  if (!order?.mercadopago_payment_id) {
    alert('No hay ID de pago de MercadoPago para verificar')
    return
  }
  
  setIsLoading(true)
  
  try {
    const response = await fetch('/api/admin/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_id: order.mercadopago_payment_id,
        order_id: order.id
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      alert(`Estado verificado: ${result.payment_status} -> ${result.order_status}`)
      // Recargar datos de la orden
      fetchOrder()
    } else {
      alert(`Error: ${result.error}`)
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    alert('Error al verificar el pago')
  } finally {
    setIsLoading(false)
  }
}

// Agregar botón en el JSX, después del botón de actualizar estado:
<button
  onClick={verifyPaymentStatus}
  disabled={isLoading || !order?.mercadopago_payment_id}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
>
  {isLoading ? 'Verificando...' : 'Verificar Estado de Pago'}
</button>
```

### 5. Agregar Componente de Estado del Sistema

**Crear archivo:** `components/admin/SystemStatus.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: string
    mercadopago: string
    environment: string
  }
  issues?: {
    missingEnvs?: string[] | null
  }
}

export default function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      console.error('Error checking system health:', error)
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'error',
          mercadopago: 'error',
          environment: 'unknown'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p>Verificando estado del sistema...</p>
      </div>
    )
  }

  if (!health) {
    return (
      <div className="bg-red-100 p-4 rounded-lg">
        <p className="text-red-800">Error al verificar el estado del sistema</p>
      </div>
    )
  }

  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800'
  }

  return (
    <div className={`p-4 rounded-lg ${statusColors[health.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Estado del Sistema</h3>
        <span className="text-sm">
          {new Date(health.timestamp).toLocaleString('es-CO')}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div>
          <span className="text-sm font-medium">Base de Datos:</span>
          <span className={`ml-2 text-sm ${
            health.services.database === 'connected' ? 'text-green-600' : 'text-red-600'
          }`}>
            {health.services.database}
          </span>
        </div>
        <div>
          <span className="text-sm font-medium">MercadoPago:</span>
          <span className={`ml-2 text-sm ${
            health.services.mercadopago === 'connected' ? 'text-green-600' : 'text-red-600'
          }`}>
            {health.services.mercadopago}
          </span>
        </div>
        <div>
          <span className="text-sm font-medium">Entorno:</span>
          <span className="ml-2 text-sm">
            {health.services.environment}
          </span>
        </div>
      </div>
      
      {health.issues?.missingEnvs && health.issues.missingEnvs.length > 0 && (
        <div className="mt-2 p-2 bg-red-50 rounded">
          <p className="text-sm font-medium text-red-800">Variables faltantes:</p>
          <ul className="text-sm text-red-700 list-disc list-inside">
            {health.issues.missingEnvs.map(env => (
              <li key={env}>{env}</li>
            ))}
          </ul>
        </div>
      )}
      
      <button
        onClick={checkHealth}
        className="mt-2 px-3 py-1 text-sm bg-white bg-opacity-50 rounded hover:bg-opacity-75"
      >
        Actualizar
      </button>
    </div>
  )
}
```

### 6. Integrar Estado del Sistema en Dashboard

**Modificar:** `app/admin/(dashboard)/dashboard/page.tsx`

Agregar la importación:
```typescript
import SystemStatus from '@/components/admin/SystemStatus'
```

Agregar el componente en el JSX:
```typescript
// Agregar después del título del dashboard
<div className="mb-6">
  <SystemStatus />
</div>
```

## 📝 Resumen de Archivos a Crear/Modificar

### Archivos Nuevos:
- ✅ `lib/logger.ts` - Sistema de logging estructurado
- ✅ `app/api/health/route.ts` - Endpoint de verificación de salud
- ✅ `app/api/admin/verify-payment/route.ts` - Verificación manual de pagos
- ✅ `components/admin/SystemStatus.tsx` - Componente de estado del sistema

### Archivos a Modificar:
- 🔄 `lib/webhook-service.ts` - Mejorar logging y manejo de errores
- 🔄 `app/admin/(dashboard)/orders/[id]/page.tsx` - Agregar verificación manual
- 🔄 `app/admin/(dashboard)/dashboard/page.tsx` - Integrar estado del sistema

## 🚀 Próximos Pasos

1. **Implementar los cambios de código** según esta guía
2. **Probar localmente** con el script de prueba de webhook
3. **Configurar MercadoPago** según la guía de configuración externa
4. **Desplegar a producción** y verificar el endpoint `/api/health`
5. **Monitorear logs** y ajustar según sea necesario

---

**Nota:** Todos estos cambios son compatibles con el código existente y mejoran la robustez del sistema sin romper funcionalidades actuales.