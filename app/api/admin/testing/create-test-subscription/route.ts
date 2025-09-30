import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServiceClient()

    console.log('📝 Creando suscripción de prueba con datos:', body)

    // Insertar la suscripción en la base de datos
    const { data: subscription, error } = await supabase
      .from('unified_subscriptions')
      .insert({
        user_id: body.user_id,
        subscription_type: body.subscription_type,
        status: body.status,
        external_reference: body.external_reference,
        customer_data: body.customer_data,
        cart_items: body.cart_items,
        product_id: body.product_id,
        quantity: body.quantity,
        size: body.size,
        discount_percentage: body.discount_percentage,
        base_price: body.base_price,
        discounted_price: body.discounted_price,
        product_name: body.product_name,
        product_image: body.product_image,
        reason: body.reason,
        charges_made: body.charges_made,
        frequency: body.frequency,
        frequency_type: body.frequency_type,
        currency_id: body.currency_id,
        transaction_amount: body.transaction_amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creando suscripción de prueba:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Suscripción de prueba creada exitosamente:', subscription)

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Suscripción de prueba creada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error en create-test-subscription:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}