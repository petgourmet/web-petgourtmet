/**
 * Utilidades de diagnóstico y corrección de suscripciones
 * Basado en el análisis de problemas de sincronización con MercadoPago
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SubscriptionDiagnostic {
  id: number;
  user_id: string;
  product_id: number;
  status: string;
  external_reference: string;
  created_at: string;
  issues: string[];
  recommendations: string[];
}

export interface DiagnosticReport {
  pendingSubscriptions: SubscriptionDiagnostic[];
  duplicateGroups: SubscriptionDiagnostic[][];
  orphanedSubscriptions: SubscriptionDiagnostic[];
  inconsistentReferences: SubscriptionDiagnostic[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    autoFixable: number;
  };
}

/**
 * Ejecuta un diagnóstico completo de las suscripciones del usuario
 */
export async function runSubscriptionDiagnostics(userId: string): Promise<DiagnosticReport> {
  console.log('🔍 Iniciando diagnóstico de suscripciones para usuario:', userId);
  
  const report: DiagnosticReport = {
    pendingSubscriptions: [],
    duplicateGroups: [],
    orphanedSubscriptions: [],
    inconsistentReferences: [],
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      autoFixable: 0
    }
  };

  try {
    // 1. Obtener todas las suscripciones del usuario
    const { data: subscriptions, error } = await supabase
      .from('unified_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo suscripciones:', error);
      return report;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No se encontraron suscripciones para el usuario');
      return report;
    }

    // 2. Analizar suscripciones pendientes
    const pendingSubscriptions = subscriptions.filter(sub => sub.status === 'pending');
    for (const sub of pendingSubscriptions) {
      const diagnostic = await analyzePendingSubscription(sub);
      report.pendingSubscriptions.push(diagnostic);
    }

    // 3. Detectar duplicados por external_reference
    const referenceGroups = groupByExternalReference(subscriptions);
    for (const [reference, subs] of referenceGroups.entries()) {
      if (subs.length > 1) {
        const diagnostics = subs.map(sub => analyzeDuplicateSubscription(sub, subs));
        report.duplicateGroups.push(diagnostics);
      }
    }

    // 4. Detectar suscripciones huérfanas (sin producto válido)
    for (const sub of subscriptions) {
      if (!sub.product_id || !sub.product_name) {
        const diagnostic = analyzeOrphanedSubscription(sub);
        report.orphanedSubscriptions.push(diagnostic);
      }
    }

    // 5. Detectar referencias inconsistentes
    for (const sub of subscriptions) {
      if (sub.external_reference && !isValidExternalReference(sub.external_reference, sub.user_id, sub.product_id)) {
        const diagnostic = analyzeInconsistentReference(sub);
        report.inconsistentReferences.push(diagnostic);
      }
    }

    // 6. Calcular resumen
    report.summary = calculateSummary(report);

    console.log('📊 Diagnóstico completado:', report.summary);
    return report;

  } catch (error) {
    console.error('Error en diagnóstico:', error);
    return report;
  }
}

/**
 * Analiza una suscripción pendiente específica
 */
async function analyzePendingSubscription(subscription: any): Promise<SubscriptionDiagnostic> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Verificar si hay una suscripción activa duplicada
  const { data: activeDuplicates } = await supabase
    .from('unified_subscriptions')
    .select('*')
    .eq('user_id', subscription.user_id)
    .eq('product_id', subscription.product_id)
    .eq('status', 'active');

  if (activeDuplicates && activeDuplicates.length > 0) {
    issues.push('Existe suscripción activa duplicada');
    recommendations.push('Eliminar suscripción pendiente duplicada');
  }

  // Verificar completitud de datos
  if (!subscription.product_name) {
    issues.push('Falta nombre del producto');
    recommendations.push('Sincronizar datos del producto');
  }

  if (!subscription.base_price || parseFloat(subscription.base_price) <= 0) {
    issues.push('Precio base inválido');
    recommendations.push('Actualizar precio desde producto');
  }

  if (!subscription.customer_data) {
    issues.push('Faltan datos del cliente');
    recommendations.push('Solicitar completar información del cliente');
  }

  // Verificar antigüedad
  const createdAt = new Date(subscription.created_at);
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceCreation > 7) {
    issues.push(`Suscripción pendiente por ${Math.floor(daysSinceCreation)} días`);
    recommendations.push('Revisar estado en MercadoPago o cancelar');
  }

  return {
    id: subscription.id,
    user_id: subscription.user_id,
    product_id: subscription.product_id,
    status: subscription.status,
    external_reference: subscription.external_reference,
    created_at: subscription.created_at,
    issues,
    recommendations
  };
}

