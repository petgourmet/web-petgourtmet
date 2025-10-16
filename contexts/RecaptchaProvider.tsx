'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface RecaptchaContextType {
  isLoaded: boolean
  executeRecaptcha: (action: string) => Promise<string | null>
}

const RecaptchaContext = createContext<RecaptchaContextType | undefined>(undefined)

interface RecaptchaProviderProps {
  children: React.ReactNode
}

export function RecaptchaProvider({ children }: RecaptchaProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Verificar si reCAPTCHA ya está cargado
    if (typeof window !== 'undefined' && window.grecaptcha) {
      setIsLoaded(true)
      return
    }

    // Cargar el script de reCAPTCHA
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setIsLoaded(true)
        })
      }
    }

    script.onerror = () => {
      console.error('Error loading reCAPTCHA script')
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup: remover el script si el componente se desmonta
      const existingScript = document.querySelector(`script[src*="recaptcha"]`)
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [])

  const executeRecaptcha = async (action: string): Promise<string | null> => {
    if (!isLoaded || !window.grecaptcha) {
      console.warn('reCAPTCHA not loaded yet')
      return null
    }

    try {
      const token = await window.grecaptcha.execute(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
        { action }
      )
      return token
    } catch (error) {
      console.error('Error executing reCAPTCHA:', error)
      return null
    }
  }

  return (
    <RecaptchaContext.Provider value={{ isLoaded, executeRecaptcha }}>
      {children}
    </RecaptchaContext.Provider>
  )
}

export function useRecaptcha() {
  const context = useContext(RecaptchaContext)
  if (context === undefined) {
    throw new Error('useRecaptcha must be used within a RecaptchaProvider')
  }
  return context
}

// Tipos para window.grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}