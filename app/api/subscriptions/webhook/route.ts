// app/api/subscriptions/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/lib/mercadopago-service'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const IS_TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true"

if (!MP_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required')
}

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

// Crear transporter para emails
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Función helper para enviar emails
const sendEmail = async (emailData: { to: string; subject: string; html: string }) => {
  const transporter = createTransporter()
  
  return await transporter.sendMail({
    from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    
    console.log('🔔 Webhook de suscripción recibido:', {
      type: body.type,
      action: body.action,
      data_id: body.data?.id,
      test_mode: IS_TEST_MODE
    })

    // Validar que es una notificación de suscripción
    if (body.type !== 'subscription_preapproval' && body.type !== 'subscription_authorized_payment') {
      console.log('ℹ️ Tipo de webhook no manejado:', body.type)
      return NextResponse.json({ received: true })
    }

    const subscriptionId = body.data?.id
    if (!subscriptionId) {
      console.error('❌ ID de suscripción no encontrado en webhook')
      return NextResponse.json({ error: 'ID de suscripción requerido' }, { status: 400 })
    }

    // Obtener información actualizada de la suscripción
    const subscriptionInfo = await mercadoPagoService.getSubscription(subscriptionId)
    
    console.log('📋 Información de suscripción:', {
      id: subscriptionInfo.id,
      status: subscriptionInfo.status,
      reason: subscriptionInfo.reason,
      payer_email: subscriptionInfo.payer_email
    })

    // Actualizar en base de datos local
    const { data: localSubscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscriptionInfo.status,
        next_payment_date: subscriptionInfo.next_payment_date,
        updated_at: new Date().toISOString()
      })
      .eq('mercadopago_subscription_id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('⚠️ Error actualizando suscripción en BD:', updateError)
    } else {
      console.log('✅ Suscripción actualizada en BD')
    }

    // Manejar diferentes acciones
    switch (body.action) {
      case 'created':
        await handleSubscriptionCreated(subscriptionInfo, supabase)
        break
      case 'updated':
        await handleSubscriptionUpdated(subscriptionInfo, supabase)
        break
      case 'cancelled':
        await handleSubscriptionCancelled(subscriptionInfo, supabase)
        break
      case 'payment_created':
        await handlePaymentCreated(subscriptionInfo, body.data, supabase)
        break
      case 'payment_updated':
        await handlePaymentUpdated(subscriptionInfo, body.data, supabase)
        break
      default:
        console.log('ℹ️ Acción no manejada:', body.action)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Error procesando webhook de suscripción:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscriptionInfo: any, supabase: any) {
  console.log('🎉 Suscripción creada:', subscriptionInfo.id)
  
  try {
    // Enviar email de confirmación al cliente
    await sendEmail({
      to: subscriptionInfo.payer_email,
      subject: '🎉 ¡Tu suscripción a Pet Gourmet está activa!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">¡Bienvenido a Pet Gourmet!</h2>
          <p>Tu suscripción <strong>${subscriptionInfo.reason}</strong> ha sido activada exitosamente.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalles de tu suscripción:</h3>
            <ul>
              <li><strong>ID:</strong> ${subscriptionInfo.id}</li>
              <li><strong>Descripción:</strong> ${subscriptionInfo.reason}</li>
              <li><strong>Próximo cobro:</strong> ${new Date(subscriptionInfo.next_payment_date).toLocaleDateString('es-MX')}</li>
              <li><strong>Monto:</strong> $${subscriptionInfo.auto_recurring?.transaction_amount} MXN</li>
            </ul>
          </div>
          <p>¡Gracias por confiar en Pet Gourmet para el cuidado de tu mascota!</p>
          <p style="color: #64748b; font-size: 14px;">
            Si tienes alguna pregunta, contáctanos en contacto@petgourmet.mx
          </p>
        </div>
      `
    })

    // Enviar notificación al admin
    await sendEmail({
      to: 'contacto@petgourmet.mx',
      subject: '🔔 Nueva suscripción activada',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Nueva suscripción activada</h2>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul>
              <li><strong>Cliente:</strong> ${subscriptionInfo.payer_email}</li>
              <li><strong>ID Suscripción:</strong> ${subscriptionInfo.id}</li>
              <li><strong>Descripción:</strong> ${subscriptionInfo.reason}</li>
              <li><strong>Monto:</strong> $${subscriptionInfo.auto_recurring?.transaction_amount} MXN</li>
              <li><strong>Frecuencia:</strong> Cada ${subscriptionInfo.auto_recurring?.frequency} ${subscriptionInfo.auto_recurring?.frequency_type}</li>
              <li><strong>Próximo cobro:</strong> ${new Date(subscriptionInfo.next_payment_date).toLocaleDateString('es-MX')}</li>
            </ul>
          </div>
        </div>
      `
    })

  } catch (emailError) {
    console.error('⚠️ Error enviando emails de confirmación:', emailError)
  }
}

async function handleSubscriptionUpdated(subscriptionInfo: any, supabase: any) {
  console.log('🔄 Suscripción actualizada:', subscriptionInfo.id)
  
  // Aquí puedes agregar lógica adicional para cambios de suscripción
}

async function handleSubscriptionCancelled(subscriptionInfo: any, supabase: any) {
  console.log('❌ Suscripción cancelada:', subscriptionInfo.id)
  
  try {
    // Enviar email de cancelación al cliente
    await sendEmail({
      to: subscriptionInfo.payer_email,
      subject: '❌ Tu suscripción a Pet Gourmet ha sido cancelada',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Suscripción cancelada</h2>
          <p>Tu suscripción <strong>${subscriptionInfo.reason}</strong> ha sido cancelada.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>ID de suscripción:</strong> ${subscriptionInfo.id}</p>
            <p><strong>Fecha de cancelación:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
          </div>
          <p>¡Esperamos verte pronto de vuelta en Pet Gourmet!</p>
          <p style="color: #64748b; font-size: 14px;">
            Si tienes alguna pregunta, contáctanos en contacto@petgourmet.mx
          </p>
        </div>
      `
    })

    // Enviar notificación al admin
    await sendEmail({
      to: 'contacto@petgourmet.mx',
      subject: '❌ Suscripción cancelada',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Suscripción cancelada</h2>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul>
              <li><strong>Cliente:</strong> ${subscriptionInfo.payer_email}</li>
              <li><strong>ID Suscripción:</strong> ${subscriptionInfo.id}</li>
              <li><strong>Descripción:</strong> ${subscriptionInfo.reason}</li>
              <li><strong>Fecha de cancelación:</strong> ${new Date().toLocaleDateString('es-MX')}</li>
            </ul>
          </div>
        </div>
      `
    })

  } catch (emailError) {
    console.error('⚠️ Error enviando emails de cancelación:', emailError)
  }
}

async function handlePaymentCreated(subscriptionInfo: any, paymentData: any, supabase: any) {
  console.log('💳 Pago de suscripción creado:', paymentData.id)
  
  // Obtener información del pago
  try {
    const paymentInfo = await mercadoPagoService.getPayment(paymentData.id)
    
    // Registrar el pago en base de datos
    await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: subscriptionInfo.id,
        payment_id: paymentInfo.id,
        status: paymentInfo.status,
        amount: paymentInfo.transaction_amount,
        currency_id: paymentInfo.currency_id,
        payment_method_id: paymentInfo.payment_method_id,
        date_created: paymentInfo.date_created,
        created_at: new Date().toISOString()
      })

    console.log('💾 Pago registrado en BD')

  } catch (error) {
    console.error('⚠️ Error procesando pago:', error)
  }
}

