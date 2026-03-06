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

    // Obtener session_ids existentes en DB
    const { data: existingOrders } = await supabaseAdmin
      .from('orders')
      .select('stripe_session_id')
      .not('stripe_session_id', 'is', null)

    const existingIds = new Set(
      (existingOrders || []).map(o => o.stripe_session_id)
    )

    const stats = { total: 0, recovered: 0, alreadyExists: 0, skipped: 0, failed: 0 }
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const params: Stripe.Checkout.SessionListParams = {
        limit: 100,
        status: 'complete',
      }
      if (startingAfter) params.starting_after = startingAfter

      const sessions = await stripe.checkout.sessions.list(params)
      stats.total += sessions.data.length

      for (const session of sessions.data) {
        if (existingIds.has(session.id)) {
          stats.alreadyExists++
          continue
        }

        if (session.mode !== 'payment' || session.payment_status !== 'paid') {
          stats.skipped++
          continue
        }

        try {
          // Obtener line items para esta sesión
          const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ['data.price.product'],
          })
          const lineItems = lineItemsResponse.data

          const metadata = session.metadata || {}
          const customerName = metadata.customer_name || session.customer_details?.name || null
          const customerEmail = session.customer_email || session.customer_details?.email || null

          let shippingData = null
          try {
            if (metadata.shipping_address) {
              shippingData = JSON.parse(metadata.shipping_address)
            }
          } catch {}

          const fullShippingAddress = {
            customer: {
              name: customerName,
              email: customerEmail,
              phone: session.customer_details?.phone || null,
            },
            shipping: shippingData,
            items: lineItems.map((item: any) => ({
              id: item.id,
              product_id: item.price?.product?.metadata?.product_id || null,
              name: item.description,
              quantity: item.quantity,
              price: (item.amount_total || 0) / 100 / (item.quantity || 1),
              product_name: item.description,
              product_image: item.price?.product?.images?.[0] || null,
            })),
          }

          const { data: order, error: insertError } = await supabaseAdmin
            .from('orders')
            .insert({
              user_id: metadata.user_id || null,
              customer_email: customerEmail,
              customer_name: customerName,
              customer_phone: session.customer_details?.phone || null,
              total: (session.amount_total || 0) / 100,
              currency: session.currency?.toUpperCase() || 'MXN',
              payment_status: 'paid',
              status: 'pending',
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_customer_id: session.customer as string,
              shipping_address: fullShippingAddress,
              metadata,
              created_at: new Date(session.created * 1000).toISOString(),
            })
            .select()
            .single()

          if (insertError) {
            if (insertError.code === '23505') { stats.alreadyExists++; continue }
            throw insertError
          }

          // Crear order_items
          const orderItems: any[] = []
          for (const item of lineItems) {
            const prodMeta = (item.price?.product as any)?.metadata || {}
            if (!prodMeta.product_id) continue

            let productImage = (item.price?.product as any)?.images?.[0] || null
            if (!productImage) {
              const { data: p } = await supabaseAdmin
                .from('products').select('image').eq('id', parseInt(prodMeta.product_id)).single()
              productImage = p?.image || ''
            }

            orderItems.push({
              order_id: order.id,
              product_id: parseInt(prodMeta.product_id),
              product_name: item.description,
              product_image: productImage,
              quantity: item.quantity || 1,
              price: (item.amount_total || 0) / 100 / (item.quantity || 1),
              size: prodMeta.size || null,
            })
          }

          if (orderItems.length > 0) {
            await supabaseAdmin.from('order_items').insert(orderItems)
          }

          stats.recovered++
          existingIds.add(session.id)
        } catch (err: any) {
          stats.failed++
          console.error(`[SYNC] Error recuperando ${session.id}:`, err.message)
        }
      }

      hasMore = sessions.has_more
      if (hasMore && sessions.data.length > 0) {
        startingAfter = sessions.data[sessions.data.length - 1].id
      }
    }

    return NextResponse.json({
      success: true,
      message: stats.recovered > 0
        ? `${stats.recovered} orden(es) sincronizada(s) desde Stripe`
        : 'Todas las órdenes ya están sincronizadas',
      stats,
    })
  } catch (error: any) {
    console.error('[SYNC] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar' },
      { status: 500 }
    )
  }
}
