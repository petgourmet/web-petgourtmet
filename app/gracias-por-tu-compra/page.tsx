'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, Mail, User, MapPin, CreditCard, Home, ShoppingBag, Phone } from 'lucide-react'
import Link from 'next/link'
import { useClientAuth } from '@/hooks/use-client-auth'
import Image from 'next/image'

interface OrderDetails {
  orderId: string
  orderNumber: string
  total: number
  subtotal: number
  shipping: number
  items: any[]
  customerEmail: string
  customerName: string
  shippingAddress: any
}

export default function GraciasPorTuCompra() {
  const searchParams = useSearchParams()
  const { user } = useClientAuth()
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      fetchOrderDetails(sessionId)
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const fetchOrderDetails = async (session_id: string) => {
    try {
      const response = await fetch(`/api/stripe/order-details?session_id=${session_id}`)
      if (response.ok) {
        const data = await response.json()
        setOrderDetails(data)

        // Google Analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'purchase', {
            transaction_id: data.orderId,
            value: data.total,
            currency: 'MXN',
            items: data.items.map((item: any) => ({
              id: item.product_id,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }))
          })
        }

        // Facebook Pixel
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: data.total,
            currency: 'MXN'
          })
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#78b7bf]/5 via-[#78b7bf]/10 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#78b7bf] border-t-transparent mx-auto mb-6"></div>
          <p className="text-lg text-gray-700 font-medium">Cargando tu pedido...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#78b7bf]/5 via-[#78b7bf]/10 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header de Éxito */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center border-t-4 border-[#78b7bf]">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#78b7bf]/10 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-[#78b7bf]" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            ¡Compra Exitosa!
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            Tu pedido ha sido confirmado y está siendo preparado con mucho cuidado
          </p>

          {orderData && (
            <div className="inline-block bg-[#78b7bf]/10 px-6 py-3 rounded-full border-2 border-[#78b7bf]/30">
              <p className="text-sm font-medium text-[#78b7bf]">Número de Pedido</p>
              <p className="text-2xl font-bold text-[#6aa5ad]">
                #PG-{orderDetails.orderId}
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Email Confirmación */}
          <div className="bg-white rounded-xl shadow-md p-6 text-center border-l-4 border-[#78b7bf]">
            <Mail className="w-10 h-10 text-[#78b7bf] mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Email Enviado</h3>
            <p className="text-sm text-gray-600">
              Recibirás la confirmación en tu email en unos minutos
            </p>
          </div>

          {/* Proceso */}
          <div className="bg-white rounded-xl shadow-md p-6 text-center border-l-4 border-[#6aa5ad]">
            <Package className="w-10 h-10 text-[#6aa5ad] mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Preparando Pedido</h3>
            <p className="text-sm text-gray-600">
              Tu pedido será enviado en 1-2 días hábiles
            </p>
          </div>

          {/* Perfil */}
          <div className="bg-white rounded-xl shadow-md p-6 text-center border-l-4 border-[#5c9ca4]">
            <User className="w-10 h-10 text-[#5c9ca4] mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {user ? 'Ver en Perfil' : 'Email de Seguimiento'}
            </h3>
            <p className="text-sm text-gray-600">
              {user 
                ? 'Revisa el estado en tu perfil' 
                : 'Te enviaremos actualizaciones por email'}
            </p>
          </div>
        </div>

        {/* Detalles del Pedido */}
        {orderDetails && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#78b7bf]" />
              Resumen de tu Compra
            </h2>

            {/* Productos */}
            <div className="space-y-4 mb-6">
              {orderDetails.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    {item.image ? (
                      <Image 
                        src={item.image} 
                        alt={item.name} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-200 flex items-center justify-center">
                        <Package className="w-8 h-8 text-green-600" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-500">${item.price} c/u</p>
                    <p className="font-bold text-gray-900">${item.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-medium">${orderDetails.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Envío:</span>
                <span className="font-medium">
                  {orderDetails.shipping > 0 ? `$${orderDetails.shipping}` : 'Gratis'}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span className="text-[#78b7bf]">${orderDetails.total} MXN</span>
              </div>
            </div>
          </div>
        )}

        {/* Información del Cliente */}
        {orderDetails && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#78b7bf]" />
                Información del Cliente
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Nombre:</span> {orderDetails.customerName}</p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {orderDetails.customerEmail}
                </p>
              </div>
            </div>

            {orderDetails.shippingAddress && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#78b7bf]" />
                  Dirección de Envío
                </h3>
                <div className="text-sm text-gray-700">
                  <p>{orderDetails.shippingAddress.address}</p>
                  <p>{orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.state}</p>
                  <p>CP: {orderDetails.shippingAddress.postalCode}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Próximos Pasos */}
        <div className="bg-gradient-to-r from-[#78b7bf] to-[#6aa5ad] rounded-2xl shadow-xl p-8 mb-6 text-white">
          <h3 className="text-2xl font-bold mb-4">📋 ¿Qué sigue ahora?</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Email de Confirmación</p>
                <p className="text-white/90 text-sm">Recibirás un correo con todos los detalles de tu pedido en los próximos minutos</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Preparación del Pedido</p>
                <p className="text-white/90 text-sm">Nuestro equipo comenzará a preparar tu pedido con mucho cuidado</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Envío y Seguimiento</p>
                <p className="text-white/90 text-sm">Te notificaremos cuando tu pedido esté en camino y podrás rastrearlo</p>
              </div>
            </li>
            {user && (
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Revisa tu Perfil</p>
                  <p className="text-white/90 text-sm">Puedes ver el estado de tu pedido en cualquier momento desde tu perfil</p>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {user ? (
            <Link
              href="/perfil?tab=orders"
              className="flex-1 bg-[#78b7bf] hover:bg-[#6aa5ad] text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <User className="w-5 h-5" />
              Ver mis Pedidos
            </Link>
          ) : (
            <div className="flex-1 bg-[#78b7bf]/10 border-2 border-[#78b7bf]/30 text-[#5c9ca4] font-medium py-4 px-6 rounded-xl text-center">
              <p className="text-sm mb-1">✉️ Revisa tu email</p>
              <p className="text-xs">Te enviamos toda la información de tu pedido</p>
            </div>
          )}
          
          <Link
            href="/productos"
            className="flex-1 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md border-2 border-gray-200"
          >
            <ShoppingBag className="w-5 h-5" />
            Seguir Comprando
          </Link>
          
          <Link
            href="/"
            className="flex-1 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md border-2 border-gray-200"
          >
            <Home className="w-5 h-5" />
            Ir al Inicio
          </Link>
        </div>

        {/* Soporte */}
        <div className="bg-white rounded-2xl shadow-md p-6 text-center">
          <h3 className="font-bold text-gray-900 mb-3">¿Necesitas Ayuda?</h3>
          <p className="text-gray-600 mb-4">Nuestro equipo está disponible para ayudarte</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="mailto:soporte@petgourmet.mx" className="flex items-center gap-2 text-[#78b7bf] hover:text-[#6aa5ad] font-medium">
              <Mail className="w-4 h-4" />
              soporte@petgourmet.mx
            </a>
            <a href="tel:+525555555555" className="flex items-center gap-2 text-[#78b7bf] hover:text-[#6aa5ad] font-medium">
              <Phone className="w-4 h-4" />
              (55) 5555-5555
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}