'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircleIcon, ShoppingBagIcon, HomeIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

interface OrderDetails {
  orderId: string
  orderNumber: string
  paymentId: string
  total: number
  items: any[]
  customerEmail: string
}

export default function GraciasPorTuCompra() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener parámetros de la URL
  const orderId = searchParams.get('order_id')
  const orderNumber = searchParams.get('order_number')
  const paymentId = searchParams.get('payment_id')
  const collection_id = searchParams.get('collection_id')
  const collection_status = searchParams.get('collection_status')
  const payment_type = searchParams.get('payment_type')
  const merchant_order_id = searchParams.get('merchant_order_id')
  const preference_id = searchParams.get('preference_id')
  const site_id = searchParams.get('site_id')
  const processing_mode = searchParams.get('processing_mode')
  const merchant_account_id = searchParams.get('merchant_account_id')

  useEffect(() => {
    // Registrar el evento de conversión para Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId || paymentId,
        value: orderDetails?.total || 0,
        currency: 'MXN',
        items: orderDetails?.items || []
      })
    }

    // Registrar el evento de conversión para Facebook Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: orderDetails?.total || 0,
        currency: 'MXN',
        content_ids: orderDetails?.items?.map(item => item.id) || [],
        content_type: 'product'
      })
    }

    // Si tenemos orderId, obtener los detalles de la orden
    if (orderId) {
      fetchOrderDetails(orderId)
    } else if (paymentId || collection_id) {
      // Si no tenemos orderId pero sí paymentId, intentar obtener la orden por payment_id
      fetchOrderByPaymentId(paymentId || collection_id)
    } else {
      setLoading(false)
      setError('No se encontraron datos de la compra')
    }
  }, [orderId, paymentId, collection_id, orderDetails])

  const fetchOrderDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`)
      if (response.ok) {
        const data = await response.json()
        setOrderDetails(data)
      } else {
        setError('No se pudieron obtener los detalles de la compra')
      }
    } catch (err) {
      setError('Error al obtener los detalles de la compra')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderByPaymentId = async (id: string) => {
    try {
      const response = await fetch(`/api/orders/by-payment/${id}`)
      if (response.ok) {
        const data = await response.json()
        setOrderDetails(data)
      } else {
        setError('No se pudieron obtener los detalles de la compra')
      }
    } catch (err) {
      setError('Error al obtener los detalles de la compra')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Procesando información de tu compra...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Mensaje de éxito */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="text-center">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ¡Gracias por tu compra!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Tu pedido ha sido procesado exitosamente
              </p>
              
              {/* Información del pago */}
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {orderId && (
                    <div>
                      <span className="font-semibold text-gray-700">ID de Orden:</span>
                      <p className="text-gray-900">{orderId}</p>
                    </div>
                  )}
                  {orderNumber && (
                    <div>
                      <span className="font-semibold text-gray-700">Número de Orden:</span>
                      <p className="text-gray-900">{orderNumber}</p>
                    </div>
                  )}
                  {(paymentId || collection_id) && (
                    <div>
                      <span className="font-semibold text-gray-700">ID de Pago:</span>
                      <p className="text-gray-900">{paymentId || collection_id}</p>
                    </div>
                  )}
                  {collection_status && (
                    <div>
                      <span className="font-semibold text-gray-700">Estado:</span>
                      <p className="text-gray-900 capitalize">{collection_status}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detalles de la orden si están disponibles */}
              {orderDetails && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Detalles de tu pedido</h3>
                  <div className="text-left space-y-2">
                    {orderDetails.items?.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.title} x{item.quantity}</span>
                        <span>${item.unit_price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 font-semibold flex justify-between">
                      <span>Total:</span>
                      <span>${orderDetails.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800">{error}</p>
                  <p className="text-sm text-yellow-600 mt-2">
                    No te preocupes, tu pago fue procesado correctamente. 
                    Recibirás un email de confirmación en breve.
                  </p>
                </div>
              )}

              {/* Información adicional */}
              <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">¿Qué sigue?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Recibirás un email de confirmación en los próximos minutos</li>
                  <li>• Tu pedido será procesado y enviado en 1-2 días hábiles</li>
                  <li>• Te notificaremos cuando tu pedido esté en camino</li>
                  <li>• Si tienes preguntas, contáctanos en soporte@petgourmet.mx</li>
                </ul>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <HomeIcon className="h-5 w-5 mr-2" />
                  Volver al inicio
                </Link>
                <Link
                  href="/productos"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <ShoppingBagIcon className="h-5 w-5 mr-2" />
                  Seguir comprando
                </Link>
              </div>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-2">¿Necesitas ayuda?</h3>
            <p className="text-gray-600 mb-4">
              Nuestro equipo de soporte está aquí para ayudarte
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <a
                href="mailto:soporte@petgourmet.mx"
                className="text-blue-600 hover:text-blue-800"
              >
                soporte@petgourmet.mx
              </a>
              <a
                href="tel:+525555555555"
                className="text-blue-600 hover:text-blue-800"
              >
                (55) 5555-5555
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}