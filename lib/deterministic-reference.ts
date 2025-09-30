import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Generador de external_reference determinístico para prevenir duplicaciones
 * Utiliza identificadores únicos del usuario y producto para generar referencias consistentes
 */

export interface ReferenceConfig {
  includeTimestamp?: boolean;
  includeUserEmail?: boolean;
  maxLength?: number;
  prefix?: string;
}

export interface ReferenceComponents {
  userId: string;
  productId: string;
  userEmail?: string;
  timestamp?: number;
  type: 'new' | 'reactivation' | 'renewal';
}

export interface ExistingSubscription {
  subscription_id: string;
  status: string;
  external_reference: string;
  created_at: string;
  can_reuse: boolean;
}

/**
 * Genera un external_reference determinístico basado en componentes únicos
 */
export function generateDeterministicReference(
  components: ReferenceComponents,
  config: ReferenceConfig = {}
): string {
  const {
    includeTimestamp = false,
    includeUserEmail = false,
    maxLength = 64,
    prefix = ''
  } = config;

  // Crear string base con componentes principales
  let baseString = `${components.userId}:${components.productId}:${components.type}`;
  
  // Agregar email si se especifica
  if (includeUserEmail && components.userEmail) {
    baseString += `:${components.userEmail}`;
  }
  
  // Agregar timestamp si se especifica (para referencias únicas por tiempo)
  if (includeTimestamp && components.timestamp) {
    baseString += `:${components.timestamp}`;
  }

  // Generar hash determinístico (8 caracteres)
  const hash = crypto
    .createHash('sha256')
    .update(baseString)
    .digest('hex')
    .substring(0, 8);

  // Construir referencia final con formato SUB-{userId}-{productId}-{hash}
  const reference = `SUB-${components.userId}-${components.productId}-${hash}`;
  
  // Verificar longitud máxima
  if (reference.length > maxLength) {
    // Si excede, usar solo hash con prefijo SUB
    return `SUB-${hash}`;
  }

  return reference;
}

/**
 * Busca suscripciones existentes que pueden ser reutilizadas
 */
export async function findExistingSubscription(
  userId: string,
  productName: string,
  externalReference?: string
): Promise<ExistingSubscription | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('find_existing_subscription', {
      p_user_id: userId,
      p_product_name: productName,
      p_external_reference: externalReference || null
    });

    if (error) {
      console.error('Error buscando suscripción existente:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error en findExistingSubscription:', error);
    return null;
  }
}

/**
 * Reactiva una suscripción existente
 */
export async function reactivateExistingSubscription(
  subscriptionId: string,
  externalReference: string,
  mercadopagoData?: any
): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('reactivate_subscription', {
      p_subscription_id: subscriptionId,
      p_external_reference: externalReference,
      p_mercadopago_data: mercadopagoData || null
    });

    if (error) {
      console.error('Error reactivando suscripción:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error en reactivateExistingSubscription:', error);
    return false;
  }
}

/**
 * Genera un external_reference único para una nueva suscripción
 * Incluye timestamp para evitar colisiones en casos edge
 */
export function generateUniqueReference(
  identifiers: SubscriptionIdentifiers,
  options: DeterministicReferenceOptions = {}
): string {
  return generateDeterministicReference(identifiers, {
    ...options,
    includeTimestamp: true,
    timestampWindow: 5 // Ventana de 5 minutos para nuevas suscripciones
  })
}

/**
 * Genera un external_reference para reactivación de suscripción existente
 * No incluye timestamp para permitir reactivaciones determinísticas
 */
export function generateReactivationReference(
  identifiers: SubscriptionIdentifiers,
  options: DeterministicReferenceOptions = {}
): string {
  return generateDeterministicReference(identifiers, {
    ...options,
    includeTimestamp: false,
    useUserEmail: true // Usar email para mayor precisión en reactivaciones
  })
}

/**
 * Valida si un external_reference sigue el formato esperado
 */
export function validateReferenceFormat(reference: string): boolean {
  // Debe ser exactamente 32 caracteres hexadecimales
  return /^[a-f0-9]{32}$/.test(reference)
}

/**
 * Extrae información del contexto de un external_reference determinístico
 * Nota: Solo funciona si se conocen los componentes originales
 */
export function verifyReference(
  reference: string,
  identifiers: SubscriptionIdentifiers,
  options: DeterministicReferenceOptions = {}
): boolean {
  const expectedReference = generateDeterministicReference(identifiers, options)
  return reference === expectedReference
}

/**
 * Genera múltiples variantes de external_reference para búsqueda
 * Útil para encontrar suscripciones existentes con diferentes configuraciones
 */
export function generateReferenceVariants(
  identifiers: SubscriptionIdentifiers
): string[] {
  const variants: string[] = []

  // Variante básica sin timestamp
  variants.push(generateDeterministicReference(identifiers, {
    includeTimestamp: false,
    useUserEmail: false
  }))

  // Variante con email
  if (identifiers.userEmail) {
    variants.push(generateDeterministicReference(identifiers, {
      includeTimestamp: false,
      useUserEmail: true
    }))
  }

  // Variantes con diferentes ventanas de tiempo (últimas 24 horas)
  const now = new Date()
  for (let hours = 0; hours < 24; hours++) {
    const timestamp = new Date(now.getTime() - (hours * 60 * 60 * 1000))
    
    variants.push(generateDeterministicReference({
      ...identifiers,
      timestamp: timestamp.toISOString()
    }, {
      includeTimestamp: true,
      timestampWindow: 60 // Ventana de 1 hora
    }))

    variants.push(generateDeterministicReference({
      ...identifiers,
      timestamp: timestamp.toISOString()
    }, {
      includeTimestamp: true,
      timestampWindow: 5 // Ventana de 5 minutos
    }))
  }

  // Remover duplicados
  return [...new Set(variants)]
}

/**
 * Configuración por defecto para diferentes tipos de suscripción
 */
export const REFERENCE_CONFIGS = {
  NEW_SUBSCRIPTION: {
    includeTimestamp: true,
    timestampWindow: 5,
    useUserEmail: false
  },
  REACTIVATION: {
    includeTimestamp: false,
    timestampWindow: 0,
    useUserEmail: true
  },
  RENEWAL: {
    includeTimestamp: false,
    timestampWindow: 0,
    useUserEmail: false
  }
} as const

/**
 * Función principal para generar external_reference según el tipo de operación
 */
export function generateSubscriptionReference(
  identifiers: SubscriptionIdentifiers,
  type: keyof typeof REFERENCE_CONFIGS = 'NEW_SUBSCRIPTION'
): string {
  const config = REFERENCE_CONFIGS[type]
  return generateDeterministicReference(identifiers, config)
}

// Exportar tipos para uso en otros módulos
export type ReferenceType = keyof typeof REFERENCE_CONFIGS