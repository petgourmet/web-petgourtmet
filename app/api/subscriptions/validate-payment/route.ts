import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import MercadoPagoService from '@/lib/mercadopago-service'

const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"
const MP_ACCESS_TOKEN = IS_TEST_MODE 
  ? process.env.MERCADOPAGO_TEST_ACCESS_TOKEN 
  : process.env.MERCADOPAGO_ACCESS_TOKEN

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    
    const {
      external_reference,
      preapproval_id,
      user_id
    } = body

    console.log('🔍 Validando pago de suscripción:', {
      external_reference,
      preapproval_id,
      user_id,
      test_mode: IS_TEST_MODE
    })

    if (!external_reference && !preapproval_id) {
      return NextResponse.json(
        { success: false, error: 'external_reference o preapproval_id es requerido' },
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id es requerido' },
        { status: 400 }
      )
    }

    let subscription = null
    let subscriptionData = null

    // 1. Buscar suscripción en la base de datos local
    if (external_reference) {
      const { data: localSubscription, error: localError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('external_reference', external_reference)
        .eq('user_id', user_id)
        .maybeSingle()

      if (localError) {
        console.error('Error buscando suscripción local:', localError)
      } else if (localSubscription) {
        subscription = localSubscription
        console.log('✅ Suscripción encontrada en BD local:', subscription.id)
      }
    }

    // 2. Si no se encuentra localmente, buscar por preapproval_id
    if (!subscription && preapproval_id) {
      const { data: preapprovalSubscription, error: preapprovalError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', preapproval_id)
        .eq('user_id', user_id)
        .maybeSingle()

      if (preapprovalError) {
        console.error('Error buscando suscripción por preapproval_id:', preapprovalError)
      } else if (preapprovalSubscription) {
        subscription = preapprovalSubscription
        console.log('✅ Suscripción encontrada por preapproval_id:', subscription.id)
      }
    }

    // 3. Validar estado en MercadoPago si tenemos ID de suscripción
    const subscriptionId = subscription?.mercadopago_subscription_id || preapproval_id
    
    if (subscriptionId) {
      try {
        subscriptionData = await mercadoPagoService.getSubscription(subscriptionId)
        console.log('📊 Estado en MercadoPago:', {
          id: subscriptionData.id,
          status: subscriptionData.status,
          next_payment_date: subscriptionData.next_payment_date
        })
      } catch (mpError) {
        console.error('Error obteniendo datos de MercadoPago:', mpError)
      }
    }

    // 4. Determinar si el pago está confirmado
    const isConfirmed = subscription && 
      (subscription.status === 'active' || subscription.status === 'authorized') &&
      subscriptionData && 
      (subscriptionData.status === 'authorized' || subscriptionData.status === 'active')

    if (isConfirmed) {
      // Actualizar información local con datos de MercadoPago si es necesario
      if (subscriptionData && subscription) {
        const updateData: any = {
          updated_at: new Date().toISOString()
        }

        if (subscriptionData.status !== subscription.status) {
          updateData.status = subscriptionData.status
        }

        if (subscriptionData.next_payment_date && subscriptionData.next_payment_date !== subscription.next_billing_date) {
          updateData.next_billing_date = subscriptionData.next_payment_date
        }

        if (Object.keys(updateData).length > 1) { // Más que solo updated_at
          await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('id', subscription.id)
        }
      }

      // Preparar respuesta con información completa
      const responseSubscription = {
        id: subscription.id,
        product_name: subscription.product_name || subscription.reason || 'Suscripción PetGourmet',
        frequency_text: getFrequencyText(subscription),
        discounted_price: subscription.transaction_amount || subscription.discounted_price,
        next_billing_date: subscriptionData?.next_payment_date || subscription.next_billing_date,
        status: subscriptionData?.status || subscription.status,
        external_reference: subscription.external_reference
      }

      return NextResponse.json({
        success: true,
        confirmed: true,
        subscription: responseSubscription,
        message: 'Suscripción confirmada exitosamente'
      })
    }

    // 5. Si no está confirmada, verificar si existe pero está pendiente
    if (subscription || subscriptionData) {
      return NextResponse.json({
        success: false,
        confirmed: false,
        pending: true,
        message: 'Suscripción encontrada pero el pago aún está pendiente',
        subscription: subscription ? {
          id: subscription.id,
          status: subscriptionData?.status || subscription.status,
          external_reference: subscription.external_reference
        } : null
      })
    }

    // 6. No se encontró la suscripción
    return NextResponse.json({
      success: false,
      confirmed: false,
      message: 'No se encontró la suscripción. Puede que aún esté siendo procesada.'
    })

  } catch (error) {
    console.error('❌ Error validando pago de suscripción:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

function getFrequencyText(subscription: any): string {
  const frequency = subscription.frequency || 1
  const frequencyType = subscription.frequency_type || 'months'
  
  if (frequencyType === 'days') {
    if (frequency === 7) return 'Semanal'
    if (frequency === 14) return 'Quincenal'
    return `Cada ${frequency} días`
  } else if (frequencyType === 'months') {
    if (frequency === 1) return 'Mensual'
    if (frequency === 3) return 'Trimestral'
    if (frequency === 12) return 'Anual'
    return `Cada ${frequency} meses`
  }
  
  return `Cada ${frequency} ${frequencyType}`
}