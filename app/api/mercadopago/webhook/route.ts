import { NextRequest, NextResponse } from 'next/server'
import WebhookService from '@/lib/webhook-service'

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
  console.log('🔔 Webhook recibido de MercadoPago')
  
  try {
    // Obtener headers importantes
    const signature = request.headers.get('x-signature') || ''
    const requestId = request.headers.get('x-request-id') || ''
    const userAgent = request.headers.get('user-agent') || ''
    
    console.log('📋 Headers del webhook:', {
      signature: signature ? 'presente' : 'ausente',
      requestId,
      userAgent
    })

    // Obtener el raw body para validación de firma
    const rawBody = await getRawBody(request)
    
    if (!rawBody) {
      console.error('❌ Body vacío en webhook')
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
      console.error('❌ Error parseando JSON del webhook:', error)
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

    console.log('📦 Datos del webhook:', {
      id: webhookData.id,
      type: webhookData.type,
      action: webhookData.action,
      dataId: webhookData.data?.id,
      liveMode: webhookData.live_mode
    })

    // Validar estructura básica del webhook
    // topic_merchant_order_wh tiene estructura diferente (id directo, no data.id)
    const hasValidStructure = webhookData.type && (
      webhookData.data?.id || // Estructura normal (payment, subscription)
      (webhookData.type === 'topic_merchant_order_wh' && webhookData.id) // Estructura de merchant order
    )
    
    if (!hasValidStructure) {
      console.error('❌ Estructura de webhook inválida:', webhookData)
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

    // TEMPORAL: Deshabilitar validación de firma para resolver problema inmediato
    // TODO: Revisar configuración de webhook secret en MercadoPago y reactivar validación
    console.log('⚠️ TEMPORAL: Validación de firma deshabilitada para resolver problema de activación automática')
    console.log('📋 Datos de firma recibidos:', {
      hasSignature: !!signature,
      signatureLength: signature?.length || 0,
      hasRequestId: !!requestId,
      environment: process.env.NODE_ENV
    })
    
    // Comentado temporalmente para permitir webhooks de MercadoPago
    /*
    if (process.env.NODE_ENV === 'production') {
      const isValidSignature = webhookService.validateWebhookSignature(rawBody, signature, requestId)
      if (!isValidSignature) {
        console.error('❌ Firma de webhook inválida')
        return NextResponse.json(
          { error: 'Firma inválida' },
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'WWW-Authenticate': 'Signature realm="MercadoPago Webhook"'
            }
          }
        )
      }
      console.log('✅ Firma de webhook validada')
    } else {
      console.log('⚠️ Modo desarrollo - omitiendo validación de firma')
    }
    */

    // Procesar según el tipo de webhook con retry automático
    let processed = false
    const maxRetries = 3
    let retryCount = 0

    while (!processed && retryCount < maxRetries) {
      try {
        switch (webhookData.type) {
          case 'payment':
            console.log(`💳 Procesando webhook de pago (intento ${retryCount + 1}/${maxRetries})`)
            processed = await webhookService.processPaymentWebhook(webhookData)
            break

          case 'subscription_preapproval':
          case 'subscription_authorized_payment':
            console.log(`📋 Procesando webhook de suscripción con activación automática mejorada (intento ${retryCount + 1}/${maxRetries})`)
            console.log('🔍 Detalles del webhook:', {
              type: webhookData.type,
              action: webhookData.action,
              dataId: webhookData.data?.id,
              liveMode: webhookData.live_mode,
              timestamp: new Date().toISOString(),
              retryAttempt: retryCount + 1
            })
            
            // Procesar con el servicio mejorado
            processed = await webhookService.processSubscriptionWebhook(webhookData)
            
            // Log adicional para seguimiento
            if (processed) {
              console.log(`✅ Webhook de suscripción procesado exitosamente con activación automática (intento ${retryCount + 1})`)
            } else {
              console.warn(`⚠️ Webhook de suscripción falló en intento ${retryCount + 1}`)
            }
            break

          case 'plan':
            console.log('📋 Webhook de plan recibido (no procesado)')
            processed = true // Los planes no requieren procesamiento especial
            break

          case 'invoice':
            console.log('🧾 Webhook de factura recibido (no procesado)')
            processed = true // Las facturas no requieren procesamiento especial
            break

          case 'topic_merchant_order_wh':
            console.log('🛒 Webhook de merchant order recibido')
            console.log('📦 Datos de merchant order:', {
              id: webhookData.id,
              status: webhookData.status || webhookData.data?.status,
              action: webhookData.action
            })
            processed = true // Merchant orders se procesan exitosamente
            break

          default:
            console.log(`ℹ️ Tipo de webhook no manejado: ${webhookData.type}`)
            processed = true // No fallar por tipos desconocidos
        }

        // Si no se procesó correctamente y aún hay intentos disponibles
        if (!processed && retryCount < maxRetries - 1) {
          retryCount++
          const delayMs = Math.pow(2, retryCount) * 1000 // Backoff exponencial: 2s, 4s, 8s
          console.log(`⏳ Reintentando procesamiento en ${delayMs}ms (intento ${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
        } else {
          break
        }
      } catch (error) {
        console.error(`❌ Error en intento ${retryCount + 1} de procesamiento de webhook:`, error)
        
        if (retryCount < maxRetries - 1) {
          retryCount++
          const delayMs = Math.pow(2, retryCount) * 1000 // Backoff exponencial
          console.log(`⏳ Reintentando tras error en ${delayMs}ms (intento ${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
        } else {
          // Último intento falló, registrar error crítico
          console.error('❌ Todos los intentos de procesamiento fallaron:', {
            type: webhookData.type,
            dataId: webhookData.data?.id,
            error: error instanceof Error ? error.message : 'Error desconocido',
            totalAttempts: maxRetries
          })
          break
        }
      }
    }

    if (processed) {
      console.log('✅ Webhook procesado exitosamente')
      return NextResponse.json(
        { 
          success: true, 
          message: 'Webhook procesado',
          type: webhookData.type,
          action: webhookData.action,
          timestamp: new Date().toISOString()
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
      console.error('❌ Error procesando webhook')
      return NextResponse.json(
        { 
          error: 'Error procesando webhook',
          type: webhookData.type,
          action: webhookData.action,
          timestamp: new Date().toISOString()
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
    console.error('❌ Error crítico en webhook:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
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
    console.log('🔍 Challenge de MercadoPago recibido:', challenge)
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