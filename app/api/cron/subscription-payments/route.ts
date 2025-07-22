// app/api/cron/subscription-payments/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import MercadoPagoService from '@/lib/mercadopago-service'
import { sendSubscriptionPaymentReminder, sendSubscriptionPaymentSuccess } from '@/lib/contact-email-service'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

export async function POST(request: NextRequest) {
  try {
    // Verificar secret de cron job (para seguridad)
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 días
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 día

    console.log('🔄 Ejecutando cron job de suscripciones:', {
      timestamp: now.toISOString(),
      checking_until: threeDaysFromNow.toISOString()
    })

    // 1. Buscar suscripciones que necesitan recordatorio (3 días antes)
    const { data: subscriptionsForReminder, error: reminderError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        products (
          name,
          description,
          image
        )
      `)
      .eq('status', 'authorized')
      .lte('next_payment_date', threeDaysFromNow.toISOString())
      .gte('next_payment_date', oneDayFromNow.toISOString())

    if (reminderError) {
      console.error('❌ Error obteniendo suscripciones para recordatorio:', reminderError)
    }

    // 2. Buscar suscripciones que necesitan procesamiento de pago (hoy)
    const { data: subscriptionsForPayment, error: paymentError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        products (
          name,
          description,
          image
        )
      `)
      .eq('status', 'authorized')
      .lte('next_payment_date', now.toISOString())

    if (paymentError) {
      console.error('❌ Error obteniendo suscripciones para pago:', paymentError)
    }

    const results = {
      reminders_sent: 0,
      payments_processed: 0,
      errors: [] as any[]
    }

    // 3. Enviar recordatorios de pago
    if (subscriptionsForReminder && subscriptionsForReminder.length > 0) {
      console.log(`📧 Enviando ${subscriptionsForReminder.length} recordatorios de pago`)
      
      for (const subscription of subscriptionsForReminder) {
        try {
          // Verificar si ya se envió recordatorio
          const { data: existingNotification } = await supabase
            .from('scheduled_notifications')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('notification_type', 'payment_reminder')
            .eq('status', 'sent')
            .gte('sent_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()) // última semana

          if (existingNotification && existingNotification.length > 0) {
            console.log(`⏭️ Recordatorio ya enviado para suscripción ${subscription.id}`)
            continue
          }

          // Obtener email del usuario
          const { data: userData } = await supabase.auth.admin.getUserById(subscription.user_id)
          const userEmail = userData.user?.email

          if (!userEmail) {
            console.error(`❌ No se encontró email para usuario ${subscription.user_id}`)
            continue
          }

          // Enviar recordatorio
          await sendSubscriptionPaymentReminder({
            userEmail,
            userName: userEmail.split('@')[0],
            productName: subscription.products?.name || 'Producto Pet Gourmet',
            nextPaymentDate: subscription.next_payment_date || '',
            amount: subscription.amount,
            subscriptionId: subscription.id
          })

          // Registrar notificación enviada
          await supabase
            .from('scheduled_notifications')
            .insert({
              subscription_id: subscription.id,
              notification_type: 'payment_reminder',
              scheduled_for: subscription.next_payment_date,
              sent_at: now.toISOString(),
              status: 'sent',
              recipient_email: userEmail,
              subject: 'Recordatorio de pago - Pet Gourmet',
              message_template: 'payment_reminder'
            })

          results.reminders_sent++
          console.log(`✅ Recordatorio enviado a ${userEmail}`)

        } catch (error) {
          console.error(`❌ Error enviando recordatorio para suscripción ${subscription.id}:`, error)
          results.errors.push({
            subscription_id: subscription.id,
            type: 'reminder',
            error: String(error)
          })
        }
      }
    }

    // 4. Procesar pagos automáticos
    if (subscriptionsForPayment && subscriptionsForPayment.length > 0) {
      console.log(`💳 Procesando ${subscriptionsForPayment.length} pagos automáticos`)
      
      for (const subscription of subscriptionsForPayment) {
        try {
          if (!subscription.mercadopago_subscription_id) {
            console.log(`⏭️ Suscripción ${subscription.id} sin ID de MercadoPago`)
            continue
          }

          // Obtener estado actual de la suscripción en MercadoPago
          const mpSubscription = await mercadoPagoService.getSubscription(
            subscription.mercadopago_subscription_id
          )

          if (mpSubscription.status !== 'authorized') {
            console.log(`⏭️ Suscripción ${subscription.id} no autorizada en MP: ${mpSubscription.status}`)
            continue
          }

          // Verificar si ya se procesó un pago reciente
          const { data: recentPayments } = await supabase
            .from('subscription_payments')
            .select('id')
            .eq('subscription_id', subscription.id)
            .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()) // últimas 24 horas

          if (recentPayments && recentPayments.length > 0) {
            console.log(`⏭️ Pago reciente ya procesado para suscripción ${subscription.id}`)
            continue
          }

          // El pago automático se maneja por MercadoPago
          // Solo actualizamos la próxima fecha de pago y registramos
          const nextPaymentDate = new Date(subscription.next_payment_date || now)
          
          // Calcular siguiente fecha según frecuencia
          if (subscription.frequency_type === 'months') {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + subscription.frequency)
          } else if (subscription.frequency_type === 'weeks') {
            nextPaymentDate.setDate(nextPaymentDate.getDate() + (subscription.frequency * 7))
          } else if (subscription.frequency_type === 'days') {
            nextPaymentDate.setDate(nextPaymentDate.getDate() + subscription.frequency)
          }

          // Actualizar suscripción
          await supabase
            .from('user_subscriptions')
            .update({
              next_payment_date: nextPaymentDate.toISOString(),
              last_payment_date: now.toISOString(),
              charges_made: (subscription.charges_made || 0) + 1,
              updated_at: now.toISOString()
            })
            .eq('id', subscription.id)

          // Registrar pago programado
          await supabase
            .from('subscription_payments')
            .insert({
              subscription_id: subscription.id,
              status: 'pending',
              amount: subscription.amount,
              currency_id: subscription.currency_id || 'MXN',
              due_date: now.toISOString(),
              external_reference: `AUTO-${subscription.id}-${Date.now()}`
            })

          results.payments_processed++
          console.log(`✅ Pago procesado para suscripción ${subscription.id}`)

          // Obtener email del usuario para notificación
          const { data: userData } = await supabase.auth.admin.getUserById(subscription.user_id)
          const userEmail = userData.user?.email

          if (userEmail) {
            // Enviar confirmación de pago procesado
            await sendSubscriptionPaymentSuccess({
              userEmail,
              userName: userEmail.split('@')[0],
              productName: subscription.products?.name || 'Producto Pet Gourmet',
              amount: subscription.amount,
              paymentDate: now.toISOString(),
              nextPaymentDate: nextPaymentDate.toISOString()
            })
          }

        } catch (error) {
          console.error(`❌ Error procesando pago para suscripción ${subscription.id}:`, error)
          results.errors.push({
            subscription_id: subscription.id,
            type: 'payment',
            error: String(error)
          })
        }
      }
    }

    console.log('✅ Cron job completado:', results)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    })

  } catch (error) {
    console.error('❌ Error en cron job de suscripciones:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
