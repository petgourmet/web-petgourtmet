"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useClientAuth } from "@/hooks/use-client-auth"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, AlertCircle, Mail, ArrowLeft, Gift } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

interface SubscriptionStatus {
  status: 'validating' | 'confirmed' | 'pending' | 'failed'
  subscription?: any
  message?: string
}

function ConfirmacionSuscripcionContent() {
  const { user, loading } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ status: 'validating' })
  const [emailSent, setEmailSent] = useState(false)
  const [isProcessing, setIsProcessing] = useState(true)

  const externalReference = searchParams.get('external_reference')
  const userId = searchParams.get('user_id')
  const preapprovalId = searchParams.get('preapproval_id')
  const status = searchParams.get('status')
  const fromLink = searchParams.get('from_link') === 'true'

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Si no hay usuario autenticado, redirigir al login
        router.push(`/login?redirect=/suscripcion/confirmacion?${searchParams.toString()}`)
        return
      }

      // Validar que el usuario coincida con el de la URL
      if (userId && user.id !== userId) {
        setSubscriptionStatus({
          status: 'failed',
          message: 'No tienes permisos para ver esta suscripción'
        })
        return
      }

      // Si viene de un enlace directo, validar primero el enlace
      if (fromLink && externalReference) {
        validateDirectLink()
      } else {
        // Procesar la confirmación de suscripción normal
        processSubscriptionConfirmation()
      }
    }
  }, [user, loading, externalReference, userId, preapprovalId, status, fromLink])

  const validateDirectLink = async () => {
    try {
      setIsProcessing(true)
      setSubscriptionStatus({ status: 'validating', message: 'Validando enlace de suscripción...' })
      
      const response = await fetch('/api/subscriptions/validate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_reference: externalReference,
          user_id: user?.id
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.valid) {
        // Enlace válido, proceder con la confirmación normal
        processSubscriptionConfirmation()
      } else {
        setSubscriptionStatus({
          status: 'failed',
          message: result.error || 'Enlace de suscripción inválido'
        })
      }
    } catch (error) {
      console.error('Error validando enlace directo:', error)
      setSubscriptionStatus({
        status: 'failed',
        message: 'Error al validar el enlace de suscripción'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const processSubscriptionConfirmation = async () => {
    if (!externalReference && !preapprovalId) {
      setSubscriptionStatus({
        status: 'failed',
        message: 'Información de suscripción incompleta'
      })
      setIsProcessing(false)
      return
    }

    try {
      setIsProcessing(true)
      
      // Esperar un momento para que los webhooks procesen
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verificar el estado de la suscripción
      const result = await validateSubscriptionPayment()
      
      if (result.success) {
        setSubscriptionStatus({
          status: 'confirmed',
          subscription: result.subscription,
          message: 'Tu suscripción ha sido confirmada exitosamente'
        })
        
        // Enviar email de agradecimiento
        await sendThankYouEmail(result.subscription)
      } else {
        // Si no está confirmada aún, seguir validando
        setSubscriptionStatus({
          status: 'pending',
          message: 'Estamos validando tu pago. Esto puede tomar unos minutos.'
        })
        
        // Reintentar después de 5 segundos
        setTimeout(() => {
          processSubscriptionConfirmation()
        }, 5000)
      }
    } catch (error) {
      console.error('Error procesando confirmación:', error)
      setSubscriptionStatus({
        status: 'failed',
        message: 'Error al procesar la confirmación de suscripción'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const validateSubscriptionPayment = async () => {
    try {
      const response = await fetch('/api/subscriptions/validate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_reference: externalReference,
          preapproval_id: preapprovalId,
          user_id: user?.id
        })
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error validando pago:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  const sendThankYouEmail = async (subscription: any) => {
    if (emailSent || !user?.email) return

    try {
      const response = await fetch('/api/subscriptions/send-thank-you-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email,
          subscription: subscription
        })
      })

      if (response.ok) {
        setEmailSent(true)
        toast({
          title: "¡Email enviado!",
          description: "Te hemos enviado un correo de confirmación con los detalles de tu suscripción.",
        })
      }
    } catch (error) {
      console.error('Error enviando email:', error)
    }
  }

  const getStatusIcon = () => {
    switch (subscriptionStatus.status) {
      case 'confirmed':
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'pending':
        return <Clock className="h-16 w-16 text-yellow-500 animate-pulse" />
      case 'validating':
        return <Clock className="h-16 w-16 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-16 w-16 text-red-500" />
      default:
        return <Clock className="h-16 w-16 text-gray-500" />
    }
  }

  const getStatusTitle = () => {
    switch (subscriptionStatus.status) {
      case 'confirmed':
        return '¡Suscripción Confirmada!'
      case 'pending':
        return 'Validando Pago...'
      case 'validating':
        return 'Procesando...'
      case 'failed':
        return 'Error en la Suscripción'
      default:
        return 'Procesando Suscripción'
    }
  }

  const getStatusDescription = () => {
    switch (subscriptionStatus.status) {
      case 'confirmed':
        return 'Tu suscripción ha sido activada exitosamente. Ya puedes disfrutar de todos los beneficios.'
      case 'pending':
        return 'Estamos validando tu pago con MercadoPago. Esto puede tomar unos minutos.'
      case 'validating':
        return 'Estamos procesando tu suscripción. Por favor espera un momento.'
      case 'failed':
        return subscriptionStatus.message || 'Hubo un problema al procesar tu suscripción.'
      default:
        return 'Procesando tu suscripción...'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Link>
          </div>

          {/* Status Card */}
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                {getStatusIcon()}
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {getStatusTitle()}
              </CardTitle>
              <CardDescription className="text-lg">
                {getStatusDescription()}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Información de la suscripción */}
              {subscriptionStatus.subscription && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Detalles de tu suscripción:
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Producto:</strong> {subscriptionStatus.subscription.product_name}</p>
                    <p><strong>Frecuencia:</strong> {subscriptionStatus.subscription.frequency_text}</p>
                    <p><strong>Precio:</strong> ${subscriptionStatus.subscription.discounted_price} MXN</p>
                    <p><strong>Próximo pago:</strong> {new Date(subscriptionStatus.subscription.next_billing_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {/* Email confirmation */}
              {subscriptionStatus.status === 'confirmed' && (
                <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
                  <Mail className="h-5 w-5" />
                  <span className="text-sm">
                    {emailSent ? 'Email de confirmación enviado' : 'Enviando email de confirmación...'}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {subscriptionStatus.status === 'confirmed' && (
                  <>
                    <Button asChild className="bg-primary hover:bg-primary/90">
                      <Link href="/suscripcion">
                        <Gift className="h-4 w-4 mr-2" />
                        Ver mis suscripciones
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/">
                        Continuar comprando
                      </Link>
                    </Button>
                  </>
                )}
                
                {subscriptionStatus.status === 'failed' && (
                  <>
                    <Button asChild>
                      <Link href="/productos">
                        Intentar de nuevo
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/contacto">
                        Contactar soporte
                      </Link>
                    </Button>
                  </>
                )}
                
                {subscriptionStatus.status === 'pending' && (
                  <Button variant="outline" asChild>
                    <Link href="/suscripcion">
                      Ver estado de suscripciones
                    </Link>
                  </Button>
                )}
              </div>

              {/* Processing indicator */}
              {isProcessing && subscriptionStatus.status === 'pending' && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  <div className="animate-pulse">Revalidando en 5 segundos...</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help section */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>¿Tienes problemas con tu suscripción?</p>
            <Link href="/contacto" className="text-primary hover:text-primary/80 underline">
              Contacta nuestro equipo de soporte
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmacionSuscripcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    }>
      <ConfirmacionSuscripcionContent />
    </Suspense>
  )
}