async function handlePaymentUpdated(subscriptionInfo: any, paymentData: any, supabase: any) {
  console.log('🔄 Pago de suscripción actualizado:', paymentData.id)
  
  // Actualizar información del pago en base de datos
  try {
    const paymentInfo = await mercadoPagoService.getPayment(paymentData.id)
    
    await supabase
      .from('subscription_payments')
      .update({
        status: paymentInfo.status,
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', paymentInfo.id)

    console.log('✅ Pago actualizado en BD')

    // Si el pago fue aprobado, enviar confirmación
    if (paymentInfo.status === 'approved') {
      await sendEmail({
        to: subscriptionInfo.payer_email,
        subject: '✅ Pago de suscripción procesado',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">¡Pago procesado exitosamente!</h2>
            <p>Tu pago de suscripción ha sido procesado correctamente.</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <ul>
                <li><strong>Monto:</strong> $${paymentInfo.transaction_amount} MXN</li>
                <li><strong>Fecha:</strong> ${new Date(paymentInfo.date_created).toLocaleDateString('es-MX')}</li>
                <li><strong>ID de pago:</strong> ${paymentInfo.id}</li>
              </ul>
            </div>
            <p>¡Gracias por confiar en Pet Gourmet!</p>
          </div>
        `
      })
    }

  } catch (error) {
    console.error('⚠️ Error actualizando pago:', error)
  }
}
