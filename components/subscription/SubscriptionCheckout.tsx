'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { CreditCard, Calendar, Package, Truck, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface Product {
  id: number
  name: string
  price: number
  image_url?: string
  weekly_discount?: number
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  semiannual_discount?: number
  annual_discount?: number
}

interface SubscriptionCheckoutProps {
  product: Product
  selectedFrequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  quantity: number
  onSuccess?: (subscriptionId: string) => void
  onCancel?: () => void
}

interface PaymentMethod {
  id: string
  type: 'credit_card' | 'debit_card' | 'bank_transfer'
  last_four?: string
  brand?: string
  expiry_month?: number
  expiry_year?: number
}

const FREQUENCY_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal', 
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual'
}

const FREQUENCY_DESCRIPTIONS = {
  weekly: 'Cada 7 días',
  biweekly: 'Cada 15 días',
  monthly: 'Cada mes',
  quarterly: 'Cada 3 meses',
  semiannual: 'Cada 6 meses',
  annual: 'Cada año'
}

export default function SubscriptionCheckout({
  product,
  selectedFrequency,
  quantity,
  onSuccess,
  onCancel
}: SubscriptionCheckoutProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [newCardData, setNewCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
    email: user?.email || ''
  })
  const [useNewCard, setUseNewCard] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [step, setStep] = useState<'payment' | 'processing' | 'success'>('payment')

  // Calcular precio con descuento
  const getDiscountedPrice = () => {
    const discountKey = `${selectedFrequency}_discount` as keyof Product
    const discount = product[discountKey] as number || 0
    const basePrice = product.price * quantity
    return basePrice * (1 - discount / 100)
  }

  const getOriginalPrice = () => product.price * quantity
  const getDiscount = () => {
    const discountKey = `${selectedFrequency}_discount` as keyof Product
    return product[discountKey] as number || 0
  }

  const getSavings = () => getOriginalPrice() - getDiscountedPrice()

  // Cargar métodos de pago del usuario
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/payment-methods', {
          headers: {
            'Authorization': `Bearer ${user.access_token}`
          }
        })

        if (response.ok) {
          const methods = await response.json()
          setPaymentMethods(methods)
          if (methods.length > 0) {
            setUseNewCard(false)
            setSelectedPaymentMethod(methods[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading payment methods:', error)
      }
    }

    loadPaymentMethods()
  }, [user])

  const handleCreateSubscription = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para crear una suscripción')
      return
    }

    if (!acceptTerms) {
      toast.error('Debes aceptar los términos y condiciones')
      return
    }

    if (useNewCard && (!newCardData.number || !newCardData.expiry || !newCardData.cvv || !newCardData.name)) {
      toast.error('Por favor completa todos los datos de la tarjeta')
      return
    }

    if (!useNewCard && !selectedPaymentMethod) {
      toast.error('Por favor selecciona un método de pago')
      return
    }

    setIsLoading(true)
    setStep('processing')

    try {
      const subscriptionData = {
        product_id: product.id,
        quantity,
        frequency_type: selectedFrequency,
        payment_method: useNewCard ? {
          type: 'new_card',
          card_data: newCardData
        } : {
          type: 'saved_method',
          method_id: selectedPaymentMethod
        }
      }

      const response = await fetch('/api/subscriptions/create-dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(subscriptionData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la suscripción')
      }

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000))

      setStep('success')
      toast.success('¡Suscripción creada exitosamente!')

      // Redirigir a MercadoPago si es necesario
      if (result.init_point) {
        window.location.href = result.init_point
      } else if (onSuccess) {
        setTimeout(() => onSuccess(result.subscription_id), 1500)
      }

    } catch (error) {
      console.error('Error creating subscription:', error)
      toast.error(error instanceof Error ? error.message : 'Error al procesar el pago')
      setStep('payment')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  if (step === 'processing') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <h3 className="text-xl font-semibold">Procesando tu suscripción...</h3>
            <p className="text-gray-600">Por favor espera mientras confirmamos tu pago</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'success') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
            <h3 className="text-2xl font-bold text-green-600">¡Suscripción Creada!</h3>
            <p className="text-gray-600">Tu suscripción ha sido activada exitosamente</p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                Recibirás un email de confirmación con todos los detalles de tu suscripción
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Información del pedido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resumen del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {product.image_url && (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h4 className="font-semibold">{product.name}</h4>
              <p className="text-sm text-gray-600">Cantidad: {quantity}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Frecuencia:</span>
              <Badge variant="secondary">
                {FREQUENCY_LABELS[selectedFrequency]}
              </Badge>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Entrega:</span>
              <span>{FREQUENCY_DESCRIPTIONS[selectedFrequency]}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Precio original:</span>
              <span className="line-through text-gray-500">
                ${getOriginalPrice().toFixed(2)}
              </span>
            </div>
            {getDiscount() > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento ({getDiscount()}%):</span>
                <span>-${getSavings().toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total a pagar:</span>
              <span>${getDiscountedPrice().toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Truck className="h-4 w-4" />
              <span className="text-sm font-medium">Envío gratuito incluido</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Información de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Métodos de pago guardados */}
          {paymentMethods.length > 0 && (
            <div className="space-y-3">
              <Label>Métodos de pago guardados</Label>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    !useNewCard && selectedPaymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setUseNewCard(false)
                    setSelectedPaymentMethod(method.id)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4" />
                      <div>
                        <p className="font-medium">
                          {method.brand?.toUpperCase()} •••• {method.last_four}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expira {method.expiry_month}/{method.expiry_year}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={!useNewCard && selectedPaymentMethod === method.id}
                      onChange={() => {
                        setUseNewCard(false)
                        setSelectedPaymentMethod(method.id)
                      }}
                    />
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={() => setUseNewCard(true)}
                className="w-full"
              >
                Usar nueva tarjeta
              </Button>
            </div>
          )}

          {/* Nueva tarjeta */}
          {(useNewCard || paymentMethods.length === 0) && (
            <div className="space-y-4">
              <Label>Nueva tarjeta</Label>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cardNumber">Número de tarjeta</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={newCardData.number}
                    onChange={(e) => setNewCardData(prev => ({
                      ...prev,
                      number: formatCardNumber(e.target.value)
                    }))}
                    maxLength={19}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="expiry">MM/AA</Label>
                    <Input
                      id="expiry"
                      placeholder="12/25"
                      value={newCardData.expiry}
                      onChange={(e) => setNewCardData(prev => ({
                        ...prev,
                        expiry: formatExpiry(e.target.value)
                      }))}
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={newCardData.cvv}
                      onChange={(e) => setNewCardData(prev => ({
                        ...prev,
                        cvv: e.target.value.replace(/\D/g, '').substring(0, 4)
                      }))}
                      maxLength={4}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cardName">Nombre en la tarjeta</Label>
                  <Input
                    id="cardName"
                    placeholder="Juan Pérez"
                    value={newCardData.name}
                    onChange={(e) => setNewCardData(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="juan@ejemplo.com"
                    value={newCardData.email}
                    onChange={(e) => setNewCardData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Términos y condiciones */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed">
                Acepto los{' '}
                <a href="/terminos" className="text-blue-600 hover:underline">
                  términos y condiciones
                </a>{' '}
                y autorizo el cargo recurrente según la frecuencia seleccionada
              </Label>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Información importante:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Puedes pausar o cancelar tu suscripción en cualquier momento</li>
                    <li>• Los cargos se realizarán automáticamente según la frecuencia</li>
                    <li>• Recibirás notificaciones antes de cada cargo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleCreateSubscription}
              disabled={isLoading || !acceptTerms}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Confirmar Suscripción
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}