// lib/checkout-validators.ts

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface CustomerData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: {
    street_name: string
    street_number: string
    zip_code: string
    city: string
    state: string
    country: string
  }
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  isSubscription?: boolean
  size?: string
  image?: string
}

// Validadores de datos del cliente
export const validateCustomerData = (customerData: CustomerData): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validar nombre
  if (!customerData.firstName?.trim()) {
    errors.push('El nombre es requerido')
  } else if (customerData.firstName.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres')
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(customerData.firstName.trim())) {
    errors.push('El nombre solo puede contener letras')
  }

  // Validar apellido
  if (!customerData.lastName?.trim()) {
    errors.push('El apellido es requerido')
  } else if (customerData.lastName.trim().length < 2) {
    errors.push('El apellido debe tener al menos 2 caracteres')
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(customerData.lastName.trim())) {
    errors.push('El apellido solo puede contener letras')
  }

  // Validar email
  if (!customerData.email?.trim()) {
    errors.push('El email es requerido')
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerData.email.trim())) {
      errors.push('El formato del email no es válido')
    }
  }

  // Validar teléfono
  if (!customerData.phone?.trim()) {
    errors.push('El teléfono es requerido')
  } else {
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/
    if (!phoneRegex.test(customerData.phone.trim())) {
      errors.push('El formato del teléfono no es válido (10-15 dígitos)')
    }
  }

  // Validar dirección
  if (!customerData.address) {
    errors.push('La dirección es requerida')
  } else {
    if (!customerData.address.street_name?.trim()) {
      errors.push('El nombre de la calle es requerido')
    }
    
    if (!customerData.address.street_number?.trim()) {
      errors.push('El número de la calle es requerido')
    } else if (!/^[0-9a-zA-Z\s\-#]+$/.test(customerData.address.street_number.trim())) {
      errors.push('El número de la calle no es válido')
    }
    
    if (!customerData.address.zip_code?.trim()) {
      errors.push('El código postal es requerido')
    } else if (!/^[0-9]{5,6}$/.test(customerData.address.zip_code.trim())) {
      errors.push('El código postal debe tener 5 o 6 dígitos')
    }
    
    if (!customerData.address.city?.trim()) {
      errors.push('La ciudad es requerida')
    } else if (customerData.address.city.trim().length < 2) {
      errors.push('La ciudad debe tener al menos 2 caracteres')
    }
    
    if (!customerData.address.state?.trim()) {
      errors.push('El estado es requerido')
    }
    
    if (!customerData.address.country?.trim()) {
      errors.push('El país es requerido')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validadores del carrito
export const validateCart = (cart: CartItem[]): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!cart || !Array.isArray(cart)) {
    errors.push('El carrito no es válido')
    return { isValid: false, errors, warnings }
  }

  if (cart.length === 0) {
    errors.push('El carrito está vacío')
    return { isValid: false, errors, warnings }
  }

  // Validar cada item del carrito
  cart.forEach((item, index) => {
    if (!item.id) {
      errors.push(`Item ${index + 1}: ID es requerido`)
    }
    
    if (!item.name?.trim()) {
      errors.push(`Item ${index + 1}: Nombre es requerido`)
    }
    
    if (typeof item.price !== 'number' || item.price <= 0) {
      errors.push(`Item ${index + 1}: Precio debe ser un número mayor a 0`)
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      errors.push(`Item ${index + 1}: Cantidad debe ser un número entero mayor a 0`)
    }
    
    if (item.quantity > 10) {
      warnings.push(`Item ${index + 1}: Cantidad muy alta (${item.quantity})`)
    }
  })

  // Validar total del carrito
  const total = cart.reduce((sum, item) => {
    const itemPrice = item.isSubscription ? item.price * 0.9 : item.price
    return sum + (itemPrice * item.quantity)
  }, 0)

  if (total > 50000) {
    warnings.push('El total del carrito es muy alto, puede requerir verificación adicional')
  }

  if (total < 1) {
    errors.push('El total del carrito debe ser mayor a $1')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validador de suscripciones
export const validateSubscriptionItems = (cart: CartItem[]): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  const subscriptionItems = cart.filter(item => item.isSubscription)
  const regularItems = cart.filter(item => !item.isSubscription)

  if (subscriptionItems.length > 0 && regularItems.length > 0) {
    warnings.push('Mezclar productos de suscripción con compras únicas puede complicar el procesamiento')
  }

  if (subscriptionItems.length > 3) {
    warnings.push('Muchos productos de suscripción en una sola orden')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validador de preferencia de MercadoPago
export const validateMercadoPagoPreference = (preferenceData: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!preferenceData.items || !Array.isArray(preferenceData.items) || preferenceData.items.length === 0) {
    errors.push('Items de preferencia son requeridos')
  }

  if (!preferenceData.payer?.email) {
    errors.push('Email del pagador es requerido')
  }

  if (!preferenceData.external_reference) {
    errors.push('Referencia externa es requerida')
  }

  if (!preferenceData.notification_url) {
    warnings.push('URL de notificación no configurada')
  }

  if (!preferenceData.back_urls?.success) {
    warnings.push('URL de éxito no configurada')
  }

  // Validar items de la preferencia
  preferenceData.items?.forEach((item: any, index: number) => {
    if (!item.title) {
      errors.push(`Item ${index + 1}: Título es requerido`)
    }
    
    if (typeof item.unit_price !== 'number' || item.unit_price <= 0) {
      errors.push(`Item ${index + 1}: Precio unitario debe ser mayor a 0`)
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Cantidad debe ser mayor a 0`)
    }
    
    if (item.currency_id !== 'MXN') {
      warnings.push(`Item ${index + 1}: Moneda no es MXN`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validador completo del checkout
export const validateCompleteCheckout = (customerData: CustomerData, cart: CartItem[]): ValidationResult => {
  const customerValidation = validateCustomerData(customerData)
  const cartValidation = validateCart(cart)
  const subscriptionValidation = validateSubscriptionItems(cart)

  const allErrors = [
    ...customerValidation.errors,
    ...cartValidation.errors,
    ...subscriptionValidation.errors
  ]

  const allWarnings = [
    ...(customerValidation.warnings || []),
    ...(cartValidation.warnings || []),
    ...(subscriptionValidation.warnings || [])
  ]

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

// Sanitizadores de datos
export const sanitizeCustomerData = (customerData: CustomerData): CustomerData => {
  return {
    firstName: customerData.firstName?.trim() || '',
    lastName: customerData.lastName?.trim() || '',
    email: customerData.email?.trim().toLowerCase() || '',
    phone: customerData.phone?.trim().replace(/[^0-9+\-\s\(\)]/g, '') || '',
    address: {
      street_name: customerData.address?.street_name?.trim() || '',
      street_number: customerData.address?.street_number?.trim() || '',
      zip_code: customerData.address?.zip_code?.trim().replace(/[^0-9]/g, '') || '',
      city: customerData.address?.city?.trim() || '',
      state: customerData.address?.state?.trim() || '',
      country: customerData.address?.country?.trim() || 'México'
    }
  }
}

// Validador de variables de entorno
export const validateEnvironmentVariables = (): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  const requiredVars = [
    'MERCADOPAGO_ACCESS_TOKEN',
    'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Variable de entorno requerida: ${varName}`)
    }
  })

  const optionalVars = [
    'MERCADOPAGO_WEBHOOK_SECRET',
    'NEXT_PUBLIC_BASE_URL',
    'SMTP_HOST',
    'SMTP_USER'
  ]

  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Variable de entorno opcional no configurada: ${varName}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validador de seguridad para webhooks
export const validateWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
  if (!secret) {
    console.warn('⚠️ Webhook secret no configurado, saltando validación')
    return true // En desarrollo permitir sin validación
  }

  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Error validando firma del webhook:', error)
    return false
  }
}

// Utilidades de logging para producción
export const logValidationErrors = (context: string, validation: ValidationResult) => {
  if (!validation.isValid) {
    console.error(`❌ Errores de validación en ${context}:`, validation.errors)
  }
  
  if (validation.warnings && validation.warnings.length > 0) {
    console.warn(`⚠️ Advertencias en ${context}:`, validation.warnings)
  }
}

// Rate limiting simple
const requestCounts = new Map<string, { count: number, resetTime: number }>()

export const checkRateLimit = (identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}