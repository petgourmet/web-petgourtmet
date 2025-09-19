import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger, { LogCategory } from '@/lib/logger';

interface PaymentVerificationRequest {
  orderId?: string;
  paymentId?: string;
  subscriptionId?: string;
}

interface PaymentVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    payment?: any;
    order?: any;
    subscription?: any;
    discrepancies?: string[];
    actions?: string[];
  };
  error?: string;
}

// Verificar si el usuario es administrador
async function verifyAdminAccess(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return false;
    }

    // Verificar si el usuario tiene rol de admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    return profile.role === 'admin';
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Error verificando acceso admin', error);
    return false;
  }
}

// Obtener información del pago desde MercadoPago
async function getMercadoPagoPayment(paymentId: string) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MercadoPago access token no configurado');
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error(LogCategory.PAYMENT, 'Error obteniendo pago de MercadoPago', { paymentId, error });
    throw error;
  }
}

// Obtener información de la suscripción desde MercadoPago
async function getMercadoPagoSubscription(subscriptionId: string) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MercadoPago access token no configurado');
    }

    const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error(LogCategory.SUBSCRIPTION, 'Error obteniendo suscripción de MercadoPago', { subscriptionId, error });
    throw error;
  }
}

// Comparar estados y detectar discrepancias
function detectDiscrepancies(localData: any, mpData: any, type: 'payment' | 'subscription'): string[] {
  const discrepancies: string[] = [];

  if (type === 'payment') {
    // Comparar estado del pago
    if (localData.status !== mpData.status) {
      discrepancies.push(`Estado local: ${localData.status}, Estado MP: ${mpData.status}`);
    }

    // Comparar monto
    if (localData.total_amount && mpData.transaction_amount) {
      const localAmount = parseFloat(localData.total_amount);
      const mpAmount = parseFloat(mpData.transaction_amount);
      if (Math.abs(localAmount - mpAmount) > 0.01) {
        discrepancies.push(`Monto local: $${localAmount}, Monto MP: $${mpAmount}`);
      }
    }

    // Comparar método de pago
    if (localData.payment_method !== mpData.payment_method_id) {
      discrepancies.push(`Método local: ${localData.payment_method}, Método MP: ${mpData.payment_method_id}`);
    }
  } else if (type === 'subscription') {
    // Comparar estado de la suscripción
    if (localData.status !== mpData.status) {
      discrepancies.push(`Estado local: ${localData.status}, Estado MP: ${mpData.status}`);
    }

    // Comparar precio
    if (localData.price && mpData.auto_recurring?.transaction_amount) {
      const localPrice = parseFloat(localData.price);
      const mpPrice = parseFloat(mpData.auto_recurring.transaction_amount);
      if (Math.abs(localPrice - mpPrice) > 0.01) {
        discrepancies.push(`Precio local: $${localPrice}, Precio MP: $${mpPrice}`);
      }
    }
  }

  return discrepancies;
}

// Sugerir acciones correctivas
function suggestActions(discrepancies: string[], type: 'payment' | 'subscription'): string[] {
  const actions: string[] = [];

  if (discrepancies.length === 0) {
    actions.push('No se requieren acciones - datos sincronizados');
    return actions;
  }

  discrepancies.forEach(discrepancy => {
    if (discrepancy.includes('Estado')) {
      actions.push(`Actualizar estado local para coincidir con MercadoPago`);
    }
    if (discrepancy.includes('Monto') || discrepancy.includes('Precio')) {
      actions.push(`Verificar y corregir monto/precio en base de datos local`);
    }
    if (discrepancy.includes('Método')) {
      actions.push(`Actualizar método de pago en registro local`);
    }
  });

  if (type === 'payment') {
    actions.push('Considerar reenviar webhook de confirmación');
  } else {
    actions.push('Verificar configuración de suscripción');
  }

  return actions;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar acceso de administrador
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado - se requieren permisos de administrador' },
        { status: 403 }
      );
    }

    const body: PaymentVerificationRequest = await request.json();
    const { orderId, paymentId, subscriptionId } = body;

    if (!orderId && !paymentId && !subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere orderId, paymentId o subscriptionId' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    let response: PaymentVerificationResponse;

    logger.info(LogCategory.PAYMENT, 'Iniciando verificación manual de pago', {
      orderId,
      paymentId,
      subscriptionId
    });

    if (orderId) {
      // Verificar orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { success: false, error: 'Orden no encontrada' },
          { status: 404 }
        );
      }

      if (order.mercadopago_payment_id) {
        // Obtener información del pago desde MercadoPago
        const mpPayment = await getMercadoPagoPayment(order.mercadopago_payment_id);
        const discrepancies = detectDiscrepancies(order, mpPayment, 'payment');
        const actions = suggestActions(discrepancies, 'payment');

        response = {
          success: true,
          message: 'Verificación de orden completada',
          data: {
            order,
            payment: mpPayment,
            discrepancies,
            actions
          }
        };
      } else {
        response = {
          success: true,
          message: 'Orden encontrada pero sin ID de pago de MercadoPago',
          data: {
            order,
            actions: ['Verificar si el pago fue procesado correctamente', 'Considerar actualizar el ID de pago']
          }
        };
      }
    } else if (paymentId) {
      // Verificar pago directamente
      const mpPayment = await getMercadoPagoPayment(paymentId);
      
      // Buscar orden asociada
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('mercadopago_payment_id', paymentId)
        .single();

      const discrepancies = order ? detectDiscrepancies(order, mpPayment, 'payment') : [];
      const actions = order ? suggestActions(discrepancies, 'payment') : ['Crear orden local para este pago'];

      response = {
        success: true,
        message: 'Verificación de pago completada',
        data: {
          payment: mpPayment,
          order: order || null,
          discrepancies,
          actions
        }
      };
    } else if (subscriptionId) {
      // Verificar suscripción
      const { data: subscription, error: subError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('mercadopago_subscription_id', subscriptionId)
        .single();

      const mpSubscription = await getMercadoPagoSubscription(subscriptionId);
      
      const discrepancies = subscription ? detectDiscrepancies(subscription, mpSubscription, 'subscription') : [];
      const actions = subscription ? suggestActions(discrepancies, 'subscription') : ['Crear suscripción local'];

      response = {
        success: true,
        message: 'Verificación de suscripción completada',
        data: {
          subscription: subscription || null,
          payment: mpSubscription,
          discrepancies,
          actions
        }
      };
    } else {
      throw new Error('Parámetros de verificación inválidos');
    }

    logger.info(LogCategory.PAYMENT, 'Verificación manual completada', {
      orderId,
      paymentId,
      subscriptionId,
      discrepancies: response.data?.discrepancies?.length || 0
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error(LogCategory.PAYMENT, 'Error en verificación manual de pago', error);
    
    const errorResponse: PaymentVerificationResponse = {
      success: false,
      message: 'Error durante la verificación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Endpoint para obtener lista de pagos pendientes de verificación
export async function GET(request: NextRequest) {
  try {
    // Verificar acceso de administrador
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'orders';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (type === 'orders') {
      // Obtener órdenes con posibles problemas
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .or('status.eq.pending,status.eq.processing')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: orders,
        message: `${orders?.length || 0} órdenes encontradas`
      });
    } else if (type === 'subscriptions') {
      // Obtener suscripciones activas
      const { data: subscriptions, error } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: subscriptions,
        message: `${subscriptions?.length || 0} suscripciones encontradas`
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Tipo no válido. Use: orders o subscriptions' },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error(LogCategory.PAYMENT, 'Error obteniendo lista de verificación', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}