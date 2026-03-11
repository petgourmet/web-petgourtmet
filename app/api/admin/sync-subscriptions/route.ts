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
          const currentPeriodStart = subAny.current_period_start as number | undefined
          const currentPeriodEnd = subAny.current_period_end as number | undefined

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
          const dbProductId = productMetadata.product_id

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
            throw insertError
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
