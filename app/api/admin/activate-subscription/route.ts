import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { WebhookService } from '@/lib/webhook-service'

export async function POST(request: NextRequest) {
  try {
    const { subscription_id, payment_id, external_reference } = await request.json()

    if (!subscription_id || !payment_id || !external_reference) {
      return NextResponse.json(
        { error: 'subscription_id, payment_id y external_reference son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const webhookService = new WebhookService()

    // 1. Obtener la suscripción actual
    const { data: subscription, error: fetchError } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Suscripción no encontrada' },
        { status: 404 }
      )
    }

    // 2. Calcular fechas de facturación
    const now = new Date()
    const nextBillingDate = new Date(now)
    
    // Para suscripción weekly, agregar 7 días
    if (subscription.subscription_type === 'weekly') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7)
    } else if (subscription.subscription_type === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }

    // Actualizar la suscripción (mantenemos el external_reference original)
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('unified_subscriptions')
      .update({
        status: 'active',
        last_billing_date: new Date().toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        charges_made: (subscription.charges_made || 0) + 1,
        updated_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      })
      .eq('id', subscription_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error actualizando suscripción:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando suscripción' },
        { status: 500 }
      )
    }

    // 4. Crear registro en billing_history
    const customerData = typeof subscription.customer_data === 'string' 
      ? JSON.parse(subscription.customer_data) 
      : subscription.customer_data
    const cartItems = typeof subscription.cart_items === 'string'
      ? JSON.parse(subscription.cart_items)
      : subscription.cart_items
    const amount = parseFloat(subscription.transaction_amount)

    const { error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert({
        subscription_id: subscription_id,
        user_id: subscription.user_id,
        amount: amount,
        currency: subscription.currency_id || 'MXN',
        status: 'completed',
        mercadopago_payment_id: payment_id,
        external_reference: external_reference,
        billing_date: now.toISOString(),
        payment_method: 'credit_card',
        metadata: {
          activation_type: 'manual_admin',
          original_external_reference: subscription.external_reference,
          processed_at: now.toISOString()
        }
      })

    if (billingError) {
      console.error('Error creando registro de facturación:', billingError)
      // No retornamos error aquí porque la suscripción ya se activó
    }

    // 5. Enviar correo de confirmación usando el servicio de email interno
    try {
      // Crear el objeto de suscripción con los datos necesarios
      const subscriptionForEmail = {
        id: subscription_id,
        user_id: subscription.user_id,
        product_name: subscription.product_name,
        subscription_type: subscription.subscription_type,
        discounted_price: subscription.discounted_price,
        base_price: subscription.base_price,
        customer_data: subscription.customer_data
      }
      
      // Usar el método privado a través de reflexión o crear instancia temporal
      const supabaseClient = createServiceClient()
      
      // Obtener datos del usuario para el email
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', subscription.user_id)
        .single()
      
      if (profile?.email) {
        // Crear transporter de email temporal
        const nodemailer = await import('nodemailer')
        const emailTransporter = nodemailer.default.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        })
        
        const productName = subscription.product_name || 'Suscripción PetGourmet'
        
        // Email al cliente
        const customerEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">¡Tu suscripción está activa! 🎉</h2>
            <p>Hola ${profile.first_name || customerData.firstName || 'Cliente'},</p>
            <p>Tu suscripción a <strong>${productName}</strong> ha sido activada exitosamente.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Detalles de tu suscripción:</h3>
              <p><strong>Producto:</strong> ${productName}</p>
              <p><strong>Tamaño:</strong> ${subscription.size}</p>
              <p><strong>Tipo:</strong> ${subscription.subscription_type}</p>
              <p><strong>Precio:</strong> $${subscription.discounted_price || subscription.base_price} MXN</p>
              <p><strong>Próximo pago:</strong> ${nextBillingDate.toLocaleDateString('es-MX')}</p>
            </div>
            
            <p>Ahora puedes disfrutar de todos los beneficios de tu suscripción:</p>
            <ul>
              <li>🥘 Comida premium para tu mascota</li>
              <li>🚚 Entregas automáticas</li>
              <li>💰 Precios preferenciales</li>
              <li>🎯 Atención personalizada</li>
            </ul>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            
            <p style="margin-top: 30px;">¡Gracias por confiar en PetGourmet!</p>
            <p><strong>El equipo de PetGourmet</strong></p>
          </div>
        `
        
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'contacto@petgourmet.mx',
          to: profile.email,
          subject: '🎉 ¡Tu suscripción a PetGourmet está activa!',
          html: customerEmailHtml
        })
        
        console.log('✅ Correo de confirmación enviado a:', profile.email)
      }
    } catch (emailError: any) {
      console.error('❌ Error enviando correo:', emailError.message)
      // No retornamos error aquí porque la suscripción ya se activó
    }

    return NextResponse.json({
      success: true,
      message: 'Suscripción activada exitosamente',
      subscription_id: subscription_id,
      status: 'active',
      payment_id: payment_id,
      external_reference: external_reference,
      next_billing_date: nextBillingDate.toISOString()
    })

  } catch (error) {
    console.error('Error en activate-subscription:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}