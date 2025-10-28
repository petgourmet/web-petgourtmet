/**
 * Configuración de Stripe
 * 
 * Este archivo centraliza la configuración de Stripe para el servidor
 * Documentación: https://docs.stripe.com/api
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY no está configurada. Por favor agrega tu clave secreta de Stripe en el archivo .env'
  )
}

// Inicializar Stripe con la clave secreta
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
  appInfo: {
    name: 'PetGourmet',
    version: '1.0.0',
  },
})

// Configuración de la aplicación
export const stripeConfig = {
  currency: process.env.NEXT_PUBLIC_STRIPE_CURRENCY || 'mxn',
  successUrl: {
    oneTime: `${process.env.NEXT_PUBLIC_SITE_URL}/gracias-por-tu-compra`,
    subscription: `${process.env.NEXT_PUBLIC_SITE_URL}/suscripcion/exito`,
  },
  cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
}

// Validar configuración crítica
export function validateStripeConfig() {
  const errors: string[] = []
  
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY no está configurada')
  }
  
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada')
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
    errors.push('STRIPE_WEBHOOK_SECRET es requerida en producción')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

export default stripe
