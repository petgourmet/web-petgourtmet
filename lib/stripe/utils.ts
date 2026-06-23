/**
 * Extrae el ID de un recurso de Stripe que puede venir como string o como objeto expandido.
 */
export function extractStripeId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id
  }
  return null
}
