import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { EmailService } from '@/lib/email-service';

const emailService = new EmailService();

export async function POST(request: NextRequest) {
  try {
    const { external_reference, user_id } = await request.json();

    if (!external_reference && !user_id) {
      return NextResponse.json(
        { error: 'Se requiere external_reference o user_id' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Buscar suscripción pendiente
    let query = supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('status', 'pending');

    if (external_reference) {
      query = query.eq('external_reference', external_reference);
    } else if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: pendingSubscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error al buscar suscripción pendiente:', fetchError);
      return NextResponse.json(
        { error: 'Error al buscar suscripción' },
        { status: 500 }
      );
    }

    if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró suscripción pendiente' },
        { status: 404 }
      );
    }

    const pendingSubscription = pendingSubscriptions[0];

    // Verificar si ya existe una suscripción activa para este usuario
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', pendingSubscription.user_id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { message: 'El usuario ya tiene una suscripción activa', subscription: existingSubscription },
        { status: 200 }
      );
    }

    // Obtener información del usuario
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', pendingSubscription.user_id)
      .single();

    if (userError || !user) {
      console.error('Error al obtener usuario:', userError);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Extraer datos del carrito
    const cartItems = Array.isArray(pendingSubscription.cart_items) 
      ? pendingSubscription.cart_items 
      : JSON.parse(pendingSubscription.cart_items || '[]');
    
    const firstItem = cartItems[0] || {};
    const basePrice = firstItem.price || 0;
    const discountPercentage = firstItem.subscription_discount || 0;
    const discountedPrice = firstItem.final_price || (basePrice * (1 - discountPercentage / 100));
    
    // Crear suscripción activa
    const subscriptionData = {
      user_id: pendingSubscription.user_id,
      product_id: firstItem.id || null,
      product_name: firstItem.name || 'Producto de suscripción',
      product_image: firstItem.image || null,
      subscription_type: pendingSubscription.subscription_type,
      status: 'active',
      quantity: firstItem.quantity || 1,
      size: firstItem.size || null,
      discount_percentage: discountPercentage,
      base_price: basePrice,
      discounted_price: discountedPrice,
      start_date: new Date().toISOString(),
      next_billing_date: getNextBillingDate(pendingSubscription.subscription_type),
      external_reference: pendingSubscription.external_reference,
      mercadopago_subscription_id: pendingSubscription.mercadopago_subscription_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error al crear suscripción:', subscriptionError);
      return NextResponse.json(
        { error: 'Error al activar suscripción' },
        { status: 500 }
      );
    }

    // Actualizar suscripción pendiente a completada
    await supabase
      .from('pending_subscriptions')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingSubscription.id);

    // Actualizar perfil del usuario
    await supabase
      .from('profiles')
      .update({ 
        has_active_subscription: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingSubscription.user_id);

    // Enviar correos de agradecimiento y notificación
    try {
      console.log('Enviando correo de agradecimiento a:', user.email);
      
      // Calcular fechas
      const startDate = new Date().toLocaleDateString('es-MX');
      const nextBillingDate = new Date(subscriptionData.next_billing_date).toLocaleDateString('es-MX');
      
      const emailData = {
        user_name: user.full_name || user.email,
        user_email: user.email,
        subscription_type: pendingSubscription.subscription_type,
        product_name: firstItem.name || 'Producto de suscripción',
        product_image: firstItem.image,
        quantity: firstItem.quantity || 1,
        size: firstItem.size,
        original_price: basePrice,
        discounted_price: discountPercentage > 0 ? discountedPrice : undefined,
        discount_percentage: discountPercentage > 0 ? discountPercentage : undefined,
        start_date: startDate,
        next_billing_date: nextBillingDate,
        external_reference: pendingSubscription.external_reference,
        cart_items: cartItems
      };
      
      // Enviar correo al cliente
      await emailService.sendThankYouEmail(emailData);
      
      // Enviar correo a administradores
      await emailService.sendAdminNotificationEmail(emailData);
      
      console.log('Correos enviados exitosamente');
    } catch (emailError) {
      console.error('Error al enviar correos:', emailError);
      // No fallar la activación por errores de correo
    }

    return NextResponse.json({
      message: 'Suscripción activada exitosamente',
      subscription: newSubscription,
      user: {
        name: user.full_name || user.email,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error en activación de suscripción:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getNextBillingDate(subscriptionType: string): string {
  const now = new Date();
  
  switch (subscriptionType) {
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'semiannual':
      now.setMonth(now.getMonth() + 6);
      break;
    case 'annual':
      now.setFullYear(now.getFullYear() + 1);
      break;
    default:
      now.setMonth(now.getMonth() + 1);
  }
  
  return now.toISOString();
}

function getSubscriptionTypeName(type: string): string {
  const typeNames: { [key: string]: string } = {
    'monthly': 'Mensual',
    'quarterly': 'Trimestral', 
    'semiannual': 'Semestral',
    'annual': 'Anual'
  };
  
  return typeNames[type] || type;
}