import { NextRequest, NextResponse } from 'next/server'
import WebhookService from '@/lib/webhook-service'

// Configurar para que Next.js no parsee el body automáticamente
export const runtime = 'nodejs'

// Función para obtener el raw body
async function getRawBody(request: NextRequest): Promise<string> {
  const chunks: Uint8Array[] = []
  const reader = request.body?.getReader()
  
  if (!reader) {
    throw new Error('No se pudo leer el body de la request')
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const concatenated = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    concatenated.set(chunk, offset)
    offset += chunk.length
  }

  return new TextDecoder().decode(concatenated)
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
        { status: 400 }
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
        { status: 400 }
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
    if (!webhookData.type || !webhookData.data?.id) {
      console.error('❌ Estructura de webhook inválida:', webhookData)
      return NextResponse.json(
        { error: 'Estructura de webhook inválida' },
        { status: 400 }
      )
    }

    // Inicializar el servicio de webhooks
    const webhookService = new WebhookService()

    // Validar firma del webhook (en producción)
    if (process.env.NODE_ENV === 'production') {
      const isValidSignature = webhookService.validateWebhookSignature(rawBody, signature)
      if (!isValidSignature) {
        console.error('❌ Firma de webhook inválida')
        return NextResponse.json(
          { error: 'Firma inválida' },
          { status: 401 }
        )
      }
      console.log('✅ Firma de webhook validada')
    } else {
      console.log('⚠️ Modo desarrollo - omitiendo validación de firma')
    }

    // Procesar según el tipo de webhook
    let processed = false

    switch (webhookData.type) {
      case 'payment':
        console.log('💳 Procesando webhook de pago')
        processed = await webhookService.processPaymentWebhook(webhookData)
        break

      case 'subscription_preapproval':
      case 'subscription_authorized_payment':
        console.log('📋 Procesando webhook de suscripción')
        processed = await webhookService.processSubscriptionWebhook(webhookData)
        break

      case 'plan':
        console.log('📋 Webhook de plan recibido (no procesado)')
        processed = true // Los planes no requieren procesamiento especial
        break

      case 'invoice':
        console.log('🧾 Webhook de factura recibido (no procesado)')
        processed = true // Las facturas no requieren procesamiento especial
        break

      default:
        console.log(`ℹ️ Tipo de webhook no manejado: ${webhookData.type}`)
        processed = true // No fallar por tipos desconocidos
    }

    if (processed) {
      console.log('✅ Webhook procesado exitosamente')
      return NextResponse.json(
        { 
          success: true, 
          message: 'Webhook procesado',
          type: webhookData.type,
          action: webhookData.action
        },
        { status: 200 }
      )
    } else {
      console.error('❌ Error procesando webhook')
      return NextResponse.json(
        { 
          error: 'Error procesando webhook',
          type: webhookData.type,
          action: webhookData.action
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error crítico en webhook:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
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
  })
}

// Manejar otros métodos HTTP
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  )
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  )
}