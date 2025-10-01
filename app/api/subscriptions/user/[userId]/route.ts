// app/api/subscriptions/user/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import MercadoPagoService from '@/lib/mercadopago-service'
import nodemailer from 'nodemailer'
import { getMercadoPagoAccessToken, isTestMode } from '@/lib/mercadopago-config'

const MP_ACCESS_TOKEN = getMercadoPagoAccessToken()
const IS_TEST_MODE = isTestMode()

const mercadoPagoService = new MercadoPagoService(MP_ACCESS_TOKEN)

// Crear transporter para emails (usando la misma configuración que el resto de la web)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true', // Consistente con email-service.ts
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Configuraciones adicionales para compatibilidad
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Función helper para enviar emails
const sendEmail = async (emailData: { to: string; subject: string; html: string }) => {
  const transporter = createTransporter()
  
  return await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Pet Gourmet" <${process.env.SMTP_USER}>`,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html
  })
}

// Función para enviar notificación de cancelación/pausa
const sendSubscriptionActionEmail = async (subscription: any, userProfile: any, action: 'cancel' | 'pause') => {
  const actionText = action === 'cancel' ? 'cancelada' : 'pausada'
  const actionEmoji = action === 'cancel' ? '❌' : '⏸️'
  
  try {
    // Email al admin
    await sendEmail({
      to: 'contacto@petgourmet.mx',
      subject: `${actionEmoji} Suscripción ${actionText} - ${userProfile?.email || 'Usuario desconocido'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${action === 'cancel' ? '#dc2626' : '#f59e0b'};">Suscripción ${actionText}</h2>
          <div style="background: ${action === 'cancel' ? '#fef2f2' : '#fefbf2'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalles del usuario:</h3>
            <ul>
              <li><strong>Nombre:</strong> ${userProfile?.full_name || 'No disponible'}</li>
              <li><strong>Email:</strong> ${userProfile?.email || 'No disponible'}</li>
              <li><strong>Teléfono:</strong> ${userProfile?.phone || 'No disponible'}</li>
            </ul>
            
            <h3>Detalles de la suscripción:</h3>
            <ul>
              <li><strong>Producto:</strong> ${subscription.product_name || 'No disponible'}</li>
              <li><strong>Tipo:</strong> ${subscription.subscription_type || 'No disponible'}</li>
              <li><strong>Precio:</strong> $${subscription.discounted_price || subscription.transaction_amount || 0} MXN</li>
              <li><strong>Frecuencia:</strong> ${subscription.frequency || 1} ${subscription.frequency_type || 'meses'}</li>
              <li><strong>ID Suscripción:</strong> ${subscription.id}</li>
              <li><strong>Fecha de ${action === 'cancel' ? 'cancelación' : 'pausa'}:</strong> ${new Date().toLocaleDateString('es-MX')}</li>
            </ul>
          </div>
          <p><strong>Acción requerida:</strong> Revisar y dar seguimiento según sea necesario.</p>
        </div>
      `
    })
    
    console.log(`✅ Email de ${actionText} enviado al admin`)
  } catch (emailError) {
    console.error(`⚠️ Error enviando email de ${actionText}:`, emailError)
  }
}

// GET - Obtener suscripciones de un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createServiceClient()
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    // Obtener suscripciones del usuario desde la tabla unificada
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        products (
          id,
          name,
          description,
          image,
          price
        )
      `)
      .eq('user_id', userId)
      .neq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error obteniendo suscripciones:', error)
      return NextResponse.json(
        { error: 'Error obteniendo suscripciones' },
        { status: 500 }
      )
    }

    // Sincronizar estado con MercadoPago
    const syncedSubscriptions = await Promise.all(
      (subscriptions || []).map(async (subscription) => {
        try {
          if (subscription.mercadopago_subscription_id) {
            const mpSubscription = await mercadoPagoService.getSubscription(
              subscription.mercadopago_subscription_id
            )
            
            // Actualizar estado si es diferente
            if (mpSubscription.status !== subscription.status) {
              await supabase
                .from('unified_subscriptions')
                .update({ 
                  status: mpSubscription.status,
                  next_payment_date: mpSubscription.next_payment_date,
                  updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id)
              
              subscription.status = mpSubscription.status
              subscription.next_payment_date = mpSubscription.next_payment_date
            }
          }
          
          return subscription
        } catch (mpError) {
          console.error('⚠️ Error sincronizando con MercadoPago:', mpError)
          return subscription
        }
      })
    )

    return NextResponse.json({
      success: true,
      subscriptions: syncedSubscriptions
    })

  } catch (error) {
    console.error('❌ Error obteniendo suscripciones de usuario:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar suscripción (cancelar, pausar, reactivar)
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createServiceClient()
    const { userId } = await params
    const body = await request.json()
    
    const { subscriptionId, action } = body

    if (!userId || !subscriptionId || !action) {
      return NextResponse.json(
        { error: 'userId, subscriptionId y action son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la suscripción pertenece al usuario
    const { data: subscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    let newStatus = subscription.status
    let mpResult = null

    // Realizar acción en MercadoPago
    switch (action) {
      case 'cancel':
        if (subscription.mercadopago_subscription_id) {
          mpResult = await mercadoPagoService.cancelSubscription(
            subscription.mercadopago_subscription_id
          )
          newStatus = 'cancelled'
        }
        break
        
      case 'pause':
        // MercadoPago no tiene pausa directa, se cancela y se puede recrear después
        if (subscription.mercadopago_subscription_id) {
          mpResult = await mercadoPagoService.cancelSubscription(
            subscription.mercadopago_subscription_id
          )
          newStatus = 'paused'
        }
        break
        
      case 'reactivate':
        // Para reactivar, necesitaríamos crear una nueva suscripción
        // Por ahora solo cambiamos el estado local
        newStatus = 'pending'
        break
        
      default:
        return NextResponse.json(
          { error: 'Acción no válida. Use: cancel, pause, reactivate' },
          { status: 400 }
        )
    }

    // Obtener datos del usuario para el email
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', userId)
      .single()

    // Actualizar estado en base de datos
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error actualizando suscripción:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando suscripción' },
        { status: 500 }
      )
    }

    // Enviar email de notificación para cancelación o pausa
    if (action === 'cancel' || action === 'pause') {
      await sendSubscriptionActionEmail(subscription, userProfile, action)
    }

    console.log('✅ Suscripción actualizada:', {
      id: subscriptionId,
      action,
      newStatus,
      mpResult: mpResult?.status
    })

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      action,
      mercadopago_result: mpResult
    })

  } catch (error) {
    console.error('❌ Error actualizando suscripción:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: IS_TEST_MODE ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
