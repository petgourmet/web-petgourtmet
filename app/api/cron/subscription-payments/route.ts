// app/api/cron/subscription-payments/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import MercadoPagoService from '@/lib/mercadopago-service'
import { sendSubscriptionPaymentReminder, sendSubscriptionPaymentSuccess } from '@/lib/contact-email-service'
import { DynamicDiscountService } from '@/lib/dynamic-discount-service'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const executionId = `cron-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`🚀 Iniciando cron job de suscripciones [${executionId}]`, {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // Verificar secret de cron job (para seguridad)
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.error(`❌ Acceso no autorizado al cron job [${executionId}]`, {
        providedAuth: authHeader ? 'Bearer ***' : 'none',
        expectedAuth: CRON_SECRET ? 'Bearer ***' : 'none'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 días
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 día

    console.log(`🔄 Configuración del cron job [${executionId}]:`, {
      timestamp: now.toISOString(),
      checking_until: threeDaysFromNow.toISOString(),
      reminder_window: `${oneDayFromNow.toISOString()} - ${threeDaysFromNow.toISOString()}`,
      payment_cutoff: now.toISOString()
    })

    // 1. Obtener suscripciones que necesitan recordatorio (1-3 días antes del pago)
    console.log(`🔍 Buscando suscripciones para recordatorio [${executionId}]`, {
      dateRange: `${oneDayFromNow.toISOString()} - ${threeDaysFromNow.toISOString()}`,
      status: 'active'
    })
    
    const reminderQueryStart = Date.now()
    const { data: subscriptionsForReminder, error: reminderError } = await supabase
      .from('unified_subscriptions')
      .select(`
        id, user_id, product_name, discounted_price, next_billing_date,
        products (id, name)
      `)
      .eq('status', 'active')
      .gte('next_billing_date', oneDayFromNow.toISOString())
      .lte('next_billing_date', threeDaysFromNow.toISOString())
    
    const reminderQueryTime = Date.now() - reminderQueryStart

    if (reminderError) {
      console.error(`❌ Error obteniendo suscripciones para recordatorio [${executionId}]:`, {
        error: reminderError,
        queryTime: `${reminderQueryTime}ms`
      })
    } else {
      console.log(`✅ Suscripciones para recordatorio encontradas [${executionId}]:`, {
        count: subscriptionsForReminder?.length || 0,
        queryTime: `${reminderQueryTime}ms`,
        subscriptionIds: subscriptionsForReminder?.map(s => s.id) || []
      })
    }

    // 2. Obtener suscripciones que necesitan pago (fecha de pago llegó)
    console.log(`🔍 Buscando suscripciones para pago [${executionId}]`, {
      cutoffDate: now.toISOString(),
      status: 'active'
    })
    
    const paymentQueryStart = Date.now()
    const { data: subscriptionsForPayment, error: paymentError } = await supabase
      .from('unified_subscriptions')
      .select(`
        id, user_id, product_name, discounted_price, next_billing_date,
        mercadopago_subscription_id, frequency, frequency_type, charges_made,
        currency_id, subscription_type,
        products (id, name)
      `)
      .eq('status', 'active')
      .lte('next_billing_date', now.toISOString())
    
    const paymentQueryTime = Date.now() - paymentQueryStart

    if (paymentError) {
      console.error(`❌ Error obteniendo suscripciones para pago [${executionId}]:`, {
        error: paymentError,
        queryTime: `${paymentQueryTime}ms`
      })
    } else {
      console.log(`✅ Suscripciones para pago encontradas [${executionId}]:`, {
        count: subscriptionsForPayment?.length || 0,
        queryTime: `${paymentQueryTime}ms`,
        subscriptionIds: subscriptionsForPayment?.map(s => s.id) || []
      })
    }

    const results = {
      reminders_sent: 0,
      payments_processed: 0,
      errors: [] as any[],
      reminders: [],
      payments: []
    }

    // 3. Enviar recordatorios de pago
    if (subscriptionsForReminder && subscriptionsForReminder.length > 0) {
      console.log(`📧 Procesando ${subscriptionsForReminder.length} recordatorios de pago [${executionId}]`)
      
      for (const subscription of subscriptionsForReminder) {
        const reminderStart = Date.now()
        try {
          console.log(`🔄 Procesando recordatorio para suscripción ${subscription.id} [${executionId}]`, {
            userId: subscription.user_id,
            productName: subscription.product_name,
            nextBillingDate: subscription.next_billing_date,
            amount: subscription.discounted_price
          })

          // Verificar si ya se envió recordatorio
          const checkStart = Date.now()
          const { data: existingNotification } = await supabase
            .from('scheduled_notifications')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('notification_type', 'payment_reminder')
            .eq('status', 'sent')
            .gte('sent_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()) // última semana
          
          const checkTime = Date.now() - checkStart
          console.log(`🔍 Verificación de recordatorio existente [${executionId}]:`, {
            subscriptionId: subscription.id,
            existingCount: existingNotification?.length || 0,
            queryTime: `${checkTime}ms`
          })

          if (existingNotification && existingNotification.length > 0) {
            console.log(`⏭️ Recordatorio ya enviado para suscripción ${subscription.id} [${executionId}]`)
            continue
          }

          // Obtener email del usuario
          const userStart = Date.now()
          const { data: userData } = await supabase.auth.admin.getUserById(subscription.user_id)
          const userEmail = userData.user?.email
          const userTime = Date.now() - userStart

          console.log(`👤 Datos de usuario obtenidos [${executionId}]:`, {
            userId: subscription.user_id,
            emailFound: !!userEmail,
            queryTime: `${userTime}ms`
          })

          if (!userEmail) {
            console.error(`❌ No se encontró email para usuario ${subscription.user_id} [${executionId}]`)
            results.errors.push({
              subscription_id: subscription.id,
              type: 'reminder',
              error: 'Email de usuario no encontrado'
            })
            continue
          }

          // Enviar recordatorio
          const emailStart = Date.now()
          await sendSubscriptionPaymentReminder({
            userEmail,
            userName: userEmail.split('@')[0],
            productName: subscription.product_name || 'Producto Pet Gourmet',
            nextPaymentDate: subscription.next_billing_date || '',
            amount: subscription.discounted_price,
            subscriptionId: subscription.id
          })
          const emailTime = Date.now() - emailStart

          // Registrar notificación enviada
          const insertStart = Date.now()
          await supabase
            .from('scheduled_notifications')
            .insert({
              subscription_id: subscription.id,
              notification_type: 'payment_reminder',
              scheduled_for: subscription.next_billing_date,
              sent_at: now.toISOString(),
              status: 'sent',
              recipient_email: userEmail,
              subject: 'Recordatorio de pago - Pet Gourmet',
              message_template: 'payment_reminder'
            })
          const insertTime = Date.now() - insertStart

          results.reminders_sent++
          const totalTime = Date.now() - reminderStart
          console.log(`✅ Recordatorio enviado exitosamente [${executionId}]:`, {
            subscriptionId: subscription.id,
            userEmail: userEmail,
            emailTime: `${emailTime}ms`,
            insertTime: `${insertTime}ms`,
            totalTime: `${totalTime}ms`
          })

        } catch (error) {
          const totalTime = Date.now() - reminderStart
          console.error(`❌ Error enviando recordatorio para suscripción ${subscription.id} [${executionId}]:`, {
            error: error,
            stack: error instanceof Error ? error.stack : undefined,
            totalTime: `${totalTime}ms`
          })
          results.errors.push({
            subscription_id: subscription.id,
            type: 'reminder',
            error: String(error)
          })
        }
      }
    } else {
      console.log(`📧 No hay recordatorios para enviar [${executionId}]`)
    }

    // 4. Procesar pagos automáticos
    if (subscriptionsForPayment && subscriptionsForPayment.length > 0) {
      console.log(`💳 Procesando ${subscriptionsForPayment.length} pagos automáticos [${executionId}]`)
      
      for (const subscription of subscriptionsForPayment) {
        const paymentStart = Date.now()
        try {
          console.log(`🔄 Procesando pago para suscripción ${subscription.id} [${executionId}]`, {
            userId: subscription.user_id,
            productName: subscription.product_name,
            currentPrice: subscription.discounted_price,
            nextBillingDate: subscription.next_billing_date,
            mercadopagoId: subscription.mercadopago_subscription_id
          })

          if (!subscription.mercadopago_subscription_id) {
            console.log(`⏭️ Suscripción ${subscription.id} sin ID de MercadoPago [${executionId}]`)
            results.errors.push({
              subscription_id: subscription.id,
              type: 'payment',
              error: 'ID de MercadoPago faltante'
            })
            continue
          }

          // Aplicar descuentos dinámicos antes de procesar el pago
          if (subscription.products?.id && subscription.subscription_type) {
            console.log(`🔄 Actualizando descuentos dinámicos para suscripción ${subscription.id} [${executionId}]`, {
              productId: subscription.products.id,
              subscriptionType: subscription.subscription_type,
              currentPrice: subscription.discounted_price
            })
            
            const discountStart = Date.now()
            const discountResult = await DynamicDiscountService.updateSubscriptionWithDynamicDiscount(
              subscription.id,
              subscription.products.id,
              subscription.subscription_type
            )
            const discountTime = Date.now() - discountStart

            if (discountResult) {
              // Actualizar el discounted_price de la suscripción
              const oldPrice = subscription.discounted_price
              subscription.discounted_price = discountResult.discountedPrice
              console.log(`✅ Descuento aplicado exitosamente [${executionId}]:`, {
                subscriptionId: subscription.id,
                oldPrice: oldPrice,
                newPrice: discountResult.discountedPrice,
                discountPercentage: discountResult.discountPercentage,
                savings: oldPrice - discountResult.discountedPrice,
                processTime: `${discountTime}ms`
              })
            } else {
              console.log(`⚠️ No se pudo aplicar descuento dinámico para suscripción ${subscription.id} [${executionId}]`, {
                processTime: `${discountTime}ms`
              })
            }
          } else {
            console.log(`⏭️ Saltando descuentos dinámicos [${executionId}]:`, {
              subscriptionId: subscription.id,
              reason: 'Producto ID o tipo de suscripción faltante',
              productId: subscription.products?.id || 'missing',
              subscriptionType: subscription.subscription_type || 'missing'
            })
          }

          // Obtener estado actual de la suscripción en MercadoPago
          console.log(`🔍 Verificando estado en MercadoPago [${executionId}]:`, {
            subscriptionId: subscription.id,
            mercadopagoId: subscription.mercadopago_subscription_id
          })
          
          const mpStart = Date.now()
          const mpSubscription = await mercadoPagoService.getSubscription(
            subscription.mercadopago_subscription_id
          )
          const mpTime = Date.now() - mpStart

          console.log(`📊 Estado de suscripción en MercadoPago [${executionId}]:`, {
            subscriptionId: subscription.id,
            status: mpSubscription.status,
            queryTime: `${mpTime}ms`
          })

          if (mpSubscription.status !== 'authorized') {
            console.log(`⏭️ Suscripción ${subscription.id} no autorizada en MP [${executionId}]:`, {
              currentStatus: mpSubscription.status,
              requiredStatus: 'authorized'
            })
            results.errors.push({
              subscription_id: subscription.id,
              type: 'payment',
              error: `Estado no autorizado en MercadoPago: ${mpSubscription.status}`
            })
            continue
          }

          // Verificar si ya se procesó un pago reciente
          console.log(`🔍 Verificando pagos recientes [${executionId}]:`, {
            subscriptionId: subscription.id,
            checkingLast24Hours: true
          })
          
          const recentPaymentsStart = Date.now()
          const { data: recentPayments } = await supabase
            .from('subscription_payments')
            .select('id')
            .eq('subscription_id', subscription.id)
            .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()) // últimas 24 horas
          const recentPaymentsTime = Date.now() - recentPaymentsStart

          console.log(`📊 Resultado verificación pagos recientes [${executionId}]:`, {
            subscriptionId: subscription.id,
            recentPaymentsCount: recentPayments?.length || 0,
            queryTime: `${recentPaymentsTime}ms`
          })

          if (recentPayments && recentPayments.length > 0) {
            console.log(`⏭️ Pago reciente ya procesado para suscripción ${subscription.id} [${executionId}]:`, {
              recentPaymentsFound: recentPayments.length
            })
            continue
          }

          // El pago automático se maneja por MercadoPago
          // Solo actualizamos la próxima fecha de pago y registramos
          console.log(`📅 Calculando próxima fecha de facturación [${executionId}]:`, {
            subscriptionId: subscription.id,
            currentBillingDate: subscription.next_billing_date,
            frequency: subscription.frequency,
            frequencyType: subscription.frequency_type
          })
          
          const nextBillingDate = new Date(subscription.next_billing_date || now)
          const originalNextDate = new Date(nextBillingDate)
          
          // Calcular siguiente fecha según frecuencia
          if (subscription.frequency_type === 'months') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + subscription.frequency)
          } else if (subscription.frequency_type === 'weeks') {
            nextBillingDate.setDate(nextBillingDate.getDate() + (subscription.frequency * 7))
          } else if (subscription.frequency_type === 'days') {
            nextBillingDate.setDate(nextBillingDate.getDate() + subscription.frequency)
          }

          console.log(`📅 Nueva fecha calculada [${executionId}]:`, {
            subscriptionId: subscription.id,
            originalDate: originalNextDate.toISOString(),
            newDate: nextBillingDate.toISOString(),
            frequencyApplied: `${subscription.frequency} ${subscription.frequency_type}`
          })

          // Actualizar suscripción con nueva fecha y precio actualizado
          console.log(`💾 Actualizando suscripción [${executionId}]:`, {
            subscriptionId: subscription.id,
            newChargesCount: (subscription.charges_made || 0) + 1,
            updatedPrice: subscription.discounted_price
          })
          
          const updateStart = Date.now()
          await supabase
            .from('unified_subscriptions')
            .update({
              next_billing_date: nextBillingDate.toISOString(),
              last_billing_date: now.toISOString(),
              charges_made: (subscription.charges_made || 0) + 1,
              discounted_price: subscription.discounted_price, // Actualizar con el precio con descuento
              updated_at: now.toISOString()
            })
            .eq('id', subscription.id)
          const updateTime = Date.now() - updateStart

          // Registrar pago programado con el amount actualizado (con descuento)
          console.log(`💳 Registrando pago programado [${executionId}]:`, {
            subscriptionId: subscription.id,
            amount: subscription.discounted_price,
            currency: subscription.currency_id || 'MXN'
          })
          
          const paymentInsertStart = Date.now()
          await supabase
            .from('subscription_payments')
            .insert({
              subscription_id: subscription.id,
              status: 'pending',
              amount: subscription.discounted_price, // Ya incluye el descuento dinámico aplicado
              currency_id: subscription.currency_id || 'MXN',
              due_date: now.toISOString(),
              external_reference: `AUTO-${subscription.id}-${Date.now()}`
            })
          const paymentInsertTime = Date.now() - paymentInsertStart

          results.payments_processed++
          console.log(`✅ Pago procesado exitosamente [${executionId}]:`, {
            subscriptionId: subscription.id,
            updateTime: `${updateTime}ms`,
            paymentInsertTime: `${paymentInsertTime}ms`
          })

          // Obtener email del usuario para notificación
          console.log(`👤 Obteniendo datos de usuario para notificación [${executionId}]:`, {
            subscriptionId: subscription.id,
            userId: subscription.user_id
          })
          
          const userNotificationStart = Date.now()
          const { data: userData } = await supabase.auth.admin.getUserById(subscription.user_id)
          const userEmail = userData.user?.email
          const userNotificationTime = Date.now() - userNotificationStart

          console.log(`📧 Resultado obtención de usuario [${executionId}]:`, {
            subscriptionId: subscription.id,
            emailFound: !!userEmail,
            queryTime: `${userNotificationTime}ms`
          })

          if (userEmail) {
            // Enviar confirmación de pago procesado
            console.log(`📤 Enviando confirmación de pago [${executionId}]:`, {
              subscriptionId: subscription.id,
              userEmail: userEmail,
              amount: subscription.discounted_price
            })
            
            const emailNotificationStart = Date.now()
            await sendSubscriptionPaymentSuccess({
              userEmail,
              userName: userEmail.split('@')[0],
              productName: subscription.product_name || 'Producto Pet Gourmet',
              amount: subscription.discounted_price,
              paymentDate: now.toISOString(),
              nextPaymentDate: nextBillingDate.toISOString()
            })
            const emailNotificationTime = Date.now() - emailNotificationStart
            
            console.log(`✅ Confirmación de pago enviada [${executionId}]:`, {
              subscriptionId: subscription.id,
              emailTime: `${emailNotificationTime}ms`
            })
          } else {
            console.log(`⚠️ No se pudo enviar confirmación [${executionId}]:`, {
              subscriptionId: subscription.id,
              reason: 'Email de usuario no encontrado'
            })
          }

        } catch (error) {
          const totalTime = Date.now() - paymentStart
          console.error(`❌ Error procesando pago para suscripción ${subscription.id} [${executionId}]:`, {
            error: error,
            stack: error instanceof Error ? error.stack : undefined,
            totalTime: `${totalTime}ms`
          })
          results.errors.push({
            subscription_id: subscription.id,
            type: 'payment',
            error: String(error)
          })
        }
      }
    } else {
      console.log(`💳 No hay pagos para procesar [${executionId}]`)
    }

    // Respuesta final
    const totalTime = Date.now() - startTime
    console.log(`🏁 Cron job completado [${executionId}]:`, {
      totalTime: `${totalTime}ms`,
      reminders: {
        sent: results.reminders.length,
        ids: results.reminders.map(r => r.subscription_id)
      },
      payments: {
        processed: results.payments.length,
        ids: results.payments.map(p => p.subscription_id)
      },
      errors: {
        count: results.errors.length,
        types: results.errors.reduce((acc, err) => {
          acc[err.type] = (acc[err.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    })

    if (results.errors.length > 0) {
      console.error(`🚨 Errores encontrados durante la ejecución [${executionId}]:`, {
        errors: results.errors.map(err => ({
          subscriptionId: err.subscription_id,
          type: err.type,
          error: err.error
        }))
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Cron job ejecutado exitosamente',
      execution_id: executionId,
      results: {
        reminders_sent: results.reminders.length,
        payments_processed: results.payments.length,
        errors: results.errors.length,
        execution_time_ms: totalTime,
        timestamp: new Date().toISOString()
      }
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
