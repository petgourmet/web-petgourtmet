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
import { extractStripeId } from '@/lib/stripe/utils'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Actualiza el perfil del usuario con los datos de envío recolectados en Stripe
 */
async function updateUserProfile(
  userId: string,
  shippingAddress: any,
  customerName: string | null,
  customerPhone: string | null
) {
  if (!userId || !shippingAddress) return

  try {
    // Obtener perfil existente para verificar/fallbacks
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const formattedAddressStr = [
      shippingAddress.address,
      shippingAddress.address2,
      shippingAddress.city,
      shippingAddress.state,
      shippingAddress.postalCode ? `CP: ${shippingAddress.postalCode}` : '',
      shippingAddress.country
    ].filter(Boolean).join(', ')

    const updateData: Record<string, any> = {
      shipping_address: shippingAddress,
      address: formattedAddressStr,
      updated_at: new Date().toISOString()
    }

    if (!profile?.full_name && customerName) {
      updateData.full_name = customerName
    }
    if (!profile?.phone && customerPhone) {
      updateData.phone = customerPhone
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      console.error('[PROFILE-UPDATE] Error al actualizar perfil:', error.message)
    } else {
      console.log('[PROFILE-UPDATE] ✅ Perfil de usuario actualizado con dirección de Stripe:', userId)
    }
  } catch (err) {
    console.error('[PROFILE-UPDATE] Error en updateUserProfile:', err)
  }
}


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

    // Sanitizar session_id: si viene duplicado por bug de URL (?session_id=X?session_id=X)
    // extraer solo el primer ID válido
    let cleanSessionId = sessionId
    if (sessionId.includes('?')) {
      cleanSessionId = sessionId.split('?')[0]
      console.warn('[SYNC] session_id contenía parámetros duplicados, limpiado:', cleanSessionId)
    }
    // Validar longitud máxima (Stripe session IDs tienen máximo 66 caracteres)
    if (cleanSessionId.length > 66) {
      return NextResponse.json(
        { error: 'ID de sesión inválido (demasiado largo)' },
        { status: 400 }
      )
    }

    // Obtener la sesión de Stripe (usar ID sanitizado)
    const session = await stripe.checkout.sessions.retrieve(cleanSessionId, {
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

    const stripeSubscriptionId = extractStripeId(session.subscription)
    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No se encontró suscripción en la sesión' },
        { status: 400 }
      )
    }

    // Verificar autenticación del usuario (opcional si viene en metadatos de la sesión)
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    const sessionMetadata = session.metadata || {}
    const sessionEmail = session.customer_email || session.customer_details?.email
    const metadataUserId = sessionMetadata.user_id
    const customerName = sessionMetadata.customer_name || session.customer_details?.name || ''
    const resolvedUserId = user?.id || metadataUserId

    if (!resolvedUserId) {
      return NextResponse.json(
        { error: 'No autenticado y no se encontró user_id en metadatos' },
        { status: 401 }
      )
    }

    if (user && metadataUserId && metadataUserId !== user.id && sessionEmail !== user.email) {
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
      const needsRepair = !existingSubscription.user_id ||
        !existingSubscription.product_id ||
        !existingSubscription.discount_percentage ||
        !existingSubscription.base_price ||
        existingSubscription.base_price === existingSubscription.discounted_price ||
        !existingSubscription.shipping_address

      if (needsRepair) {
        const repairData: Record<string, any> = { updated_at: new Date().toISOString() }
        const sessionForRepair = session as any

        if (!existingSubscription.user_id && resolvedUserId) {
          repairData.user_id = resolvedUserId
        }

        // Reparar shipping_address desde Stripe si falta
        if (!existingSubscription.shipping_address) {
          let repairAddress = session.metadata?.shipping_address ? JSON.parse(session.metadata.shipping_address) : null
          if (!repairAddress && sessionForRepair.shipping_details) {
            const sd = sessionForRepair.shipping_details
            repairAddress = {
              address: sd.address?.line1 || '',
              address2: sd.address?.line2 || '',
              city: sd.address?.city || '',
              state: sd.address?.state || '',
              postalCode: sd.address?.postal_code || '',
              country: sd.address?.country || 'MX',
              name: sd.name || '',
            }
          }
          // Fallback a billing address del customer_details
          if (!repairAddress && (session as any).customer_details?.address) {
            const ba = (session as any).customer_details.address
            repairAddress = {
              address: ba.line1 || '',
              address2: ba.line2 || '',
              city: ba.city || '',
              state: ba.state || '',
              postalCode: ba.postal_code || '',
              country: ba.country || 'MX',
              name: (session as any).customer_details.name || '',
            }
            console.log('[SYNC] Dirección obtenida de customer_details (billing)')
          }
          // Fallback a Stripe Customer shipping
          if (!repairAddress && session.customer) {
            try {
              const repairCustomerId = extractStripeId(session.customer)
              if (repairCustomerId) {
                const stripeCustomer = await stripe.customers.retrieve(repairCustomerId) as any
                if (stripeCustomer.shipping) {
                  const sd = stripeCustomer.shipping
                  repairAddress = {
                    address: sd.address?.line1 || '',
                    address2: sd.address?.line2 || '',
                    city: sd.address?.city || '',
                    state: sd.address?.state || '',
                    postalCode: sd.address?.postal_code || '',
                    country: sd.address?.country || 'MX',
                    name: sd.name || stripeCustomer.name || '',
                  }
                  console.log('[SYNC] Dirección de reparación obtenida de Stripe Customer')
                }
              }
            } catch (custError) {
              console.error('⚠️ [SYNC] Error al obtener customer para reparación:', custError)
            }
          }
          if (repairAddress) {
            repairData.shipping_address = repairAddress
            if (!existingSubscription.customer_data?.address) {
              repairData.customer_data = {
                ...(existingSubscription.customer_data || {}),
                address: repairAddress
              }
            }
            console.log('[SYNC] Reparando shipping_address desde Stripe')
          }
        }

        // Reparar product_id y precios desde Stripe si faltan
        if (!existingSubscription.product_id || !existingSubscription.discount_percentage ||
            !existingSubscription.base_price || existingSubscription.base_price === existingSubscription.discounted_price) {
          const sessionLineItems = session.line_items?.data || []
          const firstItem = sessionLineItems[0]
          const itemProduct = firstItem?.price?.product as any
          const itemMetadata = itemProduct?.metadata || {}
          const repairProductId = itemMetadata.product_id || session.metadata?.product_id

          if (repairProductId && !existingSubscription.product_id) {
            repairData.product_id = parseInt(repairProductId)
          }

          const pid = repairProductId || existingSubscription.product_id
          if (pid) {
            const { data: prodData } = await supabaseAdmin
              .from('products')
              .select('*')
              .eq('id', parseInt(pid))
              .single()

            if (prodData) {
              const subType = existingSubscription.subscription_type || session.metadata?.subscription_type || 'monthly'
              let discount = 0
              switch (subType) {
                case 'weekly': discount = prodData.weekly_discount || 0; break
                case 'biweekly': discount = prodData.biweekly_discount || 0; break
                case 'monthly': discount = prodData.monthly_discount || 0; break
                case 'quarterly': discount = prodData.quarterly_discount || 0; break
                case 'annual': discount = prodData.annual_discount || 0; break
                default: discount = prodData.monthly_discount || 0
              }
              if (!existingSubscription.base_price || existingSubscription.base_price === existingSubscription.discounted_price) {
                repairData.base_price = prodData.price
              }
              if (!existingSubscription.discount_percentage || existingSubscription.discount_percentage === 0) {
                repairData.discount_percentage = discount
              }
              if (discount > 0 && repairData.base_price) {
                repairData.discounted_price = Number((repairData.base_price * (1 - discount / 100)).toFixed(2))
              }
            }
          }
        }

        if (Object.keys(repairData).length > 1) { // más que solo updated_at
          console.log('[SYNC] Reparando suscripción existente:', existingSubscription.id, repairData)
          const { data: repairedSub } = await supabaseAdmin
            .from('unified_subscriptions')
            .update(repairData)
            .eq('id', existingSubscription.id)
            .select()
            .single()
          
          const finalSub = repairedSub || { ...existingSubscription, ...repairData }
          if (finalSub?.user_id && finalSub?.shipping_address) {
            await updateUserProfile(
              finalSub.user_id,
              finalSub.shipping_address,
              finalSub.customer_name,
              finalSub.customer_phone
            )
          }

          return NextResponse.json({
            subscription: finalSub,
            isNew: false,
            repaired: true,
            message: 'Suscripción reparada con datos faltantes'
          })
        }
      }

      // Asegurar que el perfil de usuario esté sincronizado incluso si no requiere reparación en la base de datos
      const addressToSync = existingSubscription.shipping_address || 
                           (session as any).shipping_details || 
                           session.customer_details?.address;

      if (resolvedUserId && addressToSync) {
        let parsedAddress = addressToSync;
        if (addressToSync.line1 || addressToSync.city) {
          parsedAddress = {
            address: addressToSync.line1 || addressToSync.address || '',
            address2: addressToSync.line2 || addressToSync.address2 || '',
            city: addressToSync.city || '',
            state: addressToSync.state || '',
            postalCode: addressToSync.postal_code || addressToSync.postalCode || '',
            country: addressToSync.country || 'MX',
            name: addressToSync.name || customerName || '',
          }
        }
        await updateUserProfile(
          resolvedUserId,
          parsedAddress,
          existingSubscription.customer_name || customerName,
          existingSubscription.customer_phone || session.customer_details?.phone || null
        )
      }

      return NextResponse.json({
        subscription: existingSubscription,
        isNew: false,
        message: 'Suscripción ya sincronizada'
      })
    }

    // No existe, crearla desde datos de Stripe (reutilizar objeto expandido si ya viene en la sesión)
    const expandedSub = session.subscription
    const subscriptionData = (
      typeof expandedSub === 'object' &&
      expandedSub !== null &&
      'current_period_start' in expandedSub
    )
      ? expandedSub as Stripe.Subscription
      : await stripe.subscriptions.retrieve(stripeSubscriptionId, {
          expand: ['latest_invoice', 'default_payment_method']
        })

    const lineItems = session.line_items?.data || []
    const metadata = session.metadata || {}
    
    // Dirección de envío: múltiples fuentes con fallback garantizado
    let shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null
    const sessionAny = session as any
    if (!shippingAddress && sessionAny.shipping_details) {
      const sd = sessionAny.shipping_details
      shippingAddress = {
        address: sd.address?.line1 || '',
        address2: sd.address?.line2 || '',
        city: sd.address?.city || '',
        state: sd.address?.state || '',
        postalCode: sd.address?.postal_code || '',
        country: sd.address?.country || 'MX',
        name: sd.name || customerName || '',
      }
      console.log('📦 [SYNC] Dirección obtenida de Stripe shipping_details:', shippingAddress)
    }

    // Fallback: billing address del customer_details
    if (!shippingAddress && session.customer_details?.address) {
      const ba = session.customer_details.address as any
      shippingAddress = {
        address: ba.line1 || '',
        address2: ba.line2 || '',
        city: ba.city || '',
        state: ba.state || '',
        postalCode: ba.postal_code || '',
        country: ba.country || 'MX',
        name: session.customer_details.name || customerName || '',
      }
      console.log('📦 [SYNC] Dirección obtenida de customer_details (billing):', shippingAddress)
    }


    // Fallback: Buscar directamente en el Stripe Customer
    const stripeCustomerId = extractStripeId(session.customer)
    if (!shippingAddress && stripeCustomerId) {
      try {
        const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId) as any
        if (stripeCustomer.shipping) {
          const sd = stripeCustomer.shipping
          shippingAddress = {
            address: sd.address?.line1 || '',
            address2: sd.address?.line2 || '',
            city: sd.address?.city || '',
            state: sd.address?.state || '',
            postalCode: sd.address?.postal_code || '',
            country: sd.address?.country || 'MX',
            name: sd.name || stripeCustomer.name || customerName || '',
          }
          console.log('📦 [SYNC] Dirección obtenida de Stripe Customer:', shippingAddress)
        }
      } catch (custError) {
        console.error('⚠️ [SYNC] Error al obtener customer de Stripe:', custError)
      }
    }

    if (!shippingAddress) {
      // Último recurso: buscar dirección en otra suscripción del usuario o en su perfil
      if (resolvedUserId) {
        const { data: otherSubs } = await supabaseAdmin
          .from('unified_subscriptions')
          .select('shipping_address')
          .eq('user_id', resolvedUserId)
          .not('shipping_address', 'is', null)
          .limit(1)
        
        if (otherSubs?.[0]?.shipping_address) {
          shippingAddress = otherSubs[0].shipping_address
          console.log('📦 [SYNC] Dirección copiada de otra suscripción del usuario')
        } else {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('shipping_address')
            .eq('id', resolvedUserId)
            .single()
          
          if (profile?.shipping_address) {
            const pa = typeof profile.shipping_address === 'string'
              ? JSON.parse(profile.shipping_address)
              : profile.shipping_address
            shippingAddress = {
              address: pa.street_name || pa.address || '',
              address2: pa.street_number || pa.address2 || '',
              city: pa.city || '',
              state: pa.state || '',
              postalCode: pa.zip_code || pa.postalCode || '',
              country: pa.country || 'MX',
            }
            console.log('📦 [SYNC] Dirección obtenida del perfil del usuario')
          }
        }
      }
      
      if (!shippingAddress) {
        console.warn('⚠️ [SYNC] No se pudo obtener dirección de envío para sesión:', cleanSessionId)
      }
    }

    // Obtener timestamps
    const subData = subscriptionData as any
    const item = subData?.items?.data?.[0]
    let currentPeriodStart = item?.current_period_start || subData.current_period_start || subData.billing_cycle_anchor
    let currentPeriodEnd = item?.current_period_end || subData.current_period_end

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
    // product_id desde metadata del producto Stripe O desde metadata de la sesión
    const productId = productMetadata.product_id || metadata.product_id

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
        user_id: resolvedUserId,
        customer_email: sessionEmail || (user?.email || null),
        customer_name: customerName,
        customer_phone: session.customer_details?.phone || null,
        product_id: productId ? parseInt(productId) : null,
        product_name: subscriptionLineItem?.description || productFromDB?.name || 'Suscripción Pet Gourmet',
        product_image: product?.images?.[0] || productFromDB?.image || null,
        subscription_type: subscriptionType,
        status: 'active',
        base_price: basePrice,
        discounted_price: priceInMXN || basePrice,
        discount_percentage: discountPercentage,
        transaction_amount: totalAmount,
        quantity: subscriptionLineItem?.quantity || 1,
        size: productMetadata.size || null,
        frequency,
        frequency_type: frequencyType,
        next_billing_date: new Date(currentPeriodEnd * 1000).toISOString(),
        last_billing_date: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId || extractStripeId(session.customer),
        stripe_price_id: subData.items?.data?.[0]?.price?.id || null,
        shipping_address: shippingAddress,
        customer_data: {
          email: sessionEmail || (user?.email || null),
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
      if (insertError.code === 'P0001') {
        // Trigger de deduplicación: ya existe suscripción activa para este user+product
        console.warn('[SYNC] Suscripción duplicada detectada, buscando existente:', insertError.message)
        const { data: existing } = await supabaseAdmin
          .from('unified_subscriptions')
          .select('*')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .single()
        
        if (existing) {
          // Asegurar que el perfil de usuario se sincronice con el existente
          if (resolvedUserId && existing.shipping_address) {
            await updateUserProfile(
              resolvedUserId,
              existing.shipping_address,
              existing.customer_name,
              existing.customer_phone
            )
          }
          return NextResponse.json({
            subscription: existing,
            isNew: false,
            message: 'Suscripción ya existe (detectada por deduplicación)'
          })
        } else {
          // Si no existe con ese stripe_subscription_id, significa que es una NUEVA suscripción de Stripe
          // pero el usuario tiene otra suscripción activa para el mismo producto.
          // Para evitar la restricción del trigger de base de datos, cancelamos la/s suscripción/es activa/s anterior/es
          if (resolvedUserId && productId) {
            console.log('[SYNC] Cancelando suscripciones activas anteriores para el usuario y producto:', resolvedUserId, productId)
            await supabaseAdmin
              .from('unified_subscriptions')
              .update({ 
                status: 'canceled', 
                customer_data: { email: sessionEmail || 'test@test.com' },
                updated_at: new Date().toISOString() 
              })
              .eq('user_id', resolvedUserId)
              .eq('product_id', parseInt(productId))
              .eq('status', 'active')

            // Reintentar inserción
            console.log('[SYNC] Reintentando inserción tras cancelar suscripciones previas...')
            const { data: retryNewSub, error: retryInsertError } = await supabaseAdmin
              .from('unified_subscriptions')
              .insert({
                user_id: resolvedUserId,
                customer_email: sessionEmail || (user?.email || null),
                customer_name: customerName,
                customer_phone: session.customer_details?.phone || null,
                product_id: productId ? parseInt(productId) : null,
                product_name: subscriptionLineItem?.description || productFromDB?.name || 'Suscripción Pet Gourmet',
                product_image: product?.images?.[0] || productFromDB?.image || null,
                subscription_type: subscriptionType,
                status: 'active',
                base_price: basePrice,
                discounted_price: priceInMXN || basePrice,
                discount_percentage: discountPercentage,
                transaction_amount: totalAmount,
                quantity: subscriptionLineItem?.quantity || 1,
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
                  email: sessionEmail || (user?.email || null),
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

            if (!retryInsertError) {
              console.log('[SYNC] ✅ Suscripción creada en reintento:', retryNewSub.id)
              if (retryNewSub?.user_id && retryNewSub?.shipping_address) {
                await updateUserProfile(
                  retryNewSub.user_id,
                  retryNewSub.shipping_address,
                  retryNewSub.customer_name,
                  retryNewSub.customer_phone
                )
              }
              return NextResponse.json({
                subscription: retryNewSub,
                isNew: true,
                message: 'Suscripción creada y sincronizada exitosamente (tras deduplicación)'
              })
            } else {
              console.error('[SYNC] Error en reintento de inserción:', retryInsertError)
            }
          }
        }
      }
      console.error('[SYNC] Error insertando suscripción:', insertError)
      return NextResponse.json(
        { error: 'Error al crear la suscripción', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('[SYNC] ✅ Suscripción creada:', newSub.id)
    if (newSub?.user_id && newSub?.shipping_address) {
      await updateUserProfile(
        newSub.user_id,
        newSub.shipping_address,
        newSub.customer_name,
        newSub.customer_phone
      )
    }


    // Enviar email de confirmación
    try {
      const { sendSubscriptionEmail } = await import('@/lib/email-service')

      const emailData = {
        user_email: sessionEmail || user?.email || '',
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
