'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, Truck, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const [paymentData, setPaymentData] = useState<any>(null)
  const [orderData, setOrderData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (paymentId) {
        try {
          // Obtener información del pago desde nuestro backend
          const response = await fetch(`/api/mercadopago/payment/${paymentId}`)
          if (response.ok) {
            const data = await response.json()
            setPaymentData(data)
          }
        } catch (error) {
          console.error('Error fetching payment info:', error)
        }
      }
      
      if (externalReference) {
        try {
          // Obtener información del pedido
          const response = await fetch(`/api/orders/${externalReference}`)
          if (response.ok) {
            const data = await response.json()
            setOrderData(data)
          }
        } catch (error) {
          console.error('Error fetching order info:', error)
        }
      }
      
      setIsLoading(false)
    }

    fetchPaymentInfo()
  }, [paymentId, externalReference])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>Verificando tu pago...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            ¡Pago Exitoso!
          </h1>
          <p className="text-gray-600">
            Tu pedido ha sido confirmado y está siendo procesado
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Información del Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Detalles del Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentId && (
              <div className="flex justify-between">
                <span className="text-gray-600">ID de Pago:</span>
                <span className="font-mono text-sm">{paymentId}</span>
              </div>
            )}
            {status && (
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="capitalize font-semibold text-green-600">{status}</span>
              </div>
            )}
            {externalReference && (
              <div className="flex justify-between">
                <span className="text-gray-600">Número de Pedido:</span>
                <span className="font-mono text-sm">{externalReference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha:</span>
              <span>{new Date().toLocaleDateString('es-MX')}</span>
            </div>
            {paymentData?.amount && (
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Pagado:</span>
                <span className="text-green-600">${paymentData.amount} MXN</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información del Pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Tu Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderData?.items ? (
              <div className="space-y-3">
                {orderData.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">${item.price * item.quantity} MXN</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Cargando detalles del pedido...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos Pasos */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            ¿Qué sigue?
          </CardTitle>
          <CardDescription>
            Estos son los próximos pasos para tu pedido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Confirmación de Pago</h3>
                <p className="text-sm text-gray-600">Tu pago ha sido procesado exitosamente</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Preparación del Pedido</h3>
                <p className="text-sm text-gray-600">Estamos preparando tu pedido para el envío</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 rounded-full p-2">
                <Mail className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Confirmación por Email</h3>
                <p className="text-sm text-gray-600">Recibirás un email con los detalles y seguimiento</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 rounded-full p-2">
                <Truck className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Envío</h3>
                <p className="text-sm text-gray-600">Tu pedido será enviado en las próximas 24-48 horas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="text-center space-y-4">
        <div className="space-x-4">
          <Button onClick={() => window.location.href = '/productos'}>
            Seguir Comprando
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/perfil'}>
            Ver Mis Pedidos
          </Button>
        </div>
        
        <p className="text-sm text-gray-600">
          ¿Tienes preguntas? <a href="/contacto" className="text-blue-600 hover:underline">Contáctanos</a>
        </p>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Cargando información del pago...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
