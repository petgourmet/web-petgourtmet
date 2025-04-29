"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { X, Star, ShoppingCart, Check, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CartItem } from "./cart-context"
import type { ProductCardProps } from "./product-card"

type ProductDetailModalProps = {
  product: ProductCardProps
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: CartItem) => void
}

export function ProductDetailModal({ product, isOpen, onClose, onAddToCart }: ProductDetailModalProps) {
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[0] : null)
  const [quantity, setQuantity] = useState(1)
  const [isSubscription, setIsSubscription] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  if (!isOpen) return null

  const handleAddToCart = () => {
    if (!product) return

    const price = selectedSize ? selectedSize.price : product.price || 0
    const size = selectedSize ? selectedSize.weight : "Único"

    onAddToCart({
      id: product.id,
      name: product.name,
      price,
      image: product.image,
      size,
      quantity,
      isSubscription,
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

  // Determinar las imágenes a mostrar (galería o imagen principal)
  const images = product.gallery || [{ src: product.image, alt: product.name }]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white dark:bg-gray-800 border-b">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Galería de imágenes */}
          <div className="space-y-4">
            <div className="aspect-square relative rounded-xl overflow-hidden">
              <Image
                src={images[activeImageIndex].src || "/placeholder.svg"}
                alt={images[activeImageIndex].alt}
                fill
                className="object-cover"
              />
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                      idx === activeImageIndex ? "border-primary" : "border-transparent"
                    }`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <Image src={img.src || "/placeholder.svg"} alt={img.alt} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary font-display mb-2">{product.name}</h2>

              {product.rating && (
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {product.reviews && (
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({product.reviews} reseñas)</span>
                  )}
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-300 mb-4">{product.description}</p>

              {product.features && product.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.features.map((feature, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`bg-${feature.color}/10 text-${feature.color} border-${feature.color}/30`}
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
                <h3 className="font-bold mb-2">Tamaño</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size, idx) => (
                    <Button
                      key={idx}
                      variant={selectedSize === size ? "default" : "outline"}
                      className={`rounded-full ${
                        selectedSize === size ? "bg-primary text-white" : "border-primary text-primary"
                      }`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size.weight} - €{size.price.toFixed(2)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Opción de suscripción */}
            <div>
              <h3 className="font-bold mb-2">Tipo de compra</h3>
              <div className="flex gap-2">
                <Button
                  variant={!isSubscription ? "default" : "outline"}
                  className={`rounded-full ${
                    !isSubscription ? "bg-primary text-white" : "border-primary text-primary"
                  }`}
                  onClick={() => setIsSubscription(false)}
                >
                  Compra única
                </Button>
                <Button
                  variant={isSubscription ? "default" : "outline"}
                  className={`rounded-full ${isSubscription ? "bg-primary text-white" : "border-primary text-primary"}`}
                  onClick={() => setIsSubscription(true)}
                >
                  Suscripción (-10%)
                </Button>
              </div>
              {isSubscription && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Recibe este producto automáticamente cada mes y ahorra un 10%.
                </p>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <h3 className="font-bold mb-2">Cantidad</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-primary text-primary"
                  onClick={decrementQuantity}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-primary text-primary"
                  onClick={incrementQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Precio y botón de añadir al carrito */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Precio total:</p>
                <p className="text-2xl font-bold text-primary">
                  €
                  {(
                    (selectedSize ? selectedSize.price : product.price || 0) *
                    quantity *
                    (isSubscription ? 0.9 : 1)
                  ).toFixed(2)}
                </p>
                {isSubscription && (
                  <p className="text-sm text-green-600">
                    <Check className="h-3 w-3 inline mr-1" />
                    Ahorro del 10% aplicado
                  </p>
                )}
              </div>
              <Button className="rounded-full bg-primary hover:bg-primary/90 text-white px-6" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Añadir al carrito
              </Button>
            </div>

            {/* Pestañas de información adicional */}
            {(product.ingredients || product.nutritionalInfo) && (
              <Tabs defaultValue="ingredients" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                  <TabsTrigger value="nutritional">Información Nutricional</TabsTrigger>
                </TabsList>
                <TabsContent value="ingredients" className="p-4 text-sm text-gray-600 dark:text-gray-300">
                  {product.ingredients || "Información no disponible"}
                </TabsContent>
                <TabsContent value="nutritional" className="p-4 text-sm text-gray-600 dark:text-gray-300">
                  {product.nutritionalInfo || "Información no disponible"}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
