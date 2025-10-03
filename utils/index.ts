// Utilidades principales para el sistema de webhooks

export function createIdempotencyService() {
  const processedIds = new Set<string>();
  
  return {
    isProcessed: (id: string): boolean => {
      return processedIds.has(id);
    },
    
    markAsProcessed: (id: string): void => {
      processedIds.add(id);
    },
    
    clear: (): void => {
      processedIds.clear();
    }
  };
}

export function generateHash(input: string): string {
  // Función simple de hash para generar identificadores únicos
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function parseExternalReference(externalRef: string): {
  userId?: string;
  productId?: string;
  hash?: string;
  isValid: boolean;
} {
  if (!externalRef || !externalRef.startsWith('SUB-')) {
    return { isValid: false };
  }

  const parts = externalRef.split('-');
  if (parts.length < 4) {
    return { isValid: false };
  }

  // Formato: SUB-{userId}-{productId}-{hash}
  const userId = parts.slice(1, 6).join('-'); // UUID completo
  const productId = parts[6];
  const hash = parts[7];

  return {
    userId,
    productId,
    hash,
    isValid: !!(userId && productId && hash)
  };
}