/**
 * Agrupa suscripciones por external_reference
 */
function groupByExternalReference(subscriptions: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const sub of subscriptions) {
    if (sub.external_reference) {
      const existing = groups.get(sub.external_reference) || [];
      existing.push(sub);
      groups.set(sub.external_reference, existing);
    }
  }
  
  return groups;
}

/**
 * Analiza suscripciones duplicadas
 */
function analyzeDuplicateSubscription(subscription: any, allDuplicates: any[]): SubscriptionDiagnostic {
  const issues: string[] = [];
  const recommendations: string[] = [];

  const activeCount = allDuplicates.filter(sub => sub.status === 'active').length;
  const pendingCount = allDuplicates.filter(sub => sub.status === 'pending').length;

  if (activeCount > 1) {
    issues.push(`Múltiples suscripciones activas (${activeCount})`);
    recommendations.push('Mantener solo la más reciente');
  }

  if (pendingCount > 0 && activeCount > 0) {
    issues.push('Suscripciones pendientes con activa existente');
    recommendations.push('Eliminar suscripciones pendientes duplicadas');
  }

  return {
    id: subscription.id,
    user_id: subscription.user_id,
    product_id: subscription.product_id,
    status: subscription.status,
    external_reference: subscription.external_reference,
    created_at: subscription.created_at,
    issues,
    recommendations
  };
}

/**
 * Analiza suscripciones huérfanas
 */
function analyzeOrphanedSubscription(subscription: any): SubscriptionDiagnostic {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!subscription.product_id) {
    issues.push('Falta ID del producto');
    recommendations.push('Eliminar suscripción huérfana');
  }

  if (!subscription.product_name) {
    issues.push('Falta nombre del producto');
    recommendations.push('Sincronizar datos del producto o eliminar');
  }

  return {
    id: subscription.id,
    user_id: subscription.user_id,
    product_id: subscription.product_id,
    status: subscription.status,
    external_reference: subscription.external_reference,
    created_at: subscription.created_at,
    issues,
    recommendations
  };
}

/**
 * Analiza referencias externas inconsistentes
 */
function analyzeInconsistentReference(subscription: any): SubscriptionDiagnostic {
  const issues: string[] = [];
  const recommendations: string[] = [];

  issues.push('Formato de external_reference inconsistente');
  recommendations.push('Regenerar external_reference con formato correcto');

  return {
    id: subscription.id,
    user_id: subscription.user_id,
    product_id: subscription.product_id,
    status: subscription.status,
    external_reference: subscription.external_reference,
    created_at: subscription.created_at,
    issues,
    recommendations
  };
}

/**
 * Valida el formato del external_reference
 */
function isValidExternalReference(externalRef: string, userId: string, productId: number): boolean {
  // Formato esperado: SUB-{userId}-{productId}-{hash8}
  const pattern = new RegExp(`^SUB-${userId}-${productId}-[a-f0-9]{8}$`);
  return pattern.test(externalRef);
}

/**
 * Calcula el resumen del diagnóstico
 */
function calculateSummary(report: DiagnosticReport) {
  let totalIssues = 0;
  let criticalIssues = 0;
  let autoFixable = 0;

  const allDiagnostics = [
    ...report.pendingSubscriptions,
    ...report.duplicateGroups.flat(),
    ...report.orphanedSubscriptions,
    ...report.inconsistentReferences
  ];

  for (const diagnostic of allDiagnostics) {
    totalIssues += diagnostic.issues.length;
    
    // Contar issues críticos
    const criticalKeywords = ['duplicada', 'múltiples', 'huérfana'];
    criticalIssues += diagnostic.issues.filter(issue => 
      criticalKeywords.some(keyword => issue.toLowerCase().includes(keyword))
    ).length;
    
    // Contar issues auto-reparables
    const autoFixKeywords = ['eliminar', 'sincronizar', 'actualizar'];
    autoFixable += diagnostic.recommendations.filter(rec => 
      autoFixKeywords.some(keyword => rec.toLowerCase().includes(keyword))
    ).length;
  }

  return {
    totalIssues,
    criticalIssues,
    autoFixable
  };
}

