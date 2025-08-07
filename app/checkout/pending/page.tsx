'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function CheckoutPendingContent() {
  const searchParams = useSearchParams()
  const [checkingStatus, setCheckingStatus] = useState(false)

  const paymentId = searchParams.get('payment_id')
  const externalReference = searchParams.get('external_reference')
  const orderId = searchParams.get('order_id')

  const checkPaymentStatus = async () => {
    if (!paymentId && !orderId && !externalReference) return

    setCheckingStatus(true)
    try {
      let orderData = null
      
      // Con webhooks, consultamos el estado de la orden
      if (orderId) {
        const response = await fetch(`/api/orders/${orderId}`)
        if (response.ok) {
          const data = await response.json()
          orderData = data.order
        }
      } else if (externalReference) {
        const response = await fetch(`/api/orders/search?external_reference=${externalReference}`)
        if (response.ok) {
          const data = await response.json()
          orderData = data.order
        }
      }
      
      // Verificar estado del pago si tenemos payment_id
      if (paymentId) {
        const response = await fetch(`/api/mercadopago/payment/${paymentId}`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.status === 'approved') {
            const params = new URLSearchParams()
            if (paymentId) params.set('payment_id', paymentId)
            if (orderId) params.set('order_id', orderId)
            if (externalReference) params.set('external_reference', externalReference)
            params.set('status', 'approved')
            window.location.href = `/checkout/success?${params.toString()}`
          } else if (data.status === 'rejected') {
            const params = new URLSearchParams()
            if (paymentId) params.set('payment_id', paymentId)
            if (orderId) params.set('order_id', orderId)
            if (externalReference) params.set('external_reference', externalReference)
            params.set('status', 'rejected')
            window.location.href = `/checkout/failure?${params.toString()}`
          }
        }
      }
      
      // Si tenemos datos de la orden, verificar su estado
      if (orderData && orderData.payment_status === 'paid') {
        const params = new URLSearchParams()
        if (paymentId) params.set('payment_id', paymentId)
        if (orderId) params.set('order_id', orderId)
        if (externalReference) params.set('external_reference', externalReference)
        params.set('status', 'approved')
        window.location.href = `/checkout/success?${params.toString()}`
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  // Auto-verificar el estado cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      checkPaymentStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [paymentId])

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="text-center mb-8">
        <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-yellow-600 mb-2">
          Pago Pendiente
        </h1>
        <p className="text-gray-600">
          Tu pago está siendo procesado
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            ¿Qué está pasando?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Tu pago está siendo verificado por el banco o el procesador de pagos. 
            Esto puede tomar desde unos minutos hasta algunas horas.
          </p>
          
          {paymentId && (
            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                <strong>ID de Pago:</strong> {paymentId}
              </p>
              {externalReference && (
                <p className="text-sm text-gray-600">
                  <strong>Número de Pedido:</strong> {externalReference}
                </p>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-700 mb-2">Próximos pasos:</h3>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• Verificaremos automáticamente el estado de tu pago</li>
              <li>• Te enviaremos un email cuando se confirme</li>
              <li>• Puedes verificar manualmente haciendo clic en "Verificar Estado"</li>
              <li>• Si el pago no se confirma en 24 horas, se cancelará automáticamente</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tipos de Pago que Pueden Estar Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-gray-100 rounded-full p-1 mt-0.5">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold">Transferencias bancarias</h3>
                <p className="text-sm text-gray-600">Pueden tardar 1-3 días hábiles en procesarse</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-gray-100 rounded-full p-1 mt-0.5">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold">Pagos en efectivo</h3>
                <p className="text-sm text-gray-600">Se confirman cuando realizas el pago en el punto autorizado</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-gray-100 rounded-full p-1 mt-0.5">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
              <div>
                <h3 className="font-semibold">Verificaciones adicionales</h3>
                <p className="text-sm text-gray-600">Algunos bancos requieren confirmación adicional por seguridad</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <div className="space-x-4">
          <Button 
            onClick={checkPaymentStatus} 
            disabled={checkingStatus}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {checkingStatus ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Estado
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/productos'}>
            Seguir Comprando
          </Button>
        </div>
        
        <p className="text-sm text-gray-600">
          Te notificaremos por email cuando tu pago se confirme. 
          <br />
          ¿Tienes preguntas? <a href="/contacto" className="text-blue-600 hover:underline">Contáctanos</a>
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <CheckoutPendingContent />
    </Suspense>
  )
}
