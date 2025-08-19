/**
 * Configuración de validación y seguridad para producción
 * Este archivo centraliza todas las configuraciones críticas para el entorno de producción
 */

export const PRODUCTION_CONFIG = {
  // Configuración de rate limiting
  RATE_LIMITS: {
    CHECKOUT: {
      maxRequests: 10,
      windowMs: 60000, // 1 minuto
    },
    WEBHOOK: {
      maxRequests: 50,
      windowMs: 60000, // 1 minuto
    },
    API_GENERAL: {
      maxRequests: 100,
      windowMs: 60000, // 1 minuto
    }
  },

  // Configuración de validación
  VALIDATION: {
    // Longitudes mínimas y máximas para campos
    FIELD_LENGTHS: {
      firstName: { min: 2, max: 50 },
      lastName: { min: 2, max: 50 },
      email: { min: 5, max: 100 },
      phone: { min: 8, max: 20 },
      address: { min: 5, max: 200 },
      city: { min: 2, max: 50 },
      state: { min: 2, max: 50 },
      zipCode: { min: 4, max: 10 }
    },
    
    // Patrones de validación
    PATTERNS: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[+]?[\d\s\-\(\)]{8,20}$/,
      zipCode: /^[\d]{4,10}$/,
      name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/,
      address: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.,#\-]{5,200}$/
    },

    // Configuración de precios
    PRICE_LIMITS: {
      min: 0.01,
      max: 999999.99
    },

    // Configuración de cantidad
    QUANTITY_LIMITS: {
      min: 1,
      max: 100
    }
  },

  // Configuración de seguridad
  SECURITY: {
    // Headers de seguridad requeridos
    REQUIRED_HEADERS: [
      'content-type',
      'user-agent'
    ],
    
    // Configuración de CORS
    CORS: {
      allowedOrigins: [
        'https://petgourmet.com',
        'https://www.petgourmet.com',
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
        process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : null
      ].filter(Boolean),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-signature']
    },

    // Configuración de webhook
    WEBHOOK: {
      requiredSignature: process.env.NODE_ENV === 'production',
      maxPayloadSize: 1024 * 1024, // 1MB
      timeout: 30000 // 30 segundos
    }
  },

  // Configuración de logging
  LOGGING: {
    // Niveles de log
    LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    },
    
    // Configuración por entorno
    PRODUCTION: {
      level: 'info',
      enableConsole: false,
      enableFile: true,
      enableRemote: true
    },
    
    DEVELOPMENT: {
      level: 'debug',
      enableConsole: true,
      enableFile: false,
      enableRemote: false
    }
  },

  // Variables de entorno requeridas
  REQUIRED_ENV_VARS: [
    'MERCADOPAGO_ACCESS_TOKEN',
    'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],

  // Variables de entorno opcionales pero recomendadas para producción
  RECOMMENDED_ENV_VARS: [
    'MERCADOPAGO_WEBHOOK_SECRET',
    'NEXT_PUBLIC_SITE_URL',
    'DATABASE_URL'
  ]
}

/**
 * Función para validar la configuración de producción
 */
export function validateProductionConfig(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Validar variables de entorno requeridas
  PRODUCTION_CONFIG.REQUIRED_ENV_VARS.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Variable de entorno requerida faltante: ${envVar}`)
    }
  })

  // Validar variables de entorno recomendadas
  PRODUCTION_CONFIG.RECOMMENDED_ENV_VARS.forEach(envVar => {
    if (!process.env[envVar]) {
      warnings.push(`Variable de entorno recomendada faltante: ${envVar}`)
    }
  })

  // Validar configuración específica de producción
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      errors.push('MERCADOPAGO_WEBHOOK_SECRET es requerido en producción')
    }
    
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      warnings.push('NEXT_PUBLIC_SITE_URL debería estar configurado en producción')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Función para obtener la configuración actual basada en el entorno
 */
export function getCurrentConfig() {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    ...PRODUCTION_CONFIG,
    isProduction,
    logging: isProduction 
      ? PRODUCTION_CONFIG.LOGGING.PRODUCTION 
      : PRODUCTION_CONFIG.LOGGING.DEVELOPMENT
  }
}