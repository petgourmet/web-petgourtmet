'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

function ProcessingPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentData, setPaymentData] = useState<any>(null)
  const [orderData, setOrderData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  // Extraer parámetros de la URL
  const orderId = searchParams.get('order_id')
  const orderNumber = searchParams.get('order_number')
  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const collectionId = searchParams.get('collection_id')
  const collectionStatus = searchParams.get('collection_status')
  const externalReference = searchParams.get('external_reference')
  const paymentType = searchParams.get('payment_type')
  const merchantOrderId = searchParams.get('merchant_order_id')
  const preferenceId = searchParams.get('preference_id')
  const siteId = searchParams.get('site_id')
  const processingMode = searchParams.get('processing_mode')
  const preapprovalId = searchParams.get('preapproval_id')
  const subscriptionId = searchParams.get('subscription_id')

  // Función para detectar si es una suscripción
  const isSubscription = () => {
    // Verificar parámetros específicos de suscripción
    if (preapprovalId || subscriptionId) {
      return true
    }
    
    // Verificar patrones en external_reference
    if (externalReference) {
      // Patrones comunes para suscripciones
      const subscriptionPatterns = [
        /^SUB-/i,           // SUB-xxx-xxx-xxx
        /subscription/i,     // contiene "subscription"
        /suscripcion/i,      // contiene "suscripcion"
        /preapproval/i,      // contiene "preapproval"
        /-sub-/i,           // contiene "-sub-"
        /-subs-/i           // contiene "-subs-"
      ]
      
      return subscriptionPatterns.some(pattern => pattern.test(externalReference))
    }
    
    return false
  }

  // Función para construir URL de redirección con parámetros
  const buildRedirectUrl = (basePath: string) => {
    const url = new URL(basePath, window.location.origin)
    
    // Parámetros esenciales a preservar
    const paramsToPreserve = [
      'order_id', 'order_number', 'payment_id', 'status', 'collection_id',
      'collection_status', 'external_reference', 'payment_type', 
      'merchant_order_id', 'preference_id', 'preapproval_id', 'subscription_id'
    ]
    
    paramsToPreserve.forEach(param => {
      const value = searchParams.get(param)
      if (value) {
        url.searchParams.set(param, value)
      }
    })
    
    return url.toString()
  }

  // Función para manejar redirección automática
  const handleAutoRedirect = () => {
    if (status === 'approved' && !redirecting) {
      setRedirecting(true)
      
      const targetPath = isSubscription() ? '/suscripcion/exito' : '/gracias-por-tu-compra'
      const redirectUrl = buildRedirectUrl(targetPath)
      
      console.log('🔄 Redirigiendo automáticamente:', {
        isSubscription: isSubscription(),
        targetPath,
        redirectUrl,
        searchParams: Object.fromEntries(searchParams.entries())
      })
      
      // Pequeño delay para mostrar el mensaje de redirección
      setTimeout(() => {
        router.push(redirectUrl)
      }, 1500)
    }
  }

  useEffect(() => {
    const processPayment = async () => {
      // Con webhooks, solo necesitamos order_id o external_reference para consultar el estado
      if (!orderId && !externalReference) {
        setError('Se requiere order_id o external_reference para consultar el estado del pago')
        setIsLoading(false)
        return
      }

      // Detectar si son parámetros de prueba
      const isTestData = orderId === '123' || (paymentId && paymentId === '12345') || (orderId && orderId.toString().startsWith('test')) || (paymentId && (paymentId.includes('{{') || paymentId.includes('}}')))
      
      try {
        if (!isTestData) {
          // Con webhooks, solo consultamos el estado actual de la orden
          if (orderId) {
            const orderResponse = await fetch(`/api/orders/${orderId}`)
            if (orderResponse.ok) {
              const orderInfo = await orderResponse.json()
              setOrderData(orderInfo.order)
              
              // Si tenemos payment_id, obtener información del pago
              if (paymentId) {
                const paymentResponse = await fetch(`/api/mercadopago/payment/${paymentId}`)
                if (paymentResponse.ok) {
                  const paymentInfo = await paymentResponse.json()
                  setPaymentData(paymentInfo)
                }
              }
            } else {
              throw new Error('No se pudo obtener la información de la orden')
            }
          } else if (externalReference) {
            // Buscar orden por external_reference si no tenemos order_id
            const searchResponse = await fetch(`/api/orders/search?external_reference=${externalReference}`)
            if (searchResponse.ok) {
              const searchResult = await searchResponse.json()
              if (searchResult.order) {
                setOrderData(searchResult.order)
              }
            }
          }
        } else {
          // Para datos de prueba, simular datos básicos
          console.log('Modo de prueba detectado - usando datos simulados')
          setPaymentData({
            id: paymentId || '12345',
            status: status || 'approved',
            payment_method_id: paymentType || 'cash',
            transaction_amount: 1500,
            currency_id: 'ARS'
          })
          
          if (orderNumber) {
            setOrderData({
              id: orderId,
              order_number: orderNumber,
              total_amount: 1500,
              status: 'pending'
            })
          }
        }

      } catch (error) {
        console.error('Error procesando el pago:', error)
        // Solo mostrar error si no son datos de prueba
        if (!isTestData) {
          setError(error instanceof Error ? error.message : 'Error desconocido')
        } else {
          console.log('Error ignorado en modo de prueba')
        }
      } finally {
        setIsLoading(false)
        // Intentar redirección automática después de cargar los datos
        handleAutoRedirect()
      }
    }

    processPayment()
  }, [orderId, paymentId, status])

  // Efecto separado para manejar redirección cuando cambia el estado
  useEffect(() => {
    if (!isLoading) {
      handleAutoRedirect()
    }
  }, [isLoading, status])

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'rejected':
        return <XCircle className="h-16 w-16 text-red-500" />
      case 'pending':
        return <Clock className="h-16 w-16 text-yellow-500" />
      default:
        return <AlertTriangle className="h-16 w-16 text-gray-500" />
    }
  }

  const getStatusMessage = () => {
    // Detectar si es pago en efectivo por la URL o tipo de pago
    const isCashPayment = paymentType === 'cash' || 
                         window.location.href.includes('pay_with_cash=true') ||
                         paymentType === 'ticket' ||
                         paymentType === 'atm'

    switch (status) {
      case 'approved':
        return {
          title: '¡Pago Aprobado!',
          description: redirecting ? 
            `Redirigiendo a la página de ${isSubscription() ? 'suscripción' : 'compra'} exitosa...` :
            'Tu pago ha sido procesado exitosamente.',
          color: 'text-green-600'
        }
      case 'rejected':
        return {
          title: 'Pago Rechazado',
          description: 'Tu pago no pudo ser procesado.',
          color: 'text-red-600'
        }
      case 'pending':
        if (isCashPayment) {
          return {
            title: 'Esperando tu Pago',
            description: 'Una vez realizado el pago, puedes enviarnos el comprobante para acelerar el proceso.',
            color: 'text-blue-600'
          }
        }
        return {
          title: 'Pago Pendiente',
          description: 'Tu pago está siendo procesado.',
          color: 'text-yellow-600'
        }
      default:
        return {
          title: 'Estado Desconocido',
          description: 'No se pudo determinar el estado del pago.',
          color: 'text-gray-600'
        }
    }
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_card':
        return 'Tarjeta de Crédito'
      case 'debit_card':
        return 'Tarjeta de Débito'
      case 'bank_transfer':
        return 'Transferencia Bancaria'
      case 'cash':
      case 'ticket':
        return 'Pago en Efectivo'
      case 'atm':
        return 'Cajero Automático'
      case 'account_money':
        return 'Dinero en Cuenta'
      default:
        return type || 'No especificado'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Procesando información del pago...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar mensaje de redirección para pagos aprobados
  if (redirecting && status === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">¡Pago Exitoso!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600">
              Redirigiendo a la página de {isSubscription() ? 'suscripción' : 'compra'} exitosa...
            </p>
            <p className="text-sm text-gray-500">
              Si no eres redirigido automáticamente, haz clic en el botón de abajo.
            </p>
            <Button 
              onClick={() => router.push(buildRedirectUrl(isSubscription() ? '/suscripcion/exito' : '/gracias-por-tu-compra'))}
              className="bg-green-600 hover:bg-green-700"
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusMessage = getStatusMessage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Estado Principal */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className={`text-2xl font-bold ${statusMessage.color}`}>
              {statusMessage.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {statusMessage.description}
            </p>

            <Separator />

            {orderNumber && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-700 font-medium mb-2">Número de Orden</p>
                <p className="text-xl font-mono font-bold text-gray-900">{orderNumber}</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              {status === 'approved' && !redirecting && (
                <Button onClick={() => router.push('/perfil')} className="bg-green-600 hover:bg-green-700">
                  Ver Mis Pedidos
                </Button>
              )}
              {(paymentType === 'cash' || paymentType === 'ticket' || window.location.href.includes('pay_with_cash=true')) && status === 'pending' && (
                <Button onClick={() => window.open('https://wa.me/5215512345678?text=Hola,%20quiero%20enviar%20mi%20comprobante%20de%20pago%20para%20la%20orden%20' + orderNumber, '_blank')} className="bg-green-600 hover:bg-green-700">
                  Enviar Comprobante por WhatsApp
                </Button>
              )}
              <Button onClick={() => router.push('/')} variant="outline">
                Volver al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detalles del Pago */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Información del Pago */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">ID de Pago:</span>
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{paymentId}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Estado del Pago:</span>
                  <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}>
                    {status === 'approved' ? 'Aprobado' : status === 'rejected' ? 'Rechazado' : status === 'pending' ? 'Pendiente' : status}
                  </Badge>
                </div>
                
                {paymentType && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Método de Pago:</span>
                    <span className="font-semibold">{getPaymentTypeLabel(paymentType)}</span>
                  </div>
                )}
                
                {collectionId && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">ID de Transacción:</span>
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{collectionId}</span>
                  </div>
                )}
                
                {merchantOrderId && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Orden Mercado Pago:</span>
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{merchantOrderId}</span>
                  </div>
                )}
                
                {preferenceId && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Preference ID:</span>
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{preferenceId}</span>
                  </div>
                )}
                
                {paymentData && paymentData.transaction_amount && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-700 font-medium">Monto:</span>
                    <span className="font-bold text-green-800">${paymentData.transaction_amount} {paymentData.currency_id || 'MXN'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información de la Orden */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">ID de Orden:</span>
                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{orderId}</span>
                </div>
                
                {externalReference && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Referencia Externa:</span>
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{externalReference}</span>
                  </div>
                )}
                
                {orderData && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-blue-700 font-medium">Total:</span>
                      <span className="font-bold text-blue-800">${orderData.total} MXN</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">Estado del Pedido:</span>
                      <Badge variant={orderData.status === 'completed' ? 'default' : orderData.status === 'cancelled' ? 'destructive' : 'secondary'}>
                        {orderData.status === 'pending' ? 'Pendiente' : 
                         orderData.status === 'processing' ? 'Procesando' :
                         orderData.status === 'shipped' ? 'Enviado' :
                         orderData.status === 'completed' ? 'Completado' :
                         orderData.status === 'cancelled' ? 'Cancelado' : orderData.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600 font-medium">Estado del Pago (BD):</span>
                      <Badge variant={orderData.payment_status === 'paid' ? 'default' : orderData.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                        {orderData.payment_status === 'pending' ? 'Pendiente' :
                         orderData.payment_status === 'paid' ? 'Pagado' :
                         orderData.payment_status === 'failed' ? 'Fallido' :
                         orderData.payment_status === 'refunded' ? 'Reembolsado' : orderData.payment_status || 'No definido'}
                      </Badge>
                    </div>
                    
                    {orderData.customer_name && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">Cliente:</span>
                        <span className="font-semibold">{orderData.customer_name}</span>
                      </div>
                    )}
                    
                    {orderData.created_at && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">Fecha de Creación:</span>
                        <span className="text-sm">{new Date(orderData.created_at).toLocaleString('es-MX')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información Técnica (oculta para el cliente) */}
        {false && process.env.NODE_ENV === 'development' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Información Técnica (Desarrollo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Site ID:</strong> {siteId}
                </div>
                <div>
                  <strong>Processing Mode:</strong> {processingMode}
                </div>
                <div>
                  <strong>Preference ID:</strong> {preferenceId}
                </div>
                <div>
                  <strong>Collection Status:</strong> {collectionStatus}
                </div>
              </div>
              
              {paymentData && (
                <div className="mt-4">
                  <strong>Datos del Pago:</strong>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(paymentData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function ProcessingPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del pago...</p>
        </div>
      </div>
    }>
      <ProcessingPaymentContent />
    </Suspense>
  )
}