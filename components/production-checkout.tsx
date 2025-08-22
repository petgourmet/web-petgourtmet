'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, CreditCard, User, MapPin, Mail, Phone, AlertTriangle } from 'lucide-react'
import { MercadoPagoButton } from '@/components/mercadopago-button'
import { useCart } from '@/components/cart-context'
import { useClientAuth } from '@/hooks/use-client-auth'
import { 
  validateCompleteCheckout, 
  sanitizeCustomerData, 
  logValidationErrors,
  type CustomerData,
  type CartItem,
  type ValidationResult
} from '@/lib/checkout-validators'

interface CheckoutFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: {
    street_name: string
    street_number: string
    zip_code: string
    city: string
    state: string
    country: string
  }
}

interface ProductionCheckoutProps {
  onSuccess?: (paymentData: any) => void
  onError?: (error: any) => void
  onPending?: (paymentData: any) => void
}

export default function ProductionCheckout({ onSuccess, onError, onPending }: ProductionCheckoutProps) {
  const { cart, calculateCartTotal, clearCart } = useCart()
  const { user } = useClientAuth()
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street_name: '',
      street_number: '',
      zip_code: '',
      city: '',
      state: '',
      country: 'México'
    }
  })
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<'cart' | 'form' | 'payment'>('cart')

  const subtotal = calculateCartTotal()
  const shippingCost = subtotal >= 1000 ? 0 : 90
  const totalPrice = subtotal + shippingCost

  // Pre-llenar formulario con datos del usuario autenticado
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        phone: user.user_metadata?.phone || ''
      }))
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const validateForm = (): boolean => {
    // Sanitizar datos antes de validar
    const sanitizedData = sanitizeCustomerData(formData)
    
    // Convertir cart a formato esperado por el validador
    const cartItems: CartItem[] = cart.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      isSubscription: item.isSubscription,
      size: item.size,
      image: item.image
    }))
    
    // Validar usando los validadores robustos
    const validation = validateCompleteCheckout(sanitizedData, cartItems)
    
    // Actualizar estados de validación
    setValidationErrors(validation.errors)
    setValidationWarnings(validation.warnings || [])
    
    // Log para debugging
    logValidationErrors('ProductionCheckout', validation)
    
    // Actualizar formData con datos sanitizados si es válido
    if (validation.isValid) {
      setFormData(sanitizedData)
    }
    
    return validation.isValid
  }

  const createPreference = async () => {
    if (!validateForm()) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    if (cart.length === 0) {
      setError('El carrito está vacío')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map((item: any) => ({
            id: item.id,
            title: item.name,
            description: item.description || `Producto de PetGourmet`,
            picture_url: item.image,
            quantity: item.quantity,
            unit_price: item.isSubscription ? item.price * 0.9 : item.price,
          })),
          customerData: formData,
          externalReference: `order-${Date.now()}`,
          backUrls: {
            success: `${window.location.origin}/checkout/success`,
            failure: `${window.location.origin}/checkout/failure`,
            pending: `${window.location.origin}/checkout/pending`,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear la preferencia de pago')
      }

      const data = await response.json()
      setPreferenceId(data.preferenceId)
      setCurrentStep('payment')
    } catch (error) {
      console.error('Error creating preference:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    clearCart()
    onSuccess?.(null)
  }

  const handlePaymentError = (error: any) => {
    setError('Error en el pago: ' + error.message)
    onError?.(error)
  }

  if (cart.length === 0 && currentStep === 'cart') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Tu carrito está vacío</h2>
          <p className="text-gray-600 mb-4">Agrega algunos productos para continuar con la compra</p>
          <Button onClick={() => window.location.href = '/productos'}>
            Ver Productos
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
      {/* Resumen del Pedido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Resumen del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cart.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                  <p className="text-sm text-gray-600">
                    {item.isSubscription && <span className="text-green-600">🔄 Suscripción (-10%)</span>}
                  </p>
                  <p className="font-semibold">
                    ${item.isSubscription ? item.price * 0.9 : item.price} MXN
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ${(item.isSubscription ? item.price * 0.9 : item.price) * item.quantity} MXN
                  </p>
                </div>
              </div>
            ))}
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)} MXN</span>
              </div>
              
              {/* Mensaje de envío gratis */}
              {subtotal < 1000 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 font-medium">
                      🚚 ¡Envío GRATIS en compras mayores a $1,000 MXN!
                    </p>
                    <p className="text-xs text-blue-600">
                      Te faltan ${(1000 - subtotal).toFixed(2)} MXN
                    </p>
                  </div>
                </div>
              )}
              
              {subtotal >= 1000 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-sm text-green-700 font-medium">
                      ✅ ¡Felicidades! Tu envío es GRATIS
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Envío:</span>
                <span>{shippingCost === 0 ? "Gratis" : `$${shippingCost.toFixed(2)} MXN`}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total:</span>
                <span>${totalPrice.toFixed(2)} MXN</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario y Pago */}
      <div className="space-y-6">
        {currentStep === 'cart' && (
          <Card>
            <CardHeader>
              <CardTitle>Continuar con la Compra</CardTitle>
              <CardDescription>
                Revisa tu pedido y continúa con el proceso de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setCurrentStep('form')} className="w-full">
                Proceder al Checkout
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mostrar errores de validación */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <h4 className="text-sm font-medium text-red-800">Errores de validación:</h4>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Mostrar advertencias de validación */}
              {validationWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <h4 className="text-sm font-medium text-yellow-800">Advertencias:</h4>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="555-123-4567"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección de Entrega
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street_name">Calle *</Label>
                    <Input
                      id="street_name"
                      value={formData.address.street_name}
                      onChange={(e) => handleInputChange('address.street_name', e.target.value)}
                      placeholder="Nombre de la calle"
                    />
                  </div>
                  <div>
                    <Label htmlFor="street_number">Número *</Label>
                    <Input
                      id="street_number"
                      value={formData.address.street_number}
                      onChange={(e) => handleInputChange('address.street_number', e.target.value)}
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="zip_code">Código Postal *</Label>
                    <Input
                      id="zip_code"
                      value={formData.address.zip_code}
                      onChange={(e) => handleInputChange('address.zip_code', e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      placeholder="Estado"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <Button 
                onClick={createPreference} 
                disabled={isLoading || !validateForm()}
                className="w-full"
              >
                {isLoading ? 'Procesando...' : 'Continuar al Pago'}
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'payment' && preferenceId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Método de Pago
              </CardTitle>
              <CardDescription>
                Completa tu pago de forma segura con MercadoPago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-semibold">✅ Información validada</p>
                  <p className="text-sm text-green-600">Total a pagar: ${totalPrice} MXN</p>
                </div>

                <MercadoPagoButton
                  preferenceId={preferenceId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentStep('form')
                    setPreferenceId(null)
                  }}
                  className="w-full"
                >
                  Modificar Información
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
