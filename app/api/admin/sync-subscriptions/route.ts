import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    // Verificar que el usuario sea admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener stripe_subscription_ids existentes en DB
    const { data: existingSubs } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('stripe_subscription_id')
      .not('stripe_subscription_id', 'is', null)

    const existingIds = new Set(
      (existingSubs || [])
        .map(s => s.stripe_subscription_id as string)
        .filter(Boolean)
    )

    const stats = { total: 0, recovered: 0, alreadyExists: 0, skipped: 0, failed: 0 }
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        limit: 100,
        expand: ['data.customer', 'data.items.data.price'],
      }
      if (startingAfter) params.starting_after = startingAfter

      const subscriptionsPage = await stripe.subscriptions.list(params)
      stats.total += subscriptionsPage.data.length

      for (const sub of subscriptionsPage.data) {
        if (existingIds.has(sub.id)) {
          stats.alreadyExists++
          continue
        }

        try {
          const customer = sub.customer as any
          const customerEmail = customer?.email || null
          const customerName = customer?.name || null
          const customerPhone = customer?.phone || null

          const item = sub.items.data[0]
          const price = item?.price as any
          const priceProductId = typeof price?.product === 'string' ? price.product : price?.product?.id
          const productMetadata = price?.product?.metadata || {}

          // Obtener el producto expandido por separado (evita el límite de 4 niveles)
          let product: any = null
          if (priceProductId) {
            try {
              product = await stripe.products.retrieve(priceProductId)
            } catch {}
          }

          const metadata = sub.metadata || {}
          const subscriptionType = metadata.subscription_type || 'monthly'

          const subAny = sub as any
          const currentPeriodStart = (item?.current_period_start || subAny.current_period_start || subAny.billing_cycle_anchor) as number | undefined
          const currentPeriodEnd = (item?.current_period_end || subAny.current_period_end) as number | undefined

          // Mapear status de Stripe al de la BD
          const statusMap: Record<string, string> = {
            active: 'active',
            past_due: 'past_due',
            canceled: 'canceled',
            unpaid: 'past_due',
            incomplete: 'active',
            incomplete_expired: 'canceled',
            trialing: 'active',
          }
          const dbStatus = statusMap[sub.status] || 'active'

          // Calcular frecuencia
          let frequency = 1
          let frequencyType = 'months'
          switch (subscriptionType) {
            case 'weekly':    frequency = 1;  frequencyType = 'weeks';  break
            case 'biweekly':  frequency = 2;  frequencyType = 'weeks';  break
            case 'quarterly': frequency = 3;  frequencyType = 'months'; break
            case 'annual':    frequency = 12; frequencyType = 'months'; break
          }

          const priceInMXN = (price?.unit_amount || 0) / 100

          // Buscar producto en BD para precio base y descuento
          let basePrice = priceInMXN
          let discountPercentage = 0
          let productFromDB: any = null
          const dbProductId = product?.metadata?.product_id || productMetadata.product_id || metadata.product_id

          if (dbProductId) {
            const { data: productData } = await supabaseAdmin
              .from('products')
              .select('*')
              .eq('id', parseInt(dbProductId))
              .single()

            if (productData) {
              productFromDB = productData
              basePrice = productData.price
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

          // Calcular total incluyendo envío (envío gratis si producto >= $1000)
          const shippingCost = priceInMXN >= 1000 ? 0 : 100
          const totalAmount = (priceInMXN * (item?.quantity || 1)) + shippingCost

          let shippingAddress = null
          try {
            if (metadata.shipping_address) {
              shippingAddress = JSON.parse(metadata.shipping_address as string)
            }
          } catch {}

          // Fallback to customer.shipping or customer.address
          if (!shippingAddress && customer) {
            if (customer.shipping) {
              const sd = customer.shipping
              shippingAddress = {
                address: sd.address?.line1 || '',
                address2: sd.address?.line2 || '',
                city: sd.address?.city || '',
                state: sd.address?.state || '',
                postalCode: sd.address?.postal_code || '',
                country: sd.address?.country || 'MX',
                name: sd.name || customerName || '',
              }
            } else if (customer.address) {
              const ba = customer.address
              shippingAddress = {
                address: ba.line1 || '',
                address2: ba.line2 || '',
                city: ba.city || '',
                state: ba.state || '',
                postalCode: ba.postal_code || '',
                country: ba.country || 'MX',
                name: customerName || '',
              }
            }
          }

          // Fallback: list checkout sessions for this subscription to retrieve address
          if (!shippingAddress && sub.id) {
            try {
              const sessions = await stripe.checkout.sessions.list({
                subscription: sub.id,
                limit: 1
              })
              if (sessions.data.length > 0) {
                const sessionAny = sessions.data[0] as any
                if (sessionAny.shipping_details) {
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
                  console.log(`📦 [ADMIN-SYNC] Dirección obtenida de checkout session shipping_details para ${sub.id}`)
                } else if (sessionAny.customer_details?.address) {
                  const ba = sessionAny.customer_details.address
                  shippingAddress = {
                    address: ba.line1 || '',
                    address2: ba.line2 || '',
                    city: ba.city || '',
                    state: ba.state || '',
                    postalCode: ba.postal_code || '',
                    country: ba.country || 'MX',
                    name: sessionAny.customer_details.name || customerName || '',
                  }
                  console.log(`📦 [ADMIN-SYNC] Dirección obtenida de checkout session customer_details (billing) para ${sub.id}`)
                }
              }
            } catch (sessError: any) {
              console.error(`⚠️ [ADMIN-SYNC] Error al obtener checkout sessions para ${sub.id}:`, sessError.message)
            }
          }

          const stripeCustomerId =
            typeof sub.customer === 'string'
              ? sub.customer
              : (sub.customer as any)?.id

          const { error: insertError } = await supabaseAdmin
            .from('unified_subscriptions')
            .insert({
              user_id: metadata.user_id || null,
              customer_email: customerEmail,
              customer_name: customerName || metadata.customer_name || null,
              customer_phone: customerPhone,
              stripe_subscription_id: sub.id,
              stripe_customer_id: stripeCustomerId,
              stripe_price_id: price?.id || null,
              status: dbStatus,
              subscription_type: subscriptionType,
              product_id: dbProductId ? parseInt(dbProductId) : null,
              product_name: product?.name || (item as any)?.description || productFromDB?.name || 'Suscripción Pet Gourmet',
              product_image: product?.images?.[0] || productFromDB?.image || null,
              frequency,
              frequency_type: frequencyType,
              base_price: basePrice,
              discounted_price: priceInMXN || basePrice,
              discount_percentage: discountPercentage,
              transaction_amount: totalAmount,
              next_billing_date: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : null,
              last_billing_date: currentPeriodStart
                ? new Date(currentPeriodStart * 1000).toISOString()
                : null,
              current_period_start: currentPeriodStart
                ? new Date(currentPeriodStart * 1000).toISOString()
                : null,
              current_period_end: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end,
              shipping_address: shippingAddress,
              customer_data: {
                email: customerEmail,
                firstName: customerName?.split(' ')[0] || '',
                lastName: customerName?.split(' ').slice(1).join(' ') || '',
                phone: customerPhone,
                address: shippingAddress
              },
              metadata,
              created_at: new Date(sub.created * 1000).toISOString(),
              updated_at: new Date().toISOString(),
              processed_at: new Date().toISOString(),
            })

          if (insertError) {
            // Conflicto de unicidad → ya existe, ignorar
            if (insertError.code === '23505') {
              stats.alreadyExists++
              existingIds.add(sub.id)
              continue
            }

            // Trigger de deduplicación: ya existe suscripción activa para este user+product
            if (insertError.code === 'P0001') {
              const uId = metadata.user_id || null
              const pId = dbProductId ? parseInt(dbProductId) : null
              if (uId && pId) {
                console.log(`⚠️ [ADMIN-SYNC] Cancelando suscripciones activas anteriores para el usuario ${uId} y producto ${pId} debido a trigger`)
                await supabaseAdmin
                  .from('unified_subscriptions')
                  .update({ 
                    status: 'canceled', 
                    customer_data: { email: customerEmail || 'test@test.com' },
                    updated_at: new Date().toISOString() 
                  })
                  .eq('user_id', uId)
                  .eq('product_id', pId)
                  .eq('status', 'active')

                // Reintentar inserción
                console.log(`⚠️ [ADMIN-SYNC] Reintentando inserción tras cancelar...`)
                const { error: retryError } = await supabaseAdmin
                  .from('unified_subscriptions')
                  .insert({
                    user_id: uId,
                    customer_email: customerEmail,
                    customer_name: customerName || metadata.customer_name || null,
                    customer_phone: customerPhone,
                    stripe_subscription_id: sub.id,
                    stripe_customer_id: stripeCustomerId,
                    stripe_price_id: price?.id || null,
                    status: dbStatus,
                    subscription_type: subscriptionType,
                    product_id: pId,
                    product_name: product?.name || (item as any)?.description || productFromDB?.name || 'Suscripción Pet Gourmet',
                    product_image: product?.images?.[0] || productFromDB?.image || null,
                    frequency,
                    frequency_type: frequencyType,
                    base_price: basePrice,
                    discounted_price: priceInMXN || basePrice,
                    discount_percentage: discountPercentage,
                    transaction_amount: totalAmount,
                    next_billing_date: currentPeriodEnd
                      ? new Date(currentPeriodEnd * 1000).toISOString()
                      : null,
                    last_billing_date: currentPeriodStart
                      ? new Date(currentPeriodStart * 1000).toISOString()
                      : null,
                    current_period_start: currentPeriodStart
                      ? new Date(currentPeriodStart * 1000).toISOString()
                      : null,
                    current_period_end: currentPeriodEnd
                      ? new Date(currentPeriodEnd * 1000).toISOString()
                      : null,
                    cancel_at_period_end: sub.cancel_at_period_end,
                    shipping_address: shippingAddress,
                    customer_data: {
                      email: customerEmail,
                      firstName: customerName?.split(' ')[0] || '',
                      lastName: customerName?.split(' ').slice(1).join(' ') || '',
                      phone: customerPhone,
                      address: shippingAddress
                    },
                    metadata,
                    created_at: new Date(sub.created * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                    processed_at: new Date().toISOString(),
                  })

                if (!retryError) {
                  console.log(`✅ [ADMIN-SYNC] Suscripción sincronizada en reintento: ${sub.id}`)
                  if (uId && shippingAddress) {
                    await updateUserProfile(
                      uId,
                      shippingAddress,
                      customerName || metadata.customer_name || null,
                      customerPhone
                    )
                  }
                  stats.recovered++
                  existingIds.add(sub.id)
                  continue
                } else {
                  console.error(`❌ [ADMIN-SYNC] Error en reintento de inserción para ${sub.id}:`, retryError.message)
                }
              }
            }
            throw insertError
          }

          // Invocar updateUserProfile para sincronizar perfil de usuario si tiene ID de usuario y dirección
          if (metadata.user_id && shippingAddress) {
            await updateUserProfile(
              metadata.user_id,
              shippingAddress,
              customerName || metadata.customer_name || null,
              customerPhone
            )
          }

          stats.recovered++
          existingIds.add(sub.id)
        } catch (err: any) {
          stats.failed++
          console.error(`[SYNC-SUBS] Error recuperando ${sub.id}:`, err.message)
        }
      }

      hasMore = subscriptionsPage.has_more
      if (hasMore && subscriptionsPage.data.length > 0) {
        startingAfter = subscriptionsPage.data[subscriptionsPage.data.length - 1].id
      }
    }

    return NextResponse.json({
      success: true,
      message:
        stats.recovered > 0
          ? `${stats.recovered} suscripción(es) sincronizada(s) desde Stripe`
          : 'Todas las suscripciones ya están sincronizadas',
      stats,
    })
  } catch (error: any) {
    console.error('[SYNC-SUBS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar suscripciones' },
      { status: 500 }
    )
  }
}
