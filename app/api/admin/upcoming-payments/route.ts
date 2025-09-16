// app/api/admin/upcoming-payments/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const now = new Date()
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    console.log('🔍 Obteniendo próximos pagos de suscripciones...')

    // 1. Obtener suscripciones activas con próximos pagos
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        products (
          name,
          description,
          images
        )
      `)
      .eq('status', 'authorized')
      .not('next_payment_date', 'is', null)
      .lte('next_payment_date', oneMonthFromNow.toISOString())
      .order('next_payment_date', { ascending: true })

    if (subscriptionsError) {
      console.error('❌ Error obteniendo suscripciones:', subscriptionsError)
      return NextResponse.json(
        { error: 'Error obteniendo suscripciones' },
        { status: 500 }
      )
    }

    // 2. Obtener información adicional de usuarios para emails
    const userIds = subscriptions?.map(sub => sub.user_id) || []
    const userEmails: { [key: string]: string } = {}

    if (userIds.length > 0) {
      try {
        // Obtener emails de usuarios
        for (const userId of userIds) {
          const { data: userData } = await supabase.auth.admin.getUserById(userId)
          if (userData.user?.email) {
            userEmails[userId] = userData.user.email
          }
        }
      } catch (error) {
        console.error('⚠️ Error obteniendo emails de usuarios:', error)
      }
    }

    // 3. Procesar datos y agregar información calculada
    const processedPayments = (subscriptions || []).map(subscription => {
      const nextPaymentDate = new Date(subscription.next_payment_date)
      const diffTime = nextPaymentDate.getTime() - now.getTime()
      const daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        id: subscription.id,
        user_id: subscription.user_id,
        product_name: subscription.products?.name || subscription.product_name || 'Producto no especificado',
        amount: subscription.amount || 0,
        frequency: subscription.frequency || 1,
        frequency_type: subscription.frequency_type || 'months',
        next_payment_date: subscription.next_payment_date,
        status: subscription.status,
        charges_made: subscription.charges_made || 0,
        customer_email: userEmails[subscription.user_id] || 'No disponible',
        order_id: subscription.order_id,
        days_until_payment: daysUntilPayment,
        mercadopago_subscription_id: subscription.mercadopago_subscription_id
      }
    })

    // 4. Calcular estadísticas
    const stats = {
      total_active_subscriptions: processedPayments.length,
      payments_due_today: processedPayments.filter(p => p.days_until_payment <= 0 && p.days_until_payment >= 0).length,
      payments_due_this_week: processedPayments.filter(p => p.days_until_payment <= 7 && p.days_until_payment >= 0).length,
      total_monthly_revenue: processedPayments.reduce((sum, payment) => {
        // Calcular ingresos mensuales estimados basado en frecuencia
        let monthlyAmount = payment.amount
        
        if (payment.frequency_type === 'weeks') {
          monthlyAmount = payment.amount * (4 / payment.frequency) // Aproximadamente 4 semanas por mes
        } else if (payment.frequency_type === 'months') {
          monthlyAmount = payment.amount / payment.frequency
        } else if (payment.frequency_type === 'days') {
          monthlyAmount = payment.amount * (30 / payment.frequency)
        }
        
        return sum + monthlyAmount
      }, 0),
      overdue_payments: processedPayments.filter(p => p.days_until_payment < 0).length
    }

    console.log('✅ Próximos pagos procesados:', {
      total: processedPayments.length,
      stats
    })

    return NextResponse.json({
      success: true,
      payments: processedPayments,
      stats,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('❌ Error en upcoming-payments:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Procesar pagos manualmente o enviar recordatorios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, subscriptionIds } = body

    if (!action || !subscriptionIds || !Array.isArray(subscriptionIds)) {
      return NextResponse.json(
        { error: 'Acción y IDs de suscripción requeridos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const results = []

    switch (action) {
      case 'send_reminders':
        // Enviar recordatorios manuales
        for (const subscriptionId of subscriptionIds) {
          try {
            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('id', subscriptionId)
              .single()

            if (subscription) {
              // Aquí iría la lógica para enviar recordatorio
              // Por ahora solo simulamos
              results.push({
                subscriptionId,
                success: true,
                message: 'Recordatorio programado'
              })
            }
          } catch (error) {
            results.push({
              subscriptionId,
              success: false,
              error: String(error)
            })
          }
        }
        break

      case 'process_payments':
        // Procesar pagos manualmente
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cron/subscription-payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ manual: true, subscriptionIds })
        })

        const cronResult = await response.json()
        
        return NextResponse.json({
          success: response.ok,
          results: cronResult.results || [],
          message: 'Procesamiento de pagos completado'
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      results,
      action,
      processed: results.length
    })

  } catch (error) {
    console.error('❌ Error procesando acción:', error)
    return NextResponse.json(
      { error: 'Error procesando acción' },
      { status: 500 }
    )
  }
}
