'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface ValidationResult {
  valid: boolean
  user?: {
    id: string
    email: string
    full_name: string
  }
  external_reference?: string
  extracted_user_id?: string
  plan_id?: string
  plan_info?: any
  timestamp?: number
  expires_at?: string
  error?: string
  existing_subscription?: any
}

interface SubscriptionLinkValidatorProps {
  onValidationComplete?: (result: ValidationResult) => void
  redirectOnSuccess?: string
  redirectOnError?: string
}

export default function SubscriptionLinkValidator({
  onValidationComplete,
  redirectOnSuccess = '/suscripcion',
  redirectOnError = '/planes'
}: SubscriptionLinkValidatorProps) {
  const [validationState, setValidationState] = useState<'loading' | 'success' | 'error' | 'warning'>('loading')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const external_reference = searchParams.get('external_reference')
  const user_id = searchParams.get('user_id')
  
  useEffect(() => {
    if (!external_reference) {
      setValidationState('error')
      setMessage('Enlace de suscripción inválido: falta referencia externa')
      return
    }
    
    validateSubscriptionLink()
  }, [external_reference, user_id, user])
  
  const validateSubscriptionLink = async () => {
    try {
      setValidationState('loading')
      setMessage('Validando enlace de suscripción...')
      
      const response = await fetch('/api/subscriptions/validate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          external_reference,
          user_id: user?.id || user_id
        })
      })
      
      const result: ValidationResult = await response.json()
      setValidationResult(result)
      
      if (response.ok && result.valid) {
        setValidationState('success')
        setMessage('Enlace de suscripción válido')
        
        // Verificar si el usuario actual coincide con el del enlace
        if (user && user.id !== result.extracted_user_id) {
          setValidationState('warning')
          setMessage('Este enlace pertenece a otro usuario. Por favor, inicia sesión con la cuenta correcta.')
          toast.warning('Enlace para otro usuario', {
            description: 'Este enlace de suscripción pertenece a otro usuario.'
          })
        } else {
          toast.success('Enlace válido', {
            description: 'El enlace de suscripción es válido y puede ser procesado.'
          })
          
          // Redirigir después de un breve delay
          setTimeout(() => {
            if (onValidationComplete) {
              onValidationComplete(result)
            } else {
              router.push(redirectOnSuccess)
            }
          }, 2000)
        }
      } else {
        setValidationState('error')
        
        if (response.status === 409) {
          // Suscripción duplicada o usuario ya tiene suscripción activa
          setMessage(result.error || 'Ya existe una suscripción activa')
          toast.error('Suscripción existente', {
            description: result.error
          })
          
          // Redirigir a la página de suscripciones existentes
          setTimeout(() => {
            router.push('/suscripcion')
          }, 3000)
        } else if (response.status === 400 && result.error?.includes('expirado')) {
          setMessage('El enlace de suscripción ha expirado')
          toast.error('Enlace expirado', {
            description: 'Este enlace de suscripción ya no es válido. Por favor, genera uno nuevo.'
          })
          
          setTimeout(() => {
            router.push(redirectOnError)
          }, 3000)
        } else {
          setMessage(result.error || 'Error validando el enlace de suscripción')
          toast.error('Error de validación', {
            description: result.error || 'No se pudo validar el enlace de suscripción'
          })
          
          setTimeout(() => {
            router.push(redirectOnError)
          }, 3000)
        }
      }
    } catch (error: any) {
      console.error('Error validating subscription link:', error)
      setValidationState('error')
      setMessage('Error de conexión al validar el enlace')
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor para validar el enlace.'
      })
      
      setTimeout(() => {
        router.push(redirectOnError)
      }, 3000)
    }
  }
  
  const getIcon = () => {
    switch (validationState) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />
      default:
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
    }
  }
  
  const getBackgroundColor = () => {
    switch (validationState) {
      case 'loading':
        return 'bg-blue-50'
      case 'success':
        return 'bg-green-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'error':
        return 'bg-red-50'
      default:
        return 'bg-gray-50'
    }
  }
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${getBackgroundColor()}`}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            {getIcon()}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {validationState === 'loading' && 'Validando Enlace'}
            {validationState === 'success' && 'Enlace Válido'}
            {validationState === 'warning' && 'Atención Requerida'}
            {validationState === 'error' && 'Error de Validación'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          
          {validationResult && validationResult.valid && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Detalles del Enlace:</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {validationResult.user && (
                  <p><span className="font-medium">Usuario:</span> {validationResult.user.full_name || validationResult.user.email}</p>
                )}
                {validationResult.plan_info && (
                  <p><span className="font-medium">Plan:</span> {validationResult.plan_info.name}</p>
                )}
                {validationResult.expires_at && (
                  <p><span className="font-medium">Expira:</span> {new Date(validationResult.expires_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
          
          {validationState === 'loading' && (
            <div className="text-sm text-gray-500">
              Por favor espera mientras validamos tu enlace de suscripción...
            </div>
          )}
          
          {validationState !== 'loading' && (
            <div className="text-sm text-gray-500">
              Serás redirigido automáticamente en unos segundos...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook personalizado para usar el validador
export function useSubscriptionLinkValidator() {
  const searchParams = useSearchParams()
  const external_reference = searchParams.get('external_reference')
  
  return {
    hasSubscriptionLink: !!external_reference,
    external_reference
  }
}