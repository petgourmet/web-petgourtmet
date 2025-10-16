import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MetricsService, MetricsFilters } from '@/lib/services/metrics-service';
import { detailedLogger } from '@/lib/detailed-logger';

/**
 * GET /api/admin/subscriptions/metrics
 * Obtener métricas completas de suscripciones para dashboard admin
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    
    // Verificar autenticación y permisos de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      detailedLogger.warn('🚫 Acceso no autorizado a métricas admin', {
        authError: authError?.message,
        hasUser: !!user
      });
      
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar rol de admin (asumiendo que existe una tabla user_roles o similar)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      detailedLogger.warn('🚫 Usuario sin permisos de admin intentó acceder a métricas', {
        userId: user.id,
        userRole: userRole?.role
      });
      
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    // Obtener parámetros de filtro de la URL
    const { searchParams } = new URL(request.url);
    const filters: MetricsFilters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      productId: searchParams.get('productId') ? parseInt(searchParams.get('productId')!) : undefined,
      frequencyType: searchParams.get('frequencyType') || undefined,
      status: searchParams.get('status') || undefined
    };

    detailedLogger.info('📊 Solicitando métricas admin', {
      userId: user.id,
      filters
    });

    // Obtener métricas usando el servicio
    const metricsService = MetricsService.getInstance();
    const metrics = await metricsService.getSubscriptionMetrics(filters);

    const processingTime = Date.now() - startTime;

    detailedLogger.info('✅ Métricas admin obtenidas exitosamente', {
      userId: user.id,
      processingTime: `${processingTime}ms`,
      totalSubscriptions: metrics.totalSubscriptions,
      totalRevenue: metrics.totalRevenue
    });

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        filters
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    detailedLogger.error('❌ Error obteniendo métricas admin', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las métricas'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/subscriptions/metrics
 * Forzar recálculo de métricas (para casos especiales)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    
    // Verificar autenticación y permisos de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar rol de admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, filters } = body;

    detailedLogger.info('🔄 Acción de métricas admin solicitada', {
      userId: user.id,
      action,
      filters
    });

    const metricsService = MetricsService.getInstance();

    switch (action) {
      case 'recalculate':
        // Forzar recálculo completo
        const metrics = await metricsService.getSubscriptionMetrics(filters);
        
        // Actualizar tabla de métricas cacheadas si existe
        await supabase
          .from('subscription_metrics')
          .upsert({
            date: new Date().toISOString().split('T')[0],
            total_subscriptions: metrics.totalSubscriptions,
            active_subscriptions: metrics.activeSubscriptions,
            total_revenue: metrics.totalRevenue,
            monthly_recurring_revenue: metrics.monthlyRecurringRevenue,
            churn_rate: metrics.churnRate,
            growth_rate: metrics.growthRate,
            updated_at: new Date().toISOString()
          });

        const processingTime = Date.now() - startTime;

        detailedLogger.info('✅ Métricas recalculadas exitosamente', {
          userId: user.id,
          processingTime: `${processingTime}ms`
        });

        return NextResponse.json({
          success: true,
          message: 'Métricas recalculadas exitosamente',
          data: metrics,
          meta: {
            processingTime: `${processingTime}ms`,
            timestamp: new Date().toISOString()
          }
        });

      case 'realtime':
        // Obtener métricas en tiempo real (versión rápida)
        const realtimeMetrics = await metricsService.getRealTimeMetrics();
        
        return NextResponse.json({
          success: true,
          data: realtimeMetrics,
          meta: {
            processingTime: `${Date.now() - startTime}ms`,
            timestamp: new Date().toISOString(),
            type: 'realtime'
          }
        });

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    detailedLogger.error('❌ Error en acción de métricas admin', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo completar la acción'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/subscriptions/metrics
 * Actualizar configuración de métricas
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar autenticación y permisos de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { config } = body;

    detailedLogger.info('⚙️ Actualizando configuración de métricas', {
      userId: user.id,
      config
    });

    // Actualizar configuración en base de datos
    const { error: updateError } = await supabase
      .from('admin_settings')
      .upsert({
        key: 'metrics_config',
        value: config,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      });

    if (updateError) throw updateError;

    detailedLogger.info('✅ Configuración de métricas actualizada', {
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    });

  } catch (error) {
    detailedLogger.error('❌ Error actualizando configuración de métricas', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar la configuración'
      },
      { status: 500 }
    );
  }
}