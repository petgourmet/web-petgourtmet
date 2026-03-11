/**
 * API Route: Sincronizar suscripción desde Stripe
 * 
 * POST /api/subscriptions/sync
 * 
 * Llamado desde la página de éxito para asegurar que la suscripción
 * existe en la BD. Si el webhook ya la creó, retorna la existente.
 * Si no, la crea desde los datos de Stripe.
 * También envía el email de bienvenida/suscripción activa.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere sessionId' },
        { status: 400 }
      )
    }

    // Validar formato de session ID de Stripe
    if (!sessionId.startsWith('cs_')) {
      return NextResponse.json(
        { error: 'ID de sesión inválido' },
        { status: 400 }
      )
    }

    // Verificar autenticación del usuario
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product', 'subscription'],
    })

    // Verificar que el modo sea suscripción
    if (session.mode !== 'subscription') {
      return NextResponse.json(
        { error: 'Esta sesión no es de suscripción' },
        { status: 400 }
      )
    }

    // Verificar que el pago fue completado
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'El pago no ha sido completado' },
        { status: 400 }
      )
    }

    const stripeSubscriptionId = session.subscription as string
    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No se encontró suscripción en la sesión' },
        { status: 400 }
      )
    }

    // Verificar que la sesión pertenece al usuario autenticado (por metadata o email)
    const sessionMetadata = session.metadata || {}
    const sessionEmail = session.customer_email || session.customer_details?.email
    const metadataUserId = sessionMetadata.user_id

    if (metadataUserId && metadataUserId !== user.id && sessionEmail !== user.email) {
      return NextResponse.json(
        { error: 'Esta sesión no pertenece al usuario autenticado' },
        { status: 403 }
      )
    }

    // Verificar si ya existe en la BD
    const { data: existingSubscription } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single()

    if (existingSubscription) {
      // Si existe pero no tiene user_id, actualizarlo
      if (!existingSubscription.user_id && user.id) {
        await supabaseAdmin
          .from('unified_subscriptions')
          .update({ user_id: user.id, updated_at: new Date().toISOString() })
          .eq('id', existingSubscription.id)
        
        existingSubscription.user_id = user.id
      }

      return NextResponse.json({
        subscription: existingSubscription,
        isNew: false,
        message: 'Suscripción ya sincronizada'
      })
    }

    // No existe, crearla desde datos de Stripe
    const subscriptionData = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['latest_invoice', 'default_payment_method']
    }) as any

    const lineItems = session.line_items?.data || []
    const metadata = session.metadata || {}
    const customerName = metadata.customer_name || session.customer_details?.name || ''
    const shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null

    // Obtener timestamps
    let currentPeriodStart = subscriptionData.current_period_start || subscriptionData.billing_cycle_anchor
    let currentPeriodEnd = subscriptionData.current_period_end

    if (!currentPeriodStart || !currentPeriodEnd) {
      const now = Math.floor(Date.now() / 1000)
      currentPeriodStart = currentPeriodStart || now
      const subscriptionType = metadata.subscription_type || 'monthly'
      let daysToAdd = 30
      switch (subscriptionType) {
        case 'weekly': daysToAdd = 7; break
        case 'biweekly': daysToAdd = 14; break
        case 'monthly': daysToAdd = 30; break
        case 'quarterly': daysToAdd = 90; break
        case 'annual': daysToAdd = 365; break
      }
      currentPeriodEnd = currentPeriodEnd || (currentPeriodStart + (daysToAdd * 24 * 60 * 60))
    }

    // Datos del producto
    const subscriptionLineItem = lineItems[0]
    const product = subscriptionLineItem?.price?.product as any
    const productMetadata = product?.metadata || {}
    const productId = productMetadata.product_id

    // Total incluyendo envío
    const totalAmount = lineItems.reduce((sum: number, item: any) => {
      return sum + ((item.price?.unit_amount || 0) / 100) * (item.quantity || 1)
    }, 0)

    const unitAmount = subscriptionLineItem?.price?.unit_amount || 0
    const priceInMXN = unitAmount / 100

    // Buscar producto en BD para precio base y descuento
    let productFromDB = null
    let basePrice = priceInMXN
    let discountPercentage = 0

    if (productId) {
      const { data: productData } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', parseInt(productId))
        .single()

      if (productData) {
        productFromDB = productData
        basePrice = productData.price
        const subscriptionType = metadata.subscription_type || 'monthly'
        switch (subscriptionType) {
          case 'weekly': discountPercentage = productData.weekly_discount || 0; break
          case 'biweekly': discountPercentage = productData.biweekly_discount || 0; break
          case 'monthly': discountPercentage = productData.monthly_discount || 0; break
          case 'quarterly': discountPercentage = productData.quarterly_discount || 0; break
          case 'annual': discountPercentage = productData.annual_discount || 0; break
          default: discountPercentage = productData.monthly_discount || 0
        }
      }
    }

    // Frequency
    const subscriptionType = metadata.subscription_type || 'monthly'
    let frequency = 1
    let frequencyType = 'months'
    switch (subscriptionType) {
      case 'weekly': frequency = 1; frequencyType = 'weeks'; break
      case 'biweekly': frequency = 2; frequencyType = 'weeks'; break
      case 'monthly': frequency = 1; frequencyType = 'months'; break
      case 'quarterly': frequency = 3; frequencyType = 'months'; break
      case 'annual': frequency = 12; frequencyType = 'months'; break
    }

    // Insertar suscripción
    const { data: newSub, error: insertError } = await supabaseAdmin
      .from('unified_subscriptions')
      .insert({
        user_id: user.id,
        customer_email: sessionEmail || user.email,
        customer_name: customerName,
        customer_phone: session.customer_details?.phone || null,
        product_id: productId ? parseInt(productId) : null,
        product_name: subscriptionLineItem?.description || productFromDB?.name || 'Suscripción Pet Gourmet',
        product_image: product?.images?.[0] || productFromDB?.image || null,
        subscription_type: subscriptionType,
        status: 'active',
        base_price: basePrice,
        discounted_price: priceInMXN,
        discount_percentage: discountPercentage,
        transaction_amount: totalAmount,
        size: productMetadata.size || null,
        frequency,
        frequency_type: frequencyType,
        next_billing_date: new Date(currentPeriodEnd * 1000).toISOString(),
        last_billing_date: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: session.customer as string,
        stripe_price_id: subscriptionData.items?.data?.[0]?.price?.id || null,
        shipping_address: shippingAddress,
        customer_data: {
          email: sessionEmail || user.email,
          firstName: customerName?.split(' ')[0] || '',
          lastName: customerName?.split(' ').slice(1).join(' ') || '',
          phone: session.customer_details?.phone || null,
          address: shippingAddress
        },
        cart_items: [{
          product_id: productId ? parseInt(productId) : null,
          product_name: subscriptionLineItem?.description || productFromDB?.name,
          name: subscriptionLineItem?.description || productFromDB?.name,
          image: product?.images?.[0] || productFromDB?.image,
          price: priceInMXN,
          quantity: subscriptionLineItem?.quantity || 1,
          size: productMetadata.size || null,
          isSubscription: true,
          subscriptionType
        }],
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('[SYNC] Error insertando suscripción:', insertError)
      return NextResponse.json(
        { error: 'Error al crear la suscripción', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('[SYNC] ✅ Suscripción creada:', newSub.id)

    // Enviar email de confirmación
    try {
      const { sendSubscriptionEmail } = await import('@/lib/email-service')

      const emailData = {
        user_email: sessionEmail || user.email || '',
        user_name: customerName,
        subscription_type: subscriptionType,
        amount: totalAmount,
        next_payment_date: new Date(currentPeriodEnd * 1000).toLocaleDateString('es-MX', {
          year: 'numeric', month: 'long', day: 'numeric'
        }),
        plan_description: `${subscriptionLineItem?.description || productFromDB?.name || 'Suscripción Pet Gourmet'} - Cada ${frequency} ${frequencyType === 'weeks' ? 'semana(s)' : 'mes(es)'}`,
        external_reference: stripeSubscriptionId,
        subscription_id: newSub.id
      }

      // Email al cliente
      await sendSubscriptionEmail('created', emailData)
      console.log('[SYNC] ✅ Email de confirmación enviado a:', emailData.user_email)

      // Email al admin
      await sendSubscriptionEmail('created', {
        ...emailData,
        user_email: 'contacto@petgourmet.mx',
        user_name: 'Admin Pet Gourmet',
        plan_description: `${customerName} - ${subscriptionLineItem?.description || productFromDB?.name || 'Suscripción'} - $${totalAmount.toFixed(2)} MXN`,
      })
      console.log('[SYNC] ✅ Email enviado al admin')
    } catch (emailError) {
      console.error('[SYNC] Error enviando email:', emailError)
      // No fallar por error de email
    }

    return NextResponse.json({
      subscription: newSub,
      isNew: true,
      message: 'Suscripción creada y sincronizada exitosamente'
    })

  } catch (error: any) {
    console.error('[SYNC] Error:', error)
    return NextResponse.json(
      { error: 'Error al sincronizar suscripción', details: error.message },
      { status: 500 }
    )
  }
}
