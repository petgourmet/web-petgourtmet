import { NextRequest, NextResponse } from 'next/server'
import WebhookService from '@/lib/webhook-service'
import { validateWebhookSignature } from '@/lib/checkout-validators'
import logger from '@/lib/logger'

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
      logger.error('Webhook recibido con body vacío', { requestId })
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
      logger.error('Error parseando JSON del webhook', { error, requestId })
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
    logger.info('Webhook MercadoPago recibido', {
      type: webhookData.type,
      action: webhookData.action,
      dataId: webhookData.data?.id,
      requestId,
      timestamp
    })

    // Validar estructura básica del webhook
    const hasValidStructure = (
      (webhookData.type && webhookData.data?.id) || // Estructura normal (payment)
      (webhookData.type === 'subscription_preapproval' && webhookData.id && webhookData.entity) || // Estructura de suscripción
      (webhookData.type === 'topic_merchant_order_wh' && webhookData.id) || // Estructura de merchant order
      (webhookData.topic && webhookData.resource) // Estructura legacy de merchant_order
    )
    
    if (!hasValidStructure) {
      logger.error('Estructura de webhook inválida', { 
        webhookData, 
        requestId,
        hasType: !!webhookData.type,
        hasDataId: !!webhookData.data?.id,
        hasId: !!webhookData.id
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

    // Inicializar el servicio de webhooks
    const webhookService = new WebhookService()

    // Validar firma del webhook
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    
    let isValidSignature = false
    if (signature && webhookSecret) {
      isValidSignature = validateWebhookSignature(rawBody, signature, webhookSecret)
      if (!isValidSignature) {
        logger.warn('Firma de webhook inválida', { requestId, type: webhookData.type })
      }
    }

    // Procesar según el tipo de webhook con retry automático
    let processed = false
    const maxRetries = 3
    let retryCount = 0

    while (!processed && retryCount < maxRetries) {
      try {
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
            logger.info('Tipo de webhook no manejado', { type: webhookData.type, requestId })
            processed = true // No fallar por tipos desconocidos
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
        logger.error('Error procesando webhook', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: webhookData.type,
          dataId: webhookData.data?.id,
          attempt: retryCount + 1,
          requestId
        })
        
        if (retryCount < maxRetries - 1) {
          retryCount++
          const delayMs = Math.pow(2, retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, delayMs))
        } else {
          logger.error('Todos los intentos de procesamiento fallaron', {
            type: webhookData.type,
            dataId: webhookData.data?.id,
            totalAttempts: maxRetries,
            requestId
          })
          break
        }
      }
    }

    if (processed) {
      logger.info('Webhook procesado exitosamente', {
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
      logger.error('Error procesando webhook', {
        type: webhookData.type,
        action: webhookData.action,
        requestId,
        timestamp
      })
      
      return NextResponse.json(
        { 
          error: 'Error procesando webhook',
          type: webhookData.type,
          action: webhookData.action,
          timestamp
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Webhook-Status': 'error'
          }
        }
      )
    }

  } catch (error) {
    logger.error('Error crítico en webhook', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp
    })
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp
      },
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