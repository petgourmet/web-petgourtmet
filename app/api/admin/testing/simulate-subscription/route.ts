import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { subscriptionDeduplicationService } from '@/lib/subscription-deduplication-service'
import { createEnhancedIdempotencyServiceServer } from '@/lib/enhanced-idempotency-service.server'

// Función auxiliar para calcular próxima fecha de facturación
function getNextBillingDate(frequency: string): string {
  const now = new Date()
  switch (frequency) {
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1)
      break
    default:
      now.setMonth(now.getMonth() + 1)
  }
  return now.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      planId = 'test-plan', 
      amount = 2500, 
      userEmail = 'test@petgourmet.com',
      frequency = 'monthly',
      userId = 'test-user-id'
    } = body
    
    // Generar external_reference determinística
    console.log('🔄 Generando external_reference con datos:', { userId, planId, amount, email: userEmail, frequency })
    let finalExternalReference: string
    try {
      finalExternalReference = subscriptionDeduplicationService.generateDeterministicReference(
        {
          userId,
          planId,
          amount,
          additionalData: { email: userEmail, frequency }
        }
      )
      console.log('🔗 External reference generada:', finalExternalReference)
    } catch (error) {
      console.error('❌ Error generando external_reference:', error)
      return NextResponse.json(
        { error: 'Error generando referencia externa', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }
    
    // Validar duplicados antes de crear
    const duplicateCheck = await subscriptionDeduplicationService.validateBeforeCreate({
      userId,
      planId,
      amount,
      additionalData: { email: userEmail, frequency }
    })
    
    if (!duplicateCheck.isValid) {
      console.log('🚫 Validación fallida:', duplicateCheck.reason)
      return NextResponse.json(
        { 
          error: 'Validación de suscripción fallida', 
          reason: duplicateCheck.reason,
          existing: duplicateCheck.existingSubscription
        }, 
        { status: 409 }
      )
    }
    
    const supabase = createServiceClient()
    
    // Generar clave de idempotencia
    const subscriptionData = {
      userId,
      planId,
      amount,
      additionalData: { email: userEmail, frequency }
    }
    console.log('🔑 Generando clave de idempotencia con datos:', subscriptionData)
    console.log('🔑 finalExternalReference antes de generar clave:', finalExternalReference)
    const idempotencyKey = subscriptionDeduplicationService.generateIdempotencyKey(subscriptionData)
    console.log('🔑 Clave de idempotencia generada:', idempotencyKey)
    
    // Usar servicio de idempotencia para crear la suscripción
    const idempotencyService = createEnhancedIdempotencyServiceServer()
    const result = await idempotencyService.executeSubscriptionWithIdempotency(
      async (externalRef) => {
        // Crear cliente de Supabase dentro de la función
        const supabaseClient = createServiceClient()
        
        // Crear suscripción de prueba
        const testSubscription = {
          user_id: null, // Permitir null para pruebas
          external_reference: finalExternalReference,
          subscription_type: 'monthly', // Valor fijo válido
          status: 'pending',
          transaction_amount: amount,
          currency_id: 'MXN',
          next_billing_date: getNextBillingDate(frequency),
          customer_data: {
            email: userEmail,
            plan_id: planId,
            test_user_id: userId // Guardar el userId de prueba en customer_data
          },
          metadata: {
            plan_name: 'Plan de Prueba',
            payment_method: 'mercadopago'
          }
        }
        
        console.log('📝 Datos de suscripción a insertar:', testSubscription)
        
        // Insertar suscripción en la base de datos
        const { data: insertedData, error: subscriptionError } = await supabaseClient
          .from('unified_subscriptions')
          .insert(testSubscription)
          .select()
          .single()
        
        if (subscriptionError) {
          throw new Error(`Error creando suscripción de prueba: ${subscriptionError.message}`)
        }
        
        return { subscriptionId: insertedData.id, insertedData }
      },
      {
        key: idempotencyKey,
        ttlSeconds: 300,
        maxRetries: 3,
        enablePreValidation: true,
        subscriptionData
      }
    )
    
    // Manejar resultado desde caché o nueva ejecución
    if (result.fromCache) {
      console.log('✅ Suscripción de prueba obtenida desde caché de idempotencia')
      return NextResponse.json({
        success: true,
        message: 'Suscripción de prueba ya existe (desde caché)',
        ...result.result,
        fromCache: true
      })
    }

    console.log('📊 Resultado del servicio de idempotencia:', result)
    if (!result.success || !result.data) {
      throw new Error(`El servicio de idempotencia falló: ${result.error || 'Resultado inválido'}`)
    }

    const { subscriptionId, insertedData } = result.data
    
    // Crear orden asociada
    const testOrder = {
      user_id: null, // Permitir null para pruebas
      external_reference: finalExternalReference,
      total: amount,
      status: 'pending',
      payment_method: 'mercadopago',
      customer_email: userEmail,
      is_subscription: true
    }
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single()
    
    if (orderError) {
      console.error('Error creando orden de prueba:', orderError)
      return NextResponse.json(
        { error: 'Error creando orden de prueba' },
        { status: 500 }
      )
    }
    
    const orderId = orderData.id
    
    // Simular activación después de 3 segundos
    setTimeout(async () => {
      try {
        console.log(`🔄 Iniciando simulación de activación para suscripción ${subscriptionId}`, {
          external_reference: finalExternalReference,
          user_email: userEmail
        })
        
        // Actualizar suscripción a activa
        const supabaseService = createServiceClient()
        const { error: updateError } = await supabaseService
          .from('unified_subscriptions')
          .update({
            status: 'active',
            mercadopago_subscription_id: `test_preapproval_${subscriptionId.toString().slice(0, 8)}`
          })
          .eq('id', subscriptionId)
        
        if (updateError) {
          console.error('❌ Error activando suscripción de prueba:', updateError)
          return
        }
        
        // Registrar webhook simulado
        const { error: webhookError } = await supabaseService
          .from('webhook_logs')
          .insert({
            webhook_type: 'subscription',
            webhook_data: {
              subscription_id: subscriptionId,
              external_reference: finalExternalReference,
              status: 'active',
              payment_status: 'approved',
              simulated: true,
              user_email: userEmail,
              event_type: 'subscription.activated'
            },
            status: 'processed',
            processed_at: new Date().toISOString()
          })
        
        if (webhookError) {
          console.error('❌ Error registrando webhook simulado:', webhookError)
        }
        
        console.log(`✅ Suscripción de prueba activada automáticamente`, {
          subscription_id: subscriptionId,
          external_reference: finalExternalReference,
          user_email: userEmail
        })
      } catch (error) {
        console.error('❌ Error en simulación de activación:', error)
      }
    }, 3000)
    
    return NextResponse.json({
      success: true,
      message: 'Suscripción de prueba creada exitosamente con lógica de deduplicación',
      subscription: {
        id: subscriptionId,
        external_reference: finalExternalReference,
        user_id: userId,
        user_email: userEmail,
        plan_id: planId,
        amount: amount,
        frequency: frequency,
        status: 'pending',
        next_billing_date: getNextBillingDate(frequency),
        idempotency_key: idempotencyKey
      },
      order: {
        id: orderId,
        subscription_id: subscriptionId,
        external_reference: finalExternalReference,
        amount: amount,
        status: 'pending'
      },
      deduplication_info: {
        external_reference_generated: true,
        duplicate_check_passed: true,
        idempotency_enabled: true
      },
      note: 'La suscripción se activará automáticamente en 3 segundos. Incluye protección contra duplicados e idempotencia.'
    })
    
  } catch (error) {
    console.error('Error simulating subscription:', error)
    return NextResponse.json(
      { error: 'Error al simular suscripción' },
      { status: 500 }
    )
  }
}