/**
 * Hook para detección de comportamiento sospechoso
 * Sin dependencias de reCAPTCHA - Solo validaciones del lado del cliente
 */

import { useState, useEffect, useRef } from 'react'

interface SuspiciousActivityDetector {
  isReady: boolean
  getMetrics: () => FormMetrics
  recordInteraction: () => void
}

interface FormMetrics {
  loadTime: number
  interactions: number
  mouseMovements: number
  keystrokes: number
  timeSinceLoad: number
  isSuspicious: boolean
  suspicionScore: number
}

export function useSuspiciousActivityDetector(): SuspiciousActivityDetector {
  const [loadTime] = useState(Date.now())
  const [interactions, setInteractions] = useState(0)
  const [mouseMovements, setMouseMovements] = useState(0)
  const [keystrokes, setKeystrokes] = useState(0)
  const [isReady, setIsReady] = useState(false)
  
  const hasMouseMoved = useRef(false)
  const hasTyped = useRef(false)

  useEffect(() => {
    // Detectar movimiento del mouse
    const handleMouseMove = () => {
      if (!hasMouseMoved.current) {
        hasMouseMoved.current = true
        setMouseMovements(prev => prev + 1)
      }
    }

    // Detectar teclas presionadas
    const handleKeyPress = () => {
      if (!hasTyped.current) {
        hasTyped.current = true
      }
      setKeystrokes(prev => prev + 1)
    }

    // Detectar clics
    const handleClick = () => {
      setInteractions(prev => prev + 1)
    }

    // Listeners
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('keypress', handleKeyPress, { passive: true })
    window.addEventListener('click', handleClick, { passive: true })

    // Marcar como listo después de 1 segundo
    const readyTimer = setTimeout(() => setIsReady(true), 1000)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keypress', handleKeyPress)
      window.removeEventListener('click', handleClick)
      clearTimeout(readyTimer)
    }
  }, [])

  const getMetrics = (): FormMetrics => {
    const timeSinceLoad = Date.now() - loadTime
    
    // Calcular score de sospecha (0-100, donde 100 es muy sospechoso)
    let suspicionScore = 0
    
    // Envío demasiado rápido (menos de 2 segundos)
    if (timeSinceLoad < 2000) {
      suspicionScore += 50
    }
    
    // Sin movimiento del mouse
    if (mouseMovements === 0) {
      suspicionScore += 30
    }
    
    // Sin interacciones
    if (interactions === 0) {
      suspicionScore += 20
    }
    
    // Sin teclas presionadas
    if (keystrokes === 0) {
      suspicionScore += 20
    }
    
    return {
      loadTime,
      interactions,
      mouseMovements,
      keystrokes,
      timeSinceLoad,
      isSuspicious: suspicionScore > 50,
      suspicionScore
    }
  }

  const recordInteraction = () => {
    setInteractions(prev => prev + 1)
  }

  return {
    isReady,
    getMetrics,
    recordInteraction
  }
}
