'use client'

import { useState, useEffect } from 'react'
import { Check, Calendar, CreditCard, Star, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  frequency: number
  frequency_type: string
  discount_percentage: number
  recommended: boolean
}

interface SubscriptionPlansProps {
  productId?: number
  productName?: string
  basePrice?: number
  userEmail?: string
  userId?: string
  onSubscriptionCreated?: (subscription: any) => void
}

export default function SubscriptionPlans({
  productId,
  productName = 'Producto Pet Gourmet',
  basePrice = 100,
  userEmail,
  userId,
  onSubscriptionCreated
}: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [creatingSubscription, setCreatingSubscription] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans')
      const result = await response.json()
      
      if (result.success) {
        setPlans(result.plans)
      } else {
        toast.error('Error cargando planes de suscripción')
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDiscountedPrice = (plan: SubscriptionPlan) => {
    const discount = plan.discount_percentage / 100
    return basePrice * (1 - discount)
  }

  const getFrequencyText = (plan: SubscriptionPlan) => {
    const frequency = plan.frequency
    const type = plan.frequency_type
    
    if (type === 'weeks') {
      return frequency === 1 ? 'Semanal' : `Cada ${frequency} semanas`
    } else if (type === 'months') {
      return frequency === 1 ? 'Mensual' : `Cada ${frequency} meses`
    }
    return `Cada ${frequency} ${type}`
  }

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!userEmail) {
      toast.error('Debes iniciar sesión para suscribirte')
      return
    }

    setCreatingSubscription(plan.id)

    try {
      // Crear suscripción sin plan usando la nueva API
      const subscriptionResponse = await fetch('/api/subscriptions/create-without-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: `${plan.name} - ${productName}`,
          external_reference: `PG-${Date.now()}-${userId}`,
          payer_email: userEmail,
          auto_recurring: {
            frequency: plan.frequency_type === 'weeks' ? plan.frequency * 7 : plan.frequency,
            frequency_type: plan.frequency_type === 'weeks' ? 'days' : 'months',
            start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // En 1 año
            transaction_amount: calculateDiscountedPrice(plan),
            currency_id: 'MXN'
          },
          back_url: 'https://petgourmet.mx/perfil/suscripciones',
          status: 'pending', // Sin método de pago, el usuario lo agregará en MercadoPago
          user_id: userId,
          product_id: productId,
          quantity: 1
        })
      })

      const subscriptionResult = await subscriptionResponse.json()

      if (subscriptionResult.success) {
        toast.success('¡Suscripción creada!', {
          description: 'Serás redirigido al pago',
          duration: 3000
        })

        // Redirigir a MercadoPago
        if (subscriptionResult.redirect_url) {
          window.open(subscriptionResult.redirect_url, '_blank')
        }

        // Callback opcional
        if (onSubscriptionCreated) {
          onSubscriptionCreated(subscriptionResult.subscription)
        }
      } else {
        throw new Error(subscriptionResult.error || 'Error creando suscripción')
      }

    } catch (error) {
      console.error('Error creating subscription:', error)
      toast.error('Error al crear suscripción', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo',
        duration: 5000
      })
    } finally {
      setCreatingSubscription(null)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-80 w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Planes de Suscripción
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Suscríbete y ahorra en cada entrega. Entre más frecuente, mayor descuento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const discountedPrice = calculateDiscountedPrice(plan)
          const savings = basePrice - discountedPrice
          const isCreating = creatingSubscription === plan.id

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                plan.recommended
                  ? 'border-primary ring-2 ring-primary/20 scale-105'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Recomendado
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {plan.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-3xl font-bold text-primary">
                        ${discountedPrice.toFixed(0)}
                      </span>
                      <span className="text-gray-500">MXN</span>
                    </div>
                    
                    {plan.discount_percentage > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500 line-through">
                          Precio normal: ${basePrice}
                        </div>
                        <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                          Ahorras ${savings.toFixed(0)} ({plan.discount_percentage}%)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Entrega {getFrequencyText(plan).toLowerCase()}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Cancela cuando quieras</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Envío gratuito</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Soporte prioritario</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCreating || !userEmail}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    plan.recommended
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  } ${
                    isCreating ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    !userEmail ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Suscribirse
                    </>
                  )}
                </button>

                {!userEmail && (
                  <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Inicia sesión para suscribirte</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
        <p>
          * Los precios se calculan automáticamente con descuentos aplicados. 
          Puedes cancelar tu suscripción en cualquier momento desde tu perfil. 
          No se realizan cargos adicionales por cancelación.
        </p>
      </div>
    </div>
  )
}
