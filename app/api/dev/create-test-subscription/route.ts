import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Obtener el usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    // Crear una suscripción de prueba
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const testSubscription = {
      user_id: user.id,
      customer_email: user.email,
      customer_name: user.user_metadata?.full_name || 'Usuario de Prueba',
      product_id: 1,
      product_name: 'Plan Premium - Test',
      product_image: 'https://res.cloudinary.com/petgourmet/image/upload/v1/products/premium-food.jpg',
      subscription_type: 'monthly',
      status: 'active',
      base_price: 599.00,
      discounted_price: 539.10,
      discount_percentage: 10,
      transaction_amount: 539.10,
      size: 'Grande',
      frequency: 1,
      frequency_type: 'months',
      next_billing_date: nextMonth.toISOString(),
      last_billing_date: now.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: nextMonth.toISOString(),
      stripe_subscription_id: `test_sub_${Date.now()}`,
      stripe_customer_id: `test_cus_${Date.now()}`,
      stripe_price_id: 'test_price_monthly',
      currency: 'MXN',
      shipping_address: {
        street: 'Calle Principal 123',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '01000',
        country: 'México'
      },
      customer_data: {
        email: user.email,
        firstName: user.user_metadata?.full_name?.split(' ')[0] || 'Usuario',
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'de Prueba',
        phone: user.user_metadata?.phone || '+52 55 1234 5678',
        address: {
          street: 'Calle Principal 123',
          city: 'Ciudad de México',
          state: 'CDMX',
          postalCode: '01000',
          country: 'México'
        }
      },
      cart_items: [{
        product_id: 1,
        product_name: 'Plan Premium - Test',
        name: 'Plan Premium - Test',
        image: 'https://res.cloudinary.com/petgourmet/image/upload/v1/products/premium-food.jpg',
        price: 539.10,
        quantity: 1,
        size: 'Grande',
        isSubscription: true,
        subscriptionType: 'monthly'
      }],
      metadata: {
        test: true,
        created_by: 'test_endpoint',
        created_at: now.toISOString()
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }

    // Insertar en la base de datos
    const { data: subscription, error: insertError } = await supabase
      .from('unified_subscriptions')
      .insert(testSubscription as any)
      .select()
      .single()

    if (insertError) {
      console.error('Error al crear suscripción de prueba:', insertError)
      return NextResponse.json(
        { 
          error: 'Error al crear suscripción de prueba',
          details: insertError.message 
        },
        { status: 500 }
      )
    }

    console.log('✅ Suscripción de prueba creada:', subscription)

    return NextResponse.json({
      success: true,
      message: 'Suscripción de prueba creada exitosamente',
      subscription: subscription
    })

  } catch (error: any) {
    console.error('Error en create-test-subscription:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
