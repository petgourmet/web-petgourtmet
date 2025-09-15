// lib/subscription-integrity-checker.ts
import { createClient } from '@/lib/supabase/server';

export interface IntegrityCheckResult {
  user_id: string;
  external_reference?: string;
  checks: {
    has_pending_subscription: boolean;
    has_active_subscription: boolean;
    user_profile_updated: boolean;
    external_reference_linked: boolean;
    webhook_logs_exist: boolean;
    billing_history_exists: boolean;
    subscription_dates_valid: boolean;
  };
  data: {
    pending_subscription?: any;
    active_subscription?: any;
    user_profile?: any;
    webhook_logs: any[];
    billing_history: any[];
  };
  issues: string[];
  recommendations: string[];
  integrity_score: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface BatchIntegrityResult {
  total_users: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  results: IntegrityCheckResult[];
  summary: {
    common_issues: { issue: string; count: number }[];
    avg_integrity_score: number;
    recommendations: string[];
  };
}

export class SubscriptionIntegrityChecker {
  private supabase: any;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Verifica la integridad de una suscripción específica
   */
  async checkUserSubscriptionIntegrity(
    user_id: string, 
    external_reference?: string
  ): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      user_id,
      external_reference,
      checks: {
        has_pending_subscription: false,
        has_active_subscription: false,
        user_profile_updated: false,
        external_reference_linked: false,
        webhook_logs_exist: false,
        billing_history_exists: false,
        subscription_dates_valid: false
      },
      data: {
        webhook_logs: [],
        billing_history: []
      },
      issues: [],
      recommendations: [],
      integrity_score: 0,
      status: 'critical'
    };

