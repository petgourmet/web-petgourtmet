/**
 * POST /api/admin/resend-subscription-email
 *
 * Reenvía el correo de bienvenida (created) o cancelación (cancelled)
 * a un cliente a partir de su suscripción existente.
 * Solo lectura de BD — no modifica ningún registro.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendSubscriptionEmail } from '@/lib/email-service'
import { resolveSubscriptionShipping, resolveCustomerEmail, resolveCustomerName } from '@/lib/admin-email-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriptionId, emailType } = body as {
      subscriptionId: string | number
      emailType: 'created' | 'cancelled' | 'reminder'
    }

    if (!subscriptionId || !emailType) {
      return NextResponse.json(
        { success: false, error: 'subscriptionId y emailType son requeridos' },
        { status: 400 }
      )
    }

    if (!['created', 'cancelled', 'reminder'].includes(emailType)) {
      return NextResponse.json(
        { success: false, error: 'emailType debe ser "created", "cancelled" o "reminder"' },
        { status: 400 }
      )
    }

    // Si el ID viene con prefijo 'billing_' (suscripciones del historial de facturación),
    // extraer el UUID real para buscar en unified_subscriptions
    const rawId = String(subscriptionId)
    const realId = rawId.startsWith('billing_') ? rawId.replace(/^billing_/, '') : rawId

    // Leer la suscripción (solo lectura — sin escrituras)
    // Usamos select('*') para evitar error si alguna columna no existe en la BD
    const supabase = createServiceClient()
    const { data: sub, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', realId)
      .single()

    if (error || !sub) {
      console.error('[RESEND-SUB-EMAIL] Suscripción no encontrada:', error)
      return NextResponse.json(
        { success: false, error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    const userEmail = resolveCustomerEmail(sub)
    const userName = resolveCustomerName(sub)

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'No se encontró email del cliente para esta suscripción' },
        { status: 422 }
      )
    }

    // Construir texto del plan
    const frequency = sub.frequency ?? 1
    const frequencyType = sub.frequency_type ?? 'months'
    const freqLabel =
      frequencyType === 'weeks'
        ? `${frequency} semana(s)`
        : `${frequency} mes(es)`
    const planDescription = sub.product_name
      ? `${sub.product_name} - Cada ${freqLabel}`
      : `Suscripción - Cada ${freqLabel}`

    const resolvedShippingCost = resolveSubscriptionShipping(sub)
    const amount = Number(sub.transaction_amount || sub.discounted_price || sub.base_price || 0)

    // Fecha próximo cobro legible
    const nextPaymentDate = sub.next_billing_date
      ? new Date(sub.next_billing_date).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined

    const emailData = {
      user_email: userEmail,
      user_name: userName || 'Cliente',
      subscription_type: sub.subscription_type || 'monthly',
      amount,
      next_payment_date: nextPaymentDate,
      plan_description: planDescription,
      external_reference:
        sub.stripe_subscription_id || sub.external_reference || String(sub.id),
      current_period_start: sub.current_period_start || undefined,
      current_period_end: sub.current_period_end || undefined,
      status: sub.status,
      subscription_id: sub.id,
      shipping_cost: resolvedShippingCost > 0 ? resolvedShippingCost : undefined,
      product_image: sub.product_image || undefined,
      days_until_payment: undefined as number | undefined,
    }

    console.log(`[RESEND-SUB-EMAIL] Reenviando correo tipo "${emailType}" a ${userEmail} (sub #${subscriptionId})`)

    const internalEmailType = emailType === 'reminder' ? 'payment_reminder' : emailType
    if (emailType === 'reminder') {
      emailData.days_until_payment = sub.next_billing_date
        ? Math.max(0, Math.ceil((new Date(sub.next_billing_date).getTime() - Date.now()) / 86_400_000))
        : undefined
    }

    await sendSubscriptionEmail(internalEmailType as any, emailData)

    console.log(`[RESEND-SUB-EMAIL] ✅ Correo "${emailType}" enviado a ${userEmail}`)

    const typeLabel: Record<string, string> = {
      created: 'suscripción activa',
      cancelled: 'cancelación',
      reminder: 'recordatorio de mensualidad',
    }

    return NextResponse.json({
      success: true,
      message: `Correo de ${typeLabel[emailType] ?? emailType} enviado a ${userEmail}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[RESEND-SUB-EMAIL] ❌ Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
