// lib/mercadopago-config.ts
// Configuración dinámica de MercadoPago que cambia según el modo de pruebas

/**
 * Obtiene las credenciales de MercadoPago según el modo configurado
 * @returns Objeto con las credenciales activas
 */
export function getMercadoPagoConfig() {
  const isTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true'
  
  if (isTestMode) {
    // Modo PRUEBAS/SANDBOX
    return {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN_TEST,
      publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST,
      webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET_TEST,
      clientId: process.env.CLIENT_ID_TEST,
      clientSecret: process.env.CLIENT_SECRET_TEST,
      environment: 'sandbox',
      isTestMode: true
    }
  } else {
    // Modo PRODUCCIÓN
    return {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN_PROD,
      publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD,
      webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET_PROD,
      clientId: process.env.CLIENT_ID_PROD,
      clientSecret: process.env.CLIENT_SECRET_PROD,
      environment: 'production',
      isTestMode: false
    }
  }
}

/**
 * Obtiene solo el access token según el modo
 */
export function getMercadoPagoAccessToken(): string {
  const config = getMercadoPagoConfig()
  if (!config.accessToken) {
    throw new Error(`MERCADOPAGO_ACCESS_TOKEN_${config.isTestMode ? 'TEST' : 'PROD'} no está configurado`)
  }
  return config.accessToken
}

/**
 * Obtiene solo la clave pública según el modo
 */
export function getMercadoPagoPublicKey(): string {
  const config = getMercadoPagoConfig()
  if (!config.publicKey) {
    throw new Error(`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_${config.isTestMode ? 'TEST' : 'PROD'} no está configurado`)
  }
  return config.publicKey
}

/**
 * Obtiene el webhook secret según el modo
 */
export function getMercadoPagoWebhookSecret(): string {
  const config = getMercadoPagoConfig()
  if (!config.webhookSecret) {
    throw new Error(`MERCADOPAGO_WEBHOOK_SECRET_${config.isTestMode ? 'TEST' : 'PROD'} no está configurado`)
  }
  return config.webhookSecret
}

/**
 * Verifica si estamos en modo de pruebas
 */
export function isTestMode(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true'
}

/**
 * Obtiene la configuración completa con validación
 */
export function getValidatedMercadoPagoConfig() {
  const config = getMercadoPagoConfig()
  
  const missingVars: string[] = []
  
  if (!config.accessToken) missingVars.push(`MERCADOPAGO_ACCESS_TOKEN_${config.isTestMode ? 'TEST' : 'PROD'}`)
  if (!config.publicKey) missingVars.push(`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_${config.isTestMode ? 'TEST' : 'PROD'}`)
  if (!config.webhookSecret) missingVars.push(`MERCADOPAGO_WEBHOOK_SECRET_${config.isTestMode ? 'TEST' : 'PROD'}`)
  
  if (missingVars.length > 0) {
    throw new Error(`Variables de entorno faltantes para MercadoPago (${config.environment}): ${missingVars.join(', ')}`)
  }
  
  return config
}