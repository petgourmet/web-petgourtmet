"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { X, Star, ShoppingCart, Check, Minus, Plus, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react"
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
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })

  const imageContainerRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handleAddToCart = () => {
    if (!product) return

    const price = selectedSize ? selectedSize.price : product.price || 0
    const sizeWeight = selectedSize ? selectedSize.weight : "Único"

    onAddToCart({
      id: product.id,
      name: product.name,
      price,
      image: product.image,
      size: sizeWeight,
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

  // Combinar imagen principal con imágenes adicionales
  const allImages = [{ src: product.image, alt: product.name }, ...(product.gallery || [])].filter(
    (img) => img.src && img.src.trim() !== "",
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZoomPosition({ x, y })
  }

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex justify-end p-4 bg-white dark:bg-gray-800 border-b">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
          {/* Galería de imágenes mejorada */}
          <div className="space-y-4">
            {/* Imagen principal con zoom */}
            <div className="relative">
              <div
                className="aspect-square relative rounded-xl overflow-hidden bg-gray-100 cursor-zoom-in group"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                ref={imageContainerRef}
              >
                <Image
                  src={allImages[activeImageIndex]?.src || "/placeholder.svg"}
                  alt={allImages[activeImageIndex]?.alt || product.name}
                  fill
                  className={`object-cover transition-transform duration-200 ${isZoomed ? "scale-150" : "scale-100"}`}
                  style={
                    isZoomed
                      ? {
                          transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        }
                      : {}
                  }
                />

                {/* Indicador de zoom */}
                <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-4 w-4" />
                </div>

                {/* Navegación de imágenes */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Miniaturas */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      idx === activeImageIndex
                        ? "border-[#7BBDC5] ring-2 ring-[#7BBDC5]/30"
                        : "border-gray-200 hover:border-[#7BBDC5]/50"
                    }`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <Image
                      src={img.src || "/placeholder.svg"}
                      alt={img.alt || `Imagen ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-[#7BBDC5] font-display mb-2">{product.name}</h2>

              {product.rating && (
                <div className="flex items-center mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {product.reviews && (
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({product.reviews} reseñas)</span>
                  )}
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed">{product.description}</p>

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

            {/* Tipo de compra - OCULTO TEMPORALMENTE */}
            {false && (
            <div>
              <h3 className="font-bold mb-3 text-lg">Tipo de compra</h3>
              <div className="flex gap-3">
                <Button
                  variant={!isSubscription ? "default" : "outline"}
                  className={`rounded-full px-6 py-3 ${
                    !isSubscription
                      ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                      : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                  }`}
                  onClick={() => setIsSubscription(false)}
                >
                  Compra única
                </Button>
                <Button
                  variant={isSubscription ? "default" : "outline"}
                  className={`rounded-full px-6 py-3 ${
                    isSubscription
                      ? "bg-[#7BBDC5] text-white hover:bg-[#7BBDC5]/90"
                      : "border-[#7BBDC5] text-[#7BBDC5] hover:bg-[#7BBDC5]/10"
                  }`}
                  onClick={() => setIsSubscription(true)}
                >
                  Suscripción (-10%)
                </Button>
              </div>
              {isSubscription && (
                <p className="text-sm text-green-600 flex items-center mt-2">
                  <Check className="h-3 w-3 inline mr-1" />
                  Ahorro del 10% aplicado
                </p>
              )}
            </div>
            )}

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
                  <p className="text-3xl font-bold text-[#7BBDC5]">
                    $
                    {(
                      (selectedSize ? selectedSize.price : product.price || 0) *
                      quantity *
                      (isSubscription ? 0.9 : 1)
                    ).toFixed(2)}{" "}
                    MXN
                  </p>
                  {isSubscription && (
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <Check className="h-3 w-3 inline mr-1" />
                      Ahorro del 10% aplicado
                    </p>
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
