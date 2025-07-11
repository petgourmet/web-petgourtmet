'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { XCircle, AlertTriangle, CreditCard, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function CheckoutFailureContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string>('')

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')

  useEffect(() => {
    // Determinar el tipo de error basado en los parámetros
    const errorType = searchParams.get('error') || status
    
    switch (errorType) {
      case 'rejected':
        setError('El pago fue rechazado por el banco o emisor de la tarjeta')
        break
      case 'cancelled':
        setError('El pago fue cancelado por el usuario')
        break
      case 'insufficient_funds':
        setError('Fondos insuficientes en la cuenta')
        break
      case 'invalid_card':
        setError('Los datos de la tarjeta son inválidos')
        break
      case 'expired_card':
        setError('La tarjeta ha expirado')
        break
      default:
        setError('Hubo un problema al procesar tu pago')
    }
  }, [searchParams, status])

  const retryPayment = () => {
    // Redirigir de vuelta al checkout con los mismos productos
    window.location.href = '/checkout'
  }

  const goToCart = () => {
    window.location.href = '/productos'
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="text-center mb-8">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-red-600 mb-2">
          Pago No Completado
        </h1>
        <p className="text-gray-600">
          No pudimos procesar tu pago en este momento
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            ¿Qué pasó?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{error}</p>
          
          {paymentId && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                <strong>Referencia:</strong> {paymentId}
              </p>
              {externalReference && (
                <p className="text-sm text-gray-600">
                  <strong>Pedido:</strong> {externalReference}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Soluciones Posibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold">Verifica los datos de tu tarjeta</h3>
                <p className="text-sm text-gray-600">Asegúrate de que el número, fecha de vencimiento y CVV sean correctos</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold">Verifica el saldo disponible</h3>
                <p className="text-sm text-gray-600">Confirma que tienes fondos suficientes o crédito disponible</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold">Contacta a tu banco</h3>
                <p className="text-sm text-gray-600">Algunos bancos bloquean transacciones en línea por seguridad</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold">Prueba con otro método de pago</h3>
                <p className="text-sm text-gray-600">Intenta con otra tarjeta o método de pago disponible</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <div className="space-x-4">
          <Button onClick={retryPayment} className="bg-blue-600 hover:bg-blue-700">
            Intentar de Nuevo
          </Button>
          <Button variant="outline" onClick={goToCart}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Productos
          </Button>
        </div>
        
        <p className="text-sm text-gray-600">
          ¿Necesitas ayuda? <a href="/contacto" className="text-blue-600 hover:underline">Contáctanos</a> y te ayudaremos a resolver el problema
        </p>
      </div>
    </div>
  )
}

export default function CheckoutFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Cargando información del pago...</p>
        </div>
      </div>
    }>
      <CheckoutFailureContent />
    </Suspense>
  )
}
