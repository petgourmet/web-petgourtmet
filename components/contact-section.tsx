'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Mail, MapPin, Send, CheckCircle } from 'lucide-react'

export default function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    const formData = new FormData(e.target as HTMLFormElement)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      message: formData.get('message') as string,
    }
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setIsSuccess(true)
        // Limpiar formulario
        ;(e.target as HTMLFormElement).reset()
        
        // Resetear el éxito después de 5 segundos
        setTimeout(() => {
          setIsSuccess(false)
        }, 5000)
      } else {
        setError(result.error || 'Error al enviar el mensaje')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-16 bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Tienes alguna pregunta?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Estamos aquí para ayudarte. Contáctanos y te responderemos lo antes posible.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Información de contacto */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold mb-6">Ponte en contacto</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-[#7BBDC5] p-3 rounded-full">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Teléfono</p>
                  <p className="text-muted-foreground">+52 55 6126 9681</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-[#7BBDC5] p-3 rounded-full">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Email</p>
                  <p className="text-muted-foreground">contacto@petgourmet.mx</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-[#7BBDC5] p-3 rounded-full">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Dirección</p>
                  <p className="text-muted-foreground">
                    Avenida José María Castorena 425<br />
                    Plaza Cuajimalpa Local 6<br />
                    Cuajimalpa, Ciudad de México
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de contacto */}
          <Card>
            <CardHeader>
              <CardTitle>Envíanos un mensaje</CardTitle>
              <CardDescription>
                Completa el formulario y nos pondremos en contacto contigo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mensaje de éxito */}
              {isSuccess && (
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                    <p className="text-green-800">
                      ¡Mensaje enviado exitosamente! Te responderemos pronto.
                    </p>
                  </div>
                </div>
              )}

              {/* Mensaje de error */}
              {error && (
                <div className="mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="text-sm font-medium">
                      Nombre *
                    </label>
                    <Input 
                      id="contact-name"
                      name="name"
                      placeholder="Tu nombre completo"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-phone" className="text-sm font-medium">
                      Teléfono
                    </label>
                    <Input 
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      placeholder="Tu número de teléfono"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-email" className="text-sm font-medium">
                    Email *
                  </label>
                  <Input 
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-message" className="text-sm font-medium">
                    Mensaje *
                  </label>
                  <Textarea 
                    id="contact-message"
                    name="message"
                    placeholder="¿En qué podemos ayudarte?"
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar mensaje
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Recibirás un email de confirmación cuando enviemos tu mensaje.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
