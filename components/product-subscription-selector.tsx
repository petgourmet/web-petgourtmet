"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Calendar, 
  Package, 
  Percent, 
  ShoppingCart, 
  Clock, 
  Star,
  Info,
  Check,
  Zap
} from 'lucide-react'
import { useCart } from '@/components/cart-context'
import { useClientAuth } from '@/hooks/use-client-auth'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface Product {
  id: number
  name: string
  price: number
  image: string
  category?: string
  description?: string
  // Campos de suscripción
  weekly_discount?: number
  biweekly_discount?: number
  monthly_discount?: number
  quarterly_discount?: number
  annual_discount?: number

  monthly_mercadopago_url?: string
  quarterly_mercadopago_url?: string
  annual_mercadopago_url?: string
}

interface SubscriptionOption {
  id: string
  name: string
  frequency: string
  discount: number
  savings: number
  popular?: boolean
  description: string
  icon: React.ReactNode
}

interface ProductSubscriptionSelectorProps {
  product: Product
  className?: string
  onSubscriptionSelect?: (option: SubscriptionOption, quantity: number) => void
  showOneTimeOption?: boolean
  defaultQuantity?: number
}

export function ProductSubscriptionSelector({
  product,
  className,
  onSubscriptionSelect,
  showOneTimeOption = true,
  defaultQuantity = 1
}: ProductSubscriptionSelectorProps) {
  const { addToCart } = useCart()
  const { user } = useClientAuth()
  const [selectedOption, setSelectedOption] = useState<string>('onetime')
  const [quantity, setQuantity] = useState(defaultQuantity)
  const [isLoading, setIsLoading] = useState(false)

  // Generar opciones de suscripción basadas en los datos del producto
  const subscriptionOptions: SubscriptionOption[] = [
    {
      id: 'weekly',
      name: 'Semanal',
      frequency: 'Cada semana',
      discount: product.weekly_discount || 0,
      savings: ((product.price * (product.weekly_discount || 0)) / 100) * 52, // Ahorro anual
      description: 'Perfecto para mascotas con alto consumo',
      icon: <Zap className="h-4 w-4" />
    },
    {
      id: 'biweekly',
      name: 'Quincenal',
      frequency: 'Cada 2 semanas',
      discount: product.biweekly_discount || 0,
      savings: ((product.price * (product.biweekly_discount || 0)) / 100) * 26, // Ahorro anual
      description: 'Balance ideal entre frecuencia y ahorro',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      id: 'monthly',
      name: 'Mensual',
      frequency: 'Cada mes',
      discount: product.monthly_discount || 0,
      savings: ((product.price * (product.monthly_discount || 0)) / 100) * 12, // Ahorro anual
      popular: true,
      description: 'La opción más popular entre nuestros clientes',
      icon: <Star className="h-4 w-4" />
    },
    {
      id: 'quarterly',
      name: 'Trimestral',
      frequency: 'Cada 3 meses',
      discount: product.quarterly_discount || 0,
      savings: ((product.price * (product.quarterly_discount || 0)) / 100) * 4, // Ahorro anual
      description: 'Máximo ahorro con menos entregas',
      icon: <Package className="h-4 w-4" />
    },
    {
      id: 'annual',
      name: 'Anual',
      frequency: 'Cada año',
      discount: product.annual_discount || 0,
      savings: (product.price * (product.annual_discount || 0)) / 100, // Ahorro por compra
      description: 'El mayor descuento disponible',
      icon: <Percent className="h-4 w-4" />
    }
  ].filter(option => option.discount > 0) // Solo mostrar opciones con descuento

  // Calcular precio con descuento
  const calculateDiscountedPrice = (basePrice: number, discount: number): number => {
    return basePrice - (basePrice * discount / 100)
  }

  // Obtener la opción seleccionada
  const getSelectedOption = (): SubscriptionOption | null => {
    return subscriptionOptions.find(option => option.id === selectedOption) || null
  }

  // Calcular precio final
  const getFinalPrice = (): number => {
    if (selectedOption === 'onetime') {
      return product.price * quantity
    }

    const option = getSelectedOption()
    if (!option) return product.price * quantity

    return calculateDiscountedPrice(product.price, option.discount) * quantity
  }

  // Calcular ahorro total
  const getTotalSavings = (): number => {
    if (selectedOption === 'onetime') return 0

    const option = getSelectedOption()
    if (!option) return 0

    return (product.price * option.discount / 100) * quantity
  }

  // Manejar cambio de cantidad
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity)
    }
  }

  // Manejar selección de opción
  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId)
    
    if (optionId !== 'onetime' && onSubscriptionSelect) {
      const option = subscriptionOptions.find(opt => opt.id === optionId)
      if (option) {
        onSubscriptionSelect(option, quantity)
      }
    }
  }

  // Agregar al carrito
  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para agregar productos al carrito",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const isSubscription = selectedOption !== 'onetime'
      const option = getSelectedOption()

      const cartItem = {
        id: product.id,
        name: product.name,
        price: isSubscription && option 
          ? calculateDiscountedPrice(product.price, option.discount)
          : product.price,
        image: product.image,
        size: 'default',
        quantity: quantity,
        isSubscription: isSubscription,
        subscriptionType: isSubscription ? selectedOption : undefined,
        subscriptionDiscount: isSubscription && option ? option.discount : undefined,
        category: product.category
      }

      addToCart(cartItem)

      toast({
        title: isSubscription ? "¡Suscripción agregada!" : "¡Producto agregado!",
        description: isSubscription 
          ? `${product.name} (${option?.name}) agregado al carrito con ${option?.discount}% de descuento`
          : `${product.name} agregado al carrito`,
        variant: "default"
      })

    } catch (error) {
      console.error('Error agregando al carrito:', error)
      toast({
        title: "Error",
        description: "No se pudo agregar el producto al carrito",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Opciones de compra
        </CardTitle>
        <CardDescription>
          Elige cómo quieres recibir tu producto y ahorra con nuestras suscripciones
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Selector de cantidad */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
            >
              -
            </Button>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              className="w-20 text-center"
              min="1"
              max="10"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= 10}
            >
              +
            </Button>
          </div>
        </div>

        <Separator />

        {/* Opciones de compra */}
        <RadioGroup value={selectedOption} onValueChange={handleOptionSelect}>
          {/* Opción de compra única */}
          {showOneTimeOption && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="onetime" id="onetime" />
                <Label htmlFor="onetime" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span className="font-medium">Compra única</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        ${(product.price * quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          )}

          {/* Opciones de suscripción */}
          {subscriptionOptions.map((option) => (
            <div key={option.id} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  <Card className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    selectedOption === option.id && "ring-2 ring-primary",
                    option.popular && "border-primary"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {option.icon}
                            <span className="font-semibold">{option.name}</span>
                            {option.popular && (
                              <Badge variant="default" className="text-xs">
                                Más popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {option.frequency} • {option.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-green-600">
                              <Percent className="h-3 w-3" />
                              <span>{option.discount}% descuento</span>
                            </div>
                            <div className="flex items-center gap-1 text-blue-600">
                              <Info className="h-3 w-3" />
                              <span>Ahorras ${getTotalSavings().toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm text-muted-foreground line-through">
                            ${(product.price * quantity).toFixed(2)}
                          </div>
                          <div className="font-bold text-lg text-primary">
                            ${calculateDiscountedPrice(product.price, option.discount).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            por unidad
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            </div>
          ))}
        </RadioGroup>

        <Separator />

        {/* Resumen de precio */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm">Subtotal ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})</span>
            <span className="font-medium">${getFinalPrice().toFixed(2)}</span>
          </div>
          
          {getTotalSavings() > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <span className="text-sm">Descuento por suscripción</span>
              <span className="font-medium">-${getTotalSavings().toFixed(2)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span>${getFinalPrice().toFixed(2)}</span>
          </div>

          {selectedOption !== 'onetime' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Próxima entrega: {getSelectedOption()?.frequency.toLowerCase()}
              </span>
            </div>
          )}
        </div>

        {/* Botón de agregar al carrito */}
        <Button
          onClick={handleAddToCart}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Agregando...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {selectedOption === 'onetime' 
                ? 'Agregar al carrito' 
                : `Suscribirse y ahorrar ${getSelectedOption()?.discount}%`
              }
            </>
          )}
        </Button>

        {/* Beneficios de la suscripción */}
        {selectedOption !== 'onetime' && (
          <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold text-primary flex items-center gap-2">
              <Check className="h-4 w-4" />
              Beneficios de tu suscripción
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Descuento automático en cada entrega</li>
              <li>• Envío gratuito en todas las entregas</li>
              <li>• Cancela o modifica cuando quieras</li>
              <li>• Nunca te quedarás sin producto</li>
              <li>• Soporte prioritario</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductSubscriptionSelector