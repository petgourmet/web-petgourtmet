'use client'

import { useState, useCallback } from 'react'
import { useRecaptcha } from '@/contexts/RecaptchaProvider'

export interface AntiSpamValidation {
  isValid: boolean
  errors: string[]
  recaptchaToken?: string
  recaptchaScore?: number
}

export interface AntiSpamOptions {
  enableRecaptcha?: boolean
  enableHoneypot?: boolean
  enableContentFilter?: boolean
  minRecaptchaScore?: number
  action?: string
}

export interface FormData {
  [key: string]: any
}

const DEFAULT_OPTIONS: Required<AntiSpamOptions> = {
  enableRecaptcha: true,
  enableHoneypot: true,
  enableContentFilter: true,
  minRecaptchaScore: 0.5,
  action: 'form_submit'
}

// Palabras y patrones sospechosos para detección de spam
const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|poker|lottery|winner|congratulations)\b/i,
  /\b(click here|free money|make money|work from home)\b/i,
  /\b(nigerian prince|inheritance|million dollars|urgent|confidential)\b/i,
  /\b(sex|porn|adult|xxx)\b/i,
  /https?:\/\/[^\s]+/g, // URLs múltiples
  /(.)\1{10,}/, // Caracteres repetidos
  /[A-Z]{20,}/, // Texto en mayúsculas excesivo
]

const SUSPICIOUS_PATTERNS = [
  /\b(test|testing|asdf|qwerty|123456)\b/i,
  /^.{1,2}$/, // Texto muy corto
  /(.+)\1{3,}/, // Patrones repetitivos
]

export function useAntiSpam(options: AntiSpamOptions = {}) {
  const [isValidating, setIsValidating] = useState(false)
  const { executeRecaptcha, isLoaded } = useRecaptcha()
  
  const config = { ...DEFAULT_OPTIONS, ...options }

  const validateContent = useCallback((content: string): { isSpam: boolean; isSuspicious: boolean; reasons: string[] } => {
    const reasons: string[] = []
    let isSpam = false
    let isSuspicious = false

    if (!content || content.trim().length === 0) {
      return { isSpam: false, isSuspicious: false, reasons }
    }

    // Verificar patrones de spam
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        isSpam = true
        reasons.push('Contenido identificado como spam')
        break
      }
    }

    // Verificar patrones sospechosos
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        isSuspicious = true
        reasons.push('Contenido sospechoso detectado')
        break
      }
    }

    // Verificar longitud excesiva
    if (content.length > 5000) {
      isSuspicious = true
      reasons.push('Contenido excesivamente largo')
    }

    // Verificar múltiples URLs
    const urlMatches = content.match(/https?:\/\/[^\s]+/g)
    if (urlMatches && urlMatches.length > 3) {
      isSpam = true
      reasons.push('Múltiples URLs detectadas')
    }

    return { isSpam, isSuspicious, reasons }
  }, [])

  const validateHoneypot = useCallback((formData: FormData): boolean => {
    const honeypotField = process.env.NEXT_PUBLIC_HONEYPOT_FIELD_NAME || 'website'
    return !formData[honeypotField] || formData[honeypotField] === ''
  }, [])

  const validateForm = useCallback(async (
    formData: FormData,
    honeypotValue?: string
  ): Promise<AntiSpamValidation> => {
    setIsValidating(true)
    const errors: string[] = []
    let recaptchaToken: string | undefined
    let recaptchaScore: number | undefined

    try {
      // 1. Validación de Honeypot
      if (config.enableHoneypot) {
        const honeypotField = process.env.NEXT_PUBLIC_HONEYPOT_FIELD_NAME || 'website'
        const honeypotVal = honeypotValue || formData[honeypotField]
        
        if (honeypotVal && honeypotVal !== '') {
          errors.push('Formulario inválido detectado')
          return {
            isValid: false,
            errors,
            recaptchaToken,
            recaptchaScore
          }
        }
      }

      // 2. Validación de contenido
      if (config.enableContentFilter) {
        const contentToCheck = Object.values(formData)
          .filter(value => typeof value === 'string')
          .join(' ')

        const contentValidation = validateContent(contentToCheck)
        
        if (contentValidation.isSpam) {
          errors.push('Contenido no permitido detectado')
        }
        
        if (contentValidation.isSuspicious) {
          errors.push('Contenido sospechoso detectado')
        }
      }

      // 3. Validación de reCAPTCHA
      if (config.enableRecaptcha && isLoaded) {
        try {
          recaptchaToken = await executeRecaptcha(config.action)
          
          if (!recaptchaToken) {
            errors.push('Error de verificación de seguridad')
          } else {
            // Verificar el token en el servidor
            const response = await fetch('/api/security/verify-recaptcha', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: recaptchaToken,
                action: config.action
              })
            })

            if (response.ok) {
              const result = await response.json()
              recaptchaScore = result.score
              
              if (result.score < config.minRecaptchaScore) {
                errors.push('Verificación de seguridad fallida')
              }
            } else {
              errors.push('Error en la verificación de seguridad')
            }
          }
        } catch (error) {
          console.error('Error en reCAPTCHA:', error)
          errors.push('Error de verificación de seguridad')
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        recaptchaToken,
        recaptchaScore
      }

    } catch (error) {
      console.error('Error en validación anti-spam:', error)
      return {
        isValid: false,
        errors: ['Error interno de validación'],
        recaptchaToken,
        recaptchaScore
      }
    } finally {
      setIsValidating(false)
    }
  }, [config, executeRecaptcha, isLoaded, validateContent])

  const submitWithProtection = useCallback(async (
    endpoint: string,
    formData: FormData,
    options: RequestInit = {}
  ) => {
    const validation = await validateForm(formData)
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    // Agregar token de reCAPTCHA a los datos
    const dataToSend = {
      ...formData,
      recaptchaToken: validation.recaptchaToken
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(dataToSend),
      ...options
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Error en el envío del formulario')
    }

    return response.json()
  }, [validateForm])

  return {
    validateForm,
    submitWithProtection,
    isValidating,
    isRecaptchaLoaded: isLoaded,
    validateContent,
    validateHoneypot
  }
}