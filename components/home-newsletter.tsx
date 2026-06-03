'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function HomeNewsletter() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formLoadTime, setFormLoadTime] = useState<number>(0)

  useEffect(() => {
    setFormLoadTime(Date.now())
  }, [])

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
        body: JSON.stringify({
          email,
          honeypot: '',
          submissionTime: formLoadTime,
        }),
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
        <div className="rounded-[24px] border border-green-200 bg-[linear-gradient(145deg,_#f0fdf4,_#ecfdf3)] p-8 text-center shadow-[0_18px_44px_rgba(34,197,94,0.08)]">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h3 className="text-xl font-semibold text-green-800">¡Bienvenido a la familia Pet Gourmet!</h3>
          <p className="mt-3 text-green-700">
            Tu suscripción fue registrada. Revisa tu correo para conocer lo que preparamos para ti.
          </p>
        </div>

        <button
          onClick={() => {
            setIsSuccess(false)
            setEmail('')
          }}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#d8e6e8] bg-white text-sm font-semibold text-[#35545a] transition-all duration-300 hover:border-[#7AB8BF]/35 hover:bg-[#f8fbfb]"
        >
          Suscribir otro email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[22px] border border-[#dfeaec] bg-white/92 p-2 shadow-[0_12px_28px_rgba(22,49,59,0.05)]">
        <input
          type="email"
          placeholder="Tu correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="w-full rounded-[16px] border-0 bg-transparent px-4 py-4 text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2a7880] px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-[#1d636b] hover:shadow-[0_18px_36px_rgba(29,99,107,0.18)] disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-b-white" />
            Uniéndote...
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Unirme a la comunidad
          </>
        )}
      </button>

      <p className="text-sm leading-relaxed text-[#6b7f83]">
        Al suscribirte, aceptas recibir correos electrónicos de Pet Gourmet.
        <br />
        Puedes darte de baja en cualquier momento.
      </p>
    </form>
  )
}
