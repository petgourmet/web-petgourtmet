'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Send } from 'lucide-react'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setEmail('')
      } else {
        setError(result.error || 'Error al suscribirse')
      }
    } catch (error) {
      console.error('Error subscribing to newsletter:', error)
      setError('Error de conexión. Inténtalo de nuevo.')
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
              <CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-4">
                ¡Gracias por suscribirte!
              </h2>
              <p className="text-white/90 text-lg">
                Revisa tu email para confirmar la suscripción. Pronto recibirás ofertas exclusivas y consejos para tu mascota.
              </p>
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

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70 flex-1"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !email}
                className="bg-white text-[#7BBDC5] hover:bg-white/90 font-semibold"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7BBDC5] mr-2"></div>
                    Suscribiendo...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Suscribirme
                  </>
                )}
              </Button>
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
