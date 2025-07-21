'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function HomeNewsletter() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Ingresa tu email para continuar')
      return
    }

    setIsLoading(true)

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
        toast.success('¡Te has unido a la comunidad!', {
          description: '📧 Revisa tu email para confirmar la suscripción',
          duration: 5000,
        })
      } else {
        toast.error('Error al suscribirse', {
          description: result.error || 'Inténtalo de nuevo',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error subscribing to newsletter:', error)
      toast.error('Error de conexión', {
        description: 'Inténtalo de nuevo más tarde',
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <div className="text-center p-8 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            ¡Bienvenido a la familia Pet Gourmet!
          </h3>
          <p className="text-green-700">
            Tu suscripción ha sido confirmada. Revisa tu email para más información.
          </p>
        </div>
        <Button 
          onClick={() => {
            setIsSuccess(false)
            setEmail('')
          }}
          variant="outline"
          className="w-full"
        >
          Suscribir otro email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          type="email"
          placeholder="Tu correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="w-full px-6 py-4 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent disabled:opacity-50"
        />
      </div>
      <Button 
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl px-8 py-4 h-auto text-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Uniéndote...
          </>
        ) : (
          <>
            <Send className="mr-2 h-5 w-5" />
            Unirme a la comunidad
          </>
        )}
      </Button>
      <p className="text-sm text-gray-500 text-center">
        Al suscribirte, aceptas recibir correos electrónicos de Pet Gourmet.
        <br />
        Puedes darte de baja en cualquier momento.
      </p>
    </form>
  )
}
