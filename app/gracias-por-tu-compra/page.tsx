'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, Mail, User, MapPin, CreditCard, Home, ShoppingBag, Phone } from 'lucide-react'
import Link from 'next/link'
import { useClientAuth } from '@/hooks/use-client-auth'
import Image from 'next/image'
import { trackPurchase, pushProductDataLayer } from '@/utils/analytics'

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
    console.log('🔍 [DEBUG] Sessionaaada ID desde URL:', sessionId)
    console.log('🔍 [DEBUG] URL completa:', window.location.href)
    
    if (sessionId) {
      console.log('✅ [DEBUG] Session ID encontrado, obteniendo detalles de orden...')
      fetchOrderDetails(sessionId)
    } else {
      console.warn('⚠️ [DEBUG] No hay session_id en la URL - no se pueden cargar detalles')
      setLoading(false)
    }
  }, [sessionId])

  const fetchOrderDetails = async (session_id: string, retryCount = 0) => {
    try {
      console.log('🔵 [API] Llamando a /api/stripe/order-details con session_id:', session_id, 'intento:', retryCount + 1)
      const response = await fetch(`/api/stripe/order-details?session_id=${session_id}`)
      console.log('🔵 [API] Response status:', response.status, response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔵 [API] Datos recibidos del servidor:', data)

        // Si la orden está pendiente (aún no procesada por webhook), reintentar
        if (data.pending && retryCount < 6) {
          console.log('⏳ [API] Orden aún pendiente, reintentando en 3 segundos... (intento', retryCount + 1, 'de 6)')
          // Actualizar UI con datos temporales pero NO hacer tracking todavía
          setOrderDetails(data)
          setTimeout(() => {
            fetchOrderDetails(session_id, retryCount + 1)
          }, 3000)
          return
        }
        
        // Si después de 6 intentos sigue pendiente, procesar con datos temporales
        if (data.pending && retryCount >= 6) {
          console.warn('⚠️ [API] Orden sigue pendiente después de 6 intentos')
          console.log('📋 [API] Webhook probablemente no está procesando. Usando datos de Stripe directamente.')
          // Generar número basado en la sesión
          data.orderNumber = `TEMP-${session_id.substring(8, 16).toUpperCase()}`
          data.orderId = session_id // Usar session_id completo como orderId
          data.pending = false // Marcar como no pendiente para procesar tracking
        }
        
        // ===== ASEGURAR QUE SIEMPRE HAYA UN ID VÁLIDO =====
        // Prioridad: 1) orderId real, 2) orderNumber, 3) session_id
        const finalOrderId = data.orderId || data.orderNumber || session_id
        const finalOrderNumber = data.orderNumber === 'Procesando...' 
          ? `TEMP-${session_id.substring(8, 16).toUpperCase()}`
          : data.orderNumber || `TEMP-${session_id.substring(8, 16).toUpperCase()}`
        
        // Actualizar datos con IDs garantizados
        data.orderId = finalOrderId
        data.orderNumber = finalOrderNumber
        
        // Log para verificar IDs finales
        console.log('🔵 [API] IDs finales asignados:', {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          session_id: session_id,
          isPending: data.pending
        })
        
        // Actualizar estado con los datos finales
        setOrderDetails(data)

        // ===== PUSH DATOS DE PRODUCTOS AL DATA LAYER =====
        console.log('🔵 [GTM] Datos de orden recibidos:', {
          orderId: data.orderId,
          total: data.total,
          items: data.items?.length
        })
        
        // Agregar información de productos al Data Layer
        if (data.items && data.items.length > 0) {
          console.log('🔵 [GTM] Total items recibidos:', data.items.length)
          console.log('🔵 [GTM] Todos los items:', data.items)
          
          const firstItem = data.items[0]
          console.log('🔵 [GTM] Primer item para Data Layer:', {
            category: firstItem.category,
            name: firstItem.name,
            price: firstItem.price,
            quantity: firstItem.quantity
          })
          
          console.log('🔵 [GTM] Llamando a pushProductDataLayer...')
          pushProductDataLayer({
            productCategory: firstItem.category,
            productCategoryC: firstItem.category,
            productName: firstItem.name,
            productNameC: firstItem.name,
            productPrice: firstItem.price,
            productPriceC: firstItem.price,
            productQuantityC: firstItem.quantity,
            productSKUC: firstItem.product_id || firstItem.id,
            productos: data.items.length
          })
        }

        // ===== ANALYTICS TRACKING - EVENTO PURCHASE =====
        console.log('🔵 [GTM] Preparando evento purchase...')
        console.log('🔵 [GTM] Verificación de IDs antes de trackPurchase:', {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          'orderId es null?': data.orderId === null,
          'orderId es undefined?': data.orderId === undefined,
          'tipo de orderId': typeof data.orderId
        })
        
        console.log('🔵 [GTM] Total items:', data.items?.length)
        console.log('🔵 [GTM] Datos completos de la compra:', {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          total: data.total,
          items: data.items
        })
        
        // Preparar objeto de compra con IDs verificados
        const purchaseData = {
          orderId: data.orderId || data.orderNumber || session_id,
          orderNumber: data.orderNumber || data.orderId || 'PENDING',
          total: data.total,
          subtotal: data.subtotal,
          shipping: data.shipping || 0,
          tax: data.tax || 0,
          coupon: data.coupon || undefined,
          affiliation: 'PetGourmet Online Store',
          items: data.items.map((item: any) => ({
            id: item.product_id || item.id,
            product_id: item.product_id || item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category,
            subcategory: item.subcategory,
            brand: item.brand || 'PET GOURMET',
            variant: item.variant || item.size
          })),
          customerEmail: data.customerEmail,
          customerName: data.customerName,
        }
        
        console.log('🔵 [GTM] Objeto purchaseData preparado:', purchaseData)
        console.log('🔵 [GTM] Llamando a trackPurchase...')
        
        // Usar la función centralizada que maneja todos los servicios de analytics
        trackPurchase(purchaseData)
        
        // Log final para verificación
        console.log('🟢 [GTM] ========== VERIFICACIÓN FINAL ==========')
        console.log('🟢 [GTM] Data Layer completo:', window.dataLayer)
        console.log('🟢 [GTM] Total eventos en dataLayer:', window.dataLayer.length)
        console.log('🟢 [GTM] Eventos purchase encontrados:', 
          window.dataLayer.filter((item: any) => item.event === 'purchase')
        )
        console.log('🟢 [GTM] Último evento purchase:', 
          window.dataLayer.filter((item: any) => item.event === 'purchase').slice(-1)
        )
        console.log('🟢 [GTM] ==========================================')
        
        // Tabla para ver mejor todos los eventos
        console.table(window.dataLayer.map((item: any, index: number) => ({
          index,
          event: item.event,
          hasEcommerce: !!item.ecommerce,
          pageCategory: item.pageCategory
        })))

        // NOTA: trackPurchase() ya incluye gtag y fbq internamente
        // NO duplicar eventos de purchase aquí
      } else {
        console.error('❌ [API] Error en la respuesta:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('❌ [API] Detalle del error:', errorText)
      }
    } catch (error) {
      console.error('❌ [ERROR] Error al obtener detalles de orden:', error)
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

          {orderDetails && (
            <div className="inline-block bg-[#78b7bf]/10 px-6 py-3 rounded-full border-2 border-[#78b7bf]/30">
              <p className="text-sm font-medium text-[#78b7bf]">Número de Pedido</p>
              <p className="text-2xl font-bold text-[#6aa5ad]">
                #{orderDetails.orderNumber || orderDetails.orderId}
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