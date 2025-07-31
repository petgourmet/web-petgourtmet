"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { X, Star, ShoppingCart, Check, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CartItem } from "./cart-context"
import type { ProductCardProps, SubscriptionType } from "./product-card"
import { ProductImageViewer } from "./shared/product-image-viewer"

type ProductDetailModalProps = {
  product: ProductCardProps
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: CartItem) => void
}

export function ProductDetailModal({ product, isOpen, onClose, onAddToCart }: ProductDetailModalProps) {
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[0] : null)
  const [quantity, setQuantity] = useState(1)
  const [purchaseType, setPurchaseType] = useState<'single' | 'subscription'>('single')
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState<SubscriptionType | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)

  // Obtener tipos de suscripción disponibles
  const availableSubscriptionTypes = product.subscription_types || []
  const hasSubscriptionOptions = product.subscription_available && availableSubscriptionTypes.length > 0
  
  // Mapeo de tipos de suscripción a etiquetas legibles
  const subscriptionTypeLabels: Record<SubscriptionType, string> = {
    biweekly: 'Cada 2 semanas',
    monthly: 'Mensual',
    quarterly: 'Cada 3 meses',
    annual: 'Anual'
  }

  // Función para obtener el descuento según el tipo de suscripción
  const getSubscriptionDiscount = (type: SubscriptionType): number => {
    switch (type) {
      case 'biweekly':
        return product.biweekly_discount || product.subscription_discount || 10
      case 'monthly':
        return product.monthly_discount || product.subscription_discount || 10
      case 'quarterly':
        return product.quarterly_discount || product.subscription_discount || 15
      case 'annual':
        return product.annual_discount || product.subscription_discount || 20
      default:
        return product.subscription_discount || 10
    }
  }

  // Calcular precio con descuento
  const calculatePrice = () => {
    const basePrice = selectedSize ? selectedSize.price : product.price || 0
    if (purchaseType === 'subscription' && selectedSubscriptionType) {
      const discount = getSubscriptionDiscount(selectedSubscriptionType)
      return basePrice * (1 - discount / 100)
    }
    return basePrice
  }

  if (!isOpen) return null

  const handleAddToCart = () => {
    if (!product) return

    const price = selectedSize ? selectedSize.price : product.price || 0
    const sizeWeight = selectedSize ? selectedSize.weight : "Único"

    onAddToCart({
      id: product.id,
      name: product.name,
      price: calculatePrice(),
      image: product.image,
      size: sizeWeight,
      quantity,
      isSubscription: purchaseType === 'subscription',
      subscriptionType: selectedSubscriptionType,
      subscriptionDiscount: selectedSubscriptionType ? getSubscriptionDiscount(selectedSubscriptionType) : undefined,
    })

    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const incrementQuantity = () => setQuantity((prev) => prev + 1)
  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1))



  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative mx-auto my-auto" style={{ position: 'relative', transform: 'translate(0, 0)' }}>
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white dark:bg-gray-800 border-b">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
          {/* Visor de imágenes */}
          <div className="space-y-4">
            <ProductImageViewer
              images={[
                { src: product.image, alt: product.name },
                ...(product.gallery || [])
              ]}
              className="w-full"
              showThumbnails={true}
              enableZoom={true}
              aspectRatio="square"
            />
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-[#7BBDC5] font-display mb-2">{product.name}</h2>

              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm md:text-lg leading-relaxed">
                <span className={showFullDescription ? "" : "line-clamp-3"}>
                  {product.description}
                </span>
                {product.description && product.description.length > 150 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-[#7BBDC5] hover:text-[#7BBDC5]/80 font-medium ml-2 underline"
                  >
                    {showFullDescription ? "Ver menos" : "Ver más"}
                  </button>
                )}
              </p>

              {product.features && product.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.features.map((feature, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-[#7BBDC5]/10 text-[#7BBDC5] border-[#7BBDC5]/30 px-3 py-1"
                    >
                      {feature.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Selección de tamaño */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="font-bold mb-3 text-lg">Tamaño</h3>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map((size, idx) => (
                    <Button
                      key={size.id || idx} // Usar size.id como key si está disponible, sino idx
                      variant={
                        (selectedSize && size.id && selectedSize.id === size.id) || selectedSize === size
                          ? "default"
                          : "outline"
                      } // Comparar por id si es posible, sino por referencia de objeto
                      className={`rounded-full px-6 py-3 ${
                        (selectedSize && size.id && selectedSize.id === size.id) || selectedSize === size
                          ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                          : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                      }`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size.weight} - ${size.price.toFixed(2)} MXN
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tipo de compra */}
            <div>
              <h3 className="font-bold mb-3 text-lg">Tipo de compra</h3>
              <div className="flex gap-3 mb-4">
                <Button
                  variant={purchaseType === 'single' ? "default" : "outline"}
                  className={`rounded-full px-6 py-3 ${
                    purchaseType === 'single'
                      ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                      : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                  }`}
                  onClick={() => {
                    setPurchaseType('single')
                    setSelectedSubscriptionType(null)
                  }}
                >
                  Compra única
                </Button>
                {hasSubscriptionOptions && (
                  <Button
                    variant={purchaseType === 'subscription' ? "default" : "outline"}
                    className={`rounded-full px-6 py-3 ${
                      purchaseType === 'subscription'
                        ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                        : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                    }`}
                    onClick={() => {
                      setPurchaseType('subscription')
                      if (availableSubscriptionTypes.length > 0) {
                        setSelectedSubscriptionType(availableSubscriptionTypes[0])
                      }
                    }}
                  >
                    Suscripción
                  </Button>
                )}
              </div>

              {/* Opciones de suscripción */}
              {purchaseType === 'subscription' && hasSubscriptionOptions && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-md text-gray-700 dark:text-gray-300">Frecuencia de entrega:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableSubscriptionTypes.map((type) => {
                      const discount = getSubscriptionDiscount(type)
                      return (
                        <Button
                          key={type}
                          variant={selectedSubscriptionType === type ? "default" : "outline"}
                          className={`rounded-lg px-4 py-3 text-left flex flex-col items-start h-auto ${
                            selectedSubscriptionType === type
                              ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                              : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                          }`}
                          onClick={() => setSelectedSubscriptionType(type)}
                        >
                          <span className="font-semibold">{subscriptionTypeLabels[type]}</span>
                          <span className="text-sm opacity-80">Ahorro del {discount}%</span>
                        </Button>
                      )
                    })}
                  </div>
                  {selectedSubscriptionType && (
                    <p className="text-sm text-green-600 flex items-center mt-2">
                      <Check className="h-3 w-3 inline mr-1" />
                      Ahorro del {getSubscriptionDiscount(selectedSubscriptionType)}% aplicado
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <h3 className="font-bold mb-3 text-lg">Cantidad</h3>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10 w-12 h-12"
                  onClick={decrementQuantity}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xl font-semibold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10 w-12 h-12"
                  onClick={incrementQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Precio y botón de compra */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Precio total:</p>
                  {purchaseType === 'subscription' && selectedSubscriptionType && (
                    <p className="text-sm text-gray-500 line-through">
                      ${((selectedSize ? selectedSize.price : product.price || 0) * quantity).toFixed(2)} MXN
                    </p>
                  )}
                  <p className="text-lg font-bold text-[#7BBDC5]">
                    ${(calculatePrice() * quantity).toFixed(2)} MXN
                  </p>
                  {purchaseType === 'subscription' && selectedSubscriptionType && (
                    <div className="space-y-1">
                      <p className="text-sm text-green-600 flex items-center">
                        <Check className="h-3 w-3 inline mr-1" />
                        Ahorro del {getSubscriptionDiscount(selectedSubscriptionType)}% aplicado
                      </p>
                      <p className="text-xs text-gray-500">
                        Entrega {subscriptionTypeLabels[selectedSubscriptionType].toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  className="rounded-full bg-[#7BBDC5] hover:bg-[#7BBDC5]/90 text-white px-8 py-4 text-lg font-semibold"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Añadir al carrito
                </Button>
              </div>
            </div>

            {/* Información adicional */}
            {(product.ingredients || product.nutritionalInfo) && (
              <Tabs defaultValue="ingredients" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                  <TabsTrigger value="nutritional">Información Nutricional</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="ingredients"
                  className="p-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="whitespace-pre-wrap">
                    {product.ingredients || "Información no disponible"}
                  </div>
                </TabsContent>
                <TabsContent
                  value="nutritional"
                  className="p-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="whitespace-pre-wrap">
                    {product.nutritionalInfo || "Información no disponible"}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