    try {
      // 1. Verificar suscripción pendiente
      await this.checkPendingSubscription(result);
      
      // 2. Verificar suscripción activa
      await this.checkActiveSubscription(result);
      
      // 3. Verificar perfil de usuario
      await this.checkUserProfile(result);
      
      // 4. Verificar logs de webhooks
      await this.checkWebhookLogs(result);
      
      // 5. Verificar historial de facturación
      await this.checkBillingHistory(result);
      
      // 6. Verificar fechas de suscripción
      await this.checkSubscriptionDates(result);
      
      // 7. Calcular puntuación de integridad
      this.calculateIntegrityScore(result);
      
      // 8. Generar recomendaciones
      this.generateRecommendations(result);
      
    } catch (error) {
      result.issues.push(`Error durante verificación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return result;
  }

  /**
   * Verifica la integridad de múltiples usuarios
   */
  async checkBatchIntegrity(
    user_ids?: string[], 
    limit: number = 50
  ): Promise<BatchIntegrityResult> {
    const batchResult: BatchIntegrityResult = {
      total_users: 0,
      healthy_count: 0,
      warning_count: 0,
      critical_count: 0,
      results: [],
      summary: {
        common_issues: [],
        avg_integrity_score: 0,
        recommendations: []
      }
    };

    try {
      // Si no se proporcionan user_ids, obtener usuarios con suscripciones
      if (!user_ids) {
        const { data: users } = await this.supabase
          .from('user_subscriptions')
          .select('user_id')
          .limit(limit);
        
        user_ids = users?.map((u: any) => u.user_id) || [];
      }

      batchResult.total_users = user_ids.length;

      // Verificar cada usuario
      for (const user_id of user_ids) {
        const userResult = await this.checkUserSubscriptionIntegrity(user_id);
        batchResult.results.push(userResult);
        
        // Contar por estado
        switch (userResult.status) {
          case 'healthy':
            batchResult.healthy_count++;
            break;
          case 'warning':
            batchResult.warning_count++;
            break;
          case 'critical':
            batchResult.critical_count++;
            break;
        }
      }

      // Generar resumen
      this.generateBatchSummary(batchResult);
      
    } catch (error) {
      console.error('❌ Error en verificación por lotes:', error);
    }

    return batchResult;
  }

  private async checkPendingSubscription(result: IntegrityCheckResult) {
    try {
      let query = this.supabase.from('pending_subscriptions').select('*');
      
      if (result.external_reference) {
        query = query.eq('external_reference', result.external_reference);
      } else {
        query = query.eq('user_id', result.user_id);
      }
      
      const { data } = await query.order('created_at', { ascending: false }).limit(1);
      
      if (data && data.length > 0) {
        result.checks.has_pending_subscription = true;
        result.data.pending_subscription = data[0];
        
        if (data[0].external_reference === result.external_reference) {
          result.checks.external_reference_linked = true;
        }
      } else if (result.external_reference) {
        result.issues.push('No se encontró suscripción pendiente para external_reference');
      }
    } catch (error) {
      result.issues.push(`Error verificando suscripción pendiente: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async checkActiveSubscription(result: IntegrityCheckResult) {
    try {
      const { data } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', result.user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        result.checks.has_active_subscription = true;
        result.data.active_subscription = data[0];
      } else {
        result.issues.push('No se encontró suscripción activa para el usuario');
      }
    } catch (error) {
      result.issues.push(`Error verificando suscripción activa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async checkUserProfile(result: IntegrityCheckResult) {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', result.user_id)
        .single();
      
      if (data) {
        result.data.user_profile = data;
        
        if (data.has_active_subscription === true && result.checks.has_active_subscription) {
          result.checks.user_profile_updated = true;
        } else if (result.checks.has_active_subscription && !data.has_active_subscription) {
          result.issues.push('Perfil no actualizado: has_active_subscription debería ser true');
        } else if (!result.checks.has_active_subscription && data.has_active_subscription) {
          result.issues.push('Perfil inconsistente: has_active_subscription es true pero no hay suscripción activa');
        }
      } else {
        result.issues.push('No se encontró perfil de usuario');
      }
    } catch (error) {
      result.issues.push(`Error verificando perfil de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async checkWebhookLogs(result: IntegrityCheckResult) {
    try {
      if (result.external_reference) {
        const { data } = await this.supabase
          .from('webhook_logs')
          .select('*')
          .ilike('payload', `%${result.external_reference}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (data && data.length > 0) {
          result.checks.webhook_logs_exist = true;
          result.data.webhook_logs = data;
        } else {
          result.issues.push('No se encontraron logs de webhooks para external_reference');
        }
      }
    } catch (error) {
      result.issues.push(`Error verificando logs de webhooks: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async checkBillingHistory(result: IntegrityCheckResult) {
    try {
      const { data } = await this.supabase
        .from('subscription_billing_history')
        .select('*')
        .eq('user_id', result.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data && data.length > 0) {
        result.checks.billing_history_exists = true;
        result.data.billing_history = data;
      } else if (result.checks.has_active_subscription) {
        result.issues.push('Suscripción activa sin historial de facturación');
      }
    } catch (error) {
      result.issues.push(`Error verificando historial de facturación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async checkSubscriptionDates(result: IntegrityCheckResult) {
    try {
      if (result.data.active_subscription) {
        const subscription = result.data.active_subscription;
        const now = new Date();
        const startDate = new Date(subscription.start_date);
        const endDate = new Date(subscription.end_date);
        
        if (startDate <= now && now <= endDate) {
          result.checks.subscription_dates_valid = true;
        } else {
          result.issues.push(`Fechas de suscripción inválidas: ${startDate.toISOString()} - ${endDate.toISOString()}`);
        }
      }
    } catch (error) {
      result.issues.push(`Error verificando fechas de suscripción: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private calculateIntegrityScore(result: IntegrityCheckResult) {
    const checks = result.checks;
    const weights = {
      has_active_subscription: 25,
      user_profile_updated: 20,
      external_reference_linked: 15,
      subscription_dates_valid: 15,
      webhook_logs_exist: 10,
      billing_history_exists: 10,
      has_pending_subscription: 5
    };
    
    let score = 0;
    Object.entries(checks).forEach(([check, passed]) => {
      if (passed && weights[check as keyof typeof weights]) {
        score += weights[check as keyof typeof weights];
      }
    });
    
    result.integrity_score = score;
    
    // Determinar estado
    if (score >= 80) {
      result.status = 'healthy';
    } else if (score >= 50) {
      result.status = 'warning';
    } else {
      result.status = 'critical';
    }
  }

  private generateRecommendations(result: IntegrityCheckResult) {
    const recommendations: string[] = [];
    
    if (!result.checks.has_active_subscription) {
      recommendations.push('Crear suscripción activa para el usuario');
    }
    
    if (!result.checks.user_profile_updated) {
      recommendations.push('Actualizar perfil de usuario con has_active_subscription = true');
    }
    
    if (!result.checks.external_reference_linked && result.external_reference) {
      recommendations.push('Verificar y corregir la relación external_reference');
    }
    
    if (!result.checks.webhook_logs_exist && result.external_reference) {
      recommendations.push('Revisar procesamiento de webhooks de MercadoPago');
    }
    
    if (!result.checks.billing_history_exists && result.checks.has_active_subscription) {
      recommendations.push('Crear registro inicial en historial de facturación');
    }
    
    if (!result.checks.subscription_dates_valid) {
      recommendations.push('Corregir fechas de inicio y fin de suscripción');
    }
    
    result.recommendations = recommendations;
  }

  private generateBatchSummary(batchResult: BatchIntegrityResult) {
    // Calcular promedio de puntuación
    const totalScore = batchResult.results.reduce((sum, r) => sum + r.integrity_score, 0);
    batchResult.summary.avg_integrity_score = batchResult.total_users > 0 ? totalScore / batchResult.total_users : 0;
    
    // Contar problemas comunes
    const issueCount: { [key: string]: number } = {};
    batchResult.results.forEach(result => {
      result.issues.forEach(issue => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });
    });
    
    batchResult.summary.common_issues = Object.entries(issueCount)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Generar recomendaciones generales
    const recommendations: string[] = [];
    
    if (batchResult.critical_count > 0) {
      recommendations.push(`Atender urgentemente ${batchResult.critical_count} usuarios en estado crítico`);
    }
    
    if (batchResult.warning_count > 0) {
      recommendations.push(`Revisar ${batchResult.warning_count} usuarios con advertencias`);
    }
    
    if (batchResult.summary.avg_integrity_score < 70) {
      recommendations.push('Implementar proceso de limpieza de datos de suscripciones');
    }
    
    batchResult.summary.recommendations = recommendations;
  }

  /**
   * Genera un reporte detallado en formato texto
   */
  generateTextReport(result: IntegrityCheckResult): string {
    let report = `\n🔍 REPORTE DE INTEGRIDAD DE SUSCRIPCIÓN\n`;
    report += `👤 Usuario: ${result.user_id}\n`;
    if (result.external_reference) {
      report += `🔗 External Reference: ${result.external_reference}\n`;
    }
    report += `📊 Puntuación: ${result.integrity_score}/100\n`;
    report += `🚦 Estado: ${result.status.toUpperCase()}\n\n`;
    
    report += `✅ VERIFICACIONES:\n`;
    Object.entries(result.checks).forEach(([check, passed]) => {
      report += `  ${passed ? '✅' : '❌'} ${check.replace(/_/g, ' ')}\n`;
    });
    
    if (result.issues.length > 0) {
      report += `\n⚠️ PROBLEMAS ENCONTRADOS:\n`;
      result.issues.forEach((issue, index) => {
        report += `  ${index + 1}. ${issue}\n`;
      });
    }
    
    if (result.recommendations.length > 0) {
      report += `\n💡 RECOMENDACIONES:\n`;
      result.recommendations.forEach((rec, index) => {
        report += `  ${index + 1}. ${rec}\n`;
      });
    }
    
    return report;
  }
}

// Función de utilidad para uso rápido
export async function quickIntegrityCheck(user_id: string, external_reference?: string): Promise<IntegrityCheckResult> {
  const checker = new SubscriptionIntegrityChecker();
  return await checker.checkUserSubscriptionIntegrity(user_id, external_reference);
}

// Función para verificación por lotes
export async function batchIntegrityCheck(user_ids?: string[], limit: number = 50): Promise<BatchIntegrityResult> {
  const checker = new SubscriptionIntegrityChecker();
  return await checker.checkBatchIntegrity(user_ids, limit);