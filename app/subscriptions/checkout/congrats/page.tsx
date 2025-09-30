'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface ActivationResult {
  success: boolean
  message: string
  subscription?: {
    id: number
    product_name: string
    status: string
  }
  error?: string
}

function CongratsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isActivating, setIsActivating] = useState(true)
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null)

  // Extraer parámetros de MercadoPago
  const externalReference = searchParams.get('external_reference')
  const collectionId = searchParams.get('collection_id')
  const collectionStatus = searchParams.get('collection_status')
  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const preferenceId = searchParams.get('preference_id')
  const paymentType = searchParams.get('payment_type')
  const siteId = searchParams.get('site_id')

  useEffect(() => {
    const activateSubscription = async () => {
      if (!externalReference) {
        setActivationResult({
          success: false,
          message: 'No se encontró la referencia de la suscripción',
          error: 'external_reference missing'
        })
        setIsActivating(false)
        return
      }

      try {
        console.log('🚀 Activando suscripción desde callback de MercadoPago:', {
          externalReference,
          collectionId,
          collectionStatus,
          paymentId,
          status,
          preferenceId,
          paymentType,
          siteId
        })

        const response = await fetch('/api/subscriptions/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            external_reference: externalReference,
            collection_id: collectionId,
            collection_status: collectionStatus,
            payment_id: paymentId,
            status: status,
            preference_id: preferenceId,
            payment_type: paymentType,
            site_id: siteId
          })
        })

        const result = await response.json()

        if (result.success) {
          setActivationResult({
            success: true,
            message: 'Suscripción activada exitosamente',
            subscription: result.subscription
          })

          // Enviar email de confirmación
          try {
            await fetch('/api/subscriptions/send-thank-you-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscription_id: result.subscription.id
              })
            })
          } catch (emailError) {
            console.warn('Error enviando email de confirmación:', emailError)
          }

          // Redirigir a la página de suscripción después de 3 segundos
          setTimeout(() => {
            router.push('/suscripcion')
          }, 3000)
        } else {
          setActivationResult({
            success: false,
            message: result.error || 'Error activando la suscripción',
            error: result.error
          })
        }
      } catch (error: any) {
        console.error('Error en activación:', error)
        setActivationResult({
          success: false,
          message: 'Error de conexión al activar la suscripción',
          error: error.message
        })
      } finally {
        setIsActivating(false)
      }
    }

    activateSubscription()
  }, [externalReference, collectionId, collectionStatus, paymentId, status, preferenceId, paymentType, siteId, router])

  if (isActivating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Activando tu suscripción</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Estamos procesando tu pago y activando tu suscripción a Pet Gourmet...
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>✅ Pago confirmado</p>
              <p>🔄 Activando suscripción...</p>
              <p>📧 Preparando confirmación por email</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {activationResult?.success ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <AlertCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {activationResult?.success ? '¡Suscripción Activada!' : 'Error en Activación'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {activationResult?.message}
          </p>

          {activationResult?.success && activationResult.subscription && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Detalles de tu suscripción:
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Producto:</span>
                  <span className="font-medium">{activationResult.subscription.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <Badge variant="default" className="bg-green-500">
                    {activationResult.subscription.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {activationResult?.success ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Serás redirigido automáticamente en unos segundos...
              </p>
              <div className="flex flex-col space-y-2">
                <Link href="/suscripcion">
                  <Button className="w-full">
                    Ver mis suscripciones
                  </Button>
                </Link>
                <Link href="/perfil">
                  <Button variant="outline" className="w-full">
                    Ir a mi perfil
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Si el problema persiste, contacta a nuestro soporte.
              </p>
              <div className="flex flex-col space-y-2">
                <Link href="/suscripcion">
                  <Button className="w-full">
                    Intentar nuevamente
                  </Button>
                </Link>
                <Link href="/contacto">
                  <Button variant="outline" className="w-full">
                    Contactar soporte
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Información de debug (solo en desarrollo) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left text-xs text-gray-400 mt-4">
              <summary>Debug Info</summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                {JSON.stringify({
                  externalReference,
                  collectionId,
                  collectionStatus,
                  paymentId,
                  status,
                  preferenceId,
                  paymentType,
                  siteId,
                  activationResult
                }, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function CongratsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <CongratsContent />
    </Suspense>
  )
}