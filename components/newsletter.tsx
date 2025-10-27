'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Send } from 'lucide-react'
import { useAntiSpam } from '@/hooks/useAntiSpam'
import { useFormTimer } from '@/hooks/useFormTimer'
import { HoneypotField } from '@/components/security/HoneypotField'
import { SecurityStatus } from '@/components/security/SecurityStatus'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [subscribedEmail, setSubscribedEmail] = useState('')
  const [honeypotValue, setHoneypotValue] = useState('')
  
  const { 
    submitWithProtection, 
    isValidating,
    isRecaptchaLoaded 
  } = useAntiSpam({
    action: 'newsletter_signup',
    minRecaptchaScore: 0.4
  })

  // Nuevo: validación de tiempo mínimo (3 segundos)
  const { isReady, validateSubmissionTime } = useFormTimer(3)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validar tiempo mínimo antes de enviar
    const timeValidation = validateSubmissionTime()
    if (!timeValidation.isValid) {
      setError(timeValidation.reason || 'Por favor, espera unos segundos antes de enviar')
      setIsLoading(false)
      return
    }

    try {
      // Usar el sistema anti-spam para enviar el formulario
      const result = await submitWithProtection('/api/newsletter', {
        email,
        honeypot: honeypotValue
      })

      setSubscribedEmail(email)
      setIsSuccess(true)
      setEmail('')
      setHoneypotValue('')
      
    } catch (error) {
      console.error('Error subscribing to newsletter:', error)
      setError(error instanceof Error ? error.message : 'Error de conexión. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <section className="py-16 bg-gradient-to-br from-[#7BBDC5] to-[#5DA8B5]">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
              <CheckCircle className="h-16 w-16 text-white mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-4">
                ¡Gracias por suscribirte!
              </h2>
              <p className="text-white/90 text-lg mb-6">
                Tu suscripción ha sido <strong>confirmada exitosamente</strong>. 
                Revisa tu email para más información.
              </p>
              <div className="bg-white/20 rounded-lg p-4 mb-6">
                <p className="text-white font-semibold">📧 Email enviado a:</p>
                <p className="text-white/90">{subscribedEmail}</p>
              </div>
              <p className="text-white/80 text-sm">
                Pronto recibirás ofertas exclusivas y consejos para tu mascota.
              </p>
              <div className="mt-6">
                <button 
                  onClick={() => {
                    setIsSuccess(false)
                    setSubscribedEmail('')
                    setEmail('')
                    setHoneypotValue('')
                  }}
                  className="text-white/80 hover:text-white underline text-sm transition-colors"
                >
                  ← Suscribir otro email
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gradient-to-br from-[#7BBDC5] to-[#5DA8B5]">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Únete a nuestra manada
            </h2>
            <p className="text-white/90 text-lg mb-8">
              Recibe ofertas exclusivas, consejos de nutrición y las últimas novedades para tu mascota.
            </p>
            
            {/* Mensaje de error */}
            {error && (
              <div className="mb-6">
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-red-800">
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo honeypot para detectar bots */}
              <HoneypotField 
                value={honeypotValue}
                onChange={setHoneypotValue}
              />
              
              {/* Estado de seguridad */}
              <SecurityStatus 
                isValidating={isValidating}
                className="text-white/80"
              />
              
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || isValidating}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/70 flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || isValidating || !email || !isRecaptchaLoaded || !isReady}
                  className="bg-white text-[#7BBDC5] hover:bg-white/90 font-semibold"
                >
                  {isLoading || isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7BBDC5] mr-2"></div>
                      {isValidating ? 'Verificando...' : 'Suscribiendo...'}
                    </>
                  ) : !isRecaptchaLoaded ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7BBDC5] mr-2"></div>
                      Cargando...
                    </>
                  ) : !isReady ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7BBDC5] mr-2"></div>
                      Preparando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Suscribirme
                    </>
                  )}
                </Button>
              </div>
            </form>
            
            <p className="text-white/70 text-sm mt-4">
              Al suscribirte, recibirás un email de confirmación. Puedes darte de baja en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
