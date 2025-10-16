import { createClient } from '@/lib/supabase/server';
import { detailedLogger } from '@/lib/detailed-logger';

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageSubscriptionValue: number;
  churnRate: number;
  growthRate: number;
  topProducts: Array<{
    productId: number;
    productName: string;
    subscriptionCount: number;
    revenue: number;
  }>;
  revenueByFrequency: Array<{
    frequency: string;
    count: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    date: string;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    revenue: number;
  }>;
}

export interface MetricsFilters {
  startDate?: string;
  endDate?: string;
  productId?: number;
  frequencyType?: string;
  status?: string;
}

export class MetricsService {
  private static instance: MetricsService;
  private supabase = createClient();

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Obtener métricas completas de suscripciones
   */
  public async getSubscriptionMetrics(filters: MetricsFilters = {}): Promise<SubscriptionMetrics> {
    const startTime = Date.now();

    try {
      detailedLogger.info('📊 Calculando métricas de suscripciones', { filters });

      // Construir filtros de fecha
      const dateFilter = this.buildDateFilter(filters);

      // Ejecutar consultas en paralelo para mejor performance
      const [
        subscriptionCounts,
        revenueData,
        topProducts,
        revenueByFrequency,
        recentActivity,
        churnData
      ] = await Promise.all([
        this.getSubscriptionCounts(dateFilter),
        this.getRevenueData(dateFilter),
        this.getTopProducts(dateFilter),
        this.getRevenueByFrequency(dateFilter),
        this.getRecentActivity(),
        this.getChurnData()
      ]);

      const metrics: SubscriptionMetrics = {
        ...subscriptionCounts,
        ...revenueData,
        topProducts,
        revenueByFrequency,
        recentActivity,
        churnRate: churnData.churnRate,
        growthRate: churnData.growthRate
      };

      const processingTime = Date.now() - startTime;
      
      detailedLogger.info('✅ Métricas calculadas exitosamente', {
        processingTime: `${processingTime}ms`,
        totalSubscriptions: metrics.totalSubscriptions,
        totalRevenue: metrics.totalRevenue
      });

      return metrics;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      detailedLogger.error('❌ Error calculando métricas', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        processingTime: `${processingTime}ms`
      });

      throw error;
    }
  }

  /**
   * Obtener conteos de suscripciones por estado
   */
  private async getSubscriptionCounts(dateFilter: string) {
    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .select('status')
      .gte('created_at', dateFilter);

    if (error) throw error;

    const counts = data.reduce((acc, sub) => {
      acc.total++;
      switch (sub.status) {
        case 'active':
          acc.active++;
          break;
        case 'paused':
          acc.paused++;
          break;
        case 'cancelled':
          acc.cancelled++;
          break;
      }
      return acc;
    }, { total: 0, active: 0, paused: 0, cancelled: 0 });

    return {
      totalSubscriptions: counts.total,
      activeSubscriptions: counts.active,
      pausedSubscriptions: counts.paused,
      cancelledSubscriptions: counts.cancelled
    };
  }

  /**
   * Obtener datos de ingresos
   */
  private async getRevenueData(dateFilter: string) {
    // Ingresos totales de billing_history
    const { data: billingData, error: billingError } = await this.supabase
      .from('billing_history')
      .select('transaction_amount, processed_at')
      .eq('status', 'approved')
      .gte('processed_at', dateFilter);

    if (billingError) throw billingError;

    const totalRevenue = billingData.reduce((sum, bill) => sum + (bill.transaction_amount || 0), 0);

    // Ingresos recurrentes mensuales (suscripciones activas)
    const { data: activeSubscriptions, error: activeError } = await this.supabase
      .from('unified_subscriptions')
      .select('base_price, quantity, discount_percentage, frequency_type')
      .eq('status', 'active');

    if (activeError) throw activeError;

    let monthlyRecurringRevenue = 0;
    let totalSubscriptionValue = 0;

    activeSubscriptions.forEach(sub => {
      const baseAmount = (sub.base_price || 0) * (sub.quantity || 1);
      const discountAmount = baseAmount * ((sub.discount_percentage || 0) / 100);
      const finalAmount = baseAmount - discountAmount;

      // Convertir a ingresos mensuales según frecuencia
      const monthlyAmount = this.convertToMonthlyRevenue(finalAmount, sub.frequency_type);
      monthlyRecurringRevenue += monthlyAmount;
      totalSubscriptionValue += finalAmount;
    });

    const averageSubscriptionValue = activeSubscriptions.length > 0 
      ? totalSubscriptionValue / activeSubscriptions.length 
      : 0;

    return {
      totalRevenue,
      monthlyRecurringRevenue,
      averageSubscriptionValue
    };
  }

  /**
   * Obtener productos más populares
   */
  private async getTopProducts(dateFilter: string) {
    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .select(`
        product_id,
        base_price,
        quantity,
        discount_percentage,
        products (
          name
        )
      `)
      .gte('created_at', dateFilter);

    if (error) throw error;

    const productStats = data.reduce((acc, sub) => {
      const productId = sub.product_id;
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName: sub.products?.name || 'Producto desconocido',
          subscriptionCount: 0,
          revenue: 0
        };
      }

      acc[productId].subscriptionCount++;
      
      const baseAmount = (sub.base_price || 0) * (sub.quantity || 1);
      const discountAmount = baseAmount * ((sub.discount_percentage || 0) / 100);
      acc[productId].revenue += baseAmount - discountAmount;

      return acc;
    }, {} as Record<number, any>);

    return Object.values(productStats)
      .sort((a, b) => b.subscriptionCount - a.subscriptionCount)
      .slice(0, 10);
  }

  /**
   * Obtener ingresos por frecuencia
   */
  private async getRevenueByFrequency(dateFilter: string) {
    const { data, error } = await this.supabase
      .from('unified_subscriptions')
      .select('frequency_type, base_price, quantity, discount_percentage')
      .gte('created_at', dateFilter);

    if (error) throw error;

    const frequencyStats = data.reduce((acc, sub) => {
      const frequency = sub.frequency_type || 'monthly';
      if (!acc[frequency]) {
        acc[frequency] = { frequency, count: 0, revenue: 0 };
      }

      acc[frequency].count++;
      
      const baseAmount = (sub.base_price || 0) * (sub.quantity || 1);
      const discountAmount = baseAmount * ((sub.discount_percentage || 0) / 100);
      acc[frequency].revenue += baseAmount - discountAmount;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(frequencyStats);
  }

  /**
   * Obtener actividad reciente (últimos 30 días)
   */
  private async getRecentActivity() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: subscriptions, error: subError } = await this.supabase
      .from('unified_subscriptions')
      .select('created_at, status, updated_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (subError) throw subError;

    const { data: billing, error: billError } = await this.supabase
      .from('billing_history')
      .select('processed_at, transaction_amount')
      .eq('status', 'approved')
      .gte('processed_at', thirtyDaysAgo.toISOString());

    if (billError) throw billError;

    // Agrupar por día
    const dailyStats: Record<string, any> = {};

    // Procesar suscripciones nuevas
    subscriptions.forEach(sub => {
      const date = sub.created_at.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { date, newSubscriptions: 0, cancelledSubscriptions: 0, revenue: 0 };
      }
      dailyStats[date].newSubscriptions++;
    });

    // Procesar cancelaciones (aproximación basada en updated_at)
    subscriptions.filter(sub => sub.status === 'cancelled').forEach(sub => {
      const date = sub.updated_at?.split('T')[0] || sub.created_at.split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].cancelledSubscriptions++;
      }
    });

    // Procesar ingresos
    billing.forEach(bill => {
      const date = bill.processed_at.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { date, newSubscriptions: 0, cancelledSubscriptions: 0, revenue: 0 };
      }
      dailyStats[date].revenue += bill.transaction_amount || 0;
    });

    return Object.values(dailyStats)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
  }

  /**
   * Calcular tasa de churn y crecimiento
   */
  private async getChurnData() {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 2, 1);

    // Suscripciones del mes pasado
    const { data: lastMonthSubs } = await this.supabase
      .from('unified_subscriptions')
      .select('id, status')
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', lastMonth.toISOString());

    // Suscripciones canceladas este mes
    const { data: cancelledThisMonth } = await this.supabase
      .from('unified_subscriptions')
      .select('id')
      .eq('status', 'cancelled')
      .gte('updated_at', lastMonth.toISOString());

    // Nuevas suscripciones este mes
    const { data: newThisMonth } = await this.supabase
      .from('unified_subscriptions')
      .select('id')
      .gte('created_at', lastMonth.toISOString());

    const lastMonthCount = lastMonthSubs?.length || 0;
    const cancelledCount = cancelledThisMonth?.length || 0;
    const newCount = newThisMonth?.length || 0;

    const churnRate = lastMonthCount > 0 ? (cancelledCount / lastMonthCount) * 100 : 0;
    const growthRate = lastMonthCount > 0 ? ((newCount - cancelledCount) / lastMonthCount) * 100 : 0;

    return { churnRate, growthRate };
  }

  /**
   * Convertir ingresos a base mensual según frecuencia
   */
  private convertToMonthlyRevenue(amount: number, frequency: string): number {
    const multipliers: Record<string, number> = {
      'weekly': 4.33, // ~4.33 semanas por mes
      'biweekly': 2.17, // ~2.17 quincenas por mes
      'monthly': 1,
      'quarterly': 1/3,
      'semiannual': 1/6,
      'annual': 1/12
    };

    return amount * (multipliers[frequency] || 1);
  }

  /**
   * Construir filtro de fecha
   */
  private buildDateFilter(filters: MetricsFilters): string {
    if (filters.startDate) {
      return filters.startDate;
    }

    // Por defecto, últimos 12 meses
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    return twelveMonthsAgo.toISOString();
  }

  /**
   * Obtener métricas en tiempo real (versión optimizada)
   */
  public async getRealTimeMetrics(): Promise<Partial<SubscriptionMetrics>> {
    try {
      // Solo métricas esenciales para tiempo real
      const { data: quickStats } = await this.supabase
        .rpc('subscription_metrics_realtime');

      return {
        totalSubscriptions: quickStats?.total_subscriptions || 0,
        activeSubscriptions: quickStats?.active_subscriptions || 0,
        totalRevenue: quickStats?.total_revenue || 0,
        monthlyRecurringRevenue: quickStats?.recurring_revenue || 0
      };
    } catch (error) {
      detailedLogger.error('❌ Error obteniendo métricas en tiempo real', { error });
      throw error;
    }
  }
}

export default MetricsService;