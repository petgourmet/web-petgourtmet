import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

/**
 * API para crear Preapproval de MercadoPago con external_reference correcto
 * 
 * Esta es la solución definitiva al problema de external_reference mismatch.
 * En lugar de redirigir a URLs pre-generadas, creamos el Preapproval dinámicamente
 * con nuestro external_reference personalizado en el BODY de la solicitud.
 * 
 * Flujo:
 * 1. Cliente hace checkout
 * 2. Se crea suscripción en DB con external_reference: "SUB-xxx-xxx-xxx"
 * 3. Se llama a este API con el external_reference
 * 4. API crea Preapproval en MercadoPago con el MISMO external_reference
 * 5. MercadoPago devuelve init_point para el checkout
 * 6. Cliente paga
 * 7. Webhook recibe pago con el MISMO external_reference
 * 8. ✅ Webhook encuentra la suscripción automáticamente
 * 9. ✅ Suscripción se activa automáticamente
 * 10. ✅ Email se envía automáticamente
 */

export async function POST(request: Request) {
  console.log('🔷 API: create-subscription-preference - Inicio')
  
  try {
    const body = await request.json()
    console.log('📋 Datos recibidos:', {
      external_reference: body.external_reference,
      subscription_id: body.subscription_id,
      payer_email: body.payer_email,
      transaction_amount: body.transaction_amount
    })

    const {
      external_reference,     // El SUB-xxx-xxx-xxx que YA creamos
      subscription_id,        // ID de la suscripción en nuestra DB
      payer_email,
      payer_first_name,
      payer_last_name,
      transaction_amount,
      reason,
      frequency,
      frequency_type
    } = body

    // Validaciones
    if (!external_reference || !subscription_id || !payer_email || !transaction_amount) {
      console.error('❌ Faltan datos requeridos')
      return NextResponse.json({ 
        error: "Datos incompletos",
        required: ['external_reference', 'subscription_id', 'payer_email', 'transaction_amount']
      }, { status: 400 })
    }

    // Verificar que tenemos el token de MercadoPago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error('❌ Token de MercadoPago no configurado')
      return NextResponse.json({ 
        error: "MercadoPago no configurado correctamente" 
      }, { status: 500 })
    }

    console.log('✅ Token de MercadoPago disponible')

    // Detectar la moneda correcta basado en la URL base
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://petgourmet.mx'
    const currencyId = baseUrl.includes('.cl') ? 'CLP' : 'MXN'
    
    console.log('💰 Moneda detectada:', currencyId, 'para URL:', baseUrl)

    // Parsear y validar el monto
    const amount = parseFloat(transaction_amount)
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Monto inválido:', transaction_amount)
      return NextResponse.json({ 
        error: "Monto de transacción inválido",
        received: transaction_amount,
        parsed: amount
      }, { status: 400 })
    }

    // Construir el objeto de Preapproval con external_reference correcto
    const preapprovalData: any = {
      reason: reason || `Suscripción Pet Gourmet`,
      auto_recurring: {
        frequency: frequency || 1,
        frequency_type: frequency_type || "months",
        transaction_amount: Math.round(amount * 100) / 100,  // Redondear a 2 decimales
        currency_id: currencyId
      },
      back_url: `${baseUrl}/suscripcion`,
      payer_email: payer_email,
      external_reference: external_reference,  // 🔥 CLAVE: Aquí enviamos NUESTRO external_reference
      status: "pending"
    }

    // Agregar notification_url solo si está en producción
    if (baseUrl.includes('petgourmet')) {
      preapprovalData.notification_url = `${baseUrl}/api/mercadopago/webhook`
    }

    console.log('📤 Creando Preapproval en MercadoPago con external_reference:', external_reference)
    console.log('📋 Datos del Preapproval:', preapprovalData)

    // Llamar a la API de MercadoPago para crear el Preapproval
    const response = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preapprovalData),
    })

    console.log('📥 Respuesta de MercadoPago:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("❌ Error de MercadoPago:", JSON.stringify(errorData, null, 2))
      console.error("❌ Status:", response.status)
      console.error("❌ Datos enviados:", JSON.stringify(preapprovalData, null, 2))
      
      return NextResponse.json({ 
        error: "Error creando suscripción en MercadoPago", 
        details: errorData,
        status: response.status,
        sentData: preapprovalData,  // Para debugging
        message: errorData.message || 'Error desconocido de MercadoPago'
      }, { status: response.status })
    }

    const preapproval = await response.json()
    console.log('✅ Preapproval creado exitosamente:', {
      id: preapproval.id,
      external_reference: preapproval.external_reference,
      init_point: preapproval.init_point,
      status: preapproval.status
    })

    // CRÍTICO: Verificar que MercadoPago respetó nuestro external_reference
    if (preapproval.external_reference !== external_reference) {
      console.error('⚠️ ADVERTENCIA: MercadoPago cambió el external_reference!', {
        enviado: external_reference,
        recibido: preapproval.external_reference
      })
    } else {
      console.log('✅ External reference confirmado:', preapproval.external_reference)
    }

    // Actualizar la suscripción en nuestra DB con el preapproval_id
    console.log('💾 Actualizando suscripción en DB con preapproval_id')
    const supabase = createServiceClient()
    
    const { error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({ 
        // ELIMINADO: preapproval_plan_id ya no se usa en el nuevo sistema
        // preapproval_plan_id: preapproval.id,
        init_point: preapproval.init_point,
        updated_at: new Date().toISOString(),
        metadata: {
          preapproval_created_at: new Date().toISOString(),
          preapproval_id: preapproval.id,
          api_created: true,
          external_reference_confirmed: preapproval.external_reference === external_reference
        }
      })
      .eq('id', subscription_id)

    if (updateError) {
      console.error('❌ Error actualizando suscripción en DB:', updateError)
      // No fallar por esto, pero loggearlo
    } else {
      console.log('✅ Suscripción actualizada en DB')
    }

    console.log('🎉 Proceso completado exitosamente')

    // Devolver el init_point para redirigir al usuario
    return NextResponse.json({
      success: true,
      preapproval_id: preapproval.id,
      init_point: preapproval.init_point,
      external_reference: preapproval.external_reference,
      status: preapproval.status,
      message: 'Preapproval creado correctamente con external_reference personalizado'
    })

  } catch (error: any) {
    console.error("❌ Error crítico en create-subscription-preference:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// Método GET para verificar que el endpoint está activo
export async function GET(request: Request) {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/mercadopago/create-subscription-preference',
    method: 'POST',
    description: 'Crea Preapproval de MercadoPago con external_reference personalizado',
    timestamp: new Date().toISOString()
  })
}
