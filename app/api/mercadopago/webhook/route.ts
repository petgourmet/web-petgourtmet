import { NextRequest, NextResponse } from 'next/server'
import webhookService from '@/lib/webhook-service'
import { validateWebhookSignature } from '@/lib/checkout-validators'
import { logger, LogCategory } from '@/lib/logger'

// Configurar para que Next.js no parsee el body automáticamente
export const runtime = 'nodejs'

// Función mejorada para obtener el raw body con límites de tamaño
async function getRawBody(request: NextRequest): Promise<string> {
  const MAX_BODY_SIZE = 1024 * 1024 // 1MB límite
  let totalSize = 0
  const chunks: Uint8Array[] = []
  
  const reader = request.body?.getReader()
  
  if (!reader) {
    throw new Error('No se pudo leer el body de la request')
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      if (value) {
        totalSize += value.length
        if (totalSize > MAX_BODY_SIZE) {
          throw new Error(`Body demasiado grande: ${totalSize} bytes (máximo: ${MAX_BODY_SIZE})`)
        }
        chunks.push(value)
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (chunks.length === 0) {
    return ''
  }

  // Usar Buffer.concat para mejor rendimiento
  const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
  return buffer.toString('utf8')
}

// Endpoint principal para webhooks de MercadoPago
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    // Obtener headers importantes
    const signature = request.headers.get('x-signature') || ''
    const requestId = request.headers.get('x-request-id') || ''
    
    // Obtener el raw body para validación de firma
    const rawBody = await getRawBody(request)
    
    if (!rawBody) {
      logger.error(LogCategory.WEBHOOK, 'Webhook recibido con body vacío', undefined, { requestId })
      return NextResponse.json(
        { error: 'Body vacío' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }

    // Parsear el JSON
    let webhookData
    try {
      webhookData = JSON.parse(rawBody)
    } catch (error) {
      logger.error(LogCategory.WEBHOOK, 'Error parseando JSON del webhook', error, { requestId })
      return NextResponse.json(
        { error: 'JSON inválido' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }

    // Log de auditoría para webhook recibido
    logger.info(LogCategory.WEBHOOK, 'Webhook MercadoPago recibido', {
      type: webhookData.type,
      action: webhookData.action,
      dataId: webhookData.data?.id,
      topic: webhookData.topic,
      resource: webhookData.resource,
      requestId,
      timestamp,
      fullWebhookData: JSON.stringify(webhookData, null, 2)
    })

    // Validar estructura básica del webhook
    const hasValidStructure = (
      (webhookData.type && webhookData.data?.id) || // Estructura normal (payment)
      (webhookData.type === 'subscription_preapproval' && webhookData.id && webhookData.entity) || // Estructura de suscripción
      (webhookData.type === 'topic_merchant_order_wh' && webhookData.id) || // Estructura de merchant order
      (webhookData.topic && webhookData.resource) // Estructura legacy de merchant_order
    )
    
    if (!hasValidStructure) {
      logger.error(LogCategory.WEBHOOK, 'Estructura de webhook inválida', undefined, { 
        webhookData: JSON.stringify(webhookData, null, 2), 
        requestId,
        hasType: !!webhookData.type,
        hasDataId: !!webhookData.data?.id,
        hasId: !!webhookData.id,
        hasTopic: !!webhookData.topic,
        hasResource: !!webhookData.resource
      })
      return NextResponse.json(
        { error: 'Estructura de webhook inválida' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }

    // Usar el servicio de webhooks (ya instanciado)

    // Validar firma del webhook
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    
    let isValidSignature = false
    if (signature && webhookSecret) {
      // En desarrollo, permitir firmas de prueba
      if (process.env.NODE_ENV === 'development' && signature.includes('test-signature')) {
        isValidSignature = true
        logger.info(LogCategory.WEBHOOK, 'Usando firma de prueba en desarrollo', { requestId, type: webhookData.type })
      } else {
        isValidSignature = validateWebhookSignature(rawBody, signature, webhookSecret)
        if (!isValidSignature) {
          logger.warn(LogCategory.WEBHOOK, 'Firma de webhook inválida', { requestId, type: webhookData.type })
        }
      }
    }

    // Procesar según el tipo de webhook con retry automático
    let processed = false
    const maxRetries = 3
    let retryCount = 0

    while (!processed && retryCount < maxRetries) {
      try {
        // Manejar webhooks de merchant_order (estructura legacy)
        if (webhookData.topic === 'merchant_order' && webhookData.resource) {
          logger.info(LogCategory.WEBHOOK, 'Procesando webhook de merchant_order (estructura legacy)', {
            topic: webhookData.topic,
            resource: webhookData.resource,
            requestId
          })
          processed = await webhookService.processMerchantOrderWebhook(webhookData)
        } else {
          switch (webhookData.type) {
            case 'payment':
              processed = await webhookService.processPaymentWebhook(webhookData)
              break

            case 'subscription_preapproval':
            case 'subscription_authorized_payment':
              // Normalizar estructura - MercadoPago puede enviar diferentes formatos
              const normalizedWebhookData = {
                ...webhookData,
                data: webhookData.data || { id: webhookData.id }
              }
              
              processed = await webhookService.processSubscriptionWebhook(normalizedWebhookData)
              break

            case 'plan':
            case 'invoice':
            case 'topic_merchant_order_wh':
              processed = true // Estos tipos no requieren procesamiento especial
              break

            default:
              logger.info(LogCategory.WEBHOOK, 'Tipo de webhook no manejado', { 
                type: webhookData.type, 
                topic: webhookData.topic,
                requestId,
                fullData: JSON.stringify(webhookData, null, 2)
              })
              processed = true // No fallar por tipos desconocidos
          }
        }

        // Si no se procesó correctamente y aún hay intentos disponibles
        if (!processed && retryCount < maxRetries - 1) {
          retryCount++
          const delayMs = Math.pow(2, retryCount) * 1000 // Backoff exponencial: 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delayMs))
        } else {
          break
        }
      } catch (error) {
        const errorDetails = {
          type: webhookData.type,
          dataId: webhookData.data?.id,
          attempt: retryCount + 1,
          requestId,
          errorMessage: error instanceof Error ? error.message : 'Error desconocido',
          errorType: error?.constructor?.name || 'Unknown'
        }
        
        logger.error(LogCategory.WEBHOOK, 'Error procesando webhook', error, errorDetails)
        
        if (retryCount < maxRetries - 1) {
          retryCount++
          const delayMs = Math.pow(2, retryCount) * 1000
          logger.info(LogCategory.WEBHOOK, `Reintentando procesamiento en ${delayMs}ms`, {
            attempt: retryCount + 1,
            maxRetries,
            requestId
          })
          await new Promise(resolve => setTimeout(resolve, delayMs))
        } else {
          logger.error(LogCategory.WEBHOOK, 'Todos los intentos de procesamiento fallaron', error, {
            type: webhookData.type,
            dataId: webhookData.data?.id,
            totalAttempts: maxRetries,
            requestId,
            finalError: error instanceof Error ? error.message : 'Error desconocido'
          })
          break
        }
      }
    }

    if (processed) {
      logger.info(LogCategory.WEBHOOK, 'Webhook procesado exitosamente', {
        type: webhookData.type,
        action: webhookData.action,
        requestId,
        timestamp
      })
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Webhook procesado',
          type: webhookData.type,
          action: webhookData.action,
          timestamp
        },
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Webhook-Status': 'processed'
          }
        }
      )
    } else {
      const errorContext = {
        type: webhookData.type,
        action: webhookData.action,
        requestId,
        timestamp,
        topic: webhookData.topic,
        resource: webhookData.resource,
        dataId: webhookData.data?.id,
        retryAttempts: retryCount,
        maxRetries
      }
      
      logger.error(LogCategory.WEBHOOK, 'Webhook no pudo ser procesado después de todos los intentos', undefined, errorContext)
      
      return NextResponse.json(
        { 
          error: 'Error procesando webhook',
          type: webhookData.type,
          action: webhookData.action,
          timestamp,
          retryAttempts: retryCount,
          details: 'El webhook no pudo ser procesado después de múltiples intentos'
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Webhook-Status': 'processing-failed',
            'X-Retry-Attempts': retryCount.toString()
          }
        }
      )
    }

  } catch (error) {
    // Mejorar el logging del error crítico
    const errorDetails = {
      timestamp,
      errorMessage: error instanceof Error ? error.message : 'Error desconocido',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name || 'Unknown',
      requestHeaders: Object.fromEntries(request.headers.entries()),
      requestUrl: request.url,
      requestMethod: request.method
    }
    
    logger.error(LogCategory.WEBHOOK, 'Error crítico en webhook', error, errorDetails)
    
    // Respuesta más informativa para debugging
    const responseBody = {
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp,
      // Solo incluir detalles adicionales en desarrollo
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          type: error?.constructor?.name,
          stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
        }
      })
    }
    
    return NextResponse.json(
      responseBody,
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Webhook-Status': 'critical-error'
        }
      }
    )
  }
}

// Endpoint GET para verificar que el webhook está funcionando
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('challenge')
  
  // Si MercadoPago envía un challenge, devolverlo
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }

  // Respuesta de estado para verificar que el endpoint está activo
  return NextResponse.json({
    status: 'active',
    message: 'Webhook endpoint de MercadoPago funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Endpoint-Status': 'active'
    }
  })
}

// Manejar otros métodos HTTP
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Método no permitido',
      allowed_methods: ['GET', 'POST'],
      timestamp: new Date().toISOString()
    },
    { 
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Método no permitido',
      allowed_methods: ['GET', 'POST'],
      timestamp: new Date().toISOString()
    },
    { 
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  )
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Método no permitido',
      allowed_methods: ['GET', 'POST'],
      timestamp: new Date().toISOString()
    },
    { 
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  )
}