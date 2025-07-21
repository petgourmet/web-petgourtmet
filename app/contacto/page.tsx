'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
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
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Header Section */}
          <div className="text-center lg:text-left mb-8 lg:mb-0">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Contáctanos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              ¿Tienes alguna pregunta sobre nuestros productos o necesitas ayuda? 
              Estamos aquí para ayudarte a encontrar la mejor alimentación para tu mascota.
            </p>

            {/* Contact Info */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <Phone className="h-5 w-5 text-[#7BBDC5]" />
                <span>+52 55 6126 9681</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <Mail className="h-5 w-5 text-[#7BBDC5]" />
                <span>contacto@petgourmet.mx</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <MapPin className="h-5 w-5 text-[#7BBDC5]" />
                <span>Avenida José María Castorena 425, plaza Cuajimalpa Local 6</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <Clock className="h-5 w-5 text-[#7BBDC5]" />
                <span>Lun - Vie: 9:00 AM - 6:00 PM</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            {/* Mensaje de éxito */}
            {isSuccess && (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                  <p className="text-green-800">
                    ¡Tu mensaje ha sido enviado exitosamente! Te responderemos en un plazo máximo de 24 horas.
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

            <Card>
              <CardHeader>
                <CardTitle>Envíanos un mensaje</CardTitle>
                <CardDescription>
                  Completa el formulario y nos pondremos en contacto contigo lo antes posible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input 
                        id="name"
                        name="name"
                        placeholder="Tu nombre completo"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input 
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Tu número de teléfono"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje *</Label>
                    <Textarea 
                      id="message"
                      name="message"
                      placeholder="Cuéntanos en qué podemos ayudarte..."
                      rows={6}
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
                    Al enviar este formulario, recibirás un email de confirmación y nos pondremos en contacto contigo.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
