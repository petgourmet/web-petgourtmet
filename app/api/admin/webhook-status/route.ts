import { NextRequest, NextResponse } from 'next/server'
import { logger, LogCategory } from '@/lib/logger'

// Endpoint para verificar el estado y configuración del webhook
export async function GET(request: NextRequest) {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'}/api/mercadopago/webhook`
    let mercadoPagoToken: string | undefined;
    let webhookSecret: string | undefined;
    
    try {
      const { getMercadoPagoAccessToken, getMercadoPagoWebhookSecret } = await import('@/lib/mercadopago-config');
      mercadoPagoToken = getMercadoPagoAccessToken();
      webhookSecret = getMercadoPagoWebhookSecret();
    } catch (error) {
      // Si falla la configuración dinámica, usar las variables de entorno directas como fallback
      mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    }
    
    const status = {
      webhook: {
        url: webhookUrl,
        configured: !!mercadoPagoToken,
        secretConfigured: !!webhookSecret,
        environment: process.env.NODE_ENV || 'development'
      },
      mercadopago: {
        tokenConfigured: !!mercadoPagoToken,
        tokenLength: mercadoPagoToken?.length || 0,
        tokenType: mercadoPagoToken?.startsWith('APP_USR') ? 'production' : 
                   mercadoPagoToken?.startsWith('TEST') ? 'sandbox' : 'unknown'
      },
      issues: [],
      recommendations: []
    }

    // Detectar problemas de configuración
    if (!mercadoPagoToken) {
      status.issues.push({
        type: 'MISSING_TOKEN',
        severity: 'CRITICAL',
        description: 'Token de MercadoPago no configurado',
        impact: 'Los webhooks no pueden procesar pagos'
      })
      
      status.recommendations.push({
        action: 'CONFIGURE_TOKEN',
        description: 'Configurar MERCADOPAGO_ACCESS_TOKEN en variables de entorno',
        priority: 'HIGH'
      })
    }

    if (!webhookSecret) {
      status.issues.push({
        type: 'MISSING_WEBHOOK_SECRET',
        severity: 'HIGH',
        description: 'Secret del webhook no configurado',
        impact: 'Los webhooks no pueden validar la autenticidad de las requests'
      })
      
      status.recommendations.push({
        action: 'CONFIGURE_WEBHOOK_SECRET',
        description: 'Configurar MERCADOPAGO_WEBHOOK_SECRET en variables de entorno',
        priority: 'HIGH'
      })
    }

    if (process.env.NODE_ENV === 'production' && webhookUrl.includes('localhost')) {
      status.issues.push({
        type: 'LOCALHOST_IN_PRODUCTION',
        severity: 'CRITICAL',
        description: 'URL del webhook apunta a localhost en producción',
        impact: 'MercadoPago no puede enviar webhooks'
      })
      
      status.recommendations.push({
        action: 'UPDATE_WEBHOOK_URL',
        description: 'Actualizar NEXT_PUBLIC_BASE_URL con la URL de producción',
        priority: 'HIGH'
      })
    }

    // Probar conectividad del webhook
    let webhookTest = null
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'GET'
      })
      
      webhookTest = {
        accessible: testResponse.ok,
        status: testResponse.status,
        statusText: testResponse.statusText
      }
      
      if (!testResponse.ok) {
        status.issues.push({
          type: 'WEBHOOK_NOT_ACCESSIBLE',
          severity: 'HIGH',
          description: `Webhook no accesible: ${testResponse.status} ${testResponse.statusText}`,
          impact: 'MercadoPago no puede enviar notificaciones'
        })
      }
    } catch (error) {
      webhookTest = {
        accessible: false,
        error: error.message
      }
      
      status.issues.push({
        type: 'WEBHOOK_CONNECTION_ERROR',
        severity: 'HIGH',
        description: `Error de conexión al webhook: ${error.message}`,
        impact: 'MercadoPago no puede enviar notificaciones'
      })
    }

    // Verificar configuración en MercadoPago (si tenemos token)
    let mercadopagoConfig = null
    if (mercadoPagoToken) {
      try {
        // Obtener información de la aplicación
        const appResponse = await fetch('https://api.mercadopago.com/applications/me', {
          headers: {
            'Authorization': `Bearer ${mercadoPagoToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (appResponse.ok) {
          const appData = await appResponse.json()
          mercadopagoConfig = {
            appId: appData.id,
            name: appData.name,
            status: appData.status,
            webhooksConfigured: appData.webhook_url ? true : false,
            configuredWebhookUrl: appData.webhook_url
          }
          
          // Verificar si la URL del webhook coincide
          if (appData.webhook_url && appData.webhook_url !== webhookUrl) {
            status.issues.push({
              type: 'WEBHOOK_URL_MISMATCH',
              severity: 'MEDIUM',
              description: `URL del webhook en MercadoPago (${appData.webhook_url}) no coincide con la configurada (${webhookUrl})`,
              impact: 'Los webhooks pueden no llegar correctamente'
            })
            
            status.recommendations.push({
              action: 'UPDATE_MERCADOPAGO_WEBHOOK',
              description: `Actualizar URL del webhook en MercadoPago a ${webhookUrl}`,
              priority: 'MEDIUM'
            })
          }
        }
      } catch (error) {
        mercadopagoConfig = {
          error: 'Error obteniendo configuración de MercadoPago',
          details: error.message
        }
      }
    }

    // Estadísticas de salud general
    const healthScore = Math.max(0, 100 - (status.issues.length * 20))
    const healthStatus = healthScore >= 80 ? 'healthy' : 
                        healthScore >= 60 ? 'warning' : 'critical'

    logger.info(LogCategory.WEBHOOK, 'Verificación de estado del webhook completada', {
      issuesCount: status.issues.length,
      healthScore,
      healthStatus
    })

    return NextResponse.json({
      success: true,
      status,
      webhookTest,
      mercadopagoConfig,
      health: {
        score: healthScore,
        status: healthStatus,
        message: healthStatus === 'healthy' ? 'Sistema funcionando correctamente' :
                healthStatus === 'warning' ? 'Sistema funcionando con advertencias' :
                'Sistema con problemas críticos'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error(LogCategory.WEBHOOK, 'Error verificando estado del webhook', error, {
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Endpoint POST para probar el webhook manualmente
export async function POST(request: NextRequest) {
  try {
    const { testType = 'basic' } = await request.json()
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'}/api/mercadopago/webhook`
    
    let testResult = null
    
    if (testType === 'basic') {
      // Prueba básica GET
      const response = await fetch(webhookUrl, {
        method: 'GET'
      })
      
      testResult = {
        type: 'basic',
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: response.ok ? await response.json() : null
      }
    } else if (testType === 'webhook_simulation') {
      // Simular un webhook de prueba
      const testWebhookData = {
        id: 'test-webhook-' + Date.now(),
        live_mode: false,
        type: 'payment',
        date_created: new Date().toISOString(),
        application_id: 'test',
        user_id: 'test',
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: {
          id: 'test-payment-id'
        }
      }
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'test-signature',
          'x-request-id': 'test-request-' + Date.now()
        },
        body: JSON.stringify(testWebhookData)
      })
      
      testResult = {
        type: 'webhook_simulation',
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        testData: testWebhookData,
        response: response.ok ? await response.json() : await response.text()
      }
    }
    
    logger.info(LogCategory.WEBHOOK, 'Prueba de webhook ejecutada', {
      testType,
      success: testResult?.success,
      status: testResult?.status
    })
    
    return NextResponse.json({
      success: true,
      testResult,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error(LogCategory.WEBHOOK, 'Error en prueba de webhook', error, {
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Error ejecutando prueba',
        details: error.message
      },
      { status: 500 }
    )
  }
}