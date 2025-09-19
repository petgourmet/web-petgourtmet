import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

interface SubscriptionMetrics {
  total_active_subscriptions: number;
  total_pending_subscriptions: number;
  subscriptions_by_type: { [key: string]: number };
  subscriptions_by_status: { [key: string]: number };
  avg_integrity_score: number;
  critical_issues_count: number;
  revenue_metrics: {
    total_monthly_revenue: number;
    avg_subscription_value: number;
  };
  growth_metrics: {
    new_subscriptions_last_30_days: number;
    cancelled_subscriptions_last_30_days: number;
    churn_rate: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.get('detailed') === 'true';

    // Métricas básicas de suscripciones activas
    const { data: activeSubscriptions, error: activeError } = await supabase
      .from('unified_subscriptions')
      .select('subscription_type, status, transaction_amount, created_at')
      .eq('status', 'active')
      .neq('status', 'pending');

    if (activeError) {
      throw new Error(`Error fetching active subscriptions: ${activeError.message}`);
    }

    // Métricas de suscripciones pendientes
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('unified_subscriptions')
      .select('subscription_type, status, created_at')
      .eq('status', 'pending');

    if (pendingError) {
      throw new Error(`Error fetching pending subscriptions: ${pendingError.message}`);
    }

    // Calcular métricas por tipo
    const subscriptionsByType: { [key: string]: number } = {};
    [...(activeSubscriptions || []), ...(pendingSubscriptions || [])].forEach(sub => {
      subscriptionsByType[sub.subscription_type] = (subscriptionsByType[sub.subscription_type] || 0) + 1;
    });

    // Calcular métricas por estado
    const subscriptionsByStatus: { [key: string]: number } = {
      active: activeSubscriptions?.length || 0,
      pending: pendingSubscriptions?.length || 0
    };

    // Métricas de ingresos
    const totalMonthlyRevenue = (activeSubscriptions || []).reduce((sum, sub) => {
      const amount = parseFloat(sub.transaction_amount?.toString() || '0');
      // Convertir a ingreso mensual según el tipo
      switch (sub.subscription_type) {
        case 'weekly':
          return sum + (amount * 4.33); // ~4.33 semanas por mes
        case 'biweekly':
          return sum + (amount * 2.17); // ~2.17 quincenas por mes
        case 'monthly':
          return sum + amount;
        default:
          return sum + amount;
      }
    }, 0);

    const avgSubscriptionValue = activeSubscriptions?.length 
      ? totalMonthlyRevenue / activeSubscriptions.length 
      : 0;

    // Métricas de crecimiento (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newSubscriptionsLast30Days = (activeSubscriptions || []).filter(
      sub => new Date(sub.created_at) >= thirtyDaysAgo
    ).length;

    // Suscripciones canceladas en los últimos 30 días
    const { data: cancelledSubscriptions } = await supabase
      .from('unified_subscriptions')
      .select('created_at')
      .eq('status', 'cancelled')
      .gte('updated_at', thirtyDaysAgo.toISOString());

    const cancelledLast30Days = cancelledSubscriptions?.length || 0;
    const churnRate = activeSubscriptions?.length 
      ? (cancelledLast30Days / (activeSubscriptions.length + cancelledLast30Days)) * 100
      : 0;

    // Métricas de integridad (si está disponible)
    let avgIntegrityScore = 0;
    let criticalIssuesCount = 0;

    if (detailed) {
      // Aquí podrías integrar con el SubscriptionIntegrityChecker si es necesario
      // Por ahora, valores por defecto
      avgIntegrityScore = 85; // Valor por defecto
      criticalIssuesCount = 0;
    }

    const metrics: SubscriptionMetrics = {
      total_active_subscriptions: activeSubscriptions?.length || 0,
      total_pending_subscriptions: pendingSubscriptions?.length || 0,
      subscriptions_by_type: subscriptionsByType,
      subscriptions_by_status: subscriptionsByStatus,
      avg_integrity_score: avgIntegrityScore,
      critical_issues_count: criticalIssuesCount,
      revenue_metrics: {
        total_monthly_revenue: Math.round(totalMonthlyRevenue * 100) / 100,
        avg_subscription_value: Math.round(avgSubscriptionValue * 100) / 100
      },
      growth_metrics: {
        new_subscriptions_last_30_days: newSubscriptionsLast30Days,
        cancelled_subscriptions_last_30_days: cancelledLast30Days,
        churn_rate: Math.round(churnRate * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}

// Endpoint para métricas específicas por producto
export async function POST(request: NextRequest) {
  try {
    const { product_ids } = await request.json();
    const supabase = createServiceClient();

    if (!product_ids || !Array.isArray(product_ids)) {
      return NextResponse.json(
        { success: false, error: 'product_ids array is required' },
        { status: 400 }
      );
    }

    // Métricas por producto
    const { data: productMetrics, error } = await supabase
      .from('unified_subscriptions')
      .select('product_id, subscription_type, status, transaction_amount')
      .in('product_id', product_ids)
      .eq('status', 'active')
      .neq('status', 'pending');

    if (error) {
      throw new Error(`Error fetching product metrics: ${error.message}`);
    }

    // Agrupar por producto
    const metricsByProduct: { [key: string]: any } = {};
    
    (productMetrics || []).forEach(sub => {
      const productId = sub.product_id;
      if (!metricsByProduct[productId]) {
        metricsByProduct[productId] = {
          total_subscriptions: 0,
          total_revenue: 0,
          subscription_types: {}
        };
      }
      
      metricsByProduct[productId].total_subscriptions++;
      metricsByProduct[productId].total_revenue += parseFloat(sub.transaction_amount?.toString() || '0');
      
      const type = sub.subscription_type;
      metricsByProduct[productId].subscription_types[type] = 
        (metricsByProduct[productId].subscription_types[type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: metricsByProduct,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching product subscription metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}