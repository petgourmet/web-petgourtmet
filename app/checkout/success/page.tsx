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
  const [validationStatus, setValidationStatus] = useState<{
    isValidating: boolean
    completed: boolean
    success: boolean
    message: string
  }>({ isValidating: false, completed: false, success: false, message: '' })

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        let currentOrderId = orderId || externalReference
        
        // PRIMERA VALIDACIÓN: Validación automática inmediata al llegar a la página
         if (currentOrderId) {
           setValidationStatus({
             isValidating: true,
             completed: false,
             success: false,
             message: 'Validando estado del pago...'
           })
           
           console.log('🔄 Ejecutando validación automática al llegar a página de éxito...')
           
           try {
             // Ejecutar validación proactiva automática
             const validationResponse = await fetch(`/api/orders/${currentOrderId}/validate`, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json'
               }
             })
             
             if (validationResponse.ok) {
               const validationResult = await validationResponse.json()
               console.log('✅ Validación automática completada:', validationResult)
               
               if (validationResult.validation?.success) {
                 console.log('🎉 Pago validado automáticamente:', validationResult.validation.action)
                 setValidationStatus({
                   isValidating: false,
                   completed: true,
                   success: true,
                   message: 'Pago validado exitosamente'
                 })
               } else {
                 setValidationStatus({
                   isValidating: false,
                   completed: true,
                   success: false,
                   message: 'Validación completada - Estado actual confirmado'
                 })
               }
             } else {
               setValidationStatus({
                 isValidating: false,
                 completed: true,
                 success: false,
                 message: 'Error en validación automática'
               })
             }
           } catch (validationError) {
             console.warn('⚠️ Error en validación automática (no crítico):', validationError)
             setValidationStatus({
               isValidating: false,
               completed: true,
               success: false,
               message: 'Error de conexión en validación'
             })
           }
         }
        
        // Obtener información completa de la orden (después de validación)
        if (orderId) {
          const response = await fetch(`/api/orders/${orderId}`)
          if (response.ok) {
            const data = await response.json()
            setOrderData(data.order)
            
            // Si la orden tiene payment ID, obtener datos del pago
            if (data.order?.mercadopago_payment_id) {
              const paymentResponse = await fetch(`/api/mercadopago/payment/${data.order.mercadopago_payment_id}`)
              if (paymentResponse.ok) {
                const paymentInfo = await paymentResponse.json()
                setPaymentData(paymentInfo)
              }
            }
          }
        } else if (externalReference) {
          const response = await fetch(`/api/orders/search?external_reference=${externalReference}`)
          if (response.ok) {
            const data = await response.json()
            if (data.order) {
              setOrderData(data.order)
              
              // Obtener datos del pago si están disponibles
              if (data.order?.mercadopago_payment_id) {
                const paymentResponse = await fetch(`/api/mercadopago/payment/${data.order.mercadopago_payment_id}`)
                if (paymentResponse.ok) {
                  const paymentInfo = await paymentResponse.json()
                  setPaymentData(paymentInfo)
                }
              }
            }
          }
        }
        
        // Obtener información del pago directamente si se proporciona payment_id
        if (paymentId && !paymentData) {
          const response = await fetch(`/api/mercadopago/payment/${paymentId}`)
          if (response.ok) {
            const data = await response.json()
            setPaymentData(data)
          }
        }
      } catch (error) {
        console.error('Error fetching info:', error)
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
        
        {/* Estado de Validación Automática */}
        {validationStatus.isValidating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-blue-700 font-medium">{validationStatus.message}</span>
            </div>
          </div>
        )}
        
        {validationStatus.completed && validationStatus.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-700 font-medium">{validationStatus.message}</span>
            </div>
          </div>
        )}
        
        {validationStatus.completed && !validationStatus.success && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-yellow-700 font-medium">{validationStatus.message}</span>
            </div>
          </div>
        )}
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
            {/* ID de Pago */}
            {(paymentId || orderData?.mercadopago_payment_id) && (
              <div className="flex justify-between">
                <span className="text-gray-600">ID de Pago:</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {paymentId || orderData?.mercadopago_payment_id}
                </span>
              </div>
            )}
            
            {/* Número de Pedido */}
            {(orderId || externalReference || orderData?.id) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Número de Pedido:</span>
                <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded text-blue-800">
                  #{orderId || externalReference || orderData?.id}
                </span>
              </div>
            )}
            
            {/* Estado del Pago */}
            {(status || paymentData?.status || orderData?.payment_status) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Estado del Pago:</span>
                <span className="capitalize font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                  {status || paymentData?.status || orderData?.payment_status}
                </span>
              </div>
            )}
            
            {/* Método de Pago */}
            {(paymentData?.payment_method_id || orderData?.payment_method) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Método de Pago:</span>
                <span className="capitalize">
                  {paymentData?.payment_method_id || orderData?.payment_method}
                </span>
              </div>
            )}
            
            {/* Tipo de Pago */}
            {(paymentData?.payment_type_id || orderData?.payment_type) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo de Pago:</span>
                <span className="capitalize">
                  {paymentData?.payment_type_id || orderData?.payment_type}
                </span>
              </div>
            )}
            
            {/* Fecha del Pago */}
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha del Pago:</span>
              <span>
                {paymentData?.date_created 
                  ? new Date(paymentData.date_created).toLocaleString('es-MX')
                  : orderData?.confirmed_at 
                  ? new Date(orderData.confirmed_at).toLocaleString('es-MX')
                  : new Date().toLocaleString('es-MX')
                }
              </span>
            </div>
            
            {/* Total Pagado */}
            {(paymentData?.transaction_amount || orderData?.total) && (
              <div className="flex justify-between font-semibold text-lg border-t pt-3">
                <span>Total Pagado:</span>
                <span className="text-green-600">
                  ${paymentData?.transaction_amount || orderData?.total} {paymentData?.currency_id || 'MXN'}
                </span>
              </div>
            )}
            
            {/* Información adicional si está disponible */}
            {paymentData?.installments && paymentData.installments > 1 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Cuotas:</span>
                <span>{paymentData.installments}x de ${(paymentData.transaction_amount / paymentData.installments).toFixed(2)}</span>
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
