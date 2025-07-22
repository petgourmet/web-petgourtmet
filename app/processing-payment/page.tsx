'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'

function PaymentProcessingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // Obtener parámetros de MercadoPago
        const orderId = searchParams.get('order_id')
        const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
        const status = searchParams.get('status') || searchParams.get('collection_status')
        const externalReference = searchParams.get('external_reference')

        console.log('Processing payment result:', { orderId, paymentId, status, externalReference })

        // Validar que tenemos los datos necesarios
        if (!orderId && !externalReference) {
          throw new Error('No se encontró información del pedido')
        }

        // Esperar un momento para asegurar que el webhook haya procesado
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Verificar el estado del pago si es necesario
        if (paymentId && status === 'approved') {
          // Opcional: hacer una verificación adicional del estado del pago
          try {
            const response = await fetch(`/api/mercadopago/payment/${paymentId}`)
            if (!response.ok) {
              console.warn('No se pudo verificar el estado del pago, pero continuando...')
            }
          } catch (err) {
            console.warn('Error al verificar pago:', err)
          }
        }

        // Construir URL de destino
        const params = new URLSearchParams()
        if (orderId) params.set('order_id', orderId)
        if (paymentId) params.set('payment_id', paymentId)
        if (status) params.set('status', status)
        if (externalReference) params.set('external_reference', externalReference)

        // Redirigir a la página de agradecimiento
        router.replace(`/gracias-por-tu-compra?${params.toString()}`)

      } catch (err) {
        console.error('Error processing payment result:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setIsProcessing(false)
        
        // Redirigir al home después de 3 segundos
        setTimeout(() => {
          router.replace('/')
        }, 3000)
      }
    }

    processPaymentResult()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error al procesar el pago</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Serás redirigido a la página principal en unos segundos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 animate-ping bg-green-400 rounded-full opacity-25"></div>
            <CheckCircle className="h-16 w-16 text-green-500 relative z-10" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Procesando tu compra...</h1>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-gray-600">Finalizando detalles del pedido</span>
        </div>
        <p className="text-sm text-gray-500">Esto solo tomará unos segundos</p>
      </div>
    </div>
  )
}

export default function PaymentProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Cargando...</h1>
          <p className="text-sm text-gray-500">Preparando el procesamiento del pago</p>
        </div>
      </div>
    }>
      <PaymentProcessingContent />
    </Suspense>
  )
}
