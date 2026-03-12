/**
 * API Route: Backfill shipping addresses from Stripe
 * 
 * POST /api/admin/backfill-shipping-address
 * 
 * Fetches shipping address from Stripe checkout sessions for subscriptions
 * that don't have a shipping_address in the database.
 * 
 * Optional body: { subscriptionId: number } to backfill a single subscription.
 * Without body: backfills all subscriptions missing shipping_address.
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Convierte shipping_details de Stripe al formato de la BD
 */
function stripeShippingToDbFormat(shippingDetails: any, fallbackName?: string) {
  if (!shippingDetails?.address) return null
  const addr = shippingDetails.address
  return {
    address: addr.line1 || '',
    address2: addr.line2 || '',
    city: addr.city || '',
    state: addr.state || '',
    postalCode: addr.postal_code || '',
    country: addr.country || 'MX',
    name: shippingDetails.name || fallbackName || '',
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación admin
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const targetSubscriptionId = body.subscriptionId ? Number(body.subscriptionId) : null

    // Obtener suscripciones sin dirección
    let query = supabaseAdmin
      .from('unified_subscriptions')
      .select('id, stripe_subscription_id, stripe_customer_id, customer_name, customer_data, shipping_address')
      .not('stripe_subscription_id', 'is', null)

    if (targetSubscriptionId) {
      query = query.eq('id', targetSubscriptionId)
    } else {
      query = query.is('shipping_address', null)
    }

    const { data: subscriptions, error: fetchError } = await query

    if (fetchError) {
      console.error('[BACKFILL] Error fetching subscriptions:', fetchError)
      return NextResponse.json({ error: 'Error al obtener suscripciones' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay suscripciones que necesiten actualización',
        updated: 0,
        total: 0,
      })
    }

    const results: { id: number; status: string; address?: any }[] = []

    for (const sub of subscriptions) {
      try {
        // Buscar la checkout session de Stripe usando el subscription ID
        const sessions = await stripe.checkout.sessions.list({
          subscription: sub.stripe_subscription_id,
          limit: 1,
          expand: ['data.shipping_details'],
        })

        const checkoutSession = sessions.data[0]
        if (!checkoutSession) {
          results.push({ id: sub.id, status: 'no_session_found' })
          continue
        }

        // Intentar obtener dirección de metadata primero, luego de shipping_details
        let address = null
        if (checkoutSession.metadata?.shipping_address) {
          try {
            address = JSON.parse(checkoutSession.metadata.shipping_address)
          } catch {
            // JSON inválido en metadata
          }
        }

        if (!address && (checkoutSession as any).shipping_details) {
          address = stripeShippingToDbFormat(
            (checkoutSession as any).shipping_details,
            sub.customer_name
          )
        }

        // Último recurso: obtener del customer de Stripe
        if (!address && sub.stripe_customer_id) {
          try {
            const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as any
            if (customer.shipping) {
              address = stripeShippingToDbFormat(customer.shipping, customer.name)
            }
          } catch {
            // Customer no encontrado
          }
        }

        if (!address) {
          results.push({ id: sub.id, status: 'no_address_in_stripe' })
          continue
        }

        // Actualizar en la BD
        const updateData: Record<string, any> = {
          shipping_address: address,
          updated_at: new Date().toISOString(),
        }

        // También actualizar customer_data.address si no existe
        if (!sub.customer_data?.address) {
          updateData.customer_data = {
            ...(sub.customer_data || {}),
            address: address,
          }
        }

        const { error: updateError } = await supabaseAdmin
          .from('unified_subscriptions')
          .update(updateData)
          .eq('id', sub.id)

        if (updateError) {
          results.push({ id: sub.id, status: 'update_error', address })
          console.error(`[BACKFILL] Error updating sub ${sub.id}:`, updateError)
        } else {
          results.push({ id: sub.id, status: 'updated', address })
          console.log(`[BACKFILL] ✅ Sub ${sub.id} actualizada con dirección:`, address)
        }
      } catch (err: any) {
        results.push({ id: sub.id, status: `error: ${err.message}` })
        console.error(`[BACKFILL] Error processing sub ${sub.id}:`, err.message)
      }
    }

    const updated = results.filter(r => r.status === 'updated').length

    return NextResponse.json({
      success: true,
      message: `${updated} de ${subscriptions.length} suscripciones actualizadas`,
      updated,
      total: subscriptions.length,
      results,
    })
  } catch (error: any) {
    console.error('[BACKFILL] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}
