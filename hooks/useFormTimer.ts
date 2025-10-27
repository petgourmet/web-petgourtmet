'use client'

import { useState, useEffect, useRef } from 'react'

export interface FormTimerResult {
  isReady: boolean
  elapsedSeconds: number
  formLoadedAt: number
  validateSubmissionTime: () => { isValid: boolean; reason?: string }
}

/**
 * Hook para prevenir envíos automáticos de bots mediante validación de tiempo mínimo
 * Los bots típicamente envían formularios inmediatamente o en menos de 1 segundo
 * Los humanos reales tardan al menos 3-5 segundos en leer y completar un formulario
 */
export function useFormTimer(minSecondsBeforeSubmit: number = 3): FormTimerResult {
  const [formLoadedAt] = useState<number>(Date.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Actualizar el contador cada segundo
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - formLoadedAt) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [formLoadedAt])

  const validateSubmissionTime = (): { isValid: boolean; reason?: string } => {
    const currentElapsed = Math.floor((Date.now() - formLoadedAt) / 1000)
    
    if (currentElapsed < minSecondsBeforeSubmit) {
      return {
        isValid: false,
        reason: `Por favor, tómate al menos ${minSecondsBeforeSubmit} segundos para completar el formulario`
      }
    }

    // Detectar envíos sospechosamente rápidos (menos de 1 segundo)
    if (currentElapsed < 1) {
      return {
        isValid: false,
        reason: 'Envío detectado como automático'
      }
    }

    // Detectar envíos sospechosamente lentos (más de 30 minutos podría ser un bot que espera)
    if (currentElapsed > 1800) {
      return {
        isValid: false,
        reason: 'El formulario ha expirado. Por favor, recarga la página'
      }
    }

    return { isValid: true }
  }

  return {
    isReady: elapsedSeconds >= minSecondsBeforeSubmit,
    elapsedSeconds,
    formLoadedAt,
    validateSubmissionTime
  }
}
