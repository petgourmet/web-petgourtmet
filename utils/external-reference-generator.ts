/**
 * Generador de external_reference con formato específico requerido por la BD
 * Formato: SUB-{userId}-{planId}-{hash8}
 */

import { createHash } from "crypto";

/**
 * Genera external_reference con el formato exacto requerido por la validación de BD
 * @param userId - UUID del usuario
 * @param planId - ID del plan/producto (string)
 * @param preapprovalId - ID de preapproval de MercadoPago
 * @returns external_reference en formato SUB-{userId}-{planId}-{hash8}
 */
export function makeExternalReference(userId: string, planId: string, preapprovalId: string): string {
  // Generar hash de 8 caracteres usando los 3 parámetros
  const hash8 = createHash("sha256")
    .update(`${userId}:${planId}:${preapprovalId}`)
    .digest("hex")
    .slice(0, 8);
  
  return `SUB-${userId}-${planId}-${hash8}`;
}

/**
 * Genera external_reference alternativo cuando no hay preapprovalId
 * @param userId - UUID del usuario
 * @param planId - ID del plan/producto (string)
 * @param subscriptionType - Tipo de suscripción (monthly, quarterly, etc.)
 * @returns external_reference en formato SUB-{userId}-{planId}-{hash8}
 */
export function makeExternalReferenceWithoutPreapproval(
  userId: string, 
  planId: string, 
  subscriptionType: string = 'monthly'
): string {
  // Usar timestamp actual como tercer parámetro para unicidad
  const timestamp = Date.now().toString();
  const hash8 = createHash("sha256")
    .update(`${userId}:${planId}:${subscriptionType}:${timestamp}`)
    .digest("hex")
    .slice(0, 8);
  
  return `SUB-${userId}-${planId}-${hash8}`;
}

/**
 * Valida si un external_reference tiene el formato correcto
 * @param externalReference - external_reference a validar
 * @returns true si el formato es válido
 */
export function validateExternalReferenceFormat(externalReference: string): boolean {
  // Patrón: SUB-{uuid}-{planId}-{hash8}
  const pattern = /^SUB-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\w+-[a-f0-9]{8}$/i;
  return pattern.test(externalReference);
}

/**
 * Extrae componentes del external_reference
 * @param externalReference - external_reference a parsear
 * @returns objeto con userId, planId y hash8 o null si es inválido
 */
export function parseExternalReference(externalReference: string): {
  userId: string;
  planId: string;
  hash8: string;
} | null {
  const parts = externalReference.split('-');
  
  if (parts.length < 4 || parts[0] !== 'SUB') {
    return null;
  }
  
  // Reconstruir UUID (primeros 5 partes después de SUB)
  const userId = parts.slice(1, 6).join('-');
  
  // El planId puede contener guiones, así que tomamos todo excepto los últimos 8 caracteres del hash
  const planId = parts.slice(6, -1).join('-');
  
  // El hash8 es la última parte
  const hash8 = parts[parts.length - 1];
  
  if (hash8.length !== 8) {
    return null;
  }
  
  return { userId, planId, hash8 };
}