/**
 * Aplica correcciones automáticas basadas en el diagnóstico
 */
export async function applyAutomaticFixes(userId: string, report: DiagnosticReport): Promise<{
  fixed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fixed = 0;

  try {
    // 1. Eliminar suscripciones pendientes duplicadas
    for (const group of report.duplicateGroups) {
      const activeSubscriptions = group.filter(sub => sub.status === 'active');
      const pendingSubscriptions = group.filter(sub => sub.status === 'pending');
      
      if (activeSubscriptions.length > 0 && pendingSubscriptions.length > 0) {
        const idsToDelete = pendingSubscriptions.map(sub => sub.id);
        
        const { error } = await supabase
          .from('unified_subscriptions')
          .delete()
          .in('id', idsToDelete);
        
        if (error) {
          errors.push(`Error eliminando duplicados: ${error.message}`);
        } else {
          fixed += idsToDelete.length;
          console.log(`✅ Eliminadas ${idsToDelete.length} suscripciones pendientes duplicadas`);
        }
      }
    }

    // 2. Eliminar suscripciones huérfanas
    const orphanedIds = report.orphanedSubscriptions
      .filter(sub => !sub.product_id)
      .map(sub => sub.id);
    
    if (orphanedIds.length > 0) {
      const { error } = await supabase
        .from('unified_subscriptions')
        .delete()
        .in('id', orphanedIds);
      
      if (error) {
        errors.push(`Error eliminando huérfanas: ${error.message}`);
      } else {
        fixed += orphanedIds.length;
        console.log(`✅ Eliminadas ${orphanedIds.length} suscripciones huérfanas`);
      }
    }

    console.log(`🔧 Correcciones automáticas completadas: ${fixed} issues corregidos`);
    
  } catch (error) {
    console.error('Error aplicando correcciones:', error);
    errors.push(`Error general: ${error}`);
  }

  return { fixed, errors };
}

/**
 * Genera un reporte legible para el usuario
 */
export function generateUserReport(report: DiagnosticReport): string {
  const lines: string[] = [];
  
  lines.push('📊 REPORTE DE DIAGNÓSTICO DE SUSCRIPCIONES');
  lines.push('=' .repeat(50));
  lines.push('');
  
  lines.push(`📈 RESUMEN:`);
  lines.push(`   • Total de problemas: ${report.summary.totalIssues}`);
  lines.push(`   • Problemas críticos: ${report.summary.criticalIssues}`);
  lines.push(`   • Auto-reparables: ${report.summary.autoFixable}`);
  lines.push('');
  
  if (report.pendingSubscriptions.length > 0) {
    lines.push(`⏳ SUSCRIPCIONES PENDIENTES (${report.pendingSubscriptions.length}):`);
    for (const sub of report.pendingSubscriptions) {
      lines.push(`   • ID ${sub.id}: ${sub.issues.join(', ')}`);
    }
    lines.push('');
  }
  
  if (report.duplicateGroups.length > 0) {
    lines.push(`🔄 GRUPOS DUPLICADOS (${report.duplicateGroups.length}):`);
    for (let i = 0; i < report.duplicateGroups.length; i++) {
      const group = report.duplicateGroups[i];
      lines.push(`   • Grupo ${i + 1}: ${group.length} suscripciones con misma referencia`);
    }
    lines.push('');
  }
  
  if (report.orphanedSubscriptions.length > 0) {
    lines.push(`🚫 SUSCRIPCIONES HUÉRFANAS (${report.orphanedSubscriptions.length}):`);
    for (const sub of report.orphanedSubscriptions) {
      lines.push(`   • ID ${sub.id}: ${sub.issues.join(', ')}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}