/**
 * API Route: Cron Job para Notificaciones de Pagos Próximos
 * 
 * GET /api/cron/upcoming-payments
 * 
 * Este endpoint debe ser llamado diariamente (por ejemplo, con Vercel Cron Jobs)
 * para enviar notificaciones a clientes que tienen un pago próximo en X días.
 * 
 * Configuración en vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/upcoming-payments",
 *     "schedule": "0 10 * * *"  // Diario a las 10:00 AM UTC
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSubscriptionEmail } from '@/lib/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Configuración de Supabase con Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Días de anticipación para enviar notificación (3 días antes)
const DAYS_BEFORE_PAYMENT = 3

/**
 * Verifica si hay pagos próximos y envía notificaciones
 */
export async function GET(request: NextRequest) {
  // Verificar autenticación del cron (solo Vercel puede llamar este endpoint)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🔔 Iniciando verificación de pagos próximos...')

  try {
    // Calcular la fecha objetivo (en X días)
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + DAYS_BEFORE_PAYMENT)
    targetDate.setHours(0, 0, 0, 0) // Inicio del día

    const targetDateEnd = new Date(targetDate)
    targetDateEnd.setHours(23, 59, 59, 999) // Fin del día

    // Buscar suscripciones activas con próximo pago en X días
    const { data: subscriptions, error } = await supabaseAdmin
      .from('unified_subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('next_billing_date', targetDate.toISOString())
      .lte('next_billing_date', targetDateEnd.toISOString())

    if (error) {
      console.error('❌ Error al buscar suscripciones:', error)
      return NextResponse.json(
        { error: 'Error al buscar suscripciones', details: error.message },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No hay pagos próximos para hoy')
      return NextResponse.json({
        success: true,
        message: 'No hay pagos próximos',
        count: 0,
        targetDate: targetDate.toISOString()
      })
    }

    console.log(`📧 Enviando ${subscriptions.length} notificaciones de pago próximo...`)

    const results = {
      total: subscriptions.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Enviar notificaciones
    for (const subscription of subscriptions) {
      try {
        const nextPaymentDate = new Date(subscription.next_billing_date).toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Notificación al cliente
        await sendSubscriptionEmail('payment_reminder', {
          user_email: subscription.customer_email,
          user_name: subscription.customer_name,
          subscription_type: subscription.subscription_type,
          amount: subscription.amount || 0,
          next_payment_date: nextPaymentDate,
          plan_description: subscription.product_name,
          external_reference: subscription.stripe_subscription_id || subscription.id,
          days_until_payment: DAYS_BEFORE_PAYMENT
        })

        console.log(`✅ Notificación enviada a: ${subscription.customer_email}`)

        // Notificación al admin
        await sendSubscriptionEmail('payment_reminder', {
          user_email: 'contacto@petgourmet.mx',
          user_name: 'Admin Pet Gourmet',
          subscription_type: subscription.subscription_type,
          amount: subscription.amount || 0,
          next_payment_date: nextPaymentDate,
          plan_description: `${subscription.customer_name} - ${subscription.product_name}`,
          external_reference: subscription.stripe_subscription_id || subscription.id,
          days_until_payment: DAYS_BEFORE_PAYMENT,
          admin_details: {
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            customer_email: subscription.customer_email,
            amount: subscription.amount,
            payment_method: subscription.payment_method || 'stripe'
          }
        })

        console.log(`✅ Notificación admin enviada para: ${subscription.customer_name}`)

        results.sent++
      } catch (emailError) {
        console.error(`❌ Error enviando notificación para ${subscription.customer_email}:`, emailError)
        results.failed++
        results.errors.push(`${subscription.customer_email}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`)
      }
    }

    console.log('🎉 Proceso de notificaciones completado:', results)

    return NextResponse.json({
      success: true,
      message: 'Notificaciones procesadas',
      targetDate: targetDate.toISOString(),
      daysBeforePayment: DAYS_BEFORE_PAYMENT,
      results
    })

  } catch (error) {
    console.error('❌ Error crítico en cron job:', error)
    return NextResponse.json(
      { 
        error: 'Error crítico',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
