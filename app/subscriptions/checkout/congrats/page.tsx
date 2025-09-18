'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, Loader2, AlertCircle, ArrowLeft, User } from 'lucide-react'

interface SubscriptionData {
  id: string
  user_id: string
  subscription_type: string
  status: string
  external_reference: string
  product_name: string
  discounted_price: number
  next_billing_date: string
  frequency: string
}

function CongratsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [isProcessing, setIsProcessing] = useState(true)
  const [isActivated, setIsActivated] = useState(false)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  // Obtener parámetros de la URL
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')
  const collectionId = searchParams.get('collection_id')
  const paymentId = searchParams.get('payment_id')
  const collectionStatus = searchParams.get('collection_status')

  const activateSubscription = async (externalRef: string, userId: string) => {
    try {
      console.log('Activando suscripción con external_reference:', externalRef)
      
      // Buscar la suscripción por external_reference
      const { data: subscription, error: fetchError } = await supabase
        .from('unified_subscriptions')
        .select('*')
        .eq('external_reference', externalRef)
        .eq('user_id', userId)
        .single()

      if (fetchError || !subscription) {
        console.error('Error buscando suscripción:', fetchError)
        setError('Suscripción no encontrada')
        setIsProcessing(false)
        return
      }

      console.log('Suscripción encontrada:', subscription)

      // Si ya está activa, mostrar mensaje de éxito
      if (subscription.status === 'active') {
        console.log('La suscripción ya está activa')
        setSubscriptionData(subscription)
        setIsActivated(true)
        setIsProcessing(false)
        return
      }

      // Obtener información del producto
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', subscription.product_id)
        .single()

      if (productError || !product) {
        console.error('Error obteniendo producto:', productError)
        setError('Error obteniendo información del producto')
        setIsProcessing(false)
        return
      }

      // Calcular la próxima fecha de facturación
      const nextBillingDate = calculateNextBillingDate(subscription.subscription_type)
      
      // Obtener el campo de descuento según el tipo de suscripción
      const discountField = getDiscountField(subscription.subscription_type)
      const discountedPrice = product[discountField] || product.price

      // Actualizar la suscripción a estado activo
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('unified_subscriptions')
        .update({
          status: 'active',
          processed_at: new Date().toISOString(),
          next_billing_date: nextBillingDate,
          product_name: product.name,
          discounted_price: discountedPrice,
          frequency: getFrequencyFromSubscriptionType(subscription.subscription_type),
          frequency_type: getFrequencyTypeFromSubscriptionType(subscription.subscription_type),
          metadata: {
            ...subscription.metadata,
            collection_id: collectionId,
            payment_id: paymentId,
            activated_at: new Date().toISOString()
          }
        })
        .eq('id', subscription.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error actualizando suscripción:', updateError)
        setError('Error activando la suscripción')
        setIsProcessing(false)
        return
      }

      console.log('Suscripción activada exitosamente:', updatedSubscription)
      setSubscriptionData(updatedSubscription)
      
      // Enviar correos de confirmación
      await sendWelcomeEmail(updatedSubscription)
      
      // Actualizar perfil del usuario
      await updateUserProfile(userId)
      
      setIsActivated(true)
      setIsProcessing(false)
      
      toast.success('¡Suscripción activada exitosamente!')
      
    } catch (error) {
      console.error('Error activando suscripción:', error)
      setError('Error activando la suscripción')
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // Verificar que el usuario esté autenticado
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          setError('Usuario no autenticado')
          setIsProcessing(false)
          return
        }
        setUser(currentUser)

        console.log('Parámetros recibidos:', {
          status,
          externalReference,
          collectionId,
          paymentId,
          collectionStatus
        })

        // Verificar que tenemos los parámetros necesarios
        if (!status || !externalReference) {
          setError('Parámetros de pago incompletos')
          setIsProcessing(false)
          return
        }

        // Si el status es approved, activar la suscripción inmediatamente
        if (status === 'approved' && externalReference) {
          await activateSubscription(externalReference, currentUser.id)
        } else {
          setError(`Estado de pago no válido: ${status}`)
          setIsProcessing(false)
        }
      } catch (error) {
        console.error('Error procesando resultado del pago:', error)
        setError('Error procesando el pago')
        setIsProcessing(false)
      }
    }

    processPaymentResult()
  }, [status, externalReference, collectionId, paymentId, collectionStatus])

  const calculateNextBillingDate = (subscriptionType: string): string => {
    const now = new Date()
    const nextDate = new Date(now)
    
    switch (subscriptionType) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'bimonthly':
        nextDate.setMonth(nextDate.getMonth() + 2)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      default:
        nextDate.setMonth(nextDate.getMonth() + 1)
    }
    
    return nextDate.toISOString()
  }

  const getFrequencyFromSubscriptionType = (type: string): number => {
    switch (type) {
      case 'monthly': return 1
      case 'bimonthly': return 2
      case 'quarterly': return 3
      default: return 1
    }
  }

  const getFrequencyTypeFromSubscriptionType = (type: string): string => {
    switch (type) {
      case 'monthly': return 'months'
      case 'bimonthly': return 'months'
      case 'quarterly': return 'months'
      default: return 'months'
    }
  }

  const getDiscountField = (subscriptionType: string): string => {
    switch (subscriptionType) {
      case 'monthly':
        return 'monthly_price'
      case 'bimonthly':
        return 'bimonthly_price'
      case 'quarterly':
        return 'quarterly_price'
      default:
        return 'price'
    }
  }

  const sendWelcomeEmail = async (subscription: SubscriptionData) => {
    try {
      console.log('Enviando correos de bienvenida...')
      
      const subscriptionDetails = {
        product_name: subscription.product_name,
        frequency_text: getFrequencyText(subscription.subscription_type),
        discounted_price: subscription.discounted_price,
        next_billing_date: subscription.next_billing_date
      }
      
      const response = await fetch('/api/subscriptions/send-thank-you-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          send_admin_notification: true,
          subscription_details: subscriptionDetails
        }),
      })
      
      if (response.ok) {
        console.log('Correos de bienvenida enviados exitosamente')
      } else {
        console.error('Error enviando correos de bienvenida')
      }
    } catch (error) {
      console.error('Error enviando correos de bienvenida:', error)
    }
  }

  const getFrequencyText = (subscriptionType: string): string => {
    switch (subscriptionType) {
      case 'monthly': return 'Mensual'
      case 'bimonthly': return 'Bimestral'
      case 'quarterly': return 'Trimestral'
      default: return 'Mensual'
    }
  }

  const updateUserProfile = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_active_subscription: true })
        .eq('id', userId)
      
      if (error) {
        console.error('Error actualizando perfil:', error)
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error)
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleViewProfile = () => {
    router.push('/perfil')
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <Loader2 className="h-16 w-16 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Procesando tu pago...</h2>
            <p className="text-gray-600">Estamos activando tu suscripción, por favor espera un momento.</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error en el proceso</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleGoHome}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isActivated && subscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center mb-8">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">¡Suscripción Activada!</h1>
            <p className="text-gray-600">Tu suscripción ha sido activada exitosamente</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalles de tu suscripción:</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-semibold">{subscriptionData.product_name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Frecuencia:</span>
                <span className="font-semibold">{getFrequencyText(subscriptionData.subscription_type)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Precio:</span>
                <span className="font-semibold text-green-600">${subscriptionData.discounted_price} MXN</span>
              </div>
              
              {subscriptionData.next_billing_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Próximo cobro:</span>
                  <span className="font-semibold">
                    {new Date(subscriptionData.next_billing_date).toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>¡Importante!</strong> Hemos enviado un correo de confirmación con todos los detalles de tu suscripción. 
              También prepararemos tu primer envío según la frecuencia seleccionada.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGoHome}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </button>
            
            <button
              onClick={handleViewProfile}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <User className="h-4 w-4" />
              Ver mi perfil
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ¿Necesitas ayuda? Contáctanos en{' '}
              <a href="mailto:contacto@petgourmet.mx" className="text-orange-500 hover:underline">
                contacto@petgourmet.mx
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function CongratsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <Loader2 className="h-16 w-16 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Cargando...</h2>
            <p className="text-gray-600">Preparando tu página de confirmación.</p>
          </div>
        </div>
      </div>
    }>
      <CongratsPageContent />
    </Suspense>
  